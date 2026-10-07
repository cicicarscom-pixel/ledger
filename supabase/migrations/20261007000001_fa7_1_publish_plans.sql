-- FA7-1 — "Videoyu yükle, Flow AI yayınlasın": veritabanı (07.10.2026, Claude; canlıya Claude uygular, dosya kayıt amaçlı).
-- Tablolar: flow_ai_media (yüklenen medya), social_format_rules (platform/biçim kuralları), flow_ai_publish_plans (yayın planı),
-- flow_ai_publish_targets (plan satırı = hesap/platform başına hedef), org_ai_autopublish (serbest kademe ayarı; FA7-5'e kadar kapalı).
-- Hepsi org_id + RLS. Yazma YALNIZ sunucu (service_role); kullanıcı yalnız kendi kaydını okur.
-- Yayınlamayı bu dosya yapmaz: onay, yayın ve zamanlama FA7-2/3'te (flow_ai_pending_actions + PostPublishService).
-- NOT: DROP/DELETE içeren komutlar MCP onay kapısında takılıyor; bu dosyada DROP yok.
-- NOT (kurallar): social_format_rules başlangıç değerleri muhafazakârdır ve platform kuralları değiştikçe güncellenir;
--   nihai karar her zaman platformundur. Uygunluk kontrolü yalnız ön elemedir.

-- 1) Yüklenen medya
create table if not exists public.flow_ai_media (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.flow_ai_conversations(id) on delete set null,
  media_type text not null check (media_type in ('video','image')),
  mime_type text not null check (char_length(mime_type) between 3 and 100),
  storage_bucket text,
  storage_path text,
  media_url text,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 5368709120),
  duration_sec numeric check (duration_sec is null or (duration_sec >= 0 and duration_sec <= 43200)),
  width int check (width is null or width between 1 and 16384),
  height int check (height is null or height between 1 and 16384),
  aspect_ratio numeric generated always as (case when width is not null and height is not null then round(width::numeric / height::numeric, 4) end) stored,
  status text not null default 'ready' check (status in ('pending','ready','rejected','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint flow_ai_media_location check (media_url is not null or (storage_bucket is not null and storage_path is not null)),
  constraint flow_ai_media_video_needs_duration check (media_type <> 'video' or duration_sec is not null)
);
create index if not exists flow_ai_media_org_user_idx on public.flow_ai_media (org_id, user_id, created_at desc);
create trigger tr_flow_ai_media_updated before update on public.flow_ai_media
  for each row execute function public.set_updated_at();

-- 2) Platform/biçim kuralları (küresel referans verisi)
create table if not exists public.social_format_rules (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform ~ '^[a-z]{2,20}$'),
  format text not null check (format ~ '^[a-z_]{2,20}$'),
  media_type text not null check (media_type in ('video','image','none')),
  min_duration_sec int check (min_duration_sec is null or min_duration_sec >= 0),
  max_duration_sec int check (max_duration_sec is null or max_duration_sec > 0),
  min_aspect numeric check (min_aspect is null or min_aspect > 0),
  max_aspect numeric check (max_aspect is null or max_aspect > 0),
  max_file_mb int check (max_file_mb is null or max_file_mb > 0),
  max_caption_chars int not null check (max_caption_chars > 0),
  is_active boolean not null default true,
  notes text,
  updated_at timestamptz not null default now(),
  unique (platform, format),
  constraint social_format_rules_ranges check (
    (min_duration_sec is null or max_duration_sec is null or min_duration_sec <= max_duration_sec)
    and (min_aspect is null or max_aspect is null or min_aspect <= max_aspect))
);
create trigger tr_social_format_rules_updated before update on public.social_format_rules
  for each row execute function public.set_updated_at();

insert into public.social_format_rules (platform, format, media_type, min_duration_sec, max_duration_sec, min_aspect, max_aspect, max_file_mb, max_caption_chars, notes) values
  ('instagram', 'reel',  'video', 3, 90,    0.50, 0.80, 1024, 2200,  'Dikey (9:16) önerilir'),
  ('youtube',   'short', 'video', 1, 180,   0.50, 1.00, 1024, 5000,  'Dikey ya da kare; açıklama alanı'),
  ('youtube',   'video', 'video', 1, 900,   0.50, 2.40, 4096, 5000,  'Doğrulanmamış hesap sınırına göre muhafazakâr (15 dk)'),
  ('tiktok',    'video', 'video', 3, 600,   0.50, 1.80, 1024, 2200,  null),
  ('facebook',  'reel',  'video', 3, 90,    0.50, 0.80, 1024, 5000,  'Dikey (9:16) önerilir'),
  ('facebook',  'video', 'video', 1, 14400, 0.40, 2.40, 4096, 5000,  null),
  ('linkedin',  'video', 'video', 3, 600,   0.40, 2.40, 512,  3000,  null),
  ('twitter',   'video', 'video', 1, 140,   0.33, 3.00, 512,  280,   null),
  ('threads',   'video', 'video', 1, 300,   0.40, 2.40, 512,  500,   null),
  ('bluesky',   'video', 'video', 1, 60,    0.40, 2.40, 100,  300,   null)
