-- Faz E2 testleri: kod deneme sınırı, sahipsiz firma, harf duyarsızlık, günlük tablosu erişimi (Claude, 10.10.2026).
-- GÜVENLİK: tek DO bloğu, HER DURUMDA sonda istisna → tüm değişiklikler geri alınır.
--   Başarı: ERROR "ACCOUNTANT_CODE_HARDENING_TESTS_OK: N kontrol geçti"   Hata: ERROR "FAIL Hx: ..."
-- Yalnız Claude çalıştırır.
do $$
declare
  n int := 0;
  vT uuid := gen_random_uuid();    -- işletme sahibi 1 (sınır testi)
  vT2 uuid := gen_random_uuid();   -- işletme sahibi 2 (etkilenmemeli)
  vA uuid := gen_random_uuid();    -- firma üyesi
  vOrg uuid; vOrg2 uuid; vF uuid; vO uuid;
  c1 text := 'TSTH' || substr(md5(random()::text), 1, 6);   -- üyeli firma kodu (büyük harf)
  c2 text := 'TSTO' || substr(md5(random()::text), 1, 6);   -- sahipsiz firma kodu
  r jsonb; i int; ok boolean;
begin
  insert into auth.users (id, email) values (vT, 'h-test-t-' || vT || '@workigom.test'), (vT2, 'h-test-t2-' || vT2 || '@workigom.test'), (vA, 'h-test-a-' || vA || '@workigom.test');
  insert into public.organizations (owner_id, name) values (vT, 'H TEST 1') returning id into vOrg;
  insert into public.organizations (owner_id, name) values (vT2, 'H TEST 2') returning id into vOrg2;
  insert into public.accounting_firms (firm_name, connection_code) values ('H Firma', c1) returning id into vF;
  insert into public.accounting_firms (firm_name, connection_code) values ('H Sahipsiz', c2) returning id into vO;
  insert into public.accounting_firm_members (accounting_firm_id, user_id) values (vF, vA);

  perform set_config('request.jwt.claims', json_build_object('sub', vT, 'role', 'authenticated')::text, true);

  -- H1 harf duyarsız: küçük harfle yazılan kod çözülür
  r := public.resolve_accountant_code(lower(c1));
  if r->>'status' <> 'SUCCESS' or r->>'firm_name' <> 'H Firma' then raise exception 'FAIL H1: %', r; end if; n := n + 1;
  -- H2 sahipsiz firma (üyesi yok): çözülmez ve istek açılmaz
  if (public.resolve_accountant_code(c2)->>'status') <> 'CODE_NOT_FOUND' then raise exception 'FAIL H2a'; end if;
  if (public.request_accountant_connection(c2)->>'status') <> 'CODE_NOT_FOUND' then raise exception 'FAIL H2b'; end if;
  if exists (select 1 from public.accountant_taxpayer_links where accounting_firm_id = vO) then raise exception 'FAIL H2c: sahipsiz firmaya bağlantı satırı açıldı'; end if; n := n + 1;
  -- H3 başarılı çözümler sınıra SAYILMAZ (2 başarısız + 15 başarılı sonrası hâlâ çalışır)
  if (public.resolve_accountant_code('YOK-1')->>'status') <> 'CODE_NOT_FOUND' then raise exception 'FAIL H3a'; end if;
  for i in 1..15 loop
    if (public.resolve_accountant_code(c1)->>'status') <> 'SUCCESS' then raise exception 'FAIL H3b: başarılı çözüm % sınıra takıldı', i; end if;
  end loop; n := n + 1;
  -- H4 deneme sınırı: toplam 10 başarısız → 11'inci çağrı, geçerli kod bile olsa RATE_LIMITED
  --  (H2'de 2 + H3'te 1 = 3 başarısız yazıldı; 7 daha)
  for i in 1..7 loop
    if (public.resolve_accountant_code('YOK-X' || i)->>'status') <> 'CODE_NOT_FOUND' then raise exception 'FAIL H4a: deneme % beklenmedik', i; end if;
  end loop;
  if (public.resolve_accountant_code(c1)->>'status') <> 'RATE_LIMITED' then raise exception 'FAIL H4b: 10 başarısızdan sonra geçerli kod hâlâ çözülüyor'; end if;
  if (public.request_accountant_connection(c1)->>'status') <> 'RATE_LIMITED' then raise exception 'FAIL H4c: istek yolu sınırı atladı'; end if;
  if exists (select 1 from public.accountant_taxpayer_links where accounting_firm_id = vF) then raise exception 'FAIL H4d: sınırdayken istek oluştu'; end if; n := n + 1;
  -- H5 sınır kullanıcıya özgü: başka işletme etkilenmez ve bağlanabilir
  perform set_config('request.jwt.claims', json_build_object('sub', vT2, 'role', 'authenticated')::text, true);
  if (public.resolve_accountant_code(c1)->>'status') <> 'SUCCESS' then raise exception 'FAIL H5a: başka kullanıcı etkilendi'; end if;
  if (public.request_accountant_connection(lower(c1))->>'status') <> 'SUCCESS' then raise exception 'FAIL H5b'; end if;
  if (select status from public.accountant_taxpayer_links where taxpayer_organization_id = vOrg2 and accounting_firm_id = vF) <> 'pending_confirmation' then raise exception 'FAIL H5c'; end if; n := n + 1;
  -- H6 pencere dışı: 16 dk önceki başarısızlıklar sayılmaz → kullanıcı 1 yeniden çözebilir
  update public.accountant_code_attempts set attempted_at = now() - interval '16 minutes' where user_id = vT;
  perform set_config('request.jwt.claims', json_build_object('sub', vT, 'role', 'authenticated')::text, true);
  if (public.resolve_accountant_code(c1)->>'status') <> 'SUCCESS' then raise exception 'FAIL H6a: pencere dolunca hâlâ kilitli'; end if;
  if (public.resolve_accountant_code('YOK-Y')->>'status') <> 'CODE_NOT_FOUND' then raise exception 'FAIL H6b'; end if;
  if (select fail_count from public.accountant_code_attempts where user_id = vT) <> 1 then raise exception 'FAIL H6c: pencere dolunca sayaç 1den başlamadı'; end if; n := n + 1;
  -- H7 oturumsuz çağrı hâlâ UNAUTHORIZED; günlük tablosu istemciye KAPALI
  perform set_config('request.jwt.claims', '', true);
  if (public.resolve_accountant_code(c1)->>'status') <> 'UNAUTHORIZED' then raise exception 'FAIL H7a'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', vT, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform 1 from public.accountant_code_attempts limit 1;
    raise exception 'FAIL H7b: günlük tablosu istemciye açık';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role'; n := n + 1;

  raise exception 'ACCOUNTANT_CODE_HARDENING_TESTS_OK: % kontrol geçti (tüm değişiklikler geri alındı)', n;
end $$;
