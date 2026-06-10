import { SupabaseClient } from '@supabase/supabase-js';

export async function executeChangeRequest(supabase: SupabaseClient, changeRequestId: string) {
  // Load the change request
  const { data: crRows, error: crErr } = await supabase
    .from('change_requests')
    .select('*')
    .eq('id', changeRequestId)
    .limit(1)
    .single();

  if (crErr) throw crErr;
  const cr: any = crRows;

  if (!cr) throw new Error('change_request not found');
  if (cr.status && (cr.status === 'completed' || cr.status === 'completed_auto')) {
    return { ok: false, reason: 'already_completed' };
  }

  const action = cr.action;
  const payload = cr.payload || {};
  let txSucceeded = false;
  let executionResult: any = { started_at: new Date().toISOString() };

  try {
    if (action === 'update_contact') {
      // Upsert site_contacts (site_slug, key='whatsapp_footer')
      const key = payload.field || 'whatsapp_footer';
      const value = payload.value || null;
      if (!value) throw new Error('no value to update');

      // Try upsert via supabase
      const { error: upsertErr } = await supabase
        .from('site_contacts')
        .upsert({ site_slug: cr.site_slug, key, value }, { onConflict: '(site_slug,key)' });
      if (upsertErr) throw upsertErr;
      executionResult.updated = { key, value };
      txSucceeded = true;
    } else if (action === 'create_draft') {
      const title = payload.title || 'Rascunho via WhatsApp';
      const body = payload.body || '';
      const { data: postData, error: postErr } = await supabase
        .from('posts')
        .insert([{ site_slug: cr.site_slug, title, body, status: 'draft' }])
        .select('*')
        .limit(1)
        .single();
      if (postErr) throw postErr;
      executionResult.post = postData;
      txSucceeded = true;
    } else if (action === 'schedule_post') {
      // naive schedule: insert as scheduled post if payload contains scheduled_at
      const title = payload.title || 'Agendado via WhatsApp';
      const body = payload.body || payload.raw || '';
      const scheduled_at = payload.scheduled_at || null;
      const insertObj: any = { site_slug: cr.site_slug, title, body, status: scheduled_at ? 'scheduled' : 'draft' };
      if (scheduled_at) insertObj.scheduled_at = scheduled_at;
      const { data: postData, error: postErr } = await supabase.from('posts').insert([insertObj]).select('*').limit(1).single();
      if (postErr) throw postErr;
      executionResult.post = postData;
      txSucceeded = true;
    } else {
      throw new Error('action not implemented by executor');
    }

    // mark change_request as completed
    const { error: updateErr } = await supabase
      .from('change_requests')
      .update({ status: txSucceeded ? 'completed' : 'failed', auto_executed: true, execution_result: executionResult })
      .eq('id', changeRequestId);
    if (updateErr) throw updateErr;

    // audit log
    await supabase.from('audit_logs').insert([
      { site_slug: cr.site_slug, event: 'change_request_executed', details: { change_request_id: changeRequestId, action, executionResult } },
    ]);

    return { ok: true, result: executionResult };
  } catch (err: any) {
    // update change_request as failed
    await supabase.from('change_requests').update({ status: 'failed', execution_result: { error: err.message, stack: err.stack } }).eq('id', changeRequestId);
    await supabase.from('audit_logs').insert([
      { site_slug: cr.site_slug, event: 'change_request_execution_failed', details: { change_request_id: changeRequestId, error: err.message } },
    ]);
    return { ok: false, error: err.message };
  }
}
