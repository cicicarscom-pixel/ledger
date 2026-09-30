-- Block çakışmasını engelle
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

  if exists (
    select 1 from public.calendar_blocks b
    where b.organization_id = v_owner
      and (p_calendar_id is null or b.calendar_id = p_calendar_id or b.calendar_id is null)
      and b.starts_at < v_end and b.ends_at > v_start
  ) then
    return jsonb_build_object('status', 'ALREADY_BLOCKED');
  end if;

  -- Aralkta aktif randevu varsa rezervasyon almaz; nce tanmal/iptal edilmeli
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
