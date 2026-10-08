-- Tek doğru kaynak: ekran fonksiyonları (get_customers, get_customer_appointments, get_finance_summary, get_payment_calendar)
-- artık mantığı KOPYALAMAZ; oturumdaki işletmeyi çözüp işletme-parametreli _get_*_org fonksiyonlarına devreder.
-- İmzalar, dönüş tipleri ve yetkiler DEĞİŞMEZ (create or replace). current_org_id() boşsa sonuç öncekiyle aynı: boş küme / UNAUTHORIZED.

create or replace function public.get_customers()
 returns table(id uuid, name text, phone text, phone_display text, source text, notes text, created_at timestamp with time zone, total integer, upcoming integer, past integer, cancelled integer, next_starts_at timestamp with time zone, next_doctor text, next_request text, last_visit_at timestamp with time zone, last_request text)
 language sql stable security definer set search_path to 'public'
as $function$
  select * from public._get_customers_org(public.current_org_id());
$function$;

create or replace function public.get_customer_appointments(p_customer_id uuid)
 returns table(id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone, timezone text, doctor text, request text, status text, source text)
 language sql stable security definer set search_path to 'public'
as $function$
  select * from public._get_customer_appointments_org(public.current_org_id(), p_customer_id);
$function$;

create or replace function public.get_finance_summary(p_from date, p_to date)
 returns jsonb
 language sql stable security definer set search_path to 'public'
as $function$
  select public._get_finance_summary_org(public.current_org_id(), p_from, p_to);
$function$;

create or replace function public.get_payment_calendar(p_from date, p_to date)
 returns table(id uuid, type text, title text, amount_minor bigint, currency_code text, day date, due_date date, date date, payment_status text, is_overdue boolean, source text, document_id text, category text)
 language sql stable security definer set search_path to 'public'
as $function$
  select * from public._get_payment_calendar_org(public.current_org_id(), p_from, p_to);
$function$;
