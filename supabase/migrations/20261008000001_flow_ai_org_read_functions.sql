-- Flow AI okuma araçları için işletme-parametreli kardeş fonksiyonlar (precedent: _slot_grid_org).
-- Genel (public) get_* fonksiyonları current_org_id() = auth.uid()'e bağlıdır; Edge Function'ın service_role
-- istemcisinde auth.uid() boştur. Bu fonksiyonlar AYNI mantığı p_org ile çalıştırır. Yalnız service_role çağırabilir.

create or replace function public._get_customers_org(p_org uuid)
 returns table(id uuid, name text, phone text, phone_display text, source text, notes text, created_at timestamp with time zone, total integer, upcoming integer, past integer, cancelled integer, next_starts_at timestamp with time zone, next_doctor text, next_request text, last_visit_at timestamp with time zone, last_request text)
 language sql stable security definer set search_path to 'public'
as $function$
  with org as (select p_org as id),
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
$function$;

create or replace function public._get_customer_appointments_org(p_org uuid, p_customer_id uuid)
 returns table(id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone, timezone text, doctor text, request text, status text, source text)
 language sql stable security definer set search_path to 'public'
as $function$
  select ap.id, ap.starts_at, ap.ends_at, ap.timezone, cal.name, ap.customer_request_raw, ap.status::text, ap.source
  from public.customers c
  join public.appointments ap on ap.org_id = c.org_id and public.normalize_phone(ap.customer_phone) = public.normalize_phone(c.phone)
  left join public.calendars cal on cal.id = ap.calendar_id
  where c.id = p_customer_id and c.org_id = p_org
  order by ap.starts_at desc;
$function$;

create or replace function public._get_finance_summary_org(p_org uuid, p_from date, p_to date)
 returns jsonb
 language sql stable security definer set search_path to 'public'
as $function$
  with org as (select p_org as id),
  t as (
    select tr.type, tr.amount_minor, tr.payment_status, coalesce(tr.due_date, tr.date) as day
    from public.transactions tr, org
    where tr.profile_id = org.id
  )
  select case when (select id from org) is null then jsonb_build_object('status', 'UNAUTHORIZED') else
    jsonb_build_object(
      'status', 'SUCCESS',
      'income',  coalesce(sum(amount_minor) filter (where type = 'income'  and payment_status = 'paid' and day between p_from and p_to), 0),
      'expense', coalesce(sum(amount_minor) filter (where type = 'expense' and payment_status = 'paid' and day between p_from and p_to), 0),
      'receivable', coalesce(sum(amount_minor) filter (where type = 'income'  and payment_status in ('pending','partial')), 0),
      'payable',    coalesce(sum(amount_minor) filter (where type = 'expense' and payment_status in ('pending','partial')), 0),
      'overdue_count',  count(*) filter (where payment_status in ('pending','partial') and day < public.org_today((select id from org))),
      'overdue_amount', coalesce(sum(amount_minor) filter (where payment_status in ('pending','partial') and day < public.org_today((select id from org))), 0),
      'currency', 'TRY'
    ) end
  from t;
$function$;

create or replace function public._get_payment_calendar_org(p_org uuid, p_from date, p_to date)
 returns table(id uuid, type text, title text, amount_minor bigint, currency_code text, day date, due_date date, date date, payment_status text, is_overdue boolean, source text, document_id text, category text)
 language sql stable security definer set search_path to 'public'
as $function$
  select t.id, t.type, t.title, t.amount_minor, t.currency_code,
         coalesce(t.due_date, t.date) as day, t.due_date, t.date, t.payment_status,
         (t.payment_status in ('pending', 'partial') and coalesce(t.due_date, t.date) < public.org_today(t.profile_id)) as is_overdue,
         t.source, t.document_id, t.category
  from public.transactions t
  where t.profile_id = p_org
    and coalesce(t.due_date, t.date) between p_from and p_to
  order by coalesce(t.due_date, t.date), t.type, t.created_at;
$function$;

revoke all on function public._get_customers_org(uuid) from public, anon, authenticated;
revoke all on function public._get_customer_appointments_org(uuid, uuid) from public, anon, authenticated;
revoke all on function public._get_finance_summary_org(uuid, date, date) from public, anon, authenticated;
revoke all on function public._get_payment_calendar_org(uuid, date, date) from public, anon, authenticated;
grant execute on function public._get_customers_org(uuid) to service_role;
grant execute on function public._get_customer_appointments_org(uuid, uuid) to service_role;
grant execute on function public._get_finance_summary_org(uuid, date, date) to service_role;
grant execute on function public._get_payment_calendar_org(uuid, date, date) to service_role;
