-- WAHA-1 — Çoklu sunucu "otopark" modeli: veritabanı (03.10.2026, Claude; canlıya Claude uygular).
-- Oturumlar taşınmaz; sunucular fill_order sırasıyla dolar. API anahtarları DB'de tutulmaz (yalnız secret adı).

create table if not exists public.waha_servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text,                                   -- null = eski WAHA_BASE_URL secret'ı (yalnız sunucu 1)
  api_key_secret_name text not null,
  webhook_secret_name text not null,
  fill_order int not null unique,
  max_sessions int not null check (max_sessions > 0),
  warn_percent int not null default 80 check (warn_percent between 1 and 100),
  is_active boolean not null default true,
  accepting_new boolean not null default true,
  created_at timestamptz not null default now(),
  constraint waha_servers_https check (base_url is null or base_url like 'https://%')
);

create table if not exists public.waha_session_assignments (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  session_name text not null unique,
  server_id uuid not null references public.waha_servers(id),
  assigned_at timestamptz not null default now()
);
create index if not exists waha_session_assignments_server_idx on public.waha_session_assignments (server_id);

create table if not exists public.waha_server_metrics (
  id bigint generated always as identity primary key,
  server_id uuid not null references public.waha_servers(id) on delete cascade,
  measured_at timestamptz not null default now(),
  sessions_assigned int, sessions_working int, api_ok boolean, api_latency_ms int,
  cpu_percent numeric, mem_used_mb int, mem_total_mb int
);
create index if not exists waha_server_metrics_server_time_idx on public.waha_server_metrics (server_id, measured_at desc);

