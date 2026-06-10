import fs from 'fs';

// load supabase config from cached doc
const cachePath = '/root/.hermes/cache/documents/doc_5c2e91f78bca_base.txt';
const txt = fs.readFileSync(cachePath,'utf8');
function extract(key){
  const re = new RegExp(`${key}=([^\n\r]+)`,'i');
  const m = txt.match(re); return m? m[1].trim() : null;
}
const SUPABASE_URL = extract('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = extract('SUPABASE_SERVICE_ROLE_KEY') || extract('token') || extract('SUPABASE_ANON_KEY');
if(!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('missing supabase config');

async function supabase(method, path, body){
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const opts = { method, headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }};
  if(body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try{ data = JSON.parse(text); } catch(e){ data = text; }
  return { status: res.status, data };
}

function heuristicIntent(message){
  const lower = message.toLowerCase();
  if(/troque|mude|atualiz(e|ar)|alterar/.test(lower) && /whatsapp|zap|telefone|rodape|rodap/.test(lower)){
    const m = message.match(/\+?[0-9][0-9\s().-]{6,}/);
    const digits = m? m[0].replace(/\D/g,'') : null;
    return { action:'update_contact', confidence:0.95, requiresApproval:false, payload:{field:'whatsapp_footer', value: digits}, message:'Atualizando contato.' };
  }
  if(/rascunho|cria um post|criar rascunho|novo post/.test(lower)){
    const titleMatch = message.match(/titulo[:\-]\s*(.+)$/i);
    const title = titleMatch? titleMatch[1].trim() : 'Rascunho via WhatsApp';
    return { action:'create_draft', confidence:0.93, requiresApproval:false, payload:{title, body:message}, message:'Rascunho criado.' };
  }
  if(/agenda|agendar|publicar em|em \d{1,2}\/\d{1,2}/.test(lower)){
    return { action:'schedule_post', confidence:0.92, requiresApproval:false, payload:{raw:message}, message:'Post agendado (rascunho criado).'};
  }
  return { action:'noop', confidence:0.98, requiresApproval:false, payload:{raw:message}, message:'Nada a fazer.' };
}

function phoneMatch(candidate, target){
  // best-effort: compare last 4 digits and startswith +55 if available
  if(!candidate || !target) return false;
  const candDigits = candidate.replace(/\D/g,'');
  const targDigits = target.replace(/\D/g,'');
  if(targDigits.length >= 4 && candDigits.endsWith(targDigits.slice(-4))) return true;
  if(candDigits === targDigits) return true;
  return false;
}

async function resolvePhone(phone){
  // fetch all phones and match heuristically
  const r = await supabase('GET', `phones?select=*`);
  if(r.status !== 200) throw new Error('phones list failed: '+JSON.stringify(r));
  const list = Array.isArray(r.data)? r.data : [];
  for(const entry of list){
    if(phoneMatch(entry.phone, phone)) return entry;
  }
  return null;
}

async function insertChangeRequestWithInterpretation(site_slug, from_phone, message, intent){
  const body = { site_slug, from_phone, action: intent.action, payload: intent.payload, status:'received', pending_review:false, confidence: intent.confidence, requires_approval: intent.requiresApproval, auto_executed:false, created_at: new Date().toISOString() };
  const r = await supabase('POST', 'change_requests', body);
  if(r.status !== 201 && r.status !== 200) throw new Error('insert change_request failed: '+JSON.stringify(r));
  return Array.isArray(r.data)? r.data[0] : r.data;
}

async function upsertSiteContact(site_slug, key, value){
  const q = await supabase('PATCH', `site_contacts?site_slug=eq.${encodeURIComponent(site_slug)}&key=eq.${encodeURIComponent(key)}`, { value });
  if(q.status === 200 && Array.isArray(q.data) && q.data.length) return q.data;
  const ins = await supabase('POST', 'site_contacts', { site_slug, key, value });
  return Array.isArray(ins.data)? ins.data[0] : ins.data;
}

async function insertPost(site_slug, title, body, status='draft', scheduled_at=null){
  const payload = { site_slug, title, body, status };
  if(scheduled_at) payload.scheduled_at = scheduled_at;
  const r = await supabase('POST', 'posts', payload);
  return Array.isArray(r.data)? r.data[0] : r.data;
}

async function insertAudit(site_slug, event, details){
  const r = await supabase('POST', 'audit_logs', { site_slug, event, details });
  return r.data;
}

async function runTestCase(phone, message, label){
  console.log('\n--', label);
  const resolved = await resolvePhone(phone);
  if(!resolved){ console.log('phone not found in phones table:', phone); return { error:'no_phone' } }
  console.log('resolved site_slug=', resolved.site_slug);
  const intent = heuristicIntent(message);
  console.log('interpreted action=', intent.action, 'confidence=', intent.confidence);
  const cr = await insertChangeRequestWithInterpretation(resolved.site_slug, phone, message, intent);
  console.log('change_request id=', cr.id);
  const SAFE = ['update_contact','create_draft','schedule_post','noop'];
  if(SAFE.includes(intent.action) && intent.confidence >= 0.9 && !intent.requiresApproval){
    if(intent.action === 'update_contact'){
      const val = intent.payload.value; await upsertSiteContact(resolved.site_slug, 'whatsapp_footer', val);
      await insertAudit(resolved.site_slug, 'update_contact', { payload: intent.payload });
      await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(cr.id)}`, { status:'completed_auto', auto_executed:true, execution_result:{success:true} });
      console.log('auto-executed update_contact'); return { auto_executed:true };
    }
    if(intent.action === 'create_draft'){
      const post = await insertPost(resolved.site_slug, intent.payload.title || 'Rascunho', intent.payload.body || '', 'draft');
      await insertAudit(resolved.site_slug, 'create_draft', { post });
      await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(cr.id)}`, { status:'completed_auto', auto_executed:true, execution_result:{post} });
      console.log('auto-executed create_draft'); return { auto_executed:true };
    }
    if(intent.action === 'schedule_post'){
      const post = await insertPost(resolved.site_slug, 'Post agendado', intent.payload.raw || '', 'scheduled');
      await insertAudit(resolved.site_slug, 'schedule_post', { post });
      await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(cr.id)}`, { status:'completed_auto', auto_executed:true, execution_result:{post} });
      console.log('auto-executed schedule_post'); return { auto_executed:true };
    }
    if(intent.action === 'noop'){
      await insertAudit(resolved.site_slug, 'noop', { raw: intent.payload.raw });
      await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(cr.id)}`, { status:'completed_auto', auto_executed:true, execution_result:{noop:true} });
      console.log('noop auto-executed'); return { auto_executed:true };
    }
  } else {
    await insertAudit(resolved.site_slug, 'deferred_execution', { intent });
    await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(cr.id)}`, { status:'pending_review', pending_review:true });
    console.log('deferred for review'); return { auto_executed:false };
  }
}

async function main(){
  const phone = '+551****5460';
  const tests = [
    {label:'update_contact', message:'Troque o WhatsApp do rodape para 11 99999 9999'},
    {label:'create_draft', message:'Cria um rascunho: titulo: Novidades de Julho - vamos falar sobre...'},
    {label:'schedule_post', message:'Agenda para publicar em 10/06: Post sobre Black Friday'},
    {label:'noop', message:'Mensagem sem intencao clara'},
  ];
  const results = [];
  for(const t of tests){
    const r = await runTestCase(phone, t.message, t.label);
    results.push({label:t.label,result:r});
  }
  console.log('\nResults summary:', results);
  const crAll = await supabase('GET','change_requests?select=*');
  console.log('change_requests total:', Array.isArray(crAll.data)?crAll.data.length:0);
  const audits = await supabase('GET','audit_logs?select=*');
  console.log('audit_logs total:', Array.isArray(audits.data)?audits.data.length:0);
}

main().then(()=>console.log('done')).catch(e=>{ console.error(e); process.exit(1)});