on conflict (platform, format) do nothing;

-- 3) Yayın planı
create table if not exists public.flow_ai_publish_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.flow_ai_conversations(id) on delete set null,
  media_id uuid not null references public.flow_ai_media(id) on delete restrict,
  pending_action_id uuid references public.flow_ai_pending_actions(id) on delete set null,
  mode text not null default 'approved' check (mode in ('approved','auto')),
  status text not null default 'draft' check (status in ('draft','confirmed','scheduled','publishing','done','failed','cancelled')),
  scheduled_for timestamptz,
  payload_hash text,
  idempotency_key text not null default (gen_random_uuid()::text) unique,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint flow_ai_publish_plans_confirmed_needs_hash check (
    status in ('draft','cancelled','failed') or (payload_hash is not null and confirmed_at is not null)),
  constraint flow_ai_publish_plans_scheduled_needs_time check (status <> 'scheduled' or scheduled_for is not null)
);
create index if not exists flow_ai_publish_plans_org_status_idx on public.flow_ai_publish_plans (org_id, status, created_at desc);
create index if not exists flow_ai_publish_plans_due_idx on public.flow_ai_publish_plans (scheduled_for) where status = 'scheduled';
create trigger tr_flow_ai_publish_plans_updated before update on public.flow_ai_publish_plans
  for each row execute function public.set_updated_at();

-- 4) Plan hedefleri (her hesap/platform ayrı değerlendirilir)
create table if not exists public.flow_ai_publish_targets (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.flow_ai_publish_plans(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null check (platform ~ '^[a-z]{2,20}$'),
  format text not null check (format ~ '^[a-z_]{2,20}$'),
  zernio_account_id text,
  caption text not null default '' check (char_length(caption) <= 5000),
  status text not null default 'planned' check (status in ('planned','skipped','scheduled','publishing','published','failed')),
  skip_reason text,
  external_post_id text,
  error text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, platform),
  constraint flow_ai_publish_targets_skip_reason check (status <> 'skipped' or skip_reason is not null)
);
create index if not exists flow_ai_publish_targets_plan_idx on public.flow_ai_publish_targets (plan_id);
create index if not exists flow_ai_publish_targets_org_idx on public.flow_ai_publish_targets (org_id);
create trigger tr_flow_ai_publish_targets_updated before update on public.flow_ai_publish_targets
  for each row execute function public.set_updated_at();

-- 5) Serbest kademe ayarı (varsayılan KAPALI; açma arayüzü ve "Vazgeç" penceresi FA7-5'te)
create table if not exists public.org_ai_autopublish (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  daily_limit int not null default 5 check (daily_limit between 1 and 20),
  enabled_by uuid references auth.users(id) on delete set null,
  enabled_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint org_ai_autopublish_enabled_needs_who check (not enabled or (enabled_by is not null and enabled_at is not null))
);
create trigger tr_org_ai_autopublish_updated before update on public.org_ai_autopublish
  for each row execute function public.set_updated_at();

-- RLS: yazma yalnız service_role; kullanıcı yalnız kendi kaydını okur
alter table public.flow_ai_media enable row level security;
alter table public.social_format_rules enable row level security;
alter table public.flow_ai_publish_plans enable row level security;
alter table public.flow_ai_publish_targets enable row level security;
alter table public.org_ai_autopublish enable row level security;

create policy flow_ai_media_select on public.flow_ai_media for select to authenticated
  using (org_id = public.current_org_id() and user_id = auth.uid());
create policy social_format_rules_select on public.social_format_rules for select to authenticated
  using (is_active);
create policy flow_ai_publish_plans_select on public.flow_ai_publish_plans for select to authenticated
  using (org_id = public.current_org_id() and user_id = auth.uid());
create policy flow_ai_publish_targets_select on public.flow_ai_publish_targets for select to authenticated
  using (org_id = public.current_org_id() and exists (
    select 1 from public.flow_ai_publish_plans p where p.id = plan_id and p.user_id = auth.uid()));
create policy org_ai_autopublish_select on public.org_ai_autopublish for select to authenticated
  using (org_id = public.current_org_id());

revoke all on public.flow_ai_media, public.social_format_rules, public.flow_ai_publish_plans,
  public.flow_ai_publish_targets, public.org_ai_autopublish from anon;
revoke all on public.flow_ai_media, public.social_format_rules, public.flow_ai_publish_plans,
  public.flow_ai_publish_targets, public.org_ai_autopublish from authenticated;
grant select on public.flow_ai_media, public.social_format_rules, public.flow_ai_publish_plans,
  public.flow_ai_publish_targets, public.org_ai_autopublish to authenticated;
grant all on public.flow_ai_media, public.social_format_rules, public.flow_ai_publish_plans,
  public.flow_ai_publish_targets, public.org_ai_autopublish to service_role;
