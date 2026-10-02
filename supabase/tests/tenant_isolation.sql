-- Kiracı (işletme) izolasyonu ve org_id eşitleme testleri — FAZ F1 (Claude, 02.10.2026).
-- GÜVENLİK: tek DO bloğu, HER DURUMDA sonda istisna → tüm değişiklikler geri alınır.
--   Başarı: ERROR "TENANT_ISOLATION_TESTS_OK: N kontrol geçti"   Hata: ERROR "FAIL Tx: ..."
-- Yalnız Claude çalıştırır (AGENTS.md: SQL yalnız Claude).
do $$
declare
  n int := 0;
  o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid();
  g1 uuid; g2 uuid; c1 uuid; c2 uuid; cu uuid; s uuid; k int; x record;
begin
  insert into auth.users (id, email) values (o1, 'ti-1-' || o1 || '@workigom.test'), (o2, 'ti-2-' || o2 || '@workigom.test');
  insert into public.organizations (owner_id, name) values (o1, 'TI ISLETME 1') returning id into g1;
  insert into public.organizations (owner_id, name) values (o2, 'TI ISLETME 2') returning id into g2;

  -- T1 eski sütunla yazma → org_id dolar (yüklü eski mobil sürümler)
  insert into public.calendars (merchant_id, name, is_active) values (o1, 'TI-K1', true) returning id, org_id into c1, s;
  if s is distinct from g1 then raise exception 'FAIL T1: org_id % (beklenen %)', s, g1; end if; n := n + 1;
  -- T2 yalnız org_id ile yazma → eski sütun dolar (yeni kod)
  insert into public.calendars (org_id, name, is_active) values (g2, 'TI-K2', true) returning id, merchant_id into c2, s;
  if s is distinct from o2 then raise exception 'FAIL T2: merchant_id % (beklenen %)', s, o2; end if; n := n + 1;
  -- T3 uyuşmayan çift reddedilir
  begin insert into public.customers (organization_id, org_id, name, phone) values (o1, g2, 'X', '905550001111');
    raise exception 'FAIL T3: uyuşmayan çift kabul edildi';
  exception when check_violation then null; end; n := n + 1;
  -- T4 güncellemede tek tarafı değiştirmek diğerini taşır
  insert into public.customers (organization_id, name, phone) values (o1, 'TI Müşteri', '905550002222') returning id into cu;
  update public.customers set org_id = g2 where id = cu;
  if (select organization_id from public.customers where id = cu) is distinct from o2 then raise exception 'FAIL T4a'; end if;
  update public.customers set organization_id = o1 where id = cu;
  if (select org_id from public.customers where id = cu) is distinct from g1 then raise exception 'FAIL T4b'; end if; n := n + 1;
  -- T5 diğer tablolarda da eşitleme (randevu, hizmet, bot ayarı, AI ayarı, iletişim kaydı, blok)
  insert into public.business_services (merchant_id, name, price, duration_minutes) values (o2, 'TI Hizmet', 0, 30);
  insert into public.appointments (organization_id, calendar_id, customer_phone, customer_name, date, starts_at, ends_at, status, booking_token, source)
    values (o1, c1, '905550002222', 'TI Müşteri', '2099-01-05T10:00:00', '2099-01-05 07:00+00', '2099-01-05 07:30+00', 'Pending', 'ti-' || gen_random_uuid(), 'web');
  insert into public.bot_settings (merchant_id) values (o2);
  insert into public.ai_communication_logs (org_id, platform, sender_id, user_message) values (g1, 'whatsapp', '905550002222', 'TI');
  insert into public.calendar_blocks (org_id, calendar_id, starts_at, ends_at, reason) values (g2, c2, '2099-01-06 07:00+00', '2099-01-06 08:00+00', 'meeting');
  if exists (select 1 from public.appointments where booking_token like 'ti-%' and org_id is distinct from g1)
     or exists (select 1 from public.business_services where name = 'TI Hizmet' and org_id is distinct from g2)
     or exists (select 1 from public.bot_settings where merchant_id = o2 and org_id is distinct from g2)
     or exists (select 1 from public.ai_communication_logs where user_message = 'TI' and merchant_id is distinct from o1)
     or exists (select 1 from public.calendar_blocks where calendar_id = c2 and organization_id is distinct from o2)
     or exists (select 1 from public.customers where id <> cu and phone = '905550002222' and org_id is distinct from g1)
  then raise exception 'FAIL T5: eşitleme eksik'; end if; n := n + 1;

  -- ---- Güvenlik kuralları: oturum açmış kullanıcı (işletme 1 sahibi) olarak ----
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  -- T6 yalnız kendi takvimi / müşterisi / hizmeti / bloğu görünür
  select count(*) into k from public.calendars where name in ('TI-K1', 'TI-K2');
  if k <> 1 then raise exception 'FAIL T6a: görünen test takvimi %', k; end if;
  if exists (select 1 from public.calendars where name = 'TI-K2') then raise exception 'FAIL T6b: başka işletmenin takvimi görünüyor'; end if;
  if exists (select 1 from public.business_services where name = 'TI Hizmet') then raise exception 'FAIL T6c: başka işletmenin hizmeti'; end if;
  if exists (select 1 from public.calendar_blocks where calendar_id = c2) then raise exception 'FAIL T6d: başka işletmenin bloğu'; end if;
  if exists (select 1 from public.bot_settings where merchant_id = o2) then raise exception 'FAIL T6e: başka işletmenin bot ayarı'; end if;
  if not exists (select 1 from public.appointments where booking_token like 'ti-%') then raise exception 'FAIL T6f: kendi randevusu görünmüyor'; end if;
  n := n + 1;
  -- T7 başka işletme adına yazılamaz (yeni ve eski sütunla)
  begin insert into public.calendars (org_id, name, is_active) values (g2, 'TI-SALDIRI', true); raise exception 'FAIL T7a';
  exception when insufficient_privilege then null; end;
  begin insert into public.calendars (merchant_id, name, is_active) values (o2, 'TI-SALDIRI', true); raise exception 'FAIL T7b';
  exception when insufficient_privilege then null; end;
  n := n + 1;
  -- T8 kendi işletmesi adına yeni kodla (yalnız org_id) yazabilir
  insert into public.calendars (org_id, name, is_active) values (g1, 'TI-K3', true);
  if not exists (select 1 from public.calendars where name = 'TI-K3' and merchant_id = o1) then raise exception 'FAIL T8'; end if; n := n + 1;
  -- T9 anonim kullanıcı takvim göremez (önceden herkese açıktı)
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  if exists (select 1 from public.calendars) then raise exception 'FAIL T9: anonim takvim görüyor'; end if; n := n + 1;
  execute 'reset role';

  raise exception 'TENANT_ISOLATION_TESTS_OK: % kontrol geçti (tüm değişiklikler geri alındı)', n;
end $$;
