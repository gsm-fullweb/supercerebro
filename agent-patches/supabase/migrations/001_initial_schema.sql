-- 001_initial_schema.sql
-- Minimal schema for SmartSites A4IA

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- phones: map phone -> site_slug
CREATE TABLE IF NOT EXISTS phones (
  phone text PRIMARY KEY,
  site_slug text NOT NULL,
  role text,
  authorized_by text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- change_requests: record agent commands and orchestration metadata
CREATE TABLE IF NOT EXISTS change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_slug text NOT NULL,
  from_phone text,
  action text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending, pending_review, completed, completed_auto, failed
  pending_review boolean DEFAULT false,
  confidence numeric,
  requires_approval boolean DEFAULT false,
  auto_executed boolean DEFAULT false,
  execution_result jsonb,
  suggested_command text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- audit_logs: append-only event log
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_slug text,
  event text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- site_contacts: key-value for site-specific contact info (whatsapp, phone, email)
CREATE TABLE IF NOT EXISTS site_contacts (
  id serial PRIMARY KEY,
  site_slug text NOT NULL,
  key text NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (site_slug, key)
);

-- posts: simple content model for drafts & posts
CREATE TABLE IF NOT EXISTS posts (
  id serial PRIMARY KEY,
  site_slug text NOT NULL,
  title text,
  body text,
  status text DEFAULT 'draft', -- draft|published|scheduled
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_phones_site_slug ON phones(site_slug);
CREATE INDEX IF NOT EXISTS idx_change_requests_site_slug ON change_requests(site_slug);
CREATE INDEX IF NOT EXISTS idx_audit_logs_site_slug ON audit_logs(site_slug);
CREATE INDEX IF NOT EXISTS idx_posts_site_slug ON posts(site_slug);

-- Function to keep updated_at current
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_on_change_requests
BEFORE UPDATE ON change_requests
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_on_posts
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_on_site_contacts
BEFORE UPDATE ON site_contacts
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
