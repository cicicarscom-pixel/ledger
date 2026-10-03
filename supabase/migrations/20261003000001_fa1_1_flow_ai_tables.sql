-- FA1-1 — Flow AI tabloları (03.10.2026, Claude; canlıya Claude uygular, dosya kayıt amaçlı).
-- Flow AI (işletme sahibinin asistanı) ≠ Ledger AI ≠ müşteri asistanı: bu tablolar yalnız Flow AI'a aittir.
-- Kimlik: org_id = organizations.id (current_org_id()). İstemciden kimlik alınmaz.
-- NOT: Canlıya parça parça uygulandı (apply_migration/execute_sql, DROP içeren komutlar MCP onay kapısında takılıyor);
--      bu dosya canlıda uygulanan son hâliyle aynıdır (DROP ... IF EXISTS satırları çıkarıldı).
-- Yazma ilkesi:
--   * Konuşma ve mesajları kullanıcı kendi JWT'siyle yazar/okur (yalnız kendi konuşması).
--   * Bekleyen eylemler (onay kapısı) ve kullanım kayıtlarını YALNIZ sunucu (service_role) yazar:
--     istemci kendi eylemini "approved" yapamaz; dış etkili işlem sunucuda onay uç noktasından geçer.

-- 1) Konuşmalar
create table if not exists public.flow_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  channel text not null default 'mobile' check (channel in ('mobile','web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);
create index if not exists flow_ai_conversations_org_user_idx on public.flow_ai_conversations (org_id, user_id, created_at desc);
create trigger tr_flow_ai_conversations_updated before update on public.flow_ai_conversations
  for each row execute function public.set_updated_at();

-- 2) Mesajlar
create table if not exists public.flow_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.flow_ai_conversations(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool','system')),
  content text,
  tool_name text,
  tool_args jsonb,
  tool_result jsonb,
  created_at timestamptz not null default now()
);
create index if not exists flow_ai_messages_conv_idx on public.flow_ai_messages (conversation_id, created_at);
create index if not exists flow_ai_messages_org_idx on public.flow_ai_messages (org_id, created_at desc);

-- 3) Bekleyen eylemler (onay kapısı)
create table if not exists public.flow_ai_pending_actions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.flow_ai_conversations(id) on delete set null,
  tool_name text not null,
  risk_level text not null check (risk_level in ('READ','PREPARE','EXTERNAL_ACTION')),
  args jsonb not null default '{}'::jsonb,
  preview jsonb,
  payload_hash text not null,          -- onaylanan içerik değiştiyse çalıştırma reddedilir
  status text not null default 'pending' check (status in ('pending','approved','rejected','executed','failed','expired')),
  result jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  decided_at timestamptz,
  executed_at timestamptz
);
create index if not exists flow_ai_pending_actions_org_status_idx on public.flow_ai_pending_actions (org_id, user_id, status, created_at desc);

-- 4) Kullanım olayları (günlük sınır + maliyet ölçümü)
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  source text not null check (source in ('flow_ai','flow_caption','whatsapp','social')),
  event_type text not null,            -- ör. 'message', 'tool_call', 'caption'
  conversation_id uuid references public.flow_ai_conversations(id) on delete set null,
  model text,
  input_tokens integer,
  output_tokens integer,
  tool_calls integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_events_org_day_idx on public.ai_usage_events (org_id, source, created_at desc);

-- 5) RLS
alter table public.flow_ai_conversations enable row level security;
alter table public.flow_ai_messages enable row level security;
alter table public.flow_ai_pending_actions enable row level security;
alter table public.ai_usage_events enable row level security;

-- Konuşmalar: yalnız kendi konuşması (aynı işletme + aynı kullanıcı)
create policy flow_ai_conversations_select on public.flow_ai_conversations for select to authenticated
  using (org_id = public.current_org_id() and user_id = auth.uid());
create policy flow_ai_conversations_insert on public.flow_ai_conversations for insert to authenticated
  with check (org_id = public.current_org_id() and user_id = auth.uid());
create policy flow_ai_conversations_update on public.flow_ai_conversations for update to authenticated
  using (org_id = public.current_org_id() and user_id = auth.uid())
  with check (org_id = public.current_org_id() and user_id = auth.uid());
create policy flow_ai_conversations_delete on public.flow_ai_conversations for delete to authenticated
  using (org_id = public.current_org_id() and user_id = auth.uid());

-- Mesajlar: yalnız kendi konuşmasının mesajı; değiştirilemez/silinemez (konuşma silinince kaskad)
create policy flow_ai_messages_select on public.flow_ai_messages for select to authenticated
  using (org_id = public.current_org_id() and exists (
    select 1 from public.flow_ai_conversations c where c.id = conversation_id and c.user_id = auth.uid() and c.org_id = flow_ai_messages.org_id));
create policy flow_ai_messages_insert on public.flow_ai_messages for insert to authenticated
  with check (org_id = public.current_org_id() and role in ('user') and exists (
    select 1 from public.flow_ai_conversations c where c.id = conversation_id and c.user_id = auth.uid() and c.org_id = flow_ai_messages.org_id));

-- Bekleyen eylemler: istemci yalnız okur (karar/çalıştırma sunucuda, service_role)
create policy flow_ai_pending_actions_select on public.flow_ai_pending_actions for select to authenticated
  using (org_id = public.current_org_id() and user_id = auth.uid());

-- Kullanım: işletme kendi kullanımını okur; yazma yalnız sunucu
create policy ai_usage_events_select on public.ai_usage_events for select to authenticated
  using (org_id = public.current_org_id());

-- 6) Yetkiler: anon hiçbir şey; authenticated yalnız politikaların izin verdiği kadar
revoke all on public.flow_ai_conversations, public.flow_ai_messages, public.flow_ai_pending_actions, public.ai_usage_events from anon;
revoke all on public.flow_ai_pending_actions, public.ai_usage_events from authenticated;
grant select on public.flow_ai_pending_actions, public.ai_usage_events to authenticated;
revoke all on public.flow_ai_messages from authenticated;
grant select, insert on public.flow_ai_messages to authenticated;
revoke all on public.flow_ai_conversations from authenticated;
grant select, insert, update, delete on public.flow_ai_conversations to authenticated;
grant all on public.flow_ai_conversations, public.flow_ai_messages, public.flow_ai_pending_actions, public.ai_usage_events to service_role;
