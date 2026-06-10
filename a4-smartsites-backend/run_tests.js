import { env } from './dist/config/env.js';
import { supabaseAdmin } from './dist/lib/supabase.js';
import { applyIntent } from './dist/services/content-actions.js';
import fs from 'fs';

async function resolveContext(fromPhone) {
  const phone = fromPhone.replace(/\D/g, '');
  const { data: identity } = await supabaseAdmin
    .from('whatsapp_identities')
    .select('id, tenant_id, site_id, phone_e164, display_name, role, is_active')
    .eq('phone_e164', phone.startsWith('55') ? `+${phone}` : `+55${phone}`)
    .eq('is_active', true)
    .maybeSingle();

  if (!identity) return { phone, identity: null, site: null, tenant: null };

  const { data: site } = await supabaseAdmin
    .from('sites')
    .select('id, tenant_id, name, slug, domain, status')
    .eq('status', 'active')
    .eq('id', identity.site_id)
    .single();

  if (!site) return { phone, identity, site: null, tenant: null };

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, status')
    .eq('id', site.tenant_id)
    .single();

  return { phone, identity, site, tenant };
}

async function createChangeRequest(site, tenant, identity, message) {
  const { data: changeRequest } = await supabaseAdmin
    .from('change_requests')
    .insert({
      tenant_id: tenant.id,
      site_id: site.id,
      whatsapp_identity_id: identity?.id ?? null,
      inbound_channel: 'whatsapp',
      inbound_message: message,
      status: 'received',
    })
    .select('*')
    .single();
  return changeRequest;
}

function heuristicIntent(message) {
  const lower = message.toLowerCase();
  if (/troque|mude|atualiz(e|ar)|alterar/.test(lower) && /whatsapp|zap|telefone|rodape|rodap/.test(lower)) {
    const m = message.match(/\+?[0-9][0-9\s().-]{6,}/);
    const digits = m ? m[0].replace(/\D/g, '') : null;
    return {
      action: 'update_contact',
      confidence: 0.95,
      requires_confirmation: false,
      fields: { value: digits, type: 'whatsapp' },
      response_to_user: 'Atualizando o WhatsApp do rodape',
    };
  }
  if (/rascunho|cria um post|criar rascunho|novo post/.test(lower)) {
    const titleMatch = message.match(/titulo[:\-]\s*(.+)$/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Rascunho via WhatsApp';
    return {
      action: 'create_post',
      confidence: 0.93,
      requires_confirmation: false,
      draft: { title, content: message },
      response_to_user: 'Criei um rascunho para voce.',
    };
  }
  if (/agenda|agendar|publicar em|em \d{1,2}\/\d{1,2}/.test(lower)) {
    return {
      action: 'create_post',
      confidence: 0.92,
      requires_confirmation: false,
      draft: { title: 'Post agendado', content: message },
      response_to_user: 'Agendei o post (rascunho criado).',
    };
  }
  return { action: 'unknown', confidence: 0.98, requires_confirmation: false, response_to_user: 'Nao entendi.' };
}

async function runTestCase(fromPhone, message, label) {
  console.log(`\n== Test: ${label} ==`);
  const ctx = await resolveContext(fromPhone);
  if (!ctx.site || !ctx.tenant) {
    console.log('Context not found for phone', fromPhone);
    return { error: 'context_not_found' };
  }
  const cr = await createChangeRequest(ctx.site, ctx.tenant, ctx.identity, message);
  console.log('Created change_request id=', cr.id);
  const intent = heuristicIntent(message);
  console.log('Heuristic intent:', intent.action, 'confidence=', intent.confidence);
  const result = await applyIntent({ intent, siteId: ctx.site.id, tenantId: ctx.tenant.id, changeRequestId: cr.id });
  console.log('applyIntent result:', result);

  // update change_request with interpreted intent + result
  await supabaseAdmin
    .from('change_requests')
    .update({ interpreted_action: intent.action, interpreted_payload: intent, status: result.status, response_to_user: result.message })
    .eq('id', cr.id);

  // fetch audit_logs for this CR
  const { data: audits } = await supabaseAdmin.from('audit_logs').select('*').eq('change_request_id', cr.id);
  console.log('Audit logs count:', audits.length);

  // simulate response to user
  console.log('Simulated response to user:', result.message);
  return { change_request_id: cr.id, intent, result, audits };
}

async function main(){
  const phone = '+5511955585460';
  const tests = [
    { label: 'update_contact', message: 'Troque o WhatsApp do rodape para 11 99999-9999' },
    { label: 'create_draft', message: 'Cria um rascunho: titulo: Novidades de Julho - vamos falar sobre...' },
    { label: 'schedule_post', message: 'Agenda para publicar em 10/06: Post sobre Black Friday' },
    { label: 'noop', message: 'Mensagem sem intencao clara' },
  ];

  const results = [];
  for(const t of tests){
    const r = await runTestCase(phone, t.message, t.label);
    results.push({ label: t.label, result: r });
  }

  // summary: list change_requests created in last few entries
  const { data: recent } = await supabaseAdmin.from('change_requests').select('*').order('created_at', { ascending: false }).limit(10);
  console.log('\nRecent change_requests (latest 10):');
  console.log(recent.map(r=> ({id:r.id, status:r.status, interpreted_action:r.interpreted_action, created_at:r.created_at} )));

  fs.writeFileSync('/root/.openclaw/workspace/a4-smartsites-backend/test_results.json', JSON.stringify(results, null, 2));
  console.log('\nWrote /root/.openclaw/workspace/a4-smartsites-backend/test_results.json');
}

main().then(()=>{ console.log('DONE'); process.exit(0)}).catch(e=>{ console.error(e); process.exit(1)});
