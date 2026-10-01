-- Muhasebeci bağlantısı yaşam döngüsü testleri (Claude, 01.10.2026).
-- GÜVENLİK: tek DO bloğu, HER DURUMDA sonda istisna → tüm değişiklikler geri alınır.
--   Başarı: ERROR "ACCOUNTANT_CONNECTION_TESTS_OK: N kontrol geçti"   Hata: ERROR "FAIL Ex: ..."
-- Yalnız Claude çalıştırır (AGENTS.md: SQL yalnız Claude).
do $$
declare
  n int := 0;
  vT uuid := gen_random_uuid();   -- işletme sahibi
  vA1 uuid := gen_random_uuid();  -- firma 1 üyesi
  vA2 uuid := gen_random_uuid();  -- firma 2 üyesi
  vOrg uuid; vF1 uuid; vF2 uuid; vL1 uuid; vL2 uuid;
  c1 text := 'TSTF1' || substr(md5(random()::text), 1, 6);
  c2 text := 'TSTF2' || substr(md5(random()::text), 1, 6);
  r jsonb; x record; k int;
begin
  insert into auth.users (id, email) values (vT, 'atl-test-t-' || vT || '@workigom.test'), (vA1, 'atl-test-a1-' || vA1 || '@workigom.test'), (vA2, 'atl-test-a2-' || vA2 || '@workigom.test');
  insert into public.organizations (owner_id, name) values (vT, 'ATL TEST ISLETME') returning id into vOrg;
  insert into public.accounting_firms (firm_name, connection_code) values ('ATL Firma 1', c1) returning id into vF1;
  insert into public.accounting_firms (firm_name, connection_code) values ('ATL Firma 2', c2) returning id into vF2;
  insert into public.accounting_firm_members (accounting_firm_id, user_id) values (vF1, vA1), (vF2, vA2);

  -- E1 oturumsuz çağrı reddedilir
  perform set_config('request.jwt.claims', '', true);
  if (public.request_accountant_connection(c1)->>'status') <> 'UNAUTHORIZED' then raise exception 'FAIL E1'; end if; n := n + 1;

  perform set_config('request.jwt.claims', json_build_object('sub', vT, 'role', 'authenticated')::text, true);
  -- E2 kod çözme
  if (public.resolve_accountant_code('YOKBOYLEKOD')->>'status') <> 'CODE_NOT_FOUND' then raise exception 'FAIL E2a'; end if;
  r := public.resolve_accountant_code(c1);
  if r->>'status' <> 'SUCCESS' or r->>'firm_name' <> 'ATL Firma 1' then raise exception 'FAIL E2b: %', r; end if; n := n + 1;
  -- E3 istek → pending, olay + get_my
  r := public.request_accountant_connection(c1); vL1 := (r->>'link_id')::uuid;
  if r->>'status' <> 'SUCCESS' or vL1 is null then raise exception 'FAIL E3a: %', r; end if;
  select status, source, initiated_by_user_id into x from public.accountant_taxpayer_links where id = vL1;
  if x.status <> 'pending_confirmation' or x.source <> 'advisor_code' or x.initiated_by_user_id <> vT then raise exception 'FAIL E3b: %', x; end if;
  if (select count(*) from public.accountant_connection_events where taxpayer_organization_id = vOrg and event_type = 'connection.requested' and source = 'flow' and actor_user_id = vT) <> 1 then raise exception 'FAIL E3c: olay yok'; end if;
  if (public.get_my_accountant_connection()->>'status') <> 'pending_confirmation' then raise exception 'FAIL E3d'; end if; n := n + 1;
  -- E4 tekrar istek → REQUEST_PENDING
  if (public.request_accountant_connection(c1)->>'status') <> 'REQUEST_PENDING' then raise exception 'FAIL E4'; end if; n := n + 1;

  -- E5 GÜVENLİK: onay beklerken muhasebeci belgeye ERİŞEMEZ
  perform set_config('request.jwt.claims', json_build_object('sub', vA1, 'role', 'authenticated')::text, true);
  if public.check_accountant_document_access(vOrg) then raise exception 'FAIL E5: pending iken erişim var'; end if; n := n + 1;
  -- E6 başka firma onaylayamaz
  perform set_config('request.jwt.claims', json_build_object('sub', vA2, 'role', 'authenticated')::text, true);
  if (public.review_connection_request(vL1, 'accept')->>'status') <> 'NOT_FOUND' then raise exception 'FAIL E6'; end if; n := n + 1;
  -- E7 firma 1 onaylar → active, zaman/onaylayan, bildirim, erişim
  perform set_config('request.jwt.claims', json_build_object('sub', vA1, 'role', 'authenticated')::text, true);
  r := public.review_connection_request(vL1, 'accept');
  if r->>'status' <> 'SUCCESS' then raise exception 'FAIL E7a: %', r; end if;
  select status, connected_at, confirmed_by_user_id into x from public.accountant_taxpayer_links where id = vL1;
  if x.status <> 'active' or x.connected_at is null or x.confirmed_by_user_id <> vA1 then raise exception 'FAIL E7b: %', x; end if;
  if not exists (select 1 from public.notifications where profile_id = vOrg and metadata->>'event' = 'connection.accepted') then raise exception 'FAIL E7c: kabul bildirimi yok'; end if;
  if not public.check_accountant_document_access(vOrg) then raise exception 'FAIL E7d: aktifken erişim yok'; end if; n := n + 1;

  perform set_config('request.jwt.claims', json_build_object('sub', vT, 'role', 'authenticated')::text, true);
  -- E8 aynı firmaya tekrar → ALREADY_CONNECTED; get_my active
  if (public.request_accountant_connection(c1)->>'status') <> 'ALREADY_CONNECTED' then raise exception 'FAIL E8a'; end if;
  if (public.get_my_accountant_connection()->>'status') <> 'active' then raise exception 'FAIL E8b'; end if; n := n + 1;
  -- E9 geçersiz geçiş ve geçersiz ilk durum reddedilir (her yazma yolu için)
  begin update public.accountant_taxpayer_links set status = 'rejected' where id = vL1; raise exception 'FAIL E9a: active->rejected izinli';
  exception when check_violation then null; end;
  begin insert into public.accountant_taxpayer_links (accounting_firm_id, taxpayer_organization_id, status, source, initiated_by_user_id) values (vF2, vOrg, 'active', 'advisor_code', vT);
    raise exception 'FAIL E9b: davetsiz active ekleme izinli';
  exception when check_violation then null; end; n := n + 1;

  -- E10 firma değiştirme: F2'ye istek, F2 onaylar → F1 'replaced', erişim F1'den F2'ye geçer
  r := public.request_accountant_connection(c2); vL2 := (r->>'link_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', vA2, 'role', 'authenticated')::text, true);
  if (public.review_connection_request(vL2, 'accept')->>'status') <> 'SUCCESS' then raise exception 'FAIL E10a'; end if;
  if (select status from public.accountant_taxpayer_links where id = vL1) <> 'replaced' then raise exception 'FAIL E10b: eski bağlantı replaced değil'; end if;
  if not public.check_accountant_document_access(vOrg) then raise exception 'FAIL E10c: yeni firma erişemiyor'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', vA1, 'role', 'authenticated')::text, true);
  if public.check_accountant_document_access(vOrg) then raise exception 'FAIL E10d: değiştirilen firma hâlâ erişiyor'; end if;
  if not exists (select 1 from public.notifications where profile_id = vOrg and metadata->>'event' = 'connection.replaced') then raise exception 'FAIL E10e'; end if; n := n + 1;

  -- E11 işletme koparır → disconnected, kaynak flow, erişim kapanır, işletmeye bildirim GİTMEZ
  perform set_config('request.jwt.claims', json_build_object('sub', vT, 'role', 'authenticated')::text, true);
  if (public.disconnect_current_accountant('test')->>'status') <> 'SUCCESS' then raise exception 'FAIL E11a'; end if;
  select status, disconnect_source, disconnected_by_user_id, disconnected_at into x from public.accountant_taxpayer_links where id = vL2;
  if x.status <> 'disconnected' or x.disconnect_source <> 'flow' or x.disconnected_by_user_id <> vT or x.disconnected_at is null then raise exception 'FAIL E11b: %', x; end if;
  if exists (select 1 from public.notifications where profile_id = vOrg and metadata->>'event' = 'connection.disconnected') then raise exception 'FAIL E11c: kendi koparmasına bildirim'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', vA2, 'role', 'authenticated')::text, true);
  if public.check_accountant_document_access(vOrg) then raise exception 'FAIL E11d: koptuktan sonra erişim var'; end if; n := n + 1;

  -- E12 yeniden istek (replaced → pending) + geri çekme (bildirim yok)
  perform set_config('request.jwt.claims', json_build_object('sub', vT, 'role', 'authenticated')::text, true);
  if (public.request_accountant_connection(c1)->>'status') <> 'SUCCESS' then raise exception 'FAIL E12a'; end if;
  if not exists (select 1 from public.accountant_connection_events where taxpayer_organization_id = vOrg and event_type = 'connection.re_requested') then raise exception 'FAIL E12b'; end if;
  if (public.cancel_accountant_request()->>'status') <> 'SUCCESS' then raise exception 'FAIL E12c'; end if;
  if (select status from public.accountant_taxpayer_links where id = vL1) <> 'rejected' then raise exception 'FAIL E12d'; end if;
  if exists (select 1 from public.notifications where profile_id = vOrg and metadata->>'event' = 'connection.rejected') then raise exception 'FAIL E12e: geri çekmeye ret bildirimi'; end if; n := n + 1;

  -- E13 firma tarafı koparma (Ledger): bildirim gider
  if (public.request_accountant_connection(c2)->>'status') <> 'SUCCESS' then raise exception 'FAIL E13a'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', vA2, 'role', 'authenticated')::text, true);
  if (public.review_connection_request(vL2, 'accept')->>'status') <> 'SUCCESS' then raise exception 'FAIL E13b'; end if;
  if (public.disconnect_taxpayer(vL2, 'sözleşme bitti')->>'status') <> 'SUCCESS' then raise exception 'FAIL E13c'; end if;
  if (select disconnect_source from public.accountant_taxpayer_links where id = vL2) <> 'ledger' then raise exception 'FAIL E13d'; end if;
  if not exists (select 1 from public.notifications where profile_id = vOrg and metadata->>'event' = 'connection.disconnected') then raise exception 'FAIL E13e: firma koparmasına bildirim yok'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', vA1, 'role', 'authenticated')::text, true);
  if (public.disconnect_taxpayer(vL2, null)->>'status') <> 'NOT_FOUND' then raise exception 'FAIL E13f: başka firma koparabildi'; end if; n := n + 1;

  -- E14 her durum değişikliği olay kaydında, aktör ve kaynakla
  select count(*) into k from public.accountant_connection_events where taxpayer_organization_id = vOrg;
  if k < 10 or exists (select 1 from public.accountant_connection_events where taxpayer_organization_id = vOrg and (source is null or new_status is null)) then raise exception 'FAIL E14: olay sayısı % / eksik alan', k; end if; n := n + 1;

  raise exception 'ACCOUNTANT_CONNECTION_TESTS_OK: % kontrol geçti (tüm değişiklikler geri alındı)', n;
end $$;
