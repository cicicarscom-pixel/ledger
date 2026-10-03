-- FAZ F3 regresyon testi (Claude, 03.10.2026): WhatsApp sunucu kodunun org_id ile yaptığı sorgu biçimleri.
-- Tek DO bloğu, sonda istisna → her şey geri alınır. Başarı: ERROR "F3_DB_SHAPE_OK: 6 kontrol geçti ..."
-- Test işletmesi: "Fahri alem" (organizations.id 269da914-...). Telefon gerçek WhatsApp biçiminde olmalı (trigger normalize eder).
do $$
declare o uuid := '269da914-06e1-4861-adf7-c4dfad9b85ed'; a uuid; n int := 0; c int; owner uuid; d date := current_date + 40; ph text := '905559998877@c.us';
begin
  select count(*) into c from bot_settings where org_id = o; if c <> 1 then raise exception 'FAIL bot_settings by org_id: %', c; end if; n := n+1;
  select count(*) into c from organization_ai_settings where org_id = o; if c <> 1 then raise exception 'FAIL org_ai_settings by org_id: %', c; end if; n := n+1;
  insert into ai_communication_logs (org_id, platform, sender_id, user_message, ai_response) values (o, 'whatsapp', ph, 'm', 'r');
  select merchant_id into owner from ai_communication_logs where sender_id = ph and org_id = o;
  if owner is distinct from '1c07a76c-d68f-40e7-83ed-c9f4c59b1886'::uuid then raise exception 'FAIL log sync: %', owner; end if; n := n+1;
  insert into customers (org_id, phone, name) values (o, ph, 'F3') on conflict (org_id, phone) do update set name = excluded.name;
  insert into customers (org_id, phone, name) values (o, ph, 'F3b') on conflict (org_id, phone) do update set name = excluded.name;
  select count(*) into c from customers where org_id = o and phone = ph and name = 'F3b'; if c <> 1 then raise exception 'FAIL customers upsert'; end if; n := n+1;
  insert into appointments (org_id, customer_phone, customer_name, starts_at, ends_at, timezone, source, status, booking_token)
    values (o, ph, 'F3', (d + time '08:00') at time zone 'Europe/Istanbul', (d + time '08:30') at time zone 'Europe/Istanbul', 'Europe/Istanbul', 'whatsapp', 'Pending', gen_random_uuid()::text) returning id into a;
  if (select organization_id from appointments where id = a) is distinct from '1c07a76c-d68f-40e7-83ed-c9f4c59b1886'::uuid then raise exception 'FAIL appt sync'; end if;
  select count(*) into c from appointments where org_id = o and customer_phone = ph and status in ('Pending','Approved'); if c <> 1 then raise exception 'FAIL appt select: %', c; end if; n := n+1;
  select count(*) into c from get_available_slots_for_org(o, d, null, null); if c < 1 then raise exception 'FAIL slots_for_org empty'; end if; n := n+1;
  raise exception 'F3_DB_SHAPE_OK: % kontrol geçti (geri alındı)', n;
end $$;
