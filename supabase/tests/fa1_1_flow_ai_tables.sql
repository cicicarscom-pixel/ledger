-- FA1-1 izolasyon testi (Claude, 03.10.2026). Tek DO bloğu, sonda istisna → her şey geri alınır.
-- Başarı: ERROR "FA1_1_TESTS_OK: N kontrol geçti ..."
do $$
declare
  n int := 0; o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid(); g1 uuid; g2 uuid;
  c1 uuid; m1 uuid; p1 uuid; c int;
begin
  insert into auth.users (id, email) values (o1, 'fa11-1-' || o1 || '@workigom.test'), (o2, 'fa11-2-' || o2 || '@workigom.test');
  insert into public.organizations (owner_id, name) values (o1, 'FA11 ISLETME 1') returning id into g1;
  insert into public.organizations (owner_id, name) values (o2, 'FA11 ISLETME 2') returning id into g2;

  -- sunucu (postgres/service) tarafı: bekleyen eylem + kullanım kaydı
  insert into public.flow_ai_pending_actions (org_id, user_id, tool_name, risk_level, payload_hash) values (g1, o1, 'publish_post', 'EXTERNAL_ACTION', 'h') returning id into p1;
  insert into public.ai_usage_events (org_id, user_id, source, event_type) values (g1, o1, 'flow_ai', 'message');

  -- T1 sahibi kendi konuşmasını açar, mesaj yazar, kendi eylemini ve kullanımını görür
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.flow_ai_conversations (org_id, user_id, title) values (g1, o1, 'test') returning id into c1;
  insert into public.flow_ai_messages (conversation_id, org_id, role, content) values (c1, g1, 'user', 'merhaba');
  select count(*) into c from public.flow_ai_messages where conversation_id = c1; if c <> 1 then raise exception 'FAIL T1a'; end if;
  select count(*) into c from public.flow_ai_pending_actions; if c <> 1 then raise exception 'FAIL T1b: %', c; end if;
  select count(*) into c from public.ai_usage_events; if c <> 1 then raise exception 'FAIL T1c: %', c; end if;
  n := n + 1;

  -- T2 istemci kendi eylemini onaylayamaz / yazamaz / kullanım kaydı yazamaz
  begin update public.flow_ai_pending_actions set status = 'approved' where id = p1; raise exception 'FAIL T2a: istemci update yaptı';
  exception when insufficient_privilege then null; end;
  begin insert into public.flow_ai_pending_actions (org_id, user_id, tool_name, risk_level, payload_hash) values (g1, o1, 'x', 'READ', 'h'); raise exception 'FAIL T2b';
  exception when insufficient_privilege then null; end;
  begin insert into public.ai_usage_events (org_id, source, event_type) values (g1, 'flow_ai', 'message'); raise exception 'FAIL T2c';
  exception when insufficient_privilege then null; end;
  n := n + 1;

  -- T3 istemci 'assistant' rolünde mesaj yazamaz; mesajı değiştiremez/silemez
  begin insert into public.flow_ai_messages (conversation_id, org_id, role, content) values (c1, g1, 'assistant', 'sahte'); raise exception 'FAIL T3a';
  exception when insufficient_privilege or check_violation then null; end;
  begin update public.flow_ai_messages set content = 'x' where conversation_id = c1; raise exception 'FAIL T3b';
  exception when insufficient_privilege then null; end;
  n := n + 1;

  -- T4 başka işletme hiçbir şey görmez, başkasının konuşmasına mesaj yazamaz, kendi org'u adına sahte org_id yazamaz
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.flow_ai_conversations; if c <> 0 then raise exception 'FAIL T4a'; end if;
  select count(*) into c from public.flow_ai_messages; if c <> 0 then raise exception 'FAIL T4b'; end if;
  select count(*) into c from public.flow_ai_pending_actions; if c <> 0 then raise exception 'FAIL T4c'; end if;
  select count(*) into c from public.ai_usage_events; if c <> 0 then raise exception 'FAIL T4d'; end if;
  begin insert into public.flow_ai_messages (conversation_id, org_id, role, content) values (c1, g2, 'user', 'saldırı'); raise exception 'FAIL T4e';
  exception when insufficient_privilege or check_violation then null; end;
  begin insert into public.flow_ai_conversations (org_id, user_id, title) values (g1, o2, 'sahte'); raise exception 'FAIL T4f';
  exception when insufficient_privilege or check_violation then null; end;
  n := n + 1;

  -- T5 anon hiçbir şey okuyamaz
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  begin perform 1 from public.flow_ai_conversations limit 1; raise exception 'FAIL T5a';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  n := n + 1;

  -- T6 kaskad: konuşma silinince mesajlar gider (katalogdan doğrulanır; DELETE içeren komutlar MCP onay kapısında takılıyor)
  select count(*) into c from pg_constraint where conrelid = 'public.flow_ai_messages'::regclass and confrelid = 'public.flow_ai_conversations'::regclass and confdeltype = 'c';
  if c <> 1 then raise exception 'FAIL T6: kaskad yok'; end if;
  n := n + 1;

  raise exception 'FA1_1_TESTS_OK: % kontrol geçti (tüm değişiklikler geri alındı)', n;
end $$;