create table if not exists public.waha_alerts (
  id uuid primary key default gen_random_uuid(),
  server_id uuid references public.waha_servers(id) on delete cascade,
  kind text not null check (kind in ('capacity_warn','capacity_full','no_capacity','server_down','webhook_auth_failed')),
  message text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists waha_alerts_open_idx on public.waha_alerts (kind, server_id) where resolved_at is null;

-- RLS: istemcilere tamamen kapalı (politika yok). Erişim yalnız service_role ve aşağıdaki admin fonksiyonları.
alter table public.waha_servers enable row level security;
alter table public.waha_session_assignments enable row level security;
alter table public.waha_server_metrics enable row level security;
alter table public.waha_alerts enable row level security;

-- açık aynı uyarı varsa tekrar yazma
create or replace function public._waha_alert(p_server uuid, p_kind text, p_message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.waha_alerts a where a.kind = p_kind and a.server_id is not distinct from p_server and a.resolved_at is null) then
    insert into public.waha_alerts (server_id, kind, message) values (p_server, p_kind, p_message);
  end if;
end $$;

create or replace function public.assign_waha_server(p_org uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_server uuid; v_session text; v_count int; v_max int; v_warn int; v_name text;
begin
  perform pg_advisory_xact_lock(hashtext('waha_assign'));
  select server_id into v_server from public.waha_session_assignments where org_id = p_org;
  if v_server is not null then return v_server; end if;

  select o.owner_id::text into v_session from public.organizations o where o.id = p_org;
  if v_session is null then raise exception 'ORG_NOT_FOUND' using errcode = 'foreign_key_violation'; end if;

  select s.id into v_server from public.waha_servers s
   where s.is_active and s.accepting_new
     and (select count(*) from public.waha_session_assignments a where a.server_id = s.id) < s.max_sessions
   order by s.fill_order
   limit 1;
  if v_server is null then
    perform public._waha_alert(null, 'no_capacity', 'Yeni WhatsApp oturumu için boş yer yok; yeni sunucu ekleyin.');
    return null;  -- NO_CAPACITY (istisna, uyarı kaydını da geri alırdı; çağıran NULL'u NO_CAPACITY sayar)
  end if;

  insert into public.waha_session_assignments (org_id, session_name, server_id) values (p_org, v_session, v_server);

  select (select count(*) from public.waha_session_assignments a where a.server_id = s.id), s.max_sessions, s.warn_percent, s.name
    into v_count, v_max, v_warn, v_name from public.waha_servers s where s.id = v_server;
  if v_count >= v_max then
    perform public._waha_alert(v_server, 'capacity_full', v_name || ' doldu (' || v_count || '/' || v_max || ').');
  elsif v_count * 100 >= v_max * v_warn then
    perform public._waha_alert(v_server, 'capacity_warn', v_name || ' %' || v_warn || ' eşiğini aştı (' || v_count || '/' || v_max || ').');
  end if;
  return v_server;
end $$;

create or replace function public.release_waha_assignment(p_org uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.waha_session_assignments where org_id = p_org;
$$;

-- Süper admin: kapasite özeti
create or replace function public.get_waha_capacity()
returns table (id uuid, name text, fill_order int, assigned int, max_sessions int, percent int, warn_percent int,
  status text, is_active boolean, accepting_new boolean, base_url_set boolean, is_https boolean,
  last_measured_at timestamptz, sessions_working int, api_ok boolean, api_latency_ms int, cpu_percent numeric,
  mem_used_mb int, mem_total_mb int, open_alerts int, is_next boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_next uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select s.id into v_next from public.waha_servers s
   where s.is_active and s.accepting_new
     and (select count(*) from public.waha_session_assignments a where a.server_id = s.id) < s.max_sessions
   order by s.fill_order limit 1;
  return query
  select s.id, s.name, s.fill_order, c.n, s.max_sessions, (c.n * 100 / s.max_sessions)::int, s.warn_percent,
    case when not s.is_active then 'inactive'
         when m.api_ok = false then 'down'
         when c.n >= s.max_sessions then 'full'
         when c.n * 100 >= s.max_sessions * s.warn_percent then 'warn'
         else 'ok' end,
    s.is_active, s.accepting_new, s.base_url is not null, coalesce(s.base_url like 'https://%', false),
    m.measured_at, m.sessions_working, m.api_ok, m.api_latency_ms, m.cpu_percent, m.mem_used_mb, m.mem_total_mb,
    (select count(*)::int from public.waha_alerts al where al.server_id = s.id and al.resolved_at is null),
    s.id = v_next
  from public.waha_servers s
  cross join lateral (select count(*)::int as n from public.waha_session_assignments a where a.server_id = s.id) c
  left join lateral (select * from public.waha_server_metrics x where x.server_id = s.id order by x.measured_at desc limit 1) m on true
  order by s.fill_order;
end $$;

create or replace function public.get_waha_alerts(p_include_resolved boolean default false)
returns table (id uuid, server_id uuid, server_name text, kind text, message text, created_at timestamptz, resolved_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return query
  select a.id, a.server_id, s.name, a.kind, a.message, a.created_at, a.resolved_at
  from public.waha_alerts a left join public.waha_servers s on s.id = a.server_id
  where p_include_resolved or a.resolved_at is null
  order by a.created_at desc limit 200;
end $$;

create or replace function public.get_waha_metrics(p_server uuid, p_days int default 7)
returns table (measured_at timestamptz, sessions_assigned int, sessions_working int, api_ok boolean, api_latency_ms int,
  cpu_percent numeric, mem_used_mb int, mem_total_mb int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return query
  select x.measured_at, x.sessions_assigned, x.sessions_working, x.api_ok, x.api_latency_ms, x.cpu_percent, x.mem_used_mb, x.mem_total_mb
  from public.waha_server_metrics x
  where x.server_id = p_server and x.measured_at > now() - make_interval(days => least(greatest(p_days, 1), 30))
  order by x.measured_at;
end $$;

-- Süper admin: sunucu ekle/güncelle (anahtar DEĞERİ almaz; yalnız secret adı)
create or replace function public.admin_upsert_waha_server(
  p_id uuid, p_name text, p_base_url text, p_api_key_secret_name text, p_webhook_secret_name text,
  p_fill_order int, p_max_sessions int, p_warn_percent int default 80)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_base_url is null or p_base_url not like 'https://%' then raise exception 'HTTPS_REQUIRED' using errcode = '22023'; end if;
  if p_api_key_secret_name !~ '^[A-Z][A-Z0-9_]{2,63}$' or p_webhook_secret_name !~ '^[A-Z][A-Z0-9_]{2,63}$' then
    raise exception 'INVALID_SECRET_NAME' using errcode = '22023';
  end if;
  if p_id is null then
    insert into public.waha_servers (name, base_url, api_key_secret_name, webhook_secret_name, fill_order, max_sessions, warn_percent)
    values (btrim(p_name), btrim(p_base_url), p_api_key_secret_name, p_webhook_secret_name, p_fill_order, p_max_sessions, p_warn_percent)
    returning id into v_id;
  else
    update public.waha_servers set name = btrim(p_name), base_url = btrim(p_base_url), api_key_secret_name = p_api_key_secret_name,
      webhook_secret_name = p_webhook_secret_name, fill_order = p_fill_order, max_sessions = p_max_sessions, warn_percent = p_warn_percent
    where id = p_id returning id into v_id;
    if v_id is null then raise exception 'NOT_FOUND'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.admin_set_waha_server_flags(p_id uuid, p_is_active boolean default null,
  p_accepting_new boolean default null, p_max_sessions int default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.waha_servers set
    is_active = coalesce(p_is_active, is_active),
    accepting_new = coalesce(p_accepting_new, accepting_new),
    max_sessions = coalesce(p_max_sessions, max_sessions)
  where id = p_id;
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

create or replace function public.admin_resolve_waha_alert(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.waha_alerts set resolved_at = now() where id = p_id and resolved_at is null;
end $$;

-- Yetkiler
revoke all on function public._waha_alert(uuid, text, text) from public, anon, authenticated;
revoke all on function public.assign_waha_server(uuid) from public, anon, authenticated;
revoke all on function public.release_waha_assignment(uuid) from public, anon, authenticated;
grant execute on function public.assign_waha_server(uuid) to service_role;
grant execute on function public.release_waha_assignment(uuid) to service_role;
revoke all on function public.get_waha_capacity() from public, anon;
revoke all on function public.get_waha_alerts(boolean) from public, anon;
revoke all on function public.get_waha_metrics(uuid, int) from public, anon;
revoke all on function public.admin_upsert_waha_server(uuid, text, text, text, text, int, int, int) from public, anon;
revoke all on function public.admin_set_waha_server_flags(uuid, boolean, boolean, int) from public, anon;
revoke all on function public.admin_resolve_waha_alert(uuid) from public, anon;
grant execute on function public.get_waha_capacity() to authenticated;
grant execute on function public.get_waha_alerts(boolean) to authenticated;
grant execute on function public.get_waha_metrics(uuid, int) to authenticated;
grant execute on function public.admin_upsert_waha_server(uuid, text, text, text, text, int, int, int) to authenticated;
grant execute on function public.admin_set_waha_server_flags(uuid, boolean, boolean, int) to authenticated;
grant execute on function public.admin_resolve_waha_alert(uuid) to authenticated;

-- Başlangıç verisi: bugünkü sunucu = sunucu 1 (adres eski WAHA_BASE_URL secret'ından); bütün işletmeler ona atanır.
insert into public.waha_servers (name, base_url, api_key_secret_name, webhook_secret_name, fill_order, max_sessions, warn_percent)
select 'WAHA-1 (mevcut)', null, 'WAHA_API_KEY', 'WAHA_WEBHOOK_SECRET_1', 1, 550, 80
where not exists (select 1 from public.waha_servers where fill_order = 1);

insert into public.waha_session_assignments (org_id, session_name, server_id)
select o.id, o.owner_id::text, (select id from public.waha_servers where fill_order = 1)
from public.organizations o
where o.owner_id is not null
on conflict (org_id) do nothing;
