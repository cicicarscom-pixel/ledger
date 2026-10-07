-- FA7-1 izolasyon ve kısıt testi (Claude, 07.10.2026). Tek DO bloğu, sonda istisna → geri alınır.
-- Başarı: ERROR "FA7_1_TESTS_OK: N kontrol geçti ..."   (DELETE içermez: MCP onay kapısı)
do $$
declare n int := 0; o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid(); g1 uuid; g2 uuid;
        m1 uuid; pl1 uuid; t1 uuid; c int;
begin
  insert into auth.users (id, email) values (o1, 'fa71-1-' || o1 || '@workigom.test'), (o2, 'fa71-2-' || o2 || '@workigom.test');
  insert into public.organizations (owner_id, name) values (o1, 'FA71 ISLETME 1') returning id into g1;
  insert into public.organizations (owner_id, name) values (o2, 'FA71 ISLETME 2') returning id into g2;

  insert into public.flow_ai_media (org_id, user_id, media_type, mime_type, storage_bucket, storage_path, size_bytes, duration_sec, width, height)
    values (g1, o1, 'video', 'video/mp4', 'post-media', g1 || '/a.mp4', 5000000, 42.5, 1080, 1920) returning id into m1;
  insert into public.flow_ai_publish_plans (org_id, user_id, media_id) values (g1, o1, m1) returning id into pl1;
  insert into public.flow_ai_publish_targets (plan_id, org_id, platform, format, caption) values (pl1, g1, 'instagram', 'reel', 'Merhaba') returning id into t1;
  insert into public.org_ai_autopublish (org_id) values (g1);

  -- T1: üretilen sütun + varsayılanlar
  select count(*) into c from public.flow_ai_media where id = m1 and aspect_ratio = 0.5625; if c <> 1 then raise exception 'FAIL T1a'; end if;
  select count(*) into c from public.org_ai_autopublish where org_id = g1 and enabled = false and daily_limit = 5; if c <> 1 then raise exception 'FAIL T1b'; end if;
  select count(*) into c from public.flow_ai_publish_plans where id = pl1 and status = 'draft' and mode = 'approved' and idempotency_key is not null; if c <> 1 then raise exception 'FAIL T1c'; end if;
  n := n + 1;

  -- T2: sahibi kendi kaydını görür (5 tablo), başkası görmez
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.flow_ai_media; if c <> 1 then raise exception 'FAIL T2a: %', c; end if;
  select count(*) into c from public.flow_ai_publish_plans; if c <> 1 then raise exception 'FAIL T2b: %', c; end if;
  select count(*) into c from public.flow_ai_publish_targets; if c <> 1 then raise exception 'FAIL T2c: %', c; end if;
  select count(*) into c from public.org_ai_autopublish; if c <> 1 then raise exception 'FAIL T2d: %', c; end if;
  select count(*) into c from public.social_format_rules; if c < 10 then raise exception 'FAIL T2e: %', c; end if;
  execute 'reset role';
  n := n + 1;
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.flow_ai_media; if c <> 0 then raise exception 'FAIL T2f: %', c; end if;
  select count(*) into c from public.flow_ai_publish_plans; if c <> 0 then raise exception 'FAIL T2g: %', c; end if;
  select count(*) into c from public.flow_ai_publish_targets; if c <> 0 then raise exception 'FAIL T2h: %', c; end if;
  select count(*) into c from public.org_ai_autopublish; if c <> 0 then raise exception 'FAIL T2i: %', c; end if;
  execute 'reset role';
  n := n + 1;

  -- T3: istemci hiçbir tabloya yazamaz
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin insert into public.flow_ai_media (org_id, user_id, media_type, mime_type, media_url, size_bytes, duration_sec) values (g1, o1, 'video', 'video/mp4', 'https://x', 1, 1); raise exception 'FAIL T3a';
  exception when insufficient_privilege then null; end;
  begin insert into public.flow_ai_publish_plans (org_id, user_id, media_id) values (g1, o1, m1); raise exception 'FAIL T3b';
  exception when insufficient_privilege then null; end;
  begin update public.flow_ai_publish_plans set status = 'cancelled' where id = pl1; raise exception 'FAIL T3c';
  exception when insufficient_privilege then null; end;
  begin insert into public.flow_ai_publish_targets (plan_id, org_id, platform, format) values (pl1, g1, 'tiktok', 'video'); raise exception 'FAIL T3d';
  exception when insufficient_privilege then null; end;
  begin update public.org_ai_autopublish set enabled = true, enabled_by = o1, enabled_at = now() where org_id = g1; raise exception 'FAIL T3e';
  exception when insufficient_privilege then null; end;
  begin update public.social_format_rules set max_duration_sec = 99999; raise exception 'FAIL T3f';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  n := n + 1;

  -- T4: anon hiçbir tabloyu okuyamaz
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  begin perform 1 from public.flow_ai_media limit 1; raise exception 'FAIL T4a'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.flow_ai_publish_plans limit 1; raise exception 'FAIL T4b'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.social_format_rules limit 1; raise exception 'FAIL T4c'; exception when insufficient_privilege then null; end;
  execute 'reset role';
  n := n + 1;

  -- T5: medya kısıtları
  begin insert into public.flow_ai_media (org_id, user_id, media_type, mime_type, media_url, size_bytes) values (g1, o1, 'video', 'video/mp4', 'https://x', 10); raise exception 'FAIL T5a';
  exception when check_violation then null; end;                                             -- video süresiz
  begin insert into public.flow_ai_media (org_id, user_id, media_type, mime_type, size_bytes) values (g1, o1, 'image', 'image/png', 10); raise exception 'FAIL T5b';
  exception when check_violation then null; end;                                             -- konumsuz
  begin insert into public.flow_ai_media (org_id, user_id, media_type, mime_type, media_url, size_bytes) values (g1, o1, 'image', 'image/png', 'https://x', 0); raise exception 'FAIL T5c';
  exception when check_violation then null; end;                                             -- boyutsuz
  n := n + 1;

  -- T6: plan kısıtları (onaylı plan özetsiz olamaz; zamanlanmış plan zamansız olamaz; sahte durum)
  begin update public.flow_ai_publish_plans set status = 'confirmed' where id = pl1; raise exception 'FAIL T6a';
  exception when check_violation then null; end;
  begin update public.flow_ai_publish_plans set status = 'scheduled', payload_hash = 'x', confirmed_at = now() where id = pl1; raise exception 'FAIL T6b';
  exception when check_violation then null; end;
  begin update public.flow_ai_publish_plans set status = 'yayinlandi' where id = pl1; raise exception 'FAIL T6c';
  exception when check_violation then null; end;
  update public.flow_ai_publish_plans set status = 'scheduled', payload_hash = 'abc', confirmed_at = now(), scheduled_for = now() + interval '1 day' where id = pl1;
  n := n + 1;

  -- T7: hedef kısıtları (aynı platform iki kez olmaz; atlanan hedef sebepsiz olamaz)
  begin insert into public.flow_ai_publish_targets (plan_id, org_id, platform, format) values (pl1, g1, 'instagram', 'reel'); raise exception 'FAIL T7a';
  exception when unique_violation then null; end;
  begin update public.flow_ai_publish_targets set status = 'skipped' where id = t1; raise exception 'FAIL T7b';
  exception when check_violation then null; end;
  update public.flow_ai_publish_targets set status = 'skipped', skip_reason = 'Video 90 sn''den uzun' where id = t1;
  n := n + 1;

  -- T8: serbest kademe: açık ise kim açtı zorunlu; günlük sınır 1-20
  begin update public.org_ai_autopublish set enabled = true where org_id = g1; raise exception 'FAIL T8a';
  exception when check_violation then null; end;
  begin update public.org_ai_autopublish set daily_limit = 21 where org_id = g1; raise exception 'FAIL T8b';
  exception when check_violation then null; end;
  begin update public.org_ai_autopublish set daily_limit = 0 where org_id = g1; raise exception 'FAIL T8c';
  exception when check_violation then null; end;
  n := n + 1;

  -- T9: biçim kuralları: 10 başlangıç kuralı, platform+biçim benzersiz, aralıklar tutarlı
  select count(*) into c from public.social_format_rules where is_active; if c < 10 then raise exception 'FAIL T9a: %', c; end if;
  begin insert into public.social_format_rules (platform, format, media_type, max_caption_chars) values ('instagram', 'reel', 'video', 100); raise exception 'FAIL T9b';
  exception when unique_violation then null; end;
  begin insert into public.social_format_rules (platform, format, media_type, min_duration_sec, max_duration_sec, max_caption_chars) values ('test', 'x', 'video', 10, 5, 100); raise exception 'FAIL T9c';
  exception when check_violation then null; end;
  n := n + 1;

  -- T10: işletme silinince bağlı kayıtlar gider (4 org_id tablosunda CASCADE)
  select count(*) into c from pg_constraint where confrelid = 'public.organizations'::regclass and confdeltype = 'c'
    and conrelid in ('public.flow_ai_media'::regclass, 'public.flow_ai_publish_plans'::regclass, 'public.flow_ai_publish_targets'::regclass, 'public.org_ai_autopublish'::regclass);
  if c <> 4 then raise exception 'FAIL T10a: %', c; end if;
  -- planı olan medya silinemez (RESTRICT)
  select count(*) into c from pg_constraint where conrelid = 'public.flow_ai_publish_plans'::regclass and confrelid = 'public.flow_ai_media'::regclass and confdeltype = 'r';
  if c <> 1 then raise exception 'FAIL T10b: %', c; end if;
  n := n + 1;

  raise exception 'FA7_1_TESTS_OK: % kontrol geçti (tüm değişiklikler geri alındı)', n;
end $$;
