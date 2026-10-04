-- F4-0 — Kiracı izolasyon testi (salt okunur; hata olursa EXCEPTION fırlatır).
-- Her kuruluş sahibi, authenticated rolüyle YALNIZ kendi kuruluşunun satırlarını görmeli; bilinmeyen kullanıcı hiçbir şey görmemeli.
-- Çalıştırma: SQL editöründe olduğu gibi çalıştırın. Tüm tablolarda org_id NOT NULL + FK varlığı da denetlenir.
do $$
declare
  o record;
  t text;
  tables text[] := array['appointments','customers','calendars','calendar_blocks','business_services','bot_settings','organization_ai_settings'];
  seen bigint;
  expected bigint;
  foreign_rows bigint;
begin
  -- 1) Yapısal: org_id NOT NULL ve organizations(id)'ye FK
  for t in select unnest(array['ai_communication_logs','appointment_services','appointments','bot_settings','business_services','calendar_blocks','calendars','customers','organization_ai_settings','waha_sessions']) loop
    if not exists (select 1 from pg_attribute a where a.attrelid = ('public.'||t)::regclass and a.attname='org_id' and a.attnotnull) then
      raise exception 'F4-0: %.org_id NOT NULL değil', t;
    end if;
    if not exists (select 1 from pg_constraint k where k.conrelid = ('public.'||t)::regclass and k.contype='f' and k.confrelid = 'public.organizations'::regclass) then
      raise exception 'F4-0: %.org_id için organizations FK yok', t;
    end if;
  end loop;

  -- 2) Davranışsal: her sahip yalnız kendi satırlarını görür
  for o in select id, owner_id from public.organizations loop
    perform set_config('request.jwt.claims', json_build_object('sub', o.owner_id, 'role', 'authenticated')::text, true);
    set local role authenticated;
    foreach t in array tables loop
      execute format('select count(*) from public.%I', t) into seen;
      execute format('select count(*) from public.%I where org_id <> %L', t, o.id) into foreign_rows;
      reset role;
      execute format('select count(*) from public.%I where org_id = %L', t, o.id) into expected;
      if foreign_rows <> 0 then raise exception 'F4-0: % tablosunda başka kuruluşun % satırı sızdı (org %)', t, foreign_rows, o.id; end if;
      if seen <> expected then raise exception 'F4-0: % görünür % <> beklenen % (org %)', t, seen, expected, o.id; end if;
      set local role authenticated;
    end loop;
    reset role;
  end loop;

  -- 3) Bilinmeyen kullanıcı hiçbir şey görmez
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  set local role authenticated;
  foreach t in array tables loop
    execute format('select count(*) from public.%I', t) into seen;
    if seen <> 0 then reset role; raise exception 'F4-0: bilinmeyen kullanıcı % tablosunda % satır görüyor', t, seen; end if;
  end loop;
  reset role;
  raise notice 'F4-0 OK: izolasyon doğrulandı';
end $$;
