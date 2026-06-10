create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null unique,
  domain text,
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'archived')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_identities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  phone_e164 text not null unique,
  display_name text,
  role text not null default 'owner' check (role in ('owner', 'editor', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug)
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete cascade,
  section_key text not null,
  type text not null,
  sort_order integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, section_key)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  slug text not null,
  title text not null,
  excerpt text,
  content text not null,
  category text,
  cover_media_id uuid,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  seo jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug)
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  bucket text not null,
  path text not null,
  public_url text,
  alt text,
  mime_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.posts
  add constraint posts_cover_media_id_fkey
  foreign key (cover_media_id) references public.media(id)
  on delete set null;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  label text not null,
  type text not null check (type in ('whatsapp', 'phone', 'email', 'address', 'social')),
  value text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  whatsapp_identity_id uuid references public.whatsapp_identities(id) on delete set null,
  inbound_channel text not null default 'whatsapp',
  inbound_message text not null,
  interpreted_action text,
  interpreted_payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received', 'needs_confirmation', 'approved', 'applied', 'rejected', 'failed')),
  response_to_user text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  change_request_id uuid references public.change_requests(id) on delete set null,
  actor_type text not null check (actor_type in ('user', 'agent', 'system')),
  actor_ref text,
  action text not null,
  entity_type text,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.publish_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  change_request_id uuid references public.change_requests(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'published', 'failed')),
  provider text not null default 'vercel',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sites_tenant_id on public.sites(tenant_id);
create index if not exists idx_pages_site_slug on public.pages(site_id, slug);
create index if not exists idx_sections_page_sort on public.sections(page_id, sort_order);
create index if not exists idx_posts_site_status on public.posts(site_id, status, published_at desc);
create index if not exists idx_contacts_site_type on public.contacts(site_id, type);
create index if not exists idx_change_requests_site_status on public.change_requests(site_id, status);

alter table public.tenants enable row level security;
alter table public.sites enable row level security;
alter table public.whatsapp_identities enable row level security;
alter table public.pages enable row level security;
alter table public.sections enable row level security;
alter table public.posts enable row level security;
alter table public.media enable row level security;
alter table public.contacts enable row level security;
alter table public.change_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.publish_events enable row level security;

create policy "Public can read active sites"
on public.sites for select
using (status = 'active');

create policy "Public can read published pages"
on public.pages for select
using (status = 'published');

create policy "Public can read published sections"
on public.sections for select
using (status = 'published');

create policy "Public can read published posts"
on public.posts for select
using (status = 'published');

create policy "Public can read contacts"
on public.contacts for select
using (true);

create policy "Public can read media"
on public.media for select
using (true);
