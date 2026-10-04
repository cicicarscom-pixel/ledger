-- F4-1a — Kuruluş sahibi, kimlik göndermeden yazabilir; satır doğru kuruluşa düşer ve eski sütun tetikleyiciyle dolar.
-- Test, sonunda bilerek EXCEPTION fırlatır (tüm eklemeler geri alınır); mesaj "F4-1a TEST OK" ile başlamalı.
-- :owner yerine bir kuruluş sahibinin auth.users.id değerini yazın.
do $$
declare r1 record; r2 record; r3 record; v_owner uuid := (select owner_id from public.organizations order by created_at desc limit 1);
begin
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.calendars (name) values ('__f4_test') returning org_id, merchant_id into r1;
  insert into public.business_services (name, price) values ('__f4_test', 1) returning org_id, merchant_id into r2;
  insert into public.organization_ai_settings (updated_at) values (now())
    on conflict (org_id) do update set updated_at = excluded.updated_at returning org_id, merchant_id into r3;
  reset role;
  if r1.org_id is null or r1.merchant_id <> v_owner or r2.org_id <> r1.org_id or r3.org_id <> r1.org_id then
    raise exception 'F4-1a TEST BAŞARISIZ';
  end if;
  raise exception 'F4-1a TEST OK (geri alındı)';
end $$;
