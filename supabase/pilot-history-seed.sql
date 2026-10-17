-- Synthetic, data-only history for the single-client pilot.
-- Safe to rerun: deterministic identifiers make every insert idempotent.
-- Historical rows never create a business-overdue signal. Real incoming
-- WhatsApp processes remain the only source of glowing threads.

create temp table pilot_demo_seed on commit drop as
with raw as (
  select
    i,
    mod(i - 1, 16) as stage_bucket,
    mod(i - 1, 9) as campaign_bucket,
    case
      when i <= 10 then now() - make_interval(mins => 120 + i * 53)
      when i <= 28 then now() - make_interval(hours => 12 + (i - 10) * 7)
      else now() - make_interval(days => 8 + mod(i * 17, 250), hours => mod(i, 19))
    end as created_at
  from generate_series(1, 96) as series(i)
), classified as (
  select
    *,
    case
      when stage_bucket <= 1 then 0
      when stage_bucket <= 4 then 1
      when stage_bucket <= 7 then 2
      when stage_bucket <= 10 then 3
      when stage_bucket <= 13 then 4
      else 5
    end as stage_ix
  from raw
)
select
  i,
  ('a1000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid as lead_id,
  ('b1000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid as process_id,
  ('d1000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid as conversation_id,
  case stage_ix
    when 0 then 'LEAD'
    when 1 then 'DIALOG'
    when 2 then 'QUOTE'
    when 3 then 'CONTRACT'
    when 4 then 'FULFILLMENT'
    else 'PAYMENT'
  end as stage,
  stage_ix,
  case mod(i - 1, 4)
    when 0 then 'Абая'
    when 1 then 'Mega'
    when 2 then 'Орбита'
    else 'Туран'
  end as location_name,
  case
    when campaign_bucket <= 2 then 'Окна'
    when campaign_bucket <= 5 then 'Двери'
    else 'Балконы'
  end as product_name,
  case campaign_bucket
    when 0 then 'Reels · Тепло без переплат'
    when 1 then 'Карусель · Окна: до и после'
    when 2 then 'WhatsApp · Расчёт окон в чате'
    when 3 then 'Reels · Тихая дверь за 1 день'
    when 4 then 'Stories · Бесплатный замер двери'
    when 5 then 'Instagram Direct · Дверь под ваш интерьер'
    when 6 then 'Карусель · Балкон: было / стало'
    when 7 then 'Stories · Тёплый балкон за 7 дней'
    else 'WhatsApp · Расчёт балкона в чате'
  end as creative_name,
  case mod(i - 1, 5)
    when 0 then 'Данияр К.'
    when 1 then 'Аскар Б.'
    when 2 then 'Айдана С.'
    when 3 then 'Марат Н.'
    else 'Жанна Т.'
  end as manager_name,
  created_at,
  least(
    now() - interval '15 minutes',
    created_at + case stage_ix
      when 0 then make_interval(mins => 20 + mod(i * 19, 180))
      when 1 then make_interval(hours => 3 + mod(i * 7, 42))
      when 2 then make_interval(days => 2 + mod(i * 5, 9), hours => mod(i * 3, 20))
      when 3 then make_interval(days => 7 + mod(i * 7, 22), hours => mod(i * 5, 20))
      when 4 then make_interval(days => 18 + mod(i * 11, 40), hours => mod(i * 7, 20))
      else make_interval(days => 28 + mod(i * 13, 65), hours => mod(i * 9, 20))
    end
  ) as updated_at
from classified;

insert into public.leads (
  id, whatsapp_phone, whatsapp_name, customer_name, status, current_state,
  ai_enabled, manager_takeover, assigned_manager, lead_temperature,
  pain_summary, need_summary, qualification_confidence, city, created_at, updated_at
)
select
  lead_id,
  null,
  'Демо-клиент ' || lpad(i::text, 3, '0'),
  'Демо-клиент ' || lpad(i::text, 3, '0'),
  stage,
  stage,
  true,
  false,
  case when stage_ix = 0 then null else manager_name end,
  case when stage_ix = 0 and mod(i, 2) = 0 then 'cold'
       when stage_ix <= 1 then 'warm'
       else 'hot' end,
  case when stage_ix = 0 then null
       when mod(i, 3) = 0 then 'Высокие теплопотери и сквозняки'
       when mod(i, 3) = 1 then 'Шум с улицы и слабая изоляция'
       else 'Нужно обновить конструкцию до сезона' end,
  case when stage_ix = 0 then null
       when product_name = 'Окна' then 'Новые окна с замером и монтажом'
       when product_name = 'Двери' then 'Надёжная дверь с установкой'
       else 'Остекление и утепление балкона' end,
  least(0.98, 0.28 + stage_ix * 0.13 + mod(i, 7) * 0.015),
  'Алматы',
  created_at,
  updated_at
from pilot_demo_seed
on conflict (id) do nothing;

insert into public.conversations (id, lead_id, created_at, updated_at)
select conversation_id, lead_id, created_at, updated_at
from pilot_demo_seed
on conflict (id) do nothing;

insert into public.pilot_processes (
  id, lead_id, client_key, location_name, product_name, stage,
  manager_name, waiting_for, waiting_since, obligation_due_at,
  created_at, updated_at, channel, external_conversation_id
)
select
  process_id,
  lead_id,
  'pilot-client',
  location_name,
  product_name,
  stage,
  case when stage_ix = 0 then null else manager_name end,
  case when stage_ix < 5 and mod(i, 3) <> 0 then 'customer' else null end,
  case when stage_ix < 5 and mod(i, 3) <> 0 then updated_at else null end,
  null,
  created_at,
  updated_at,
  'whatsapp',
  'demo-history-' || lpad(i::text, 3, '0')
from pilot_demo_seed
on conflict (id) do nothing;

insert into public.ad_attributions (
  id, process_id, platform, ad_account_id, campaign_id, campaign_name,
  adset_id, adset_name, ad_id, ad_name, creative_id, creative_name,
  referral, created_at
)
select
  ('e1000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  process_id,
  'meta',
  'demo-ad-account',
  'demo-campaign-' || lpad((campaign_bucket + 1)::text, 2, '0'),
  product_name || ' · заявки',
  'demo-adset-' || lpad((campaign_bucket + 1)::text, 2, '0'),
  location_name || ' · 25–55',
  'demo-ad-' || lpad(i::text, 3, '0'),
  creative_name,
  'demo-creative-' || lpad((campaign_bucket + 1)::text, 2, '0'),
  creative_name,
  jsonb_build_object('synthetic', true, 'seed', 'pilot-history-v1'),
  created_at
from (
  select seed.*, mod(i - 1, 9) as campaign_bucket
  from pilot_demo_seed seed
) attributed
on conflict (id) do nothing;

insert into public.messages (
  id, conversation_id, external_message_id, sender_type, message_type,
  text, delivery_status, created_at
)
select
  ('d2000000-0000-4000-8000-' || lpad((seed.i * 10 + msg.step)::text, 12, '0'))::uuid,
  seed.conversation_id,
  'demo-history-' || lpad(seed.i::text, 3, '0') || '-message-' || msg.step,
  case msg.step when 1 then 'CLIENT' when 2 then 'MANAGER' else 'SYSTEM' end,
  'TEXT',
  case msg.step
    when 1 then 'Синтетическая запись: клиент описал задачу.'
    when 2 then 'Синтетическая запись: менеджер подтвердил следующий шаг.'
    else 'Синтетическая запись: этап процесса обновлён.'
  end,
  'delivered',
  seed.created_at + ((seed.updated_at - seed.created_at) * (msg.step::numeric / 4))
from pilot_demo_seed seed
cross join generate_series(1, 3) as msg(step)
on conflict (id) do nothing;

insert into public.process_events (
  id, process_id, event_type, source, actor_type, stage_from, stage_to,
  evidence_type, evidence_ref, metadata, occurred_at, created_at
)
select
  ('c1000000-0000-4000-8000-' || lpad((seed.i * 10 + event.step)::text, 12, '0'))::uuid,
  seed.process_id,
  case event.step
    when 0 then 'LEAD_CREATED'
    when 1 then 'CUSTOMER_MESSAGE_RECEIVED'
    when 2 then 'QUOTE_SENT'
    when 3 then 'CONTRACT_SENT'
    when 4 then 'FULFILLMENT_STARTED'
    else 'PAYMENT_RECEIVED'
  end,
  case event.step
    when 0 then 'Meta Ads'
    when 1 then 'WhatsApp'
    when 2 then 'WhatsApp'
    when 3 then 'Документы'
    when 4 then 'Telegram'
    else 'Kaspi'
  end,
  case event.step when 0 then 'SYSTEM' when 1 then 'CLIENT' else 'MANAGER' end,
  case event.step
    when 0 then null
    when 1 then 'LEAD'
    when 2 then 'DIALOG'
    when 3 then 'QUOTE'
    when 4 then 'CONTRACT'
    else 'FULFILLMENT'
  end,
  case event.step
    when 0 then 'LEAD'
    when 1 then 'DIALOG'
    when 2 then 'QUOTE'
    when 3 then 'CONTRACT'
    when 4 then 'FULFILLMENT'
    else 'PAYMENT'
  end,
  'synthetic_seed',
  'demo-history-' || lpad(seed.i::text, 3, '0') || '-event-' || event.step,
  jsonb_build_object('synthetic', true, 'seed', 'pilot-history-v1'),
  seed.created_at + ((seed.updated_at - seed.created_at) * ((event.step + 1)::numeric / (seed.stage_ix + 2))),
  seed.created_at + ((seed.updated_at - seed.created_at) * ((event.step + 1)::numeric / (seed.stage_ix + 2)))
from pilot_demo_seed seed
cross join lateral generate_series(0, seed.stage_ix) as event(step)
on conflict (id) do nothing;

insert into public.process_events (
  id, process_id, event_type, source, actor_type, stage_from, stage_to,
  evidence_type, evidence_ref, metadata, occurred_at, created_at
)
select
  ('c2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  process_id,
  case when mod(i, 2) = 0 then 'QUOTE_REVISION_REQUESTED' else 'CONTRACT_REVISION_REQUESTED' end,
  'WhatsApp',
  'CLIENT',
  case when mod(i, 2) = 0 then 'QUOTE' else 'CONTRACT' end,
  case when mod(i, 2) = 0 then 'DIALOG' else 'QUOTE' end,
  'synthetic_seed',
  'demo-history-' || lpad(i::text, 3, '0') || '-revision',
  jsonb_build_object('synthetic', true, 'reason', 'Запрошены правки'),
  created_at + ((updated_at - created_at) * 0.62),
  created_at + ((updated_at - created_at) * 0.62)
from pilot_demo_seed
where stage_ix >= 2 and mod(i, 7) = 0
on conflict (id) do nothing;

insert into public.quotes (
  id, lead_id, quote_number, subtotal, extras_total, installation_total,
  dismantling_total, delivery_total, grand_total, min_estimate, max_estimate,
  status, valid_until, created_at
)
select
  ('f1000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  lead_id,
  'DEMO-' || lpad(i::text, 4, '0'),
  280000 + mod(i * 47000, 1100000),
  20000 + mod(i * 9000, 120000),
  65000 + mod(i * 7000, 95000),
  case when mod(i, 2) = 0 then 35000 else 0 end,
  case when mod(i, 3) = 0 then 25000 else 0 end,
  400000 + mod(i * 61000, 1450000),
  360000 + mod(i * 57000, 1250000),
  440000 + mod(i * 68000, 1650000),
  case when stage_ix = 2 then 'SENT' when stage_ix < 5 then 'ACCEPTED' else 'PAID' end,
  created_at + interval '21 days',
  created_at + ((updated_at - created_at) * 0.45)
from pilot_demo_seed
where stage_ix >= 2
on conflict (id) do nothing;

insert into public.measurements (
  id, lead_id, status, measurement_date, measurement_time,
  measurement_address, measurer_name, manager_comment, created_at, updated_at
)
select
  ('a2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  lead_id,
  case when stage_ix = 3 then 'PLANNED' else 'COMPLETED' end,
  (created_at + interval '5 days')::date,
  (time '10:00' + make_interval(mins => mod(i, 12) * 30))::time,
  location_name || ' · демонстрационный объект',
  case when mod(i, 2) = 0 then 'Ермек А.' else 'Сергей П.' end,
  'Синтетическая история пилота',
  created_at + interval '2 days',
  updated_at
from pilot_demo_seed
where stage_ix >= 3
on conflict (id) do nothing;

insert into public.reply_drafts (
  id, process_id, source_message_id, content, status, provider, model,
  input_tokens, output_tokens, estimated_cost_usd, created_at,
  resolved_at, resolved_by
)
select
  ('a3000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  process_id,
  'demo-history-' || lpad(i::text, 3, '0') || '-ai-draft',
  'Синтетический AI-черновик: уточнить параметры и подтвердить следующий шаг.',
  'USED',
  'openai',
  'demo-model',
  420 + mod(i * 17, 280),
  90 + mod(i * 11, 80),
  0.0008 + mod(i, 9) * 0.0001,
  created_at + interval '35 minutes',
  created_at + interval '50 minutes',
  manager_name
from pilot_demo_seed
where stage_ix >= 1 and mod(i, 2) = 0
on conflict (id) do nothing;
