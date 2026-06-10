import { supabaseAdmin } from './dist/lib/supabase.js';

async function main(){
  try{
    const { data: tenant } = await supabaseAdmin.from('tenants').insert({ name: 'Staging Tenant', slug: 'staging-tenant', status: 'active' }).select('*').single();
    console.log('tenant id=', tenant.id);
    const { data: site } = await supabaseAdmin.from('sites').insert({ tenant_id: tenant.id, name: 'Staging Site', slug: 'staging-site', domain: 'staging.example', status: 'active' }).select('*').single();
    console.log('site id=', site.id);
    const phone = '+5511955585460';
    const { data: identity } = await supabaseAdmin.from('whatsapp_identities').insert({ tenant_id: tenant.id, site_id: site.id, phone_e164: phone, display_name: 'Test WA', role: 'admin', is_active: true }).select('*').single();
    console.log('identity id=', identity.id);
  } catch(e){
    console.error('error', e);
  }
}

main().then(()=>console.log('done')).catch(e=>console.error(e));
