-- One-client VibeForge Pilot: persistent process, event, draft, attribution,
-- delivery and role records. Process history is append-only.

create table if not exists public.pilot_processes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  client_key text not null default 'pilot-client',
  location_name text not null,
  product_name text not null,
  stage text not null default 'LEAD'
    check (stage in ('LEAD', 'DIALOG', 'QUOTE', 'CONTRACT', 'FULFILLMENT', 'PAYMENT')),
  chatwoot_conversation_id bigint unique,
  manager_name text,
  waiting_for text check (waiting_for in ('business', 'customer')),
  waiting_since timestamptz,
  obligation_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.process_events (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.pilot_processes(id) on delete cascade,
  event_type text not null,
  source text not null,
  actor_type text not null,
  stage_from text,
  stage_to text,
  evidence_type text,
  evidence_ref text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (source, evidence_ref)
);

create table if not exists public.reply_drafts (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.pilot_processes(id) on delete cascade,
  source_message_id text not null unique,
  content text not null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'USED', 'DISMISSED')),
  provider text,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

create table if not exists public.ad_attributions (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.pilot_processes(id) on delete cascade,
  platform text not null default 'meta',
  ad_account_id text,
  campaign_id text,
  campaign_name text,
  adset_id text,
  adset_name text,
  ad_id text,
  ad_name text,
  creative_id text,
  creative_name text,
  referral jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_deliveries (
  id uuid primary key default gen_random_uuid(),
  process_id uuid references public.pilot_processes(id) on delete cascade,
  event_id uuid references public.process_events(id) on delete set null,
  channel text not null,
  target text,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
  attempts integer not null default 0,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pilot_users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  role text not null check (role in ('owner', 'manager')),
  telegram_chat_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pilot_processes_stage_idx
  on public.pilot_processes(stage);
create index if not exists process_events_process_time_idx
  on public.process_events(process_id, occurred_at desc);
create index if not exists reply_drafts_process_status_idx
  on public.reply_drafts(process_id, status);
create index if not exists ad_attributions_process_idx
  on public.ad_attributions(process_id);
create index if not exists integration_deliveries_status_idx
  on public.integration_deliveries(status, created_at);

drop trigger if exists pilot_processes_set_updated_at on public.pilot_processes;
create trigger pilot_processes_set_updated_at
  before update on public.pilot_processes
  for each row execute function public.set_updated_at();

drop trigger if exists integration_deliveries_set_updated_at on public.integration_deliveries;
create trigger integration_deliveries_set_updated_at
  before update on public.integration_deliveries
  for each row execute function public.set_updated_at();

drop trigger if exists pilot_users_set_updated_at on public.pilot_users;
create trigger pilot_users_set_updated_at
  before update on public.pilot_users
  for each row execute function public.set_updated_at();
