-- VibeForge Window Assistant — initial Supabase schema
create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  whatsapp_phone text,
  whatsapp_name text,
  customer_name text,
  status text not null default 'NEW',
  current_state text,
  ai_enabled boolean not null default true,
  manager_takeover boolean not null default false,
  assigned_manager text,
  twenty_person_id text unique,
  lead_temperature text not null default 'cold' check (lead_temperature in ('cold', 'warm', 'hot')),
  pain_summary text,
  need_summary text,
  qualification_confidence numeric(4,3),
  city text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads add column if not exists twenty_person_id text;
alter table public.leads add column if not exists lead_temperature text not null default 'cold';
alter table public.leads add column if not exists pain_summary text;
alter table public.leads add column if not exists need_summary text;
alter table public.leads add column if not exists qualification_confidence numeric(4,3);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  external_message_id text unique,
  sender_type text not null check (sender_type in ('CLIENT', 'AI', 'MANAGER', 'SYSTEM')),
  message_type text not null default 'TEXT',
  text text,
  media_url text,
  transcription text,
  delivery_status text,
  created_at timestamptz not null default now()
);

create table if not exists public.window_configurations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  object_type text,
  window_type text,
  quantity integer check (quantity is null or quantity > 0),
  width_mm integer check (width_mm is null or width_mm > 0),
  height_mm integer check (height_mm is null or height_mm > 0),
  profile_material text,
  sash_count integer check (sash_count is null or sash_count > 0),
  opening_sashes integer check (opening_sashes is null or opening_sashes >= 0),
  opening_type text,
  opening_direction text,
  profile_color text,
  glass_type text,
  mosquito_net boolean not null default false,
  window_sill boolean not null default false,
  slopes boolean not null default false,
  dismantling boolean not null default false,
  installation boolean not null default true,
  delivery boolean not null default false,
  comment text,
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_photos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  original_url text not null,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  window_type text,
  sash_count integer check (sash_count is null or sash_count > 0),
  opening_type text,
  profile_material text,
  available_colors jsonb not null default '[]'::jsonb,
  available_glass_types jsonb not null default '[]'::jsonb,
  transparent_image_url text,
  preview_image_url text,
  base_price_per_m2 numeric(12,2) check (base_price_per_m2 is null or base_price_per_m2 >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_selections (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  selected_color text,
  selected_glass_type text,
  selected_options jsonb not null default '{}'::jsonb,
  visualization_url text,
  visualization_transform jsonb,
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.selection_links (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.product_selections add column if not exists visualization_transform jsonb;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  quote_number text not null unique,
  subtotal numeric(12,2) not null default 0,
  extras_total numeric(12,2) not null default 0,
  installation_total numeric(12,2) not null default 0,
  dismantling_total numeric(12,2) not null default 0,
  delivery_total numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  min_estimate numeric(12,2),
  max_estimate numeric(12,2),
  pdf_url text,
  status text not null default 'DRAFT',
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.quotes add column if not exists dismantling_total numeric(12,2) not null default 0;

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  status text not null default 'PLANNED',
  measurement_date date,
  measurement_time time,
  measurement_address text,
  measurer_name text,
  manager_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  actor_type text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.pricing_settings (
  id text primary key default 'default' check (id = 'default'),
  rules jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.pricing_settings (id, rules) values ('default', '{"profiles":{"standard":55000,"reinforced":68000,"aluminum":95000},"glass":{"standard":0,"energySaving":12000,"soundproof":18000,"tinted":15000},"openingSash":20000,"mosquitoNet":15000,"windowSill":12000,"slopes":25000,"dismantling":15000,"installation":25000,"delivery":20000,"minimumOrder":90000,"rangePercent":15}'::jsonb) on conflict (id) do nothing;

create index if not exists conversations_lead_id_idx on public.conversations(lead_id);
create unique index if not exists conversations_lead_id_unique_idx on public.conversations(lead_id);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists customer_photos_lead_id_idx on public.customer_photos(lead_id);
create index if not exists product_selections_lead_id_idx on public.product_selections(lead_id);
create index if not exists selection_links_lead_id_idx on public.selection_links(lead_id);
create index if not exists quotes_lead_id_idx on public.quotes(lead_id);
create index if not exists measurements_lead_id_idx on public.measurements(lead_id);
create unique index if not exists measurements_lead_id_unique_idx on public.measurements(lead_id);
create index if not exists audit_logs_lead_id_idx on public.audit_logs(lead_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_updated_at();
drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at before update on public.conversations for each row execute function public.set_updated_at();
drop trigger if exists window_configurations_set_updated_at on public.window_configurations;
create trigger window_configurations_set_updated_at before update on public.window_configurations for each row execute function public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists product_selections_set_updated_at on public.product_selections;
create trigger product_selections_set_updated_at before update on public.product_selections for each row execute function public.set_updated_at();
drop trigger if exists measurements_set_updated_at on public.measurements;
create trigger measurements_set_updated_at before update on public.measurements for each row execute function public.set_updated_at();
drop trigger if exists pricing_settings_set_updated_at on public.pricing_settings;
create trigger pricing_settings_set_updated_at before update on public.pricing_settings for each row execute function public.set_updated_at();
