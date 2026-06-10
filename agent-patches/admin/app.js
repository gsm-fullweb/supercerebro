(function(){
  const SUPABASE_URL = window.SUPABASE_URL || null; // set by server via template or leave to client env
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || null;
  if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
    // try reading from meta or fallback to placeholder; the server serves real values in production/staging
    console.warn('Supabase keys not set in window globals. Edit admin_server to inject them, or set window.SUPABASE_URL/SUPABASE_ANON_KEY');
  }
  const supabase = supabaseJs.createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

  const emailInput = document.getElementById('email');
  const btnSignin = document.getElementById('btn-signin');
  const authStatus = document.getElementById('auth-status');
  const panel = document.getElementById('panel');
  const historyEl = document.getElementById('history');
  const messageEl = document.getElementById('message');
  const sendBtn = document.getElementById('send');

  const SITE_SLUG = 'smartcompany';

  let currentUser = null;

  btnSignin.addEventListener('click', async ()=>{
    const email = emailInput.value.trim();
    if(!email){ alert('Informe o email'); return }
    authStatus.textContent = 'Enviando magic link... verifique seu e-mail';
    const { error } = await supabase.auth.signInWithOtp({ email });
    if(error){ authStatus.textContent = 'Erro ao enviar link: '+error.message; return }
    authStatus.textContent = 'Link enviado. Abra seu e-mail para entrar.';
  });

  // check session on page load
  (async function(){
    const { data: { session } } = await supabase.auth.getSession();
    if(session && session.user){
      currentUser = session.user;
      onLogin();
    }
    // listen to auth changes
    supabase.auth.onAuthStateChange((event, session)=>{
      if(session && session.user){ currentUser = session.user; onLogin(); }
    });
  })();

  function addHistoryItem(obj){
    const el = document.createElement('div');
    el.className = 'msg';
    el.innerHTML = `<div><b>${obj.action||obj.interpreted_action||'request'}</b> <small>${obj.status||''}</small></div><div><pre>${JSON.stringify(obj.payload||obj.interpreted_payload||obj, null, 2)}</pre></div><div style="font-size:12px;color:#666">${obj.created_at||''}</div>`;
    historyEl.prepend(el);
  }

  async function loadHistory(){
    historyEl.innerHTML = '<small>Carregando...</small>';
    try{
      const res = await fetch(`/api/requests?site_slug=${encodeURIComponent(SITE_SLUG)}`);
      const data = await res.json();
      historyEl.innerHTML = '';
      data.forEach(addHistoryItem);
    }catch(e){ historyEl.innerHTML = '<div>Erro ao carregar histórico</div>'; }
  }

  async function onLogin(){
    authStatus.textContent = `Logado: ${currentUser?.email||'--'}`;
    panel.style.display = '';
    await loadHistory();
  }

  sendBtn.addEventListener('click', async ()=>{
    const message = messageEl.value.trim();
    if(!message) return;
    const payload = { site_slug: SITE_SLUG, message, user_email: currentUser?.email || null };
    // optimistic UI
    addHistoryItem({ action:'(enviando)', payload:{ message }, status:'sending', created_at: new Date().toISOString() });
    messageEl.value = '';
    try{
      const token = (await supabase.auth.getSession()).data.session?.access_token || null;
      const res = await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json', 'Authorization': token? `Bearer ${token}` : ''}, body: JSON.stringify(payload)});
      const data = await res.json();
      if(res.ok){ addHistoryItem(Object.assign({status:'ok'}, data)); }
      else { addHistoryItem({status:'error', error: data}); }
    }catch(e){ addHistoryItem({status:'error', error: e.message}); }
    // refresh history
    await loadHistory();
  });

})();
