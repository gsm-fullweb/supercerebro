-- 001_seed_phones.sql
-- Seed inicial: número central da plataforma (exemplo)
INSERT INTO phones (phone, site_slug, role, authorized_by, active)
VALUES ('+5511999999999','smartcompany','owner','seed', true)
ON CONFLICT (phone) DO UPDATE SET site_slug = EXCLUDED.site_slug, role = EXCLUDED.role, authorized_by = EXCLUDED.authorized_by, active = EXCLUDED.active;
