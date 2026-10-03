-- FA3-1 izolasyon testi (Claude, 03.10.2026). Tek DO bloğu, sonda istisna → geri alınır.
-- Başarı: ERROR "FA3_1_TESTS_OK: 6 kontrol geçti ..."   (DELETE içermez: MCP onay kapısı)
do $$
declare n int := 0; o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid(); g1 uuid; g2 uuid; d1 uuid; c int;
begin
  insert into auth.users (id, email) values (o1, 'fa31-1-' || o1 || '@workigom.test'), (o2, 'fa31-2-' || o2 || '@workigom.test');
  insert into public.organizations (owner_id, name) values (o1, 'FA31 ISLETME 1') returning id into g1;
  insert into public.organizations (owner_id, name) values (o2, 'FA31 ISLETME 2') returning id into g2;
  insert into public.flow_ai_post_drafts (org_id, user_id, caption, platforms) values (g1, o1, 'Yaz kampanyası başladı!', array['instagram','facebook']) returning id into d1;
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.flow_ai_post_drafts; if c <> 1 then raise exception 'FAIL T1: %', c; end if; n := n + 1;
  begin insert into public.flow_ai_post_drafts (org_id, user_id, caption) values (g1, o1, 'sahte'); raise exception 'FAIL T2a';
  exception when insufficient_privilege then null; end;
  begin update public.flow_ai_post_drafts set caption = 'değişti' where id = d1; raise exception 'FAIL T2b';
  exception when insufficient_privilege then null; end;
  n := n + 1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.flow_ai_post_drafts; if c <> 0 then raise exception 'FAIL T3: %', c; end if; n := n + 1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  begin perform 1 from public.flow_ai_post_drafts limit 1; raise exception 'FAIL T4';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  n := n + 1;
  begin insert into public.flow_ai_post_drafts (org_id, user_id, caption) values (g1, o1, ''); raise exception 'FAIL T5a';
  exception when check_violation then null; end;
  begin insert into public.flow_ai_post_drafts (org_id, user_id, caption, platforms) values (g1, o1, 'x', array['a','b','c','d','e','f','g','h','i','j','k']); raise exception 'FAIL T5b';
  exception when check_violation then null; end;
  n := n + 1;
  select count(*) into c from pg_constraint where conrelid = 'public.flow_ai_post_drafts'::regclass and confrelid = 'public.organizations'::regclass and confdeltype = 'c';
  if c <> 1 then raise exception 'FAIL T6'; end if; n := n + 1;
  raise exception 'FA3_1_TESTS_OK: % kontrol geçti (tüm değişiklikler geri alındı)', n;
end $$;
