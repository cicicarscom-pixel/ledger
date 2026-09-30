-- _slot_grid durum önceliği: blocked > booked > past > free (Claude, 30.09.2026 akşam; canlıya uygulandı).
-- Önceden 'past' ilk kontrol ediliyordu: saati geçen randevular ve rezervasyonlar ızgarada kayboluyor,
-- geçmiş günlerde hiçbir randevu görünmüyordu. Boş saat listeleri (status = 'free') etkilenmez;
-- geçmişteki boş saatler yine 'past'.
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
         case when b.id is not null then 'blocked'
              when a.id is not null then 'booked'
              when s.ss < now() then 'past'
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

revoke execute on function public._slot_grid(uuid, date, uuid, text[]) from public, anon, authenticated;
