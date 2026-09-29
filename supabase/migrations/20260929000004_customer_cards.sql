-- Müşteri kartı (web + mobil) — 29.09.2026, Claude tarafından canlıya uygulandı.
-- 1) Telefon standardı: customers.phone her zaman WhatsApp biçiminde "90XXXXXXXXXX@c.us".
--    WhatsApp asistanı müşteriyi bu biçimle arıyor; web/mobilden "0505..." girilen kişi de aynı kayda düşer.
-- 2) Her randevu müşterisini bulur/oluşturur (web/mobil elle randevular müşteri açmıyordu).
-- 3) Kart verisi RPC'lerden: get_customers, get_customer_appointments, update_customer_notes, create_customer.
-- Not: customers/appointments.organization_id = işletme SAHİBİNİN auth user id'si (organizations.id değil).

create or replace function public.normalize_phone(p text)
returns text language sql immutable as $$
  select case
    when d = '' then null
    when length(d) = 11 and left(d, 1) = '0' then '9' || d            -- 05XXXXXXXXX -> 905XXXXXXXXX
    when length(d) = 10 and left(d, 1) = '5' then '90' || d           -- 5XXXXXXXXX  -> 905XXXXXXXXX
    when length(d) = 14 and left(d, 4) = '0090' then substr(d, 3)     -- 0090...     -> 90...
    else d
  end
  from (select regexp_replace(split_part(coalesce(p, ''), '@', 1), '\D', '', 'g') as d) s;
$$;

create or replace function public.canonical_phone(p text)
returns text language sql immutable as $$
  select case when public.normalize_phone(p) is null then null else public.normalize_phone(p) || '@c.us' end;
$$;

create or replace function public.format_phone_display(p text)
returns text language sql immutable as $$
  select case
    when n is null then null
    when length(n) = 12 and left(n, 2) = '90'
      then '+90 ' || substr(n, 3, 3) || ' ' || substr(n, 6, 3) || ' ' || substr(n, 9, 2) || ' ' || substr(n, 11, 2)
    else '+' || n
  end
  from (select public.normalize_phone(p) as n) s;
$$;

-- customers.phone her yazımda standart biçime
create or replace function public.tr_customers_canonical_phone()
returns trigger language plpgsql as $$
begin
  if new.phone is not null then
    new.phone := coalesce(public.canonical_phone(new.phone), new.phone);
  end if;
  return new;
end;
$$;
drop trigger if exists tr_customers_canonical_phone on public.customers;
create trigger tr_customers_canonical_phone
  before insert or update of phone on public.customers
  for each row execute function public.tr_customers_canonical_phone();

-- Her randevu müşterisini bulur ya da oluşturur (adı mevcutsa ezilmez)
create or replace function public.tr_appointment_ensure_customer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is not null and public.canonical_phone(new.customer_phone) is not null then
    insert into public.customers (organization_id, phone, name)
    values (new.organization_id, public.canonical_phone(new.customer_phone), nullif(btrim(new.customer_name), ''))
    on conflict (organization_id, phone) do update
      set name = coalesce(public.customers.name, excluded.name);
  end if;
  return new;
end;
$$;
drop trigger if exists tr_appointment_ensure_customer on public.appointments;
create trigger tr_appointment_ensure_customer
  after insert on public.appointments
  for each row execute function public.tr_appointment_ensure_customer();

-- Geriye dönük: mevcut müşteri telefonlarını standartla, randevulardan eksik müşterileri aç
update public.customers set phone = public.canonical_phone(phone)
  where phone is not null and public.canonical_phone(phone) is distinct from phone
    and not exists (select 1 from public.customers c2
                    where c2.organization_id = customers.organization_id and c2.phone = public.canonical_phone(customers.phone));
insert into public.customers (organization_id, phone, name)
select distinct on (a.organization_id, public.canonical_phone(a.customer_phone))
       a.organization_id, public.canonical_phone(a.customer_phone), nullif(btrim(a.customer_name), '')
