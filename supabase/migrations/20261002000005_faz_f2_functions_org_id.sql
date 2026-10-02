-- FAZ F2 — Veritabanı fonksiyonları org_id ile (02.10.2026, Claude; canlıya Claude uygular, dosya kayıt amaçlı).
-- Dış imzalar DEĞİŞMEZ: ekranlar ve WhatsApp asistanı aynı fonksiyonları aynı parametrelerle çağırır.
-- Yeni kod (Flow AI dahil) için: _slot_grid_org(p_org, ...) ve get_available_slots_for_org(p_org, ...).

-- 0) Eşitleme tetikleyicisi HER ZAMAN ilk çalışmalı (BEFORE tetikleyiciler ada göre alfabetik sırayla çalışır;
--    tr_appointments_block_guard, tr_sync_org_id'den önce geliyordu → org_id henüz boşken koruma çalışırdı).
do $$
declare t text;
begin
  foreach t in array array['calendars','appointments','customers','ai_communication_logs','bot_settings','organization_ai_settings','calendar_blocks','business_services','appointment_services','waha_sessions'] loop
    execute format('drop trigger if exists tr_sync_org_id on public.%I', t);
    execute format('drop trigger if exists a00_sync_org_id on public.%I', t);
    execute format('create trigger a00_sync_org_id before insert or update on public.%I for each row execute function public.tr_sync_org_id(%L)', t,
      case when t in ('appointments','customers','calendar_blocks','appointment_services') then 'organization_id' else 'merchant_id' end);
  end loop;
end $$;

-- 1) Müşteri tekilliği org_id ile de
create unique index if not exists customers_org_id_phone_key on public.customers (org_id, phone);

-- 2) Müsaitlik çekirdeği: asıl uygulama org ile
create or replace function public._slot_grid_org(p_org uuid, p_date date, p_calendar_id uuid default null, p_service_ids text[] default null)
returns table (
  calendar_id uuid, calendar_name text, local_time text, slot_start timestamptz, slot_end timestamptz,
  status text, block_id uuid, block_reason text, block_note text, appointment_id uuid, duration_minutes int
) language sql stable security definer set search_path = public as $$
  with org as (
    select coalesce(o.timezone, 'Europe/Istanbul') as tz, o.default_appointment_duration_minutes as d
    from public.organizations o where o.id = p_org
  ),
  svc as (
    select sum(s.duration_minutes)::int as m from public.business_services s
    where s.org_id = p_org and s.id::text = any(coalesce(p_service_ids, '{}'))
  ),
  cals as (
    select c.id, c.name, c.working_hours, c.default_duration_minutes
    from public.calendars c
    where c.org_id = p_org and c.is_active
      and (p_calendar_id is null or c.id = p_calendar_id)
      and (coalesce(array_length(p_service_ids, 1), 0) = 0
           or not exists (select 1 from public.calendar_services cs where cs.calendar_id = c.id)
           or exists (select 1 from public.calendar_services cs where cs.calendar_id = c.id and cs.service_id::text = any(p_service_ids)))
  ),
  slots as (
    select c.id as cid, c.name as cname, dur.m, t as local_ts,
           (t at time zone (select tz from org)) as ss
    from cals c
    cross join lateral (select coalesce(nullif((select m from svc), 0), c.default_duration_minutes, (select d from org), 30)::int as m) dur
    cross join lateral public._working_hours_for(c.working_hours, p_date) h
    cross join lateral generate_series(p_date + h.start_t, p_date + h.end_t - make_interval(mins => dur.m), interval '30 minutes') t
  )
  select s.cid, s.cname, to_char(s.local_ts, 'HH24:MI'), s.ss, s.ss + make_interval(mins => s.m),
         case when b.id is not null then 'blocked'
              when a.id is not null then 'booked'
              when s.ss < now() then 'past'
              else 'free' end,
         b.id, b.reason, b.note, a.id, s.m
  from slots s
  left join lateral (
    select cb.id, cb.reason, cb.note from public.calendar_blocks cb
    where cb.org_id = p_org and (cb.calendar_id is null or cb.calendar_id = s.cid)
      and cb.starts_at < s.ss + make_interval(mins => s.m) and cb.ends_at > s.ss
    order by cb.starts_at limit 1
  ) b on true
  left join lateral (
    select ap.id from public.appointments ap
    where ap.org_id = p_org and ap.calendar_id = s.cid and ap.status in ('Pending', 'Approved')
      and ap.starts_at < s.ss + make_interval(mins => s.m) and ap.ends_at > s.ss
    limit 1
  ) a on true
  order by s.cname, s.ss;
