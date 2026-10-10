-- Müsaitlik çekirdeği + rezervasyon regresyon testleri (Claude, 01.10.2026; 10.10.2026'da organizations.id modeline güncellendi:
-- eski sütunlar (calendars.merchant_id, appointments.organization_id) Faz F5c'de kaldırıldı; motor _slot_grid_org(org_id,…)).
--
-- GÜVENLİK: Testin tamamı tek bir DO bloğunda çalışır ve HER DURUMDA en sonda bir istisna fırlatır.
-- Postgres bu durumda bloktaki bütün değişiklikleri geri alır; veritabanında hiçbir şey kalıcı olmaz.
--   Başarı: ERROR "SCHEDULING_CORE_TESTS_OK: N kontrol geçti"
--   Hata  : ERROR "FAIL Tx: ..."
-- Bu dosyayı yalnız Claude çalıştırır (AGENTS.md: SQL yalnız Claude). Ajan çalıştırmaz.
--
-- Kapsam: çalışma saatleri (öğle arası, kapalı gün, varsayılan), süreli çakışma, iptal, doktor ve klinik
-- rezervasyonu, çift rezervasyon (ALREADY_BLOCKED), randevu üstüne rezervasyon (CONFLICTS_WITH_APPOINTMENTS),
-- rezerve saate randevu yazma (exclusion_violation → SLOT_TAKEN), SAATİ GEÇMİŞ RANDEVUNUN IZGARADA KALMASI
-- (30.09 hatası), WhatsApp AI boş saat listesi, kiracı (tenant) izolasyonu.
do $$
declare
  n int := 0;
  v_owner  uuid := gen_random_uuid();
  v_owner2 uuid := gen_random_uuid();
  v_org uuid; v_org2 uuid;
  v_calA uuid := gen_random_uuid();   -- çalışma saati: Pzt 09-12 + 13-17, Pazar kapalı
  v_calB uuid := gen_random_uuid();   -- çalışma saati tanımsız → varsayılan 09-18
  v_cal2 uuid := gen_random_uuid();   -- ikinci işletmenin takvimi
  v_mon date := (date_trunc('week', current_date + 14))::date;   -- 2 hafta sonraki pazartesi
  v_sun date := (date_trunc('week', current_date + 14))::date + 6;
  v_past date := current_date - 7;
  tz text := 'Europe/Istanbul';
  r jsonb; s text; c int; ok boolean;
begin
  -- ---------- kurulum (hepsi en sonda geri alınır) ----------
  insert into auth.users (id, email) values (v_owner,  'sched-test-' || v_owner  || '@workigom.test'),
                                            (v_owner2, 'sched-test-' || v_owner2 || '@workigom.test');
  insert into public.organizations (owner_id, name, timezone, default_appointment_duration_minutes)
    values (v_owner, 'SCHED TEST 1', tz, 30) returning id into v_org;
  insert into public.organizations (owner_id, name, timezone, default_appointment_duration_minutes)
    values (v_owner2, 'SCHED TEST 2', tz, 30) returning id into v_org2;
  insert into public.calendars (id, org_id, name, is_active, working_hours) values
    (v_calA, v_org, 'T-A', true, '{"mon":[["09:00","12:00"],["13:00","17:00"]],"sun":[]}'::jsonb),
    (v_calB, v_org, 'T-B', true, null),
    (v_cal2, v_org2, 'T-2', true, null);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);

  -- T1 çalışma saatleri + öğle arası: 09:00–11:30 (6) + 13:00–16:30 (8) = 14 slot
  select count(*), bool_and(local_time not in ('12:00','12:30','17:00')) into c, ok from public._slot_grid_org(v_org, v_mon, v_calA);
  if c <> 14 or not ok then raise exception 'FAIL T1: Pzt T-A slot sayısı % (beklenen 14) / öğle arası=%', c, ok; end if; n := n + 1;
  -- T2 kapalı gün (Pazar boş dizi)
  select count(*) into c from public._slot_grid_org(v_org, v_sun, v_calA);
  if c <> 0 then raise exception 'FAIL T2: kapalı günde % slot', c; end if; n := n + 1;
  -- T3 varsayılan saatler (tanımsız → 09:00–17:30 = 18)
  select count(*) into c from public._slot_grid_org(v_org, v_mon, v_calB);
  if c <> 18 then raise exception 'FAIL T3: varsayılan slot sayısı % (beklenen 18)', c; end if; n := n + 1;

  -- T4 süreli çakışma: 10:00–11:00 randevu → 10:00 ve 10:30 dolu, 09:30 ve 11:00 boş
  insert into public.appointments (org_id, calendar_id, customer_phone, customer_name, date, starts_at, ends_at, status, booking_token, source)
    values (v_org, v_calA, '905550000001@c.us', 'Test A', v_mon || 'T10:00:00',
            (v_mon + time '10:00') at time zone tz, (v_mon + time '11:00') at time zone tz, 'Approved', 'sched-' || gen_random_uuid(), 'web');
  select string_agg(local_time || '=' || status, ',' order by local_time) into s from public._slot_grid_org(v_org, v_mon, v_calA) where local_time in ('09:30','10:00','10:30','11:00');
  if s <> '09:30=free,10:00=booked,10:30=booked,11:00=free' then raise exception 'FAIL T4: %', s; end if; n := n + 1;
  -- T5 iptal saati açar
  update public.appointments set status = 'Cancelled' where calendar_id = v_calA;
  select status into s from public._slot_grid_org(v_org, v_mon, v_calA) where local_time = '10:00';
  if s <> 'free' then raise exception 'FAIL T5: iptal sonrası 10:00 = %', s; end if; n := n + 1;

  -- T6 doktor rezervasyonu: yalnız o doktor kapanır
  r := public.create_calendar_block(v_calA, v_mon || 'T13:00', v_mon || 'T14:00', 'meeting', 'test');
  if r->>'status' <> 'SUCCESS' then raise exception 'FAIL T6a: %', r; end if;
  select string_agg(local_time || '=' || status, ',' order by local_time) into s from public._slot_grid_org(v_org, v_mon, v_calA) where local_time in ('13:00','13:30','14:00');
  if s <> '13:00=blocked,13:30=blocked,14:00=free' then raise exception 'FAIL T6b: %', s; end if;
  select status into s from public._slot_grid_org(v_org, v_mon, v_calB) where local_time = '13:00';
  if s <> 'free' then raise exception 'FAIL T6c: başka doktor 13:00 = %', s; end if; n := n + 1;
  -- T7 klinik geneli rezervasyon: iki doktor da kapanır
  r := public.create_calendar_block(null, v_mon || 'T15:00', v_mon || 'T15:30', 'break', null);
  if r->>'status' <> 'SUCCESS' then raise exception 'FAIL T7a: %', r; end if;
  select count(*) into c from public._slot_grid_org(v_org, v_mon) where local_time = '15:00' and status = 'blocked';
  if c <> 2 then raise exception 'FAIL T7b: 15:00 rezerve doktor sayısı %', c; end if; n := n + 1;
  -- T8 çift rezervasyon reddedilir (aynı doktor; klinik bloğunun altına doktor bloğu)
  r := public.create_calendar_block(v_calA, v_mon || 'T13:30', v_mon || 'T14:00', 'meeting', null);
  if r->>'status' <> 'ALREADY_BLOCKED' then raise exception 'FAIL T8a: %', r; end if;
  r := public.create_calendar_block(v_calB, v_mon || 'T15:00', v_mon || 'T15:30', 'meeting', null);
  if r->>'status' <> 'ALREADY_BLOCKED' then raise exception 'FAIL T8b: %', r; end if; n := n + 1;
  -- T9 randevu üstüne rezervasyon açılmaz, çakışan randevu listelenir
  insert into public.appointments (org_id, calendar_id, customer_phone, customer_name, date, starts_at, ends_at, status, booking_token, source)
    values (v_org, v_calB, '905550000002@c.us', 'Test B', v_mon || 'T09:00:00',
            (v_mon + time '09:00') at time zone tz, (v_mon + time '09:30') at time zone tz, 'Pending', 'sched-' || gen_random_uuid(), 'web');
  r := public.create_calendar_block(v_calB, v_mon || 'T09:00', v_mon || 'T10:00', 'leave', null);
  if r->>'status' <> 'CONFLICTS_WITH_APPOINTMENTS' or (r->'appointments'->0->>'customer_name') <> 'Test B' then raise exception 'FAIL T9: %', r; end if; n := n + 1;
  -- T10 rezerve saate randevu yazılamaz (koruma tetikleyicisi)
  begin
    insert into public.appointments (org_id, calendar_id, customer_phone, customer_name, date, starts_at, ends_at, status, booking_token, source)
      values (v_org, v_calA, '905550000003@c.us', 'Test C', v_mon || 'T13:00:00',
              (v_mon + time '13:00') at time zone tz, (v_mon + time '13:30') at time zone tz, 'Pending', 'sched-' || gen_random_uuid(), 'web');
    raise exception 'FAIL T10: rezerve saate randevu yazıldı';
  exception when exclusion_violation then null;
  end; n := n + 1;

  -- T11 SAATİ GEÇMİŞ RANDEVU IZGARADA KALIR (30.09 hatası): geçmiş gün 10:00 dolu, 11:00 geçmiş
  insert into public.appointments (org_id, calendar_id, customer_phone, customer_name, date, starts_at, ends_at, status, booking_token, source)
    values (v_org, v_calB, '905550000004@c.us', 'Test D', v_past || 'T10:00:00',
            (v_past + time '10:00') at time zone tz, (v_past + time '10:30') at time zone tz, 'Approved', 'sched-' || gen_random_uuid(), 'web');
  select string_agg(local_time || '=' || status, ',' order by local_time) into s from public._slot_grid_org(v_org, v_past, v_calB) where local_time in ('10:00','11:00');
  if s <> '10:00=booked,11:00=past' then raise exception 'FAIL T11: %', s; end if; n := n + 1;

  -- T12 WhatsApp AI boş saat listesi: 13:00'te yalnız T-B, 15:00 hiç yok, geçmiş günde hiç yok
  select string_agg(x->>'name', ',' order by x->>'name') into s
    from public.get_available_slots_for_org(v_org, v_mon) g, jsonb_array_elements(g.calendars) x where g.local_time = '13:00';
  if s <> 'T-B' then raise exception 'FAIL T12a: 13:00 müsait doktorlar = %', s; end if;
  select count(*) into c from public.get_available_slots_for_org(v_org, v_mon) where local_time = '15:00';
  if c <> 0 then raise exception 'FAIL T12b: klinik molası AI listesinde'; end if;
  select count(*) into c from public.get_available_slots_for_org(v_org, v_past);
  if c <> 0 then raise exception 'FAIL T12c: geçmiş günde % boş saat', c; end if; n := n + 1;

  -- T13 kiracı izolasyonu: ikinci işletmenin klinik bloğu birinciyi etkilemez; listeler karışmaz
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner2, 'role', 'authenticated')::text, true);
  r := public.create_calendar_block(null, v_mon || 'T11:00', v_mon || 'T12:00', 'leave', null);
  if r->>'status' <> 'SUCCESS' then raise exception 'FAIL T13a: %', r; end if;
  select status into s from public._slot_grid_org(v_org, v_mon, v_calA) where local_time = '11:00';
  if s <> 'free' then raise exception 'FAIL T13b: başka işletmenin bloğu etkiledi (%)', s; end if;
  select count(*) into c from public.get_available_slots_for_org(v_org2, v_mon) g, jsonb_array_elements(g.calendars) x where x->>'name' in ('T-A','T-B');
  if c <> 0 then raise exception 'FAIL T13c: ikinci işletmeye birincinin doktorları listelendi'; end if; n := n + 1;

  -- T14 eski sahip-kimliği sütunları kaldırıldı (Faz F5c): yeniden eklenirse test kırılır
  if exists (select 1 from information_schema.columns where table_schema = 'public'
             and ((table_name = 'calendars' and column_name = 'merchant_id')
               or (table_name = 'appointments' and column_name = 'organization_id')
               or (table_name = 'calendar_blocks' and column_name = 'organization_id')))
  then raise exception 'FAIL T14: eski sahip-kimliği sütunu geri gelmiş'; end if; n := n + 1;
  -- T15 sahip kimliği sarmalayıcıları hâlâ motoru çağırıyor (WhatsApp AI uyumu): aynı sonuç
  select count(*) into c from public._slot_grid(v_owner, v_mon, v_calA);
  if c <> 14 then raise exception 'FAIL T15: _slot_grid sarmalayıcısı % slot (beklenen 14)', c; end if; n := n + 1;

  raise exception 'SCHEDULING_CORE_TESTS_OK: % kontrol geçti (tüm değişiklikler geri alındı)', n;
end $$;
