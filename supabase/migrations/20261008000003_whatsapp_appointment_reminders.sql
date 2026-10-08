-- WhatsApp randevu hatırlatma: ayarlar, gönderim kaydı, talep (claim) ve sonuç fonksiyonları.
-- Gönderimi `appointment-reminders` Edge Function yapar (pg_cron ile tetiklenir; cron AYRI migration'da, fonksiyon deploy edildikten sonra).
-- Varsayılan KAPALI: işletme açmadıkça hiçbir mesaj gitmez.

alter table public.organizations
  add column if not exists whatsapp_reminders_enabled boolean not null default false,
  add column if not exists reminder_hours_before integer not null default 24
    check (reminder_hours_before between 1 and 72);

create table if not exists public.appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  kind text not null default '24h',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id, kind)
);
create index if not exists appointment_reminders_org_idx on public.appointment_reminders (org_id, created_at desc);
alter table public.appointment_reminders enable row level security;
-- Politika YOK: yalnız service_role (RLS'i aşar) okur/yazar.
revoke all on table public.appointment_reminders from anon, authenticated;

-- Gönderilecek hatırlatmaları talep eder. p_dry=true ise yalnız listeler (kayıt açmaz).
-- Kurallar: yalnız Approved randevu; işletme açmış; hesap askıda/banlı değil; randevuya en az 2 saat var ve
-- "hours_before" penceresine girmiş; işletme saatiyle 09:00-20:59 arası; aynı randevuya aynı tür bir kez
-- (başarısız olursa 15 dk sonra en fazla 3 deneme).
create or replace function public.claim_due_reminders(p_limit integer default 30, p_dry boolean default false)
 returns table(reminder_id uuid, org_id uuid, org_name text, owner_id uuid, appointment_id uuid, customer_name text,
               phone_digits text, starts_at timestamptz, timezone text, doctor text, service text)
 language plpgsql security definer set search_path to 'public'
as $function$
#variable_conflict use_column
begin
  if p_dry then
    return query
    select null::uuid, ap.org_id, o.name, o.owner_id, ap.id, ap.customer_name, public.normalize_phone(ap.customer_phone),
           ap.starts_at, coalesce(o.timezone, 'Europe/Istanbul'), cal.name, bs.name
    from public.appointments ap
    join public.organizations o on o.id = ap.org_id and o.whatsapp_reminders_enabled
    left join public.profiles pr on pr.id = o.owner_id
    left join public.calendars cal on cal.id = ap.calendar_id
    left join public.business_services bs on bs.id::text = ap.service_id
    where ap.status = 'Approved'
      and ap.starts_at > now() + interval '2 hours'
      and ap.starts_at <= now() + make_interval(hours => o.reminder_hours_before)
      and coalesce(pr.account_status::text, 'active') not in ('suspended', 'banned')
      and extract(hour from (now() at time zone coalesce(o.timezone, 'Europe/Istanbul'))) between 9 and 20
      and not exists (
        select 1 from public.appointment_reminders r
        where r.appointment_id = ap.id and r.kind = '24h'
          and (r.status in ('sent', 'skipped')
               or (r.status = 'failed' and r.attempts >= 3)
               or (r.status in ('pending', 'failed') and r.updated_at > now() - interval '15 minutes')))
    order by ap.starts_at
    limit greatest(1, least(coalesce(p_limit, 30), 100));
    return;
  end if;

  return query
  with cand as (
    select ap.id as appt_id, ap.org_id as c_org, o.name as c_org_name, o.owner_id as c_owner, ap.customer_name as c_name,
           public.normalize_phone(ap.customer_phone) as c_phone, ap.starts_at as c_start,
           coalesce(o.timezone, 'Europe/Istanbul') as c_tz, cal.name as c_doctor, bs.name as c_service
    from public.appointments ap
    join public.organizations o on o.id = ap.org_id and o.whatsapp_reminders_enabled
    left join public.profiles pr on pr.id = o.owner_id
    left join public.calendars cal on cal.id = ap.calendar_id
    left join public.business_services bs on bs.id::text = ap.service_id
    where ap.status = 'Approved'
      and ap.starts_at > now() + interval '2 hours'
      and ap.starts_at <= now() + make_interval(hours => o.reminder_hours_before)
      and coalesce(pr.account_status::text, 'active') not in ('suspended', 'banned')
      and extract(hour from (now() at time zone coalesce(o.timezone, 'Europe/Istanbul'))) between 9 and 20
      and not exists (
        select 1 from public.appointment_reminders r
        where r.appointment_id = ap.id and r.kind = '24h'
          and (r.status in ('sent', 'skipped')
               or (r.status = 'failed' and r.attempts >= 3)
               or (r.status in ('pending', 'failed') and r.updated_at > now() - interval '15 minutes')))
    order by ap.starts_at
    limit greatest(1, least(coalesce(p_limit, 30), 100))
  ),
  claimed as (
    insert into public.appointment_reminders as ar (org_id, appointment_id, kind, status, attempts, updated_at)
    select c_org, appt_id, '24h', 'pending', 1, now() from cand
    on conflict (appointment_id, kind) do update
      set status = 'pending', attempts = ar.attempts + 1, updated_at = now()
      where ar.status in ('pending', 'failed') and ar.updated_at <= now() - interval '15 minutes'
    returning ar.id as rid, ar.appointment_id as rappt
  )
  select claimed.rid, cand.c_org, cand.c_org_name, cand.c_owner, cand.appt_id, cand.c_name, cand.c_phone,
         cand.c_start, cand.c_tz, cand.c_doctor, cand.c_service
  from claimed join cand on cand.appt_id = claimed.rappt;
end;
$function$;

create or replace function public.mark_reminder_result(p_id uuid, p_status text, p_error text default null)
 returns void
 language plpgsql security definer set search_path to 'public'
as $function$
begin
  if p_status not in ('sent', 'failed', 'skipped') then
    raise exception 'invalid status';
  end if;
  update public.appointment_reminders
     set status = p_status, error = left(p_error, 500),
         sent_at = case when p_status = 'sent' then now() else sent_at end,
         updated_at = now()
   where id = p_id;
end;
$function$;

-- Ayar okuma/yazma (ekranlar için): yalnız işletme SAHİBİ değiştirir.
create or replace function public.get_reminder_settings()
 returns jsonb
 language sql stable security definer set search_path to 'public'
as $function$
  select case when o.id is null then jsonb_build_object('status', 'UNAUTHORIZED')
         else jsonb_build_object('status', 'SUCCESS', 'enabled', o.whatsapp_reminders_enabled, 'hoursBefore', o.reminder_hours_before) end
  from (select 1) x left join public.organizations o on o.id = public.current_org_id();
$function$;

create or replace function public.set_reminder_settings(p_enabled boolean)
 returns jsonb
 language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid := public.current_org_id();
begin
  if v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if not exists (select 1 from public.organizations where id = v_org and owner_id = auth.uid()) then
    return jsonb_build_object('status', 'FORBIDDEN');
  end if;
  update public.organizations set whatsapp_reminders_enabled = coalesce(p_enabled, false), updated_at = now() where id = v_org;
  return jsonb_build_object('status', 'SUCCESS', 'enabled', coalesce(p_enabled, false));
end;
$function$;

revoke all on function public.claim_due_reminders(integer, boolean) from public, anon, authenticated;
revoke all on function public.mark_reminder_result(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer, boolean) to service_role;
grant execute on function public.mark_reminder_result(uuid, text, text) to service_role;
revoke all on function public.get_reminder_settings() from public, anon;
revoke all on function public.set_reminder_settings(boolean) from public, anon;
grant execute on function public.get_reminder_settings() to authenticated, service_role;
grant execute on function public.set_reminder_settings(boolean) to authenticated, service_role;
