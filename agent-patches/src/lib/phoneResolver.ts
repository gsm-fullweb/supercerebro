import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function resolveSiteFromPhone(phone: string): Promise<string | null> {
  // Normalize phone (simple)
  const normalized = phone.replace(/[^0-9+]/g, '');

  // Try Supabase lookup first
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('phones')
        .select('site_slug')
        .eq('phone', normalized)
        .limit(1)
        .single();
      if (error) {
        // table might not exist yet
        return null;
      }
      return (data && data.site_slug) || null;
    } catch (err) {
      return null;
    }
  }

  // Fallback to local config file: ./config/phones.json
  try {
    const confPath = path.resolve(process.cwd(), 'config', 'phones.json');
    if (fs.existsSync(confPath)) {
      const raw = fs.readFileSync(confPath, 'utf-8');
      const obj = JSON.parse(raw);
      if (obj[normalized]) return obj[normalized];
      // support array of mappings
      if (Array.isArray(obj)) {
        const found = obj.find((p: any) => (p.phone || '').replace(/[^0-9+]/g, '') === normalized);
        return (found && found.site_slug) || null;
      }
    }
  } catch (err) {
    // ignore
  }

  return null;
}
