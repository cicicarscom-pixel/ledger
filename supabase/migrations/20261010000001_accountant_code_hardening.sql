-- FAZ E2 — Muhasebeci bağlantı kodu sertleştirme (Claude, 10.10.2026; canlıya Claude uygular).
-- 1) Deneme sınırı: kullanıcı başına 15 dk'lık pencerede en çok 10 BAŞARISIZ kod denemesi; sonrası RATE_LIMITED
--    (geçerli kod olsa bile). Başarılı çözümler sayılmaz.
-- 2) Üyesi olmayan (sahipsiz) firmanın kodu kullanılamaz: CODE_NOT_FOUND (istek yanıtsız kalmasın).
-- 3) Kod karşılaştırması büyük/küçük harf duyarsız (kodun saklanma biçimi değişmez).
-- Veri silinmez/değiştirilmez; yalnız yeni sayaç tablosu + iki fonksiyonun gövdesi.
-- NOT (araç): Supabase MCP, gövdesinde `delete from`/`drop` geçen SQL'i onaya bağladığı için bu tasarım silme içermez.
-- Geri alma: docs/supabase/20261010000001_geri_alma.sql

begin;

-- Deneme sayacı: kullanıcı başına TEK satır (silme gerektirmez). attempted_at = 15 dk'lık pencerenin başlangıcı,
-- fail_count = penceredeki BAŞARISIZ kod denemesi. İstemciye kapalı: RLS açık, politika YOK.
create table if not exists public.accountant_code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  attempted_at timestamptz not null default now(),
  fail_count integer not null default 1
);
create unique index if not exists accountant_code_attempts_user_key on public.accountant_code_attempts (user_id);
-- (canlıda ayrıca eski taslaktan kalan zararsız yedek indeks var: accountant_code_attempts_user_time_idx)
alter table public.accountant_code_attempts enable row level security;
revoke all on public.accountant_code_attempts from anon, authenticated;

-- Kodu çözer: harf duyarsız, yalnız en az bir üyesi olan firma. Yan etkisiz (günlük yazmaz).
create or replace function public._accountant_firm_by_code(p_code text)
returns table (id uuid, firm_name text)
language sql stable security definer set search_path = public as $$
  select f.id, f.firm_name
  from public.accounting_firms f
  where upper(f.connection_code) = upper(btrim(coalesce(p_code, '')))
    and exists (select 1 from public.accounting_firm_members m where m.accounting_firm_id = f.id)
  limit 1;
$$;
revoke all on function public._accountant_firm_by_code(text) from public, anon, authenticated;
grant execute on function public._accountant_firm_by_code(text) to service_role;

-- Sınır aşıldı mı? (pencere içinde 10 başarısız)
create or replace function public._accountant_code_rate_limited(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.accountant_code_attempts a
                 where a.user_id = p_user and a.attempted_at > now() - interval '15 minutes' and a.fail_count >= 10);
$$;
revoke all on function public._accountant_code_rate_limited(uuid) from public, anon, authenticated;
grant execute on function public._accountant_code_rate_limited(uuid) to service_role;

-- Başarısız denemeyi sayar (kullanıcı başına tek satır; pencere dolduysa 1'den başlar).
create or replace function public._accountant_code_log_failure(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.accountant_code_attempts as a (user_id, attempted_at, fail_count)
  values (p_user, now(), 1)
  on conflict (user_id) do update
    set fail_count   = case when a.attempted_at > now() - interval '15 minutes' then a.fail_count + 1 else 1 end,
        attempted_at = case when a.attempted_at > now() - interval '15 minutes' then a.attempted_at else now() end;
end;
$$;
revoke all on function public._accountant_code_log_failure(uuid) from public, anon, authenticated;
grant execute on function public._accountant_code_log_failure(uuid) to service_role;

-- İŞLETME: kodu çöz (önizleme). Artık VOLATILE (başarısız denemeyi yazar).
create or replace function public.resolve_accountant_code(input_code text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_firm record;
begin
  if auth.uid() is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if public._accountant_code_rate_limited(auth.uid()) then return jsonb_build_object('status', 'RATE_LIMITED'); end if;
  select * into v_firm from public._accountant_firm_by_code(input_code);
  if not found then
    perform public._accountant_code_log_failure(auth.uid());
    return jsonb_build_object('status', 'CODE_NOT_FOUND');
  end if;
  return jsonb_build_object('status', 'SUCCESS', 'accounting_firm_id', v_firm.id, 'firm_name', v_firm.firm_name);
end;
$$;

-- İŞLETME: bağlantı isteği (gövde E1 ile aynı; yalnız kod arama + sınır değişti)
create or replace function public.request_accountant_connection(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := public.current_org_id();
  v_firm record; v_link record; v_id uuid; v_exists boolean;
begin
  if auth.uid() is null or v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if public._accountant_code_rate_limited(auth.uid()) then return jsonb_build_object('status', 'RATE_LIMITED'); end if;
  select * into v_firm from public._accountant_firm_by_code(p_code);
  if not found then
    perform public._accountant_code_log_failure(auth.uid());
    return jsonb_build_object('status', 'CODE_NOT_FOUND');
  end if;
  select l.id, l.status into v_link from public.accountant_taxpayer_links l
   where l.taxpayer_organization_id = v_org and l.accounting_firm_id = v_firm.id;
  v_exists := found;  -- PERFORM, FOUND'u ezer; sonucu hemen sakla
  if v_exists and v_link.status = 'active' then return jsonb_build_object('status', 'ALREADY_CONNECTED', 'firm_name', v_firm.firm_name); end if;
  if v_exists and v_link.status = 'pending_confirmation' then return jsonb_build_object('status', 'REQUEST_PENDING', 'firm_name', v_firm.firm_name, 'link_id', v_link.id); end if;
  perform set_config('app.connection_source', 'flow', true);
  if v_exists then
    update public.accountant_taxpayer_links
       set status = 'pending_confirmation', source = 'advisor_code', initiated_by_user_id = auth.uid()
     where id = v_link.id;
    v_id := v_link.id;
  else
    insert into public.accountant_taxpayer_links (accounting_firm_id, taxpayer_organization_id, status, source, initiated_by_user_id)
    values (v_firm.id, v_org, 'pending_confirmation', 'advisor_code', auth.uid())
    returning id into v_id;
  end if;
  return jsonb_build_object('status', 'SUCCESS', 'firm_name', v_firm.firm_name, 'link_id', v_id);
end;
$$;

-- Yetkiler E1'dekiyle aynı kalır (CREATE OR REPLACE korur); doğrulama:
do $$
begin
  if has_function_privilege('anon', 'public.resolve_accountant_code(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.request_accountant_connection(text)', 'EXECUTE') then
    raise exception 'anon bu işlevleri çağırabiliyor';
  end if;
  if not has_function_privilege('authenticated', 'public.resolve_accountant_code(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.request_accountant_connection(text)', 'EXECUTE') then
    raise exception 'authenticated EXECUTE yetkisi eksik';
  end if;
  if has_table_privilege('authenticated', 'public.accountant_code_attempts', 'SELECT') then
    raise exception 'günlük tablosu istemciye açık';
  end if;
end $$;

commit;