$$;
revoke execute on function public._slot_grid_org(uuid, date, uuid, text[]) from public, anon, authenticated;

-- eski imza: sahibin kimliği → işletme → _slot_grid_org (F5'te kaldırılacak)
create or replace function public._slot_grid(p_owner uuid, p_date date, p_calendar_id uuid default null, p_service_ids text[] default null)
returns table (
  calendar_id uuid, calendar_name text, local_time text, slot_start timestamptz, slot_end timestamptz,
  status text, block_id uuid, block_reason text, block_note text, appointment_id uuid, duration_minutes int
) language sql stable security definer set search_path = public as $$
  select * from public._slot_grid_org((select o.id from public.organizations o where o.owner_id = p_owner), p_date, p_calendar_id, p_service_ids);
$$;
revoke execute on function public._slot_grid(uuid, date, uuid, text[]) from public, anon, authenticated;

create or replace function public.get_day_schedule(p_date date, p_calendar_id uuid default null, p_service_id text default null)
returns table (
  calendar_id uuid, calendar_name text, local_time text, slot_start timestamptz, slot_end timestamptz,
  status text, block_id uuid, block_reason text, block_note text, appointment_id uuid, duration_minutes int
) language sql stable security definer set search_path = public as $$
  select * from public._slot_grid_org(public.current_org_id(), p_date, p_calendar_id,
    case when p_service_id is null then null else array[p_service_id] end);
$$;

create or replace function public.get_available_slots(p_date date, p_calendar_id uuid default null, p_service_id text default null)
returns table (local_time text, slot_start timestamptz, calendars jsonb)
language sql stable security definer set search_path = public as $$
  select g.local_time, min(g.slot_start),
         jsonb_agg(jsonb_build_object('id', g.calendar_id, 'name', g.calendar_name) order by g.calendar_name)
  from public._slot_grid_org(public.current_org_id(), p_date, p_calendar_id,
    case when p_service_id is null then null else array[p_service_id] end) g
  where g.status = 'free'
  group by g.local_time order by g.local_time;
$$;

-- yeni kod (Flow AI, F3 sonrası WhatsApp) için; yalnız sunucu
create or replace function public.get_available_slots_for_org(p_org uuid, p_date date, p_service_ids text[] default null, p_calendar_id uuid default null)
returns table (local_time text, slot_start timestamptz, calendars jsonb)
language sql stable security definer set search_path = public as $$
  select g.local_time, min(g.slot_start),
         jsonb_agg(jsonb_build_object('id', g.calendar_id, 'name', g.calendar_name) order by g.calendar_name)
  from public._slot_grid_org(p_org, p_date, p_calendar_id, p_service_ids) g
  where g.status = 'free'
  group by g.local_time order by g.local_time;
$$;
revoke execute on function public.get_available_slots_for_org(uuid, date, text[], uuid) from public, anon, authenticated;
grant execute on function public.get_available_slots_for_org(uuid, date, text[], uuid) to service_role;

-- eski imza (WhatsApp asistanı bugün bunu çağırıyor; F3'te _for_org'a geçecek)
create or replace function public.get_available_slots_for_owner(p_owner uuid, p_date date, p_service_ids text[] default null, p_calendar_id uuid default null)
returns table (local_time text, slot_start timestamptz, calendars jsonb)
language sql stable security definer set search_path = public as $$
  select * from public.get_available_slots_for_org((select o.id from public.organizations o where o.owner_id = p_owner), p_date, p_service_ids, p_calendar_id);
$$;

-- 3) Rezervasyon
create or replace function public.create_calendar_block(
  p_calendar_id uuid, p_local_start text, p_local_end text, p_reason text, p_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := public.current_org_id();
  v_tz text;
  v_ls timestamp; v_le timestamp;
  v_start timestamptz; v_end timestamptz;
  v_conflicts jsonb;
  v_id uuid;
begin
  if v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if p_reason not in ('meeting', 'leave', 'break', 'other') then return jsonb_build_object('status', 'INVALID_REASON'); end if;
  if p_local_start !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$' or p_local_end !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$' then
    return jsonb_build_object('status', 'INVALID_FORMAT');
  end if;
  v_ls := p_local_start::timestamp; v_le := p_local_end::timestamp;
  if v_le <= v_ls then return jsonb_build_object('status', 'INVALID_RANGE'); end if;
  if p_calendar_id is not null and not exists (
    select 1 from public.calendars c where c.id = p_calendar_id and c.org_id = v_org and c.is_active) then
    return jsonb_build_object('status', 'INVALID_CALENDAR');
  end if;

  select coalesce(o.timezone, 'Europe/Istanbul') into v_tz from public.organizations o where o.id = v_org;
  v_start := v_ls at time zone v_tz; v_end := v_le at time zone v_tz;

  if exists (
    select 1 from public.calendar_blocks cb
    where cb.org_id = v_org
      and (cb.calendar_id is not distinct from p_calendar_id or cb.calendar_id is null)
      and cb.starts_at < v_end and cb.ends_at > v_start
  ) then
    return jsonb_build_object('status', 'ALREADY_BLOCKED');
  end if;

  select jsonb_agg(jsonb_build_object(
           'id', a.id, 'customer_name', a.customer_name, 'calendar_name', c.name,
           'local_start', to_char(a.starts_at at time zone v_tz, 'YYYY-MM-DD"T"HH24:MI')) order by a.starts_at)
    into v_conflicts
  from public.appointments a left join public.calendars c on c.id = a.calendar_id
  where a.org_id = v_org and a.status in ('Pending', 'Approved')
    and (p_calendar_id is null or a.calendar_id = p_calendar_id)
    and a.starts_at < v_end and a.ends_at > v_start;
  if v_conflicts is not null then
    return jsonb_build_object('status', 'CONFLICTS_WITH_APPOINTMENTS', 'appointments', v_conflicts);
  end if;

  insert into public.calendar_blocks (org_id, calendar_id, starts_at, ends_at, reason, note)
  values (v_org, p_calendar_id, v_start, v_end, p_reason, nullif(btrim(p_note), ''))
  returning id into v_id;
  return jsonb_build_object('status', 'SUCCESS', 'id', v_id);
end;
$$;

create or replace function public.delete_calendar_block(p_block_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if public.current_org_id() is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  delete from public.calendar_blocks where id = p_block_id and org_id = public.current_org_id();
  get diagnostics v_n = row_count;
  return jsonb_build_object('status', case when v_n = 0 then 'NOT_FOUND' else 'SUCCESS' end);
end;
$$;

-- 4) Tetikleyiciler
create or replace function public.tr_appointments_block_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('Pending', 'Approved') and new.starts_at is not null and new.ends_at is not null and exists (
    select 1 from public.calendar_blocks cb
    where cb.org_id = new.org_id and (cb.calendar_id is null or cb.calendar_id = new.calendar_id)
      and cb.starts_at < new.ends_at and cb.ends_at > new.starts_at
  ) then
    raise exception 'SLOT_BLOCKED' using errcode = 'exclusion_violation';
  end if;
  return new;
end;
$$;

create or replace function public.tr_appointment_ensure_customer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.org_id is not null and public.canonical_phone(new.customer_phone) is not null then
    insert into public.customers (org_id, phone, name)
    values (new.org_id, public.canonical_phone(new.customer_phone), nullif(btrim(new.customer_name), ''))
    on conflict (org_id, phone) do update set name = coalesce(public.customers.name, excluded.name);
  end if;
  return new;
end;
$$;

create or replace function public.auto_link_new_calendar_to_services()
returns trigger language plpgsql set search_path = public as $$
begin
  insert into public.calendar_services (calendar_id, service_id)
  select new.id, bs.id from public.business_services bs where bs.org_id = new.org_id
  on conflict (calendar_id, service_id) do nothing;
  return new;
end;
$$;

create or replace function public.auto_link_new_service_to_calendars()
returns trigger language plpgsql set search_path = public as $$
begin
  insert into public.calendar_services (calendar_id, service_id)
  select c.id, new.id from public.calendars c where c.org_id = new.org_id
  on conflict (calendar_id, service_id) do nothing;
  return new;
end;
$$;

create or replace function public.notify_new_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cal text;
  v_tz text := coalesce(new.timezone, 'Europe/Istanbul');
begin
  if new.source is distinct from 'whatsapp' or new.org_id is null then return new; end if;
  select name into v_cal from public.calendars where id = new.calendar_id;
  insert into public.notifications (profile_id, title, message, type, metadata)
  values (new.org_id, 'Yeni randevu',
    coalesce(new.customer_name, 'Bir müşteri') || ' randevu aldı · ' || to_char(new.starts_at at time zone v_tz, 'DD.MM.YYYY HH24:MI') || coalesce(' · ' || v_cal, ''),
    'appointment_created',
    jsonb_build_object('appointment_id', new.id, 'customer_name', new.customer_name, 'starts_at', new.starts_at, 'timezone', v_tz,
      'calendar_name', v_cal, 'customer_request_raw', new.customer_request_raw, 'source', new.source));
  return new;
exception when others then
  raise warning 'notify_new_appointment failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

-- 5) Randevu yazma (auth.uid() = sahip varsayımı kalktı; çalışan üyeler de kullanabilir)
create or replace function public.create_manual_appointment(
  p_local_start text, p_customer_name text, p_customer_phone text, p_calendar_id uuid default null,
  p_service_id text default null, p_request_raw text default null, p_source text default 'web', p_allow_customer_overlap boolean default false
) returns jsonb language plpgsql set search_path = public as $$
declare
  v_org uuid := public.current_org_id();
  v_tz text; v_org_dur int; v_cal_id uuid; v_cal_dur int; v_cal_count int; v_svc_dur int; v_dur int;
  v_local timestamp; v_start timestamptz; v_end timestamptz; v_id uuid;
  v_phone text := trim(coalesce(p_customer_phone, ''));
  v_name text := trim(coalesce(p_customer_name, ''));
  v_service text := nullif(trim(coalesce(p_service_id, '')), '');
