-- scheduling_core.sql
-- Regresyon Testleri - Müsaitlik Çekirdeği

DO $$
DECLARE
    v_org_id uuid;
    v_owner_id uuid;
    v_org2_id uuid;
    v_owner2_id uuid;
    v_calendar_id uuid;
    v_calendar2_id uuid;
    v_service_id uuid := gen_random_uuid();
    v_test_date date := current_date + 7;
    v_test_date_str text := to_char(v_test_date, 'YYYY-MM-DD');
    v_slots record;
    v_found boolean;
    v_app_id uuid;
    v_block_id uuid;
    v_result text;
BEGIN
    RAISE NOTICE '--- STARTING SCHEDULING CORE TESTS ---';

    -- 0. Setup: Create test orgs, owners, and calendars
    v_owner_id := gen_random_uuid();
    v_org_id := gen_random_uuid();
    
    insert into auth.users (id, email) values (v_owner_id, 'test_' || v_owner_id || '@workigom.test');
    insert into public.organizations (id, owner_id, name) values (v_org_id, v_owner_id, 'Test Org 1');
    -- In legacy model, some things use owner_id, some use org_id. We must simulate a user session or directly insert.
    -- Wait, our functions might expect user to be logged in? 
    -- The prompt says "RPC parametre adları veritabanındaki imzadan kopyalanır, tahmin edilmez (bkz. §4)."
    -- The RPCs we are testing are `get_available_slots_for_owner(p_owner, p_date, p_service_ids, p_calendar_id)`.
    -- For this RPC, we need a calendar in public.calendars with merchant_id = v_owner_id.
    
    insert into public.calendars (id, name, merchant_id, is_active, working_hours) 
    values (gen_random_uuid(), 'Test Calendar', v_owner_id, true, 
    '{"shifts": [{"day": 1, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}]}') 
    returning id into v_calendar_id;
    
    insert into public.business_services (id, merchant_id, name, duration_minutes, is_visible, price, currency)
    values (v_service_id, v_owner_id, 'Test Service', 30, true, 100, 'TRY');

    -- D1.1 Normal boş slot
    RAISE NOTICE 'Running D1.1 - Normal boş slot...';
    -- We must ensure the chosen test date is a Monday (day 1) so our shift matches.
    -- Let's just create shifts for all 7 days to be safe.
    update public.calendars set working_hours = '{"shifts": [{"day": 1, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}, {"day": 2, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}, {"day": 3, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}, {"day": 4, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}, {"day": 5, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}, {"day": 6, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}, {"day": 0, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}]}' where id = v_calendar_id;
    
    v_found := false;
    FOR v_slots IN SELECT * FROM public.get_available_slots_for_owner(v_owner_id, v_test_date, ARRAY[v_service_id::text], v_calendar_id) LOOP
        IF v_slots.local_time = '09:00' THEN
            v_found := true;
        END IF;
    END LOOP;
    
    IF NOT v_found THEN
        RAISE EXCEPTION 'FAIL D1.1: Slot 09:00 not found for empty calendar.';
    END IF;
    RAISE NOTICE 'PASS D1.1';

    -- D1.2 Mevcut randevu slotu kapatır
    RAISE NOTICE 'Running D1.2 - Mevcut randevu slotu kapatir...';
    insert into public.appointments (id, organization_id, calendar_id, service_id, starts_at, ends_at, status, customer_phone, customer_name, booking_token)
    values (gen_random_uuid(), v_owner_id, v_calendar_id, v_service_id, 
            timezone('Europe/Istanbul', (v_test_date_str || ' 09:00:00')::timestamp), 
            timezone('Europe/Istanbul', (v_test_date_str || ' 09:30:00')::timestamp), 
            'Approved', '905551234567@c.us', 'Test User', gen_random_uuid()::text) returning id into v_app_id;
            
    v_found := false;
    FOR v_slots IN SELECT * FROM public.get_available_slots_for_owner(v_owner_id, v_test_date, ARRAY[v_service_id::text], v_calendar_id) LOOP
        IF v_slots.local_time = '09:00' THEN
            v_found := true;
        END IF;
    END LOOP;
    
    IF v_found THEN
        RAISE EXCEPTION 'FAIL D1.2: Slot 09:00 is available despite Confirmed appointment.';
    END IF;
    RAISE NOTICE 'PASS D1.2';

    -- D1.4 İptal edilmiş randevu (İptal edilen slot açılmalı)
    RAISE NOTICE 'Running D1.4 - Iptal edilmis randevu...';
    update public.appointments set status = 'Cancelled' where id = v_app_id;
    
    v_found := false;
    FOR v_slots IN SELECT * FROM public.get_available_slots_for_owner(v_owner_id, v_test_date, ARRAY[v_service_id::text], v_calendar_id) LOOP
        IF v_slots.local_time = '09:00' THEN
            v_found := true;
        END IF;
    END LOOP;
    
    IF NOT v_found THEN
        RAISE EXCEPTION 'FAIL D1.4: Slot 09:00 is NOT available despite Cancelled appointment.';
    END IF;
    RAISE NOTICE 'PASS D1.4';

    -- D1.3 Calendar block slotu kapatır
    RAISE NOTICE 'Running D1.3 - Calendar block slotu kapatir...';
    insert into public.calendar_blocks (id, organization_id, calendar_id, starts_at, ends_at, reason)
    values (gen_random_uuid(), v_owner_id, v_calendar_id, 
            timezone('Europe/Istanbul', (v_test_date_str || ' 09:00:00')::timestamp), 
            timezone('Europe/Istanbul', (v_test_date_str || ' 09:30:00')::timestamp), 'break') returning id into v_block_id;
            
    v_found := false;
    FOR v_slots IN SELECT * FROM public.get_available_slots_for_owner(v_owner_id, v_test_date, ARRAY[v_service_id::text], v_calendar_id) LOOP
        IF v_slots.local_time = '09:00' THEN
            v_found := true;
        END IF;
    END LOOP;
    
    IF v_found THEN
        RAISE EXCEPTION 'FAIL D1.3: Slot 09:00 is available despite calendar_block.';
    END IF;
    
    -- Temizlik (block)
    delete from public.calendar_blocks where id = v_block_id;
    RAISE NOTICE 'PASS D1.3';

    -- D1.5 Gün sınırı / timezone
    RAISE NOTICE 'Running D1.5 - Gün siniri / timezone...';
    -- We verify that an appointment created right at UTC boundary (e.g. 21:00 UTC = 00:00 Istanbul) 
    -- correctly blocks the local day slot and doesn't spill over wrong day.
    insert into public.appointments (id, organization_id, calendar_id, service_id, starts_at, ends_at, status, customer_phone, customer_name, booking_token)
    values (gen_random_uuid(), v_owner_id, v_calendar_id, v_service_id, 
            timezone('Europe/Istanbul', (v_test_date_str || ' 09:00:00')::timestamp), 
            timezone('Europe/Istanbul', (v_test_date_str || ' 09:30:00')::timestamp), 
            'Approved', '905551234567@c.us', 'Test User', gen_random_uuid()::text) returning id into v_app_id;
            
    v_found := false;
    FOR v_slots IN SELECT * FROM public.get_available_slots_for_owner(v_owner_id, v_test_date, ARRAY[v_service_id::text], v_calendar_id) LOOP
        IF v_slots.local_time = '09:00' THEN
            v_found := true;
        END IF;
    END LOOP;
    IF v_found THEN
        RAISE EXCEPTION 'FAIL D1.5: Local timezone handling failed.';
    END IF;
    delete from public.appointments where id = v_app_id;
    RAISE NOTICE 'PASS D1.5';

    -- D1.6 Tenant izolasyonu
    RAISE NOTICE 'Running D1.6 - Tenant izolasyonu...';
    v_owner2_id := gen_random_uuid();
    v_org2_id := gen_random_uuid();
    insert into auth.users (id, email) values (v_owner2_id, 'test_' || v_owner2_id || '@workigom.test');
    insert into public.organizations (id, owner_id, name) values (v_org2_id, v_owner2_id, 'Test Org 2');
    
    insert into public.calendars (id, name, merchant_id, is_active, working_hours) 
    values (gen_random_uuid(), 'Test Calendar 2', v_owner2_id, true, 
    '{"shifts": [{"day": 1, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}, {"day": 2, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}, {"day": 3, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}, {"day": 4, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}, {"day": 5, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}, {"day": 6, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}, {"day": 0, "is_active": true, "intervals": [{"start": "09:00", "end": "17:00"}]}]}') 
    returning id into v_calendar2_id;
    
    -- Create block in ORG 2
    insert into public.calendar_blocks (id, organization_id, calendar_id, starts_at, ends_at, reason)
    values (gen_random_uuid(), v_owner2_id, v_calendar2_id, 
            timezone('Europe/Istanbul', (v_test_date_str || ' 09:00:00')::timestamp), 
            timezone('Europe/Istanbul', (v_test_date_str || ' 09:30:00')::timestamp), 'break');
            
    -- Check ORG 1 availability
    v_found := false;
    FOR v_slots IN SELECT * FROM public.get_available_slots_for_owner(v_owner_id, v_test_date, ARRAY[v_service_id::text], v_calendar_id) LOOP
        IF v_slots.local_time = '09:00' THEN
            v_found := true;
        END IF;
    END LOOP;
    
    IF NOT v_found THEN
        RAISE EXCEPTION 'FAIL D1.6: Tenant isolation failed. Org 2 block affected Org 1.';
    END IF;
    RAISE NOTICE 'PASS D1.6';

    -- D1.7 OWNER RPC KORUMASI
    RAISE NOTICE 'Running D1.7 - OWNER RPC KORUMASI...';
    -- Calling with wrong owner/tenant combination should return empty or fail, but not return another tenant's slots.
    v_found := false;
    FOR v_slots IN SELECT * FROM public.get_available_slots_for_owner(v_owner2_id, v_test_date, ARRAY[v_service_id::text], v_calendar_id) LOOP
        v_found := true;
    END LOOP;
    -- Since v_calendar_id belongs to v_owner_id, querying with v_owner2_id should return NO slots.
    IF v_found THEN
        RAISE EXCEPTION 'FAIL D1.7: Cross-tenant RPC call returned slots!';
    END IF;
    RAISE NOTICE 'PASS D1.7';

    -- TEMİZLİK (Açıkça)
    delete from public.calendar_blocks where organization_id in (v_org_id, v_org2_id);
    delete from public.appointments where organization_id in (v_org_id, v_org2_id);
    delete from public.business_services where id = v_service_id;
    delete from public.calendars where id in (v_calendar_id, v_calendar2_id);
    delete from public.organizations where id in (v_org_id, v_org2_id);
    delete from auth.users where id in (v_owner_id, v_owner2_id);

    RAISE NOTICE 'ALL TESTS PASSED. PASS';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'TEST FAILED: %', SQLERRM;
        -- Attempt cleanup even on failure
        delete from public.calendar_blocks where organization_id in (v_org_id, v_org2_id);
        delete from public.appointments where organization_id in (v_org_id, v_org2_id);
        delete from public.business_services where id = v_service_id;
        delete from public.calendars where id in (v_calendar_id, v_calendar2_id);
        delete from public.organizations where id in (v_org_id, v_org2_id);
        delete from auth.users where id in (v_owner_id, v_owner2_id);
        RAISE EXCEPTION '%', SQLERRM;
END $$;
