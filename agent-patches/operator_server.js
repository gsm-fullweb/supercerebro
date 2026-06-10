import http from 'http';
import fs from 'fs';

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

async function listPending(){
  const r = await supabase('GET','change_requests?select=*&or=(status.eq.pending,status.eq.pending_review)');
  if(r.status !== 200) return [];
  return r.data;
}

async function performApproval(id){
  // fetch change_request
  const rr = await supabase('GET',`change_requests?select=*&id=eq.${encodeURIComponent(id)}`);
  if(rr.status !== 200 || !Array.isArray(rr.data) || !rr.data.length) throw new Error('not found');
  const cr = rr.data[0];
  const action = cr.action;
  const payload = cr.payload || {};
  const site = cr.site_slug;
  // simple executor for safe actions
  if(action === 'update_contact'){
    await supabase('PATCH', `site_contacts?site_slug=eq.${encodeURIComponent(site)}&key=eq.whatsapp_footer`, { value: payload.value });
    await supabase('POST','audit_logs',{site_slug:site,event:'operator_approved_update_contact',details:{id}});
    await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(id)}`, { status:'completed', auto_executed:false, execution_result:{approved:true} });
    return { ok:true };
  }
  if(action === 'create_draft'){
    const post = await supabase('POST','posts',{site_slug:site,title:payload.title||'Rascunho',body:payload.body||'',status:'draft'});
    await supabase('POST','audit_logs',{site_slug:site,event:'operator_approved_create_draft',details:{id}});
    await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(id)}`, { status:'completed', auto_executed:false, execution_result:{approved:true} });
    return { ok:true };
  }
  // default: mark completed
  await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(id)}`, { status:'completed', auto_executed:false, execution_result:{approved:true} });
  await supabase('POST','audit_logs',{site_slug:site,event:'operator_approved_generic',details:{id}});
  return { ok:true };
}

async function performRejection(id){
  const rr = await supabase('GET',`change_requests?select=*&id=eq.${encodeURIComponent(id)}`);
  if(rr.status !== 200 || !Array.isArray(rr.data) || !rr.data.length) throw new Error('not found');
  const cr = rr.data[0];
  const site = cr.site_slug;
  await supabase('PATCH', `change_requests?id=eq.${encodeURIComponent(id)}`, { status:'rejected' });
  await supabase('POST','audit_logs',{site_slug:site,event:'operator_rejected',details:{id}});
  return { ok:true };
}

const server = http.createServer(async (req,res)=>{
  try{
    if(req.method==='GET' && req.url === '/'){
      const html = fs.readFileSync('./operator-panel.html','utf8');
      res.writeHead(200,{'Content-Type':'text/html'}); res.end(html); return;
    }
    if(req.method==='GET' && req.url.startsWith('/api/change_requests')){
      const list = await listPending();
      res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify(list)); return;
    }
    if(req.method==='POST' && req.url.match(/^\/api\/change_requests\/[^\/]+\/approve$/)){
      const id = decodeURIComponent(req.url.split('/')[3]);
      const r = await performApproval(id);
      res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify(r)); return;
    }
    if(req.method==='POST' && req.url.match(/^\/api\/change_requests\/[^\/]+\/reject$/)){
      const id = decodeURIComponent(req.url.split('/')[3]);
      const r = await performRejection(id);
      res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify(r)); return;
    }
    res.writeHead(404); res.end('not found');
  }catch(e){
    res.writeHead(500,{'Content-Type':'application/json'}); res.end(JSON.stringify({error:e.message}));
  }
});

server.listen(4040, '127.0.0.1', ()=> console.log('Operator server listening on http://127.0.0.1:4040'));