begin
  if auth.uid() is null or v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if v_name = '' or v_phone = '' then
    return jsonb_build_object('status', 'CUSTOMER_REQUIRED', 'message', 'Müşteri adı ve telefonu zorunludur.');
  end if;
  if p_local_start is null or p_local_start !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$' then
    return jsonb_build_object('status', 'INVALID_FORMAT');
  end if;
  begin v_local := p_local_start::timestamp;
  exception when others then return jsonb_build_object('status', 'INVALID_FORMAT'); end;

  select o.timezone, o.default_appointment_duration_minutes into v_tz, v_org_dur from public.organizations o where o.id = v_org;
  v_tz := coalesce(v_tz, 'Europe/Istanbul');
  v_start := v_local at time zone v_tz;
  if (v_start at time zone v_tz) <> v_local then return jsonb_build_object('status', 'INVALID_LOCAL_TIME'); end if;

  if p_calendar_id is not null then
    select c.id, c.default_duration_minutes into v_cal_id, v_cal_dur from public.calendars c
     where c.id = p_calendar_id and c.org_id = v_org and c.is_active;
    if not found then return jsonb_build_object('status', 'INVALID_CALENDAR'); end if;
  else
    select count(*) into v_cal_count from public.calendars c where c.org_id = v_org and c.is_active;
    if v_cal_count <> 1 then return jsonb_build_object('status', 'CALENDAR_REQUIRED'); end if;
    select c.id, c.default_duration_minutes into v_cal_id, v_cal_dur from public.calendars c where c.org_id = v_org and c.is_active;
  end if;

  if v_service is not null then
    select s.duration_minutes into v_svc_dur from public.business_services s where s.id::text = v_service and s.org_id = v_org;
    if not found then return jsonb_build_object('status', 'INVALID_SERVICE'); end if;
  end if;

  v_dur := coalesce(nullif(v_svc_dur, 0), v_cal_dur, v_org_dur, 30);
  v_end := v_start + make_interval(mins => v_dur);

  if not p_allow_customer_overlap and exists (
    select 1 from public.appointments a
    where a.org_id = v_org and a.customer_phone = v_phone and a.status::text in ('Pending', 'Approved')
      and a.starts_at < v_end and a.ends_at > v_start
  ) then
    return jsonb_build_object('status', 'CUSTOMER_TIME_CONFLICT');
  end if;

  begin
    insert into public.appointments (org_id, customer_phone, customer_name, service_id, calendar_id, starts_at, ends_at,
                                     timezone, status, booking_token, customer_request_raw, source)
    values (v_org, v_phone, v_name, v_service, v_cal_id, v_start, v_end, v_tz, 'Pending', gen_random_uuid(),
            nullif(trim(coalesce(p_request_raw, '')), ''), case when p_source in ('web', 'mobile') then p_source else 'web' end)
    returning id into v_id;
  exception when exclusion_violation then
    return jsonb_build_object('status', 'SLOT_TAKEN');
  end;

  return jsonb_build_object('status', 'SUCCESS', 'appointment_id', v_id, 'starts_at', v_start, 'ends_at', v_end,
                            'timezone', v_tz, 'duration_minutes', v_dur, 'calendar_id', v_cal_id);
