#!/usr/bin/env node
import http from 'http';
import fs from 'fs';

// Simple admin server for MVP. Uses SUPABASE_SERVICE_ROLE_KEY to write to DB (STAGING only).
// Endpoints:
// GET /admin -> serves index.html
// GET /admin/* static files
// POST /api/chat -> accepts {site_slug, message} and a Supabase JWT, creates change_request, applies safe actions, writes audit_logs
// GET /api/requests?site_slug=... -> returns list of change_requests for site

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vdhcmaunhbvdwfiobhim.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const PORT = process.env.ADMIN_PORT ? Number(process.env.ADMIN_PORT) : 4050;
const ADMIN_REQUIRE_AUTH = process.env.ADMIN_REQUIRE_AUTH === '0' ? false : true;
const ADMIN_ALLOWED_EMAILS = (process.env.ADMIN_ALLOWED_EMAILS || process.env.ALLOWED_ADMIN_EMAILS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

if(!SUPABASE_SERVICE_ROLE_KEY) console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY not set. Server will fail on DB writes.');
if(ADMIN_REQUIRE_AUTH && !SUPABASE_ANON_KEY) console.warn('Warning: SUPABASE_ANON_KEY not set. JWT validation will use service role key as API key.');
if(ADMIN_REQUIRE_AUTH && ADMIN_ALLOWED_EMAILS.length === 0) console.warn('Warning: ADMIN_ALLOWED_EMAILS not set. Any authenticated Supabase user can use admin API endpoints.');

async function supabase(method, path, body){
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const opts = { method, headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }};
  if(method !== 'GET') opts.headers['Prefer'] = 'return=representation';
  if(body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try{ data = JSON.parse(text); } catch(e){ data = text; }
  return { status: res.status, data };
}

function sendJson(res, status, data){
  res.writeHead(status, {'Content-Type':'application/json'});
  res.end(JSON.stringify(data));
}

function getBearerToken(req){
  const header = req.headers.authorization || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function verifySupabaseUser(token){
  const apiKey = SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY;
  if(!apiKey) throw new Error('Supabase API key missing for auth validation');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'GET',
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${token}`,
    },
  });
  const text = await res.text();
  let data;
  try{ data = JSON.parse(text); } catch(e){ data = text; }
  if(!res.ok) return { ok:false, status: res.status, data };
  return { ok:true, user: data };
}

async function requireAdmin(req, res){
  if(!ADMIN_REQUIRE_AUTH) return { ok:true, user:{ id:'dev-bypass', email:'dev-bypass@local' } };
  const token = getBearerToken(req);
  if(!token){
    sendJson(res, 401, { ok:false, error:'missing_bearer_token' });
    return { ok:false };
  }
  const verified = await verifySupabaseUser(token);
  if(!verified.ok){
    sendJson(res, 401, { ok:false, error:'invalid_or_expired_token' });
    return { ok:false };
  }
  const email = (verified.user?.email || '').toLowerCase();
  if(ADMIN_ALLOWED_EMAILS.length && !ADMIN_ALLOWED_EMAILS.includes(email)){
    sendJson(res, 403, { ok:false, error:'email_not_allowed' });
    return { ok:false };
  }
  return { ok:true, user: verified.user };
}

function heuristicIntent(message){
  const lower = message.toLowerCase();
  if(/troque|mude|atualiz(e|ar)|alterar/.test(lower) && /whatsapp|zap|telefone|rodape|rodap/.test(lower)){
    const m = message.match(/\+?[0-9][0-9\s().-]{6,}/);
    const digits = m? m[0].replace(/\D/g,'') : null;
    return { action:'update_contact', confidence:0.95, requiresApproval:false, payload:{field:'whatsapp_footer', value: digits}, response_to_user:'Pronto, atualizei o contato.' };
  }
  if(/rascunho|cria um post|criar rascunho|novo post/.test(lower)){
    const titleMatch = message.match(/titulo[:\-]\s*(.+)$/i);
    const title = titleMatch? titleMatch[1].trim() : 'Rascunho via Admin';
    return { action:'create_draft', confidence:0.93, requiresApproval:false, payload:{title, body:message}, response_to_user:'Rascunho criado.' };
  }
  if(/agenda|agendar|publicar em|em \d{1,2}\/\d{1,2}/.test(lower)){
    return { action:'schedule_post', confidence:0.92, requiresApproval:false, payload:{raw:message}, response_to_user:'Post agendado (rascunho criado).'};
  }
  return { action:'noop', confidence:0.98, requiresApproval:false, payload:{raw:message}, response_to_user:'Recebido (nenhuma a\u00e7\u00e3o necessária).'};
}

async function createChangeRequest(site_slug, from_phone, message, interpreted, actor){
  const body = {
    site_slug,
    from_phone: from_phone || null,
    action: interpreted.action,
    payload: interpreted.payload || null,
    status: 'received',
    pending_review: false,
    confidence: interpreted.confidence || null,
    requires_approval: interpreted.requiresApproval || false,
    auto_executed: false,
    execution_result: null,
    suggested_command: null,
    created_at: new Date().toISOString(),
    original_message: message || null,
  };
  if(actor?.email){
    body.payload = Object.assign({}, body.payload || {}, { actor_email: actor.email, actor_id: actor.id || null });
  }
  const r = await supabase('POST', 'change_requests', body);
  if(r.status !== 201 && r.status !== 200) throw new Error('change_request insert failed: '+JSON.stringify(r));
  // supabase returns array
  const row = Array.isArray(r.data)? r.data[0] : r.data;
  if(!row?.id) throw new Error('change_request insert did not return id: '+JSON.stringify(r));
  return row;
}

async function insertAudit(site_slug, event, details, actor, change_request_id){
  const body = { site_slug, event, details: Object.assign({}, details || {}, { actor_email: actor?.email || null, actor_id: actor?.id || null }), actor_phone: null, change_request_id: change_request_id || null, created_at: new Date().toISOString() };
  const r = await supabase('POST', 'audit_logs', body);
  return r;
}

async function applySafeAction(site_slug, interpreted, changeRequestId, actor){
  const action = interpreted.action;
  if(action === 'update_contact'){
    const val = interpreted.payload?.value || interpreted.payload?.phone || null;
    if(!val) return { ok:false, reason:'no value' };
    // upsert site_contacts key=whatsapp_footer
    // try patch first
    const patch = await supabase('PATCH', `site_contacts?site_slug=eq.${encodeURIComponent(site_slug)}&key=eq.whatsapp_footer`, { value: val });
    if(patch.status === 200 && Array.isArray(patch.data) && patch.data.length){
      await insertAudit(site_slug, 'update_contact', { payload: interpreted.payload }, actor, changeRequestId);
      await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(changeRequestId)}`, { status:'completed_auto', auto_executed:true, execution_result:{success:true} });
      return { ok:true };
    }
    const ins = await supabase('POST', 'site_contacts', { site_slug, key:'whatsapp_footer', value: val });
    await insertAudit(site_slug, 'update_contact', { payload: interpreted.payload }, actor, changeRequestId);
    await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(changeRequestId)}`, { status:'completed_auto', auto_executed:true, execution_result:{success:true} });
    return { ok:true };
  }
  if(action === 'create_draft'){
    const title = interpreted.payload?.title || 'Rascunho';
    const body = interpreted.payload?.body || '';
    const post = await supabase('POST','posts',{ site_slug, title, body, status:'draft' });
    await insertAudit(site_slug, 'create_draft', { post: post.data || post }, actor, changeRequestId);
    await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(changeRequestId)}`, { status:'completed_auto', auto_executed:true, execution_result:{post: post.data || post} });
    return { ok:true };
  }
  if(action === 'schedule_post'){
    const title = interpreted.payload?.title || 'Post agendado';
    const body = interpreted.payload?.raw || '';
    const post = await supabase('POST','posts',{ site_slug, title, body, status:'scheduled', scheduled_at: new Date().toISOString() });
    await insertAudit(site_slug, 'schedule_post', { post: post.data || post }, actor, changeRequestId);
    await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(changeRequestId)}`, { status:'completed_auto', auto_executed:true, execution_result:{post: post.data || post} });
    return { ok:true };
  }
  if(action === 'noop'){
    await insertAudit(site_slug, 'noop', { raw: interpreted.payload?.raw || null }, actor, changeRequestId);
    await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(changeRequestId)}`, { status:'completed_auto', auto_executed:true, execution_result:{noop:true} });
    return { ok:true };
  }
  return { ok:false, reason:'not_supported' };
}

