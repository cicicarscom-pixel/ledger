-- Tek müsaitlik çekirdeği + saat rezervasyonu (calendar_blocks) — 30.09.2026, Claude tarafından canlıya uygulandı.
-- Web, mobil ve WhatsApp AI müsaitliği artık aynı fonksiyondan alır (eski: üç ayrı hesap, date metni,
-- yalnız başlangıç saati karşılaştırması). Kurallar:
--   * Çalışma saati: calendars.working_hours {"mon":[["09:00","18:00"]], "sun":[] ...}; tanımsızsa 09:00–18:00 her gün
--     (bugünkü davranış). Boş dizi = o gün kapalı.
--   * Süre: hizmet(ler) → takvim → işletme → 30 dk. Adım: 30 dk.
--   * Dolu: aynı takvimde [başlangıç, bitiş) aralığı kesişen Pending/Approved randevu.
--   * Rezerve: calendar_blocks kesişmesi (calendar_id NULL = tüm klinik).
--   * Rezerve saate randevu yazılamaz (tetikleyici, exclusion_violation → mevcut SLOT_TAKEN / SLOT_ALREADY_TAKEN).
-- Kimlik: organization_id = işletme SAHİBİNİN auth user id'si (appointments/calendars ile aynı).

create table if not exists public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references auth.users(id) on delete cascade,
  calendar_id uuid references public.calendars(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null check (reason in ('meeting', 'leave', 'break', 'other')),
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint calendar_blocks_range check (ends_at > starts_at)
);
create index if not exists calendar_blocks_org_time_idx on public.calendar_blocks (organization_id, starts_at, ends_at);
alter table public.calendar_blocks enable row level security;
drop policy if exists "calendar_blocks org read" on public.calendar_blocks;
create policy "calendar_blocks org read" on public.calendar_blocks
  for select to authenticated using (organization_id = public.current_org_owner_id());
-- Yazma yalnız RPC'lerden (security definer).

-- Çalışma saatleri (gün için aralıklar)
create or replace function public._working_hours_for(p_hours jsonb, p_date date)
returns table (start_t time, end_t time) language sql immutable as $$
  with k as (select (array['mon','tue','wed','thu','fri','sat','sun'])[extract(isodow from p_date)::int] as day)
  select (r->>0)::time, (r->>1)::time
  from k, jsonb_array_elements(p_hours -> k.day) r
  where p_hours is not null and p_hours ? k.day
  union all
  select time '09:00', time '18:00'
  from k
  where p_hours is null or not (p_hours ? k.day);
$$;

