-- FAZ F2 regresyon testleri (Claude, 02.10.2026). Tek DO bloğu, sonda istisna → her şey geri alınır.
do $$
declare
  n int := 0;
  o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid();
  g1 uuid; g2 uuid; k1 uuid; r jsonb; a_id uuid; cu uuid; c int; s1 text; s2 text;
  d date := (date_trunc('week', current_date + 21))::date;  -- 3 hafta sonraki pazartesi
begin
  insert into auth.users (id, email) values (o1, 'f2-1-' || o1 || '@workigom.test'), (o2, 'f2-2-' || o2 || '@workigom.test');
  insert into public.organizations (owner_id, name, timezone) values (o1, 'F2 ISLETME 1', 'Europe/Istanbul') returning id into g1;
  insert into public.organizations (owner_id, name, timezone) values (o2, 'F2 ISLETME 2', 'Europe/Istanbul') returning id into g2;
  insert into public.calendars (merchant_id, name, is_active) values (o1, 'F2-K1', true) returning id into k1;
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);

  -- T1 SIRALAMA: rezerve saate ESKİ sütunla gelen randevu da engellenir (a00_sync_org_id önce çalışır)
  r := public.create_calendar_block(k1, d || 'T10:00', d || 'T11:00', 'meeting', null);
  if r->>'status' <> 'SUCCESS' then raise exception 'FAIL T1a: %', r; end if;
  begin
    insert into public.appointments (organization_id, calendar_id, customer_phone, customer_name, date, starts_at, ends_at, status, booking_token, source)
      values (o1, k1, '905551110000', 'Eski', d || 'T10:00:00', (d + time '10:00') at time zone 'Europe/Istanbul',
              (d + time '10:30') at time zone 'Europe/Istanbul', 'Pending', 'f2-' || gen_random_uuid(), 'whatsapp');
    raise exception 'FAIL T1b: eski sütunla rezerve saate randevu yazıldı';
  exception when exclusion_violation then null; end; n := n + 1;

  -- T2 create_manual_appointment → müşteri org_id ile oluşur, get_customers görür
  r := public.create_manual_appointment(d || 'T14:00', 'F2 Müşteri', '0555 222 33 44', k1, null, 'kontrol', 'web');
  if r->>'status' <> 'SUCCESS' then raise exception 'FAIL T2a: %', r; end if;
  a_id := (r->>'appointment_id')::uuid;
  if (select org_id from public.appointments where id = a_id) is distinct from g1
     or (select organization_id from public.appointments where id = a_id) is distinct from o1 then raise exception 'FAIL T2b: kimlik eşitlemesi'; end if;
  select id into cu from public.customers where org_id = g1 and name = 'F2 Müşteri';
  if cu is null then raise exception 'FAIL T2c: müşteri oluşmadı'; end if;
  if not exists (select 1 from public.get_customers() g where g.id = cu and g.total = 1 and g.upcoming = 1) then raise exception 'FAIL T2d: get_customers'; end if;
  if (select count(*) from public.get_customer_appointments(cu)) <> 1 then raise exception 'FAIL T2e: get_customer_appointments'; end if;
  n := n + 1;

  -- T3 müşteri fonksiyonları
  if (public.update_customer_notes(cu, 'not')->>'status') <> 'SUCCESS' then raise exception 'FAIL T3a'; end if;
  if (public.create_customer('Tekrar', '0555 222 33 44')->>'status') <> 'ALREADY_EXISTS' then raise exception 'FAIL T3b'; end if;
  if (public.create_customer('Yeni Kişi', '0555 999 88 77')->>'status') <> 'SUCCESS' then raise exception 'FAIL T3c'; end if;
  n := n + 1;

  -- T4 müsaitlik: eski (owner) ve yeni (org) fonksiyon aynı sonucu verir; blok ve randevu dolu
  select string_agg(local_time, ',' order by local_time) into s1 from public.get_available_slots_for_owner(o1, d);
  select string_agg(local_time, ',' order by local_time) into s2 from public.get_available_slots_for_org(g1, d);
  if s1 is distinct from s2 or s1 like '%10:00%' or s1 like '%14:00%' then raise exception 'FAIL T4: % / %', s1, s2; end if;
  if (select status from public.get_day_schedule(d, k1) where local_time = '14:00') <> 'booked' then raise exception 'FAIL T4b'; end if;
  n := n + 1;

  -- T5 başka işletme bu randevuyu iptal/silemez, müşteriyi göremez
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  if (public.cancel_appointment(a_id, 'x')->>'status') <> 'NOT_FOUND' then raise exception 'FAIL T5a'; end if;
  if (public.delete_appointment(a_id)->>'status') <> 'NOT_FOUND' then raise exception 'FAIL T5b'; end if;
  if exists (select 1 from public.get_customers() g where g.id = cu) then raise exception 'FAIL T5c'; end if;
  if (public.update_customer_notes(cu, 'saldırı')->>'status') <> 'NOT_FOUND' then raise exception 'FAIL T5d'; end if;
  n := n + 1;

  -- T6 sahibi iptal eder, sonra siler
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  if (public.cancel_appointment(a_id, 'test')->>'status') <> 'SUCCESS' then raise exception 'FAIL T6a'; end if;
  if (select status from public.get_day_schedule(d, k1) where local_time = '14:00') <> 'free' then raise exception 'FAIL T6b'; end if;
  if (public.delete_appointment(a_id)->>'status') <> 'SUCCESS' then raise exception 'FAIL T6c'; end if;
  if (public.delete_calendar_block((select id from public.calendar_blocks where org_id = g1 limit 1))->>'status') <> 'SUCCESS' then raise exception 'FAIL T6d'; end if;
  n := n + 1;

  raise exception 'F2_TESTS_OK: % kontrol geçti (tüm değişiklikler geri alındı)', n;
end $$;