function parseJsonBody(req){
  return new Promise((resolve,reject)=>{
    let s=''; req.on('data', c=> s+=c); req.on('end', ()=>{ try{ resolve(JSON.parse(s||'{}')) }catch(e){ reject(e)} }); req.on('error', reject);
  });
}

const server = http.createServer(async (req,res)=>{
  try{
    const url = new URL(req.url, `http://${req.headers.host}`);
    if(req.method === 'GET' && (url.pathname === '/admin' || url.pathname === '/admin/')){
      const html = fs.readFileSync('./admin/index.html','utf8');
      // inject supabase keys for client usage (anonymous key only)
      const injected = html.replace('</head>', `<script>window.SUPABASE_URL='${SUPABASE_URL}'; window.SUPABASE_ANON_KEY='${SUPABASE_ANON_KEY}';</script></head>`);
      res.writeHead(200, {'Content-Type':'text/html'}); res.end(injected); return;
    }
    if(req.method === 'GET' && url.pathname.startsWith('/admin/')){
      const path = '.' + url.pathname;
      if(fs.existsSync(path)){
        const ext = path.split('.').pop();
        const content = fs.readFileSync(path);
        const ct = ext === 'js' ? 'application/javascript' : ext==='css' ? 'text/css' : 'text/plain';
        res.writeHead(200, {'Content-Type': ct}); res.end(content); return;
      }
    }
    if(req.method === 'POST' && url.pathname === '/api/chat'){
      const auth = await requireAdmin(req, res);
      if(!auth.ok) return;
      const body = await parseJsonBody(req);
      const site_slug = body.site_slug || 'smartcompany';
      const message = body.message || '';
      // interpret
      const interpreted = heuristicIntent(message);
      // create change_request
      const cr = await createChangeRequest(site_slug, null, message, interpreted, auth.user);
      // attempt auto-exec for safe actions
      let execRes = null;
      try{ execRes = await applySafeAction(site_slug, interpreted, cr.id, auth.user); }catch(e){ execRes = { ok:false, err: e.message } }
      // record operator-visible response
      await insertAudit(site_slug, 'agent_response', { interpreted, execRes }, auth.user, cr.id);
      res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify({ ok:true, change_request_id: cr.id, actor_email: auth.user?.email || null, interpreted, execRes, message: interpreted.response_to_user })); return;
    }
    if(req.method === 'GET' && url.pathname === '/api/requests'){
      const auth = await requireAdmin(req, res);
      if(!auth.ok) return;
      const site = url.searchParams.get('site_slug') || 'smartcompany';
      const r = await supabase('GET', `change_requests?select=*&site_slug=eq.${encodeURIComponent(site)}&order=created_at.desc&limit=50`);
      res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify(r.data || [])); return;
    }
    res.writeHead(404); res.end('not found');
  }catch(e){
    console.error('err', e);
    res.writeHead(500, {'Content-Type':'application/json'}); res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, '127.0.0.1', ()=> console.log(`Admin server listening on http://127.0.0.1:${PORT}/admin`));
