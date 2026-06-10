-- down_001_initial_schema.sql
-- Rollback for 001_initial_schema.sql

-- Note: Run only after verifying you have a backup (pg_dump) and are certain
-- this rollback is intended. Prefer renaming tables to keep data for auditing.

-- Drop triggers (if exist)
DROP TRIGGER IF EXISTS set_timestamp_on_change_requests ON change_requests;
DROP TRIGGER IF EXISTS set_timestamp_on_posts ON posts;
DROP TRIGGER IF EXISTS set_timestamp_on_site_contacts ON site_contacts;

-- Drop trigger function
DROP FUNCTION IF EXISTS trigger_set_timestamp();

-- Drop indexes (optional; DROP TABLE will drop them too)
DROP INDEX IF EXISTS idx_phones_site_slug;
DROP INDEX IF EXISTS idx_change_requests_site_slug;
DROP INDEX IF EXISTS idx_audit_logs_site_slug;
DROP INDEX IF EXISTS idx_posts_site_slug;

-- Drop tables (order matters: dependent objects first)
DROP TABLE IF EXISTS site_contacts;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS change_requests;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS phones;

-- (Optional) drop extension if not used elsewhere
DROP EXTENSION IF EXISTS pgcrypto;