from public.appointments a
where a.organization_id is not null and public.canonical_phone(a.customer_phone) is not null
order by a.organization_id, public.canonical_phone(a.customer_phone), a.created_at
on conflict (organization_id, phone) do nothing;

-- Çağıranın işletme sahibi (customers/appointments bu kimlikle tutuluyor)
create or replace function public.current_org_owner_id()
returns uuid language sql stable security definer set search_path = public as $$
  select owner_id from public.organizations where id = public.current_org_id();
$$;

create or replace function public.get_customers()
returns table (
  id uuid, name text, phone text, phone_display text, source text, notes text, created_at timestamptz,
  total int, upcoming int, past int, cancelled int,
  next_starts_at timestamptz, next_doctor text, next_request text,
  last_visit_at timestamptz, last_request text
) language sql stable security definer set search_path = public as $$
  with owner as (select public.current_org_owner_id() as id),
  a as (
    select ap.*, public.normalize_phone(ap.customer_phone) as pkey, cal.name as doctor
    from public.appointments ap
    left join public.calendars cal on cal.id = ap.calendar_id
    where ap.organization_id = (select id from owner)
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
  where c.organization_id = (select id from owner)
  order by n.starts_at nulls last, c.created_at desc;
$$;

create or replace function public.get_customer_appointments(p_customer_id uuid)
returns table (id uuid, starts_at timestamptz, ends_at timestamptz, timezone text, doctor text, request text, status text, source text)
language sql stable security definer set search_path = public as $$
  select ap.id, ap.starts_at, ap.ends_at, ap.timezone, cal.name, ap.customer_request_raw, ap.status::text, ap.source
  from public.customers c
  join public.appointments ap
    on ap.organization_id = c.organization_id
   and public.normalize_phone(ap.customer_phone) = public.normalize_phone(c.phone)
  left join public.calendars cal on cal.id = ap.calendar_id
  where c.id = p_customer_id and c.organization_id = public.current_org_owner_id()
  order by ap.starts_at desc;
$$;

create or replace function public.update_customer_notes(p_customer_id uuid, p_notes text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if public.current_org_owner_id() is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  update public.customers set notes = nullif(btrim(p_notes), ''), updated_at = now()
   where id = p_customer_id and organization_id = public.current_org_owner_id();
  get diagnostics v_n = row_count;
  return jsonb_build_object('status', case when v_n = 0 then 'NOT_FOUND' else 'SUCCESS' end);
end;
$$;

create or replace function public.create_customer(p_name text, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_owner uuid := public.current_org_owner_id(); v_phone text := public.canonical_phone(p_phone); v_id uuid;
begin
  if v_owner is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if coalesce(btrim(p_name), '') = '' then return jsonb_build_object('status', 'NAME_REQUIRED'); end if;
  if v_phone is null or length(public.normalize_phone(p_phone)) < 10 then return jsonb_build_object('status', 'INVALID_PHONE'); end if;
  select id into v_id from public.customers where organization_id = v_owner and phone = v_phone;
  if v_id is not null then return jsonb_build_object('status', 'ALREADY_EXISTS', 'id', v_id); end if;
  insert into public.customers (organization_id, phone, name) values (v_owner, v_phone, btrim(p_name)) returning id into v_id;
  return jsonb_build_object('status', 'SUCCESS', 'id', v_id);
end;
$$;

revoke execute on function public.get_customers() from public, anon;
revoke execute on function public.get_customer_appointments(uuid) from public, anon;
revoke execute on function public.update_customer_notes(uuid, text) from public, anon;
revoke execute on function public.create_customer(text, text) from public, anon;
revoke execute on function public.current_org_owner_id() from public, anon;
grant execute on function public.get_customers() to authenticated;
grant execute on function public.get_customer_appointments(uuid) to authenticated;
grant execute on function public.update_customer_notes(uuid, text) to authenticated;
grant execute on function public.create_customer(text, text) to authenticated;
grant execute on function public.current_org_owner_id() to authenticated;