-- Çekirdek: her takvim × slot için durum (iç kullanım)
create or replace function public._slot_grid(p_owner uuid, p_date date, p_calendar_id uuid default null, p_service_ids text[] default null)
returns table (
  calendar_id uuid, calendar_name text, local_time text, slot_start timestamptz, slot_end timestamptz,
  status text, block_id uuid, block_reason text, block_note text, appointment_id uuid, duration_minutes int
) language sql stable security definer set search_path = public as $$
  with org as (
    select coalesce(o.timezone, 'Europe/Istanbul') as tz, o.default_appointment_duration_minutes as d
    from public.organizations o where o.owner_id = p_owner order by o.created_at limit 1
  ),
  svc as (
    select sum(s.duration_minutes)::int as m from public.business_services s
    where s.merchant_id = p_owner and s.id::text = any(coalesce(p_service_ids, '{}'))
  ),
  cals as (
    select c.id, c.name, c.working_hours, c.default_duration_minutes
    from public.calendars c
    where c.merchant_id = p_owner and c.is_active
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
         case when s.ss < now() then 'past'
              when b.id is not null then 'blocked'
              when a.id is not null then 'booked'
              else 'free' end,
         b.id, b.reason, b.note, a.id, s.m
  from slots s
  left join lateral (
    select cb.id, cb.reason, cb.note from public.calendar_blocks cb
    where cb.organization_id = p_owner and (cb.calendar_id is null or cb.calendar_id = s.cid)
      and cb.starts_at < s.ss + make_interval(mins => s.m) and cb.ends_at > s.ss
    order by cb.starts_at limit 1
  ) b on true
  left join lateral (
    select ap.id from public.appointments ap
    where ap.organization_id = p_owner and ap.calendar_id = s.cid and ap.status in ('Pending', 'Approved')
      and ap.starts_at < s.ss + make_interval(mins => s.m) and ap.ends_at > s.ss
    limit 1
  ) a on true
  order by s.cname, s.ss;
$$;

-- Personel ekranı: gün görünümü (rezervasyon sebebi dahil)
create or replace function public.get_day_schedule(p_date date, p_calendar_id uuid default null, p_service_id text default null)
returns table (
  calendar_id uuid, calendar_name text, local_time text, slot_start timestamptz, slot_end timestamptz,
  status text, block_id uuid, block_reason text, block_note text, appointment_id uuid, duration_minutes int
) language sql stable security definer set search_path = public as $$
  select * from public._slot_grid(public.current_org_owner_id(), p_date, p_calendar_id,
                                  case when p_service_id is null then null else array[p_service_id] end);
$$;

-- Randevu penceresi: yalnız boş saatler, saat başına müsait doktorlar
create or replace function public.get_available_slots(p_date date, p_calendar_id uuid default null, p_service_id text default null)
returns table (local_time text, slot_start timestamptz, calendars jsonb)
language sql stable security definer set search_path = public as $$
  select g.local_time, min(g.slot_start),
         jsonb_agg(jsonb_build_object('id', g.calendar_id, 'name', g.calendar_name) order by g.calendar_name)
  from public._slot_grid(public.current_org_owner_id(), p_date, p_calendar_id,
                         case when p_service_id is null then null else array[p_service_id] end) g
  where g.status = 'free'
  group by g.local_time order by g.local_time;
$$;

-- WhatsApp AI (service_role): aynı sonuç, işletme sahibi parametreyle
create or replace function public.get_available_slots_for_owner(p_owner uuid, p_date date, p_service_ids text[] default null, p_calendar_id uuid default null)
returns table (local_time text, slot_start timestamptz, calendars jsonb)
language sql stable security definer set search_path = public as $$
  select g.local_time, min(g.slot_start),
         jsonb_agg(jsonb_build_object('id', g.calendar_id, 'name', g.calendar_name) order by g.calendar_name)
  from public._slot_grid(p_owner, p_date, p_calendar_id, p_service_ids) g
  where g.status = 'free'
  group by g.local_time order by g.local_time;
$$;

-- Rezerve saate randevu yazılamaz (her yol: web, mobil, AI)
create or replace function public.tr_appointments_block_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('Pending', 'Approved') and new.starts_at is not null and new.ends_at is not null
     and exists (
       select 1 from public.calendar_blocks cb
       where cb.organization_id = new.organization_id
         and (cb.calendar_id is null or cb.calendar_id = new.calendar_id)
         and cb.starts_at < new.ends_at and cb.ends_at > new.starts_at
     ) then
    raise exception 'SLOT_BLOCKED' using errcode = 'exclusion_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists tr_appointments_block_guard on public.appointments;
create trigger tr_appointments_block_guard
  before insert or update of starts_at, ends_at, calendar_id, status on public.appointments
  for each row execute function public.tr_appointments_block_guard();

-- Rezervasyon oluştur (yerel saat "YYYY-MM-DDTHH:MI", işletme saat dilimi)
create or replace function public.create_calendar_block(
  p_calendar_id uuid, p_local_start text, p_local_end text, p_reason text, p_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid := public.current_org_owner_id();
  v_tz text;
  v_ls timestamp; v_le timestamp;
  v_start timestamptz; v_end timestamptz;
  v_conflicts jsonb;
  v_id uuid;
begin
  if v_owner is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if p_reason not in ('meeting', 'leave', 'break', 'other') then return jsonb_build_object('status', 'INVALID_REASON'); end if;
  if p_local_start !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$' or p_local_end !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$' then
    return jsonb_build_object('status', 'INVALID_FORMAT');
  end if;
  v_ls := p_local_start::timestamp; v_le := p_local_end::timestamp;
  if v_le <= v_ls then return jsonb_build_object('status', 'INVALID_RANGE'); end if;
  if p_calendar_id is not null and not exists (
    select 1 from public.calendars c where c.id = p_calendar_id and c.merchant_id = v_owner and c.is_active) then
    return jsonb_build_object('status', 'INVALID_CALENDAR');
  end if;

  select coalesce(o.timezone, 'Europe/Istanbul') into v_tz from public.organizations o where o.owner_id = v_owner order by o.created_at limit 1;
  v_start := v_ls at time zone v_tz; v_end := v_le at time zone v_tz;

  -- Aralıkta aktif randevu varsa rezervasyon açılmaz; önce taşınmalı/iptal edilmeli
  select jsonb_agg(jsonb_build_object(
           'id', a.id, 'customer_name', a.customer_name, 'calendar_name', c.name,
           'local_start', to_char(a.starts_at at time zone v_tz, 'YYYY-MM-DD"T"HH24:MI')) order by a.starts_at)
    into v_conflicts
  from public.appointments a left join public.calendars c on c.id = a.calendar_id
  where a.organization_id = v_owner and a.status in ('Pending', 'Approved')
    and (p_calendar_id is null or a.calendar_id = p_calendar_id)
    and a.starts_at < v_end and a.ends_at > v_start;
  if v_conflicts is not null then
    return jsonb_build_object('status', 'CONFLICTS_WITH_APPOINTMENTS', 'appointments', v_conflicts);
  end if;

  insert into public.calendar_blocks (organization_id, calendar_id, starts_at, ends_at, reason, note)
  values (v_owner, p_calendar_id, v_start, v_end, p_reason, nullif(btrim(p_note), ''))
  returning id into v_id;
  return jsonb_build_object('status', 'SUCCESS', 'id', v_id);
end;
$$;

create or replace function public.delete_calendar_block(p_block_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if public.current_org_owner_id() is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  delete from public.calendar_blocks where id = p_block_id and organization_id = public.current_org_owner_id();
  get diagnostics v_n = row_count;
  return jsonb_build_object('status', case when v_n = 0 then 'NOT_FOUND' else 'SUCCESS' end);
end;
$$;

revoke execute on function public._slot_grid(uuid, date, uuid, text[]) from public, anon, authenticated;
revoke execute on function public.get_available_slots_for_owner(uuid, date, text[], uuid) from public, anon, authenticated;
grant execute on function public.get_available_slots_for_owner(uuid, date, text[], uuid) to service_role;
revoke execute on function public.get_day_schedule(date, uuid, text) from public, anon;
revoke execute on function public.get_available_slots(date, uuid, text) from public, anon;
revoke execute on function public.create_calendar_block(uuid, text, text, text, text) from public, anon;
revoke execute on function public.delete_calendar_block(uuid) from public, anon;
grant execute on function public.get_day_schedule(date, uuid, text) to authenticated;
grant execute on function public.get_available_slots(date, uuid, text) to authenticated;
grant execute on function public.create_calendar_block(uuid, text, text, text, text) to authenticated;
grant execute on function public.delete_calendar_block(uuid) to authenticated;
