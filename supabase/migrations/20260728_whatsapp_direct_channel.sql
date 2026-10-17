-- Direct WhatsApp Cloud API conversations coexist with legacy Chatwoot rows.
-- The external id is namespaced by channel and tenant to keep webhook delivery idempotent.

alter table public.pilot_processes
  add column if not exists channel text not null default 'chatwoot',
  add column if not exists external_conversation_id text;

update public.pilot_processes
set external_conversation_id = coalesce(
  external_conversation_id,
  chatwoot_conversation_id::text,
  lead_id::text
)
where external_conversation_id is null;

alter table public.pilot_processes
  alter column external_conversation_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pilot_processes_channel_check'
      and conrelid = 'public.pilot_processes'::regclass
  ) then
    alter table public.pilot_processes
      add constraint pilot_processes_channel_check
      check (channel in ('chatwoot', 'whatsapp'));
  end if;
end
$$;

create unique index if not exists pilot_processes_external_conversation_idx
  on public.pilot_processes(client_key, channel, external_conversation_id);

create index if not exists pilot_processes_channel_stage_idx
  on public.pilot_processes(channel, stage);

