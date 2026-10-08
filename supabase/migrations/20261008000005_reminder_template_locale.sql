-- WhatsApp hatırlatma: işletmenin kendi metni (şablon) + mesaj dili. Tek doğru kaynak: varsayılan metinler burada.
-- Unvan (Sayın/Mr/Mrs/Herr/Frau) YOK: müşterinin cinsiyeti tahmin edilmez; isteyen kendi şablonuna yazar.
-- Yer tutucular: {name} {first_name} {business} {date} {time} {doctor} {service}
-- {doctor} ve {service} boşsa o satır mesajdan çıkarılır (Edge Function'da).

alter table public.organizations
  add column if not exists reminder_template text check (reminder_template is null or char_length(reminder_template) <= 700),
  add column if not exists reminder_locale text check (reminder_locale is null or reminder_locale in ('tr', 'en', 'de', 'fr', 'es'));

create or replace function public.reminder_default_template(p_locale text)
 returns text
 language sql immutable set search_path to 'public'
as $function$
  select case coalesce(p_locale, 'en')
    when 'tr' then E'Merhaba {first_name},\n{business} olarak {date} saat {time} randevunuzu hatırlatmak isteriz.\nUzman: {doctor}\nİşlem: {service}\nRandevunuzla ilgili bir değişiklik için bu mesaja yazabilirsiniz. Sizi bekliyoruz!'
    when 'de' then E'Hallo {first_name},\nwir erinnern Sie an Ihren Termin bei {business} am {date} um {time} Uhr.\nBei: {doctor}\nLeistung: {service}\nFalls Sie etwas ändern möchten, antworten Sie einfach auf diese Nachricht. Wir freuen uns auf Sie!'
    when 'fr' then E'Bonjour {first_name},\nNous vous rappelons votre rendez-vous chez {business} le {date} à {time}.\nAvec : {doctor}\nPrestation : {service}\nPour toute modification, répondez simplement à ce message. À bientôt !'
    when 'es' then E'Hola {first_name},\nLe recordamos su cita en {business} el {date} a las {time}.\nCon: {doctor}\nServicio: {service}\nSi necesita hacer algún cambio, responda a este mensaje. ¡Le esperamos!'
    else E'Hello {first_name},\nThis is a reminder of your appointment at {business} on {date} at {time}.\nWith: {doctor}\nService: {service}\nIf you need to change anything, just reply to this message. See you soon!'
  end;
$function$;

-- Etkin dil: işletmenin seçimi; yoksa saat diliminden tahmin (Türkiye→tr, Almanya/Avusturya/İsviçre→de, Fransa→fr, İspanya→es, diğer→en).
create or replace function public.reminder_effective_locale(p_locale text, p_timezone text)
 returns text
 language sql immutable set search_path to 'public'
as $function$
  select coalesce(
    nullif(p_locale, ''),
    case
      when p_timezone = 'Europe/Istanbul' then 'tr'
      when p_timezone in ('Europe/Berlin', 'Europe/Vienna', 'Europe/Zurich') then 'de'
      when p_timezone = 'Europe/Paris' then 'fr'
      when p_timezone in ('Europe/Madrid', 'Atlantic/Canary') then 'es'
      else 'en'
    end);
$function$;

-- claim_due_reminders: dönüşe `template` (etkin metin: işletmenin metni ya da dilin varsayılanı) ve `locale` eklendi.
-- Dönüş tipi değiştiği için YENİ ADLA eklendi (canlı veritabanında DROP komutları takıldığından eskisi silinmedi;
-- eski `claim_due_reminders` kullanılmaz, uygun bir bakım penceresinde silinecek).
create or replace function public.claim_due_reminders_v2(p_limit integer default 30, p_dry boolean default false)
 returns table(reminder_id uuid, org_id uuid, org_name text, owner_id uuid, appointment_id uuid, customer_name text,
               phone_digits text, starts_at timestamptz, timezone text, doctor text, service text, template text, locale text)
 language plpgsql security definer set search_path to 'public'
as $function$
#variable_conflict use_column
begin
  if p_dry then
    return query
    select null::uuid, ap.org_id, o.name, o.owner_id, ap.id, ap.customer_name, public.normalize_phone(ap.customer_phone),
           ap.starts_at, coalesce(o.timezone, 'Europe/Istanbul'), cal.name, bs.name,
           coalesce(nullif(btrim(o.reminder_template), ''), public.reminder_default_template(public.reminder_effective_locale(o.reminder_locale, o.timezone))),
           public.reminder_effective_locale(o.reminder_locale, o.timezone)
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
           coalesce(o.timezone, 'Europe/Istanbul') as c_tz, cal.name as c_doctor, bs.name as c_service,
           coalesce(nullif(btrim(o.reminder_template), ''), public.reminder_default_template(public.reminder_effective_locale(o.reminder_locale, o.timezone))) as c_template,
           public.reminder_effective_locale(o.reminder_locale, o.timezone) as c_locale
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
         cand.c_start, cand.c_tz, cand.c_doctor, cand.c_service, cand.c_template, cand.c_locale
  from claimed join cand on cand.appt_id = claimed.rappt;
end;
$function$;

revoke all on function public.claim_due_reminders_v2(integer, boolean) from public, anon, authenticated;
grant execute on function public.claim_due_reminders_v2(integer, boolean) to service_role;

-- Ayarları okuma: mevcut alanlar KORUNDU (enabled, hoursBefore); yeni: template (özel metin ya da null), locale (etkin dil), defaults (dil → varsayılan metin).
create or replace function public.get_reminder_settings()
 returns jsonb
 language sql stable security definer set search_path to 'public'
as $function$
  select case when o.id is null then jsonb_build_object('status', 'UNAUTHORIZED')
         else jsonb_build_object(
           'status', 'SUCCESS',
           'enabled', o.whatsapp_reminders_enabled,
           'hoursBefore', o.reminder_hours_before,
           'template', nullif(btrim(o.reminder_template), ''),
           'locale', public.reminder_effective_locale(o.reminder_locale, o.timezone),
           'defaults', jsonb_build_object(
             'tr', public.reminder_default_template('tr'), 'en', public.reminder_default_template('en'),
             'de', public.reminder_default_template('de'), 'fr', public.reminder_default_template('fr'),
             'es', public.reminder_default_template('es')),
           'placeholders', jsonb_build_array('name', 'first_name', 'business', 'date', 'time', 'doctor', 'service')
         ) end
  from (select 1) x left join public.organizations o on o.id = public.current_org_id();
$function$;

-- Metin ve dil kaydı (yalnız işletme sahibi). p_template boş/null → özel metin silinir, dilin varsayılanı kullanılır.
-- p_locale null → dil seçimi silinir (saat diliminden tahmin edilir).
create or replace function public.set_reminder_template(p_template text, p_locale text default null)
 returns jsonb
 language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_org uuid := public.current_org_id();
  v_tpl text := nullif(btrim(coalesce(p_template, '')), '');
  v_unknown text[];
begin
  if v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if not exists (select 1 from public.organizations where id = v_org and owner_id = auth.uid()) then
    return jsonb_build_object('status', 'FORBIDDEN');
  end if;
  if p_locale is not null and p_locale not in ('tr', 'en', 'de', 'fr', 'es') then
    return jsonb_build_object('status', 'INVALID_LOCALE');
  end if;
  if v_tpl is not null then
    if char_length(v_tpl) > 700 then return jsonb_build_object('status', 'TEMPLATE_TOO_LONG'); end if;
    select coalesce(array_agg(distinct t.m[1]), '{}') into v_unknown
      from regexp_matches(v_tpl, '\{([A-Za-z_]+)\}', 'g') as t(m)
     where t.m[1] not in ('name', 'first_name', 'business', 'date', 'time', 'doctor', 'service');
    if array_length(v_unknown, 1) > 0 then
      return jsonb_build_object('status', 'UNKNOWN_PLACEHOLDER', 'unknown', to_jsonb(v_unknown));
    end if;
  end if;
  update public.organizations set reminder_template = v_tpl, reminder_locale = p_locale, updated_at = now() where id = v_org;
  return jsonb_build_object('status', 'SUCCESS');
end;
$function$;

revoke all on function public.set_reminder_template(text, text) from public, anon;
grant execute on function public.set_reminder_template(text, text) to authenticated, service_role;
revoke all on function public.reminder_default_template(text) from public, anon;
revoke all on function public.reminder_effective_locale(text, text) from public, anon;
grant execute on function public.reminder_default_template(text) to authenticated, service_role;
grant execute on function public.reminder_effective_locale(text, text) to authenticated, service_role;