end;
$$;

create or replace function public.cancel_appointment(p_appointment_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.current_org_id(); v_row public.appointments%rowtype;
begin
  if auth.uid() is null or v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  select * into v_row from public.appointments where id = p_appointment_id and org_id = v_org for update;
  if not found then return jsonb_build_object('status', 'NOT_FOUND'); end if;
  if v_row.status::text = 'Cancelled' then return jsonb_build_object('status', 'ALREADY_CANCELLED'); end if;
  update public.appointments
     set status = 'Cancelled', cancelled_at = now(), cancelled_by = 'business',
         cancel_reason = nullif(trim(coalesce(p_reason, '')), '')
   where id = p_appointment_id;
  return jsonb_build_object('status', 'SUCCESS', 'appointment_id', p_appointment_id);
end;
$$;

create or replace function public.delete_appointment(p_appointment_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.current_org_id(); v_notifs int;
begin
  if auth.uid() is null or v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  perform 1 from public.appointments where id = p_appointment_id and org_id = v_org for update;
  if not found then return jsonb_build_object('status', 'NOT_FOUND'); end if;
  delete from public.notifications where metadata->>'appointment_id' = p_appointment_id::text;
  get diagnostics v_notifs = row_count;
  delete from public.appointment_services where appointment_id = p_appointment_id;
  delete from public.appointments where id = p_appointment_id;
  return jsonb_build_object('status', 'SUCCESS', 'appointment_id', p_appointment_id, 'deleted_notifications', v_notifs);
end;
$$;

-- 6) Müşteriler
create or replace function public.get_customers()
returns table(id uuid, name text, phone text, phone_display text, source text, notes text, created_at timestamptz,
  total integer, upcoming integer, past integer, cancelled integer, next_starts_at timestamptz, next_doctor text,
  next_request text, last_visit_at timestamptz, last_request text)
language sql stable security definer set search_path = public as $$
  with org as (select public.current_org_id() as id),
  a as (
    select ap.*, public.normalize_phone(ap.customer_phone) as pkey, cal.name as doctor
    from public.appointments ap left join public.calendars cal on cal.id = ap.calendar_id
    where ap.org_id = (select id from org)
  )
  select c.id, c.name, c.phone, public.format_phone_display(c.phone),
    case when exists (select 1 from a where a.pkey = public.normalize_phone(c.phone) and a.source = 'whatsapp') then 'whatsapp' else 'manual' end,
    c.notes, c.created_at,
    (select count(*) from a where a.pkey = public.normalize_phone(c.phone))::int,
    (select count(*) from a where a.pkey = public.normalize_phone(c.phone) and a.status in ('Pending','Approved') and a.starts_at >= now())::int,
    (select count(*) from a where a.pkey = public.normalize_phone(c.phone) and a.status in ('Pending','Approved') and a.starts_at < now())::int,
    (select count(*) from a where a.pkey = public.normalize_phone(c.phone) and a.status = 'Cancelled')::int,
    n.starts_at, n.doctor, n.customer_request_raw,
    (select max(a.starts_at) from a where a.pkey = public.normalize_phone(c.phone) and a.status in ('Pending','Approved') and a.starts_at < now()),
    (select a.customer_request_raw from a where a.pkey = public.normalize_phone(c.phone) and a.customer_request_raw is not null order by a.created_at desc limit 1)
  from public.customers c
  left join lateral (
    select a.starts_at, a.doctor, a.customer_request_raw from a
    where a.pkey = public.normalize_phone(c.phone) and a.status in ('Pending','Approved') and a.starts_at >= now()
    order by a.starts_at limit 1
  ) n on true
  where c.org_id = (select id from org)
  order by n.starts_at nulls last, c.created_at desc;
$$;

create or replace function public.get_customer_appointments(p_customer_id uuid)
returns table(id uuid, starts_at timestamptz, ends_at timestamptz, timezone text, doctor text, request text, status text, source text)
language sql stable security definer set search_path = public as $$
  select ap.id, ap.starts_at, ap.ends_at, ap.timezone, cal.name, ap.customer_request_raw, ap.status::text, ap.source
  from public.customers c
  join public.appointments ap on ap.org_id = c.org_id and public.normalize_phone(ap.customer_phone) = public.normalize_phone(c.phone)
  left join public.calendars cal on cal.id = ap.calendar_id
  where c.id = p_customer_id and c.org_id = public.current_org_id()
  order by ap.starts_at desc;
$$;

create or replace function public.update_customer_notes(p_customer_id uuid, p_notes text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if public.current_org_id() is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  update public.customers set notes = nullif(btrim(p_notes), ''), updated_at = now()
   where id = p_customer_id and org_id = public.current_org_id();
  get diagnostics v_n = row_count;
  return jsonb_build_object('status', case when v_n = 0 then 'NOT_FOUND' else 'SUCCESS' end);
end;
$$;

create or replace function public.create_customer(p_name text, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.current_org_id(); v_phone text := public.canonical_phone(p_phone); v_id uuid;
begin
  if v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if coalesce(btrim(p_name), '') = '' then return jsonb_build_object('status', 'NAME_REQUIRED'); end if;
  if v_phone is null or length(public.normalize_phone(p_phone)) < 10 then return jsonb_build_object('status', 'INVALID_PHONE'); end if;
  select id into v_id from public.customers where org_id = v_org and phone = v_phone;
  if v_id is not null then return jsonb_build_object('status', 'ALREADY_EXISTS', 'id', v_id); end if;
  insert into public.customers (org_id, phone, name) values (v_org, v_phone, btrim(p_name)) returning id into v_id;
  return jsonb_build_object('status', 'SUCCESS', 'id', v_id);
end;
$$;
