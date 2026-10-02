-- FAZ F1 — Genişlet (02.10.2026, Claude; canlıya Claude uygular, dosya kayıt amaçlı).
-- Sahibin auth.users kimliğine bağlı 10 tabloya org_id (organizations.id) eklenir ve doldurulur.
-- Eski sütunlar, kurallar ve kısıtlar DEĞİŞMEZ; iki yönlü eşitleme tetikleyicisi sayesinde eski kod (yüklü mobil
-- sürümler dahil) ve yeni kod birlikte doğru çalışır. F5'e kadar geri alınabilir.

-- 1) İki yönlü eşitleme: tg_argv[0] = eski sütun adı (sahibin kullanıcı kimliği)
create or replace function public.tr_sync_org_id()
returns trigger language plpgsql set search_path = public as $$
declare
  c text := tg_argv[0];
  v_owner uuid := (to_jsonb(new) ->> c)::uuid;
  v_old_owner uuid;
  v_old_org uuid;
begin
  if tg_op = 'UPDATE' then
    v_old_owner := (to_jsonb(old) ->> c)::uuid;
    v_old_org := old.org_id;
    -- yalnız eski sütun değiştiyse org_id yeniden hesaplanır; yalnız org_id değiştiyse eski sütun
    if v_owner is distinct from v_old_owner and new.org_id is not distinct from v_old_org then
      new.org_id := null;
    elsif new.org_id is distinct from v_old_org and v_owner is not distinct from v_old_owner then
      v_owner := null;
      new := jsonb_populate_record(new, jsonb_build_object(c, null));
    end if;
  end if;

  if new.org_id is null and v_owner is not null then
    select o.id into new.org_id from public.organizations o where o.owner_id = v_owner;
    if new.org_id is null then
      raise exception 'ORG_NOT_FOUND_FOR_OWNER: %', v_owner using errcode = 'foreign_key_violation';
    end if;
  elsif new.org_id is not null and v_owner is null then
    select o.owner_id into v_owner from public.organizations o where o.id = new.org_id;
    new := jsonb_populate_record(new, jsonb_build_object(c, v_owner));
  elsif new.org_id is not null and v_owner is not null then
    if not exists (select 1 from public.organizations o where o.id = new.org_id and o.owner_id = v_owner) then
      raise exception 'ORG_ID_MISMATCH: org_id % sahibi % değil', new.org_id, v_owner using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

-- 2) Sütun + doldurma + NOT NULL + indeks + tetikleyici (10 tablo)
do $$
declare
  r record;
begin
  for r in select * from (values
    ('calendars', 'merchant_id'), ('appointments', 'organization_id'), ('customers', 'organization_id'),
    ('ai_communication_logs', 'merchant_id'), ('bot_settings', 'merchant_id'), ('organization_ai_settings', 'merchant_id'),
    ('calendar_blocks', 'organization_id'), ('business_services', 'merchant_id'), ('appointment_services', 'organization_id'),
    ('waha_sessions', 'merchant_id')) as v(tbl, col)
  loop
    execute format('alter table public.%I add column if not exists org_id uuid references public.organizations(id) on delete cascade', r.tbl);
    execute format('update public.%I t set org_id = o.id from public.organizations o where o.owner_id = t.%I and t.org_id is null', r.tbl, r.col);
    execute format('alter table public.%I alter column org_id set not null', r.tbl);
    execute format('create index if not exists %I on public.%I (org_id)', r.tbl || '_org_id_idx', r.tbl);
    execute format('drop trigger if exists tr_sync_org_id on public.%I', r.tbl);
    execute format('create trigger tr_sync_org_id before insert or update on public.%I for each row execute function public.tr_sync_org_id(%L)', r.tbl, r.col);
  end loop;
end $$;

-- 3) Yeni güvenlik kuralları: org_id = current_org_id() (eskilerin YANINA; ikisi de geçerli)
create policy "org_id: select" on public.calendars for select to authenticated using (org_id = public.current_org_id());
create policy "org_id: insert" on public.calendars for insert to authenticated with check (org_id = public.current_org_id());
create policy "org_id: update" on public.calendars for update to authenticated using (org_id = public.current_org_id());
create policy "org_id: delete" on public.calendars for delete to authenticated using (org_id = public.current_org_id());

create policy "org_id: select" on public.appointments for select to authenticated using (org_id = public.current_org_id());
create policy "org_id: insert" on public.appointments for insert to authenticated with check (org_id = public.current_org_id());
create policy "org_id: update" on public.appointments for update to authenticated using (org_id = public.current_org_id());

create policy "org_id: select" on public.customers for select to authenticated using (org_id = public.current_org_id());
create policy "org_id: insert" on public.customers for insert to authenticated with check (org_id = public.current_org_id());
create policy "org_id: update" on public.customers for update to authenticated using (org_id = public.current_org_id());

create policy "org_id: select" on public.ai_communication_logs for select to authenticated using (org_id = public.current_org_id());
create policy "org_id: insert" on public.ai_communication_logs for insert to authenticated with check (org_id = public.current_org_id());
create policy "org_id: delete" on public.ai_communication_logs for delete to authenticated using (org_id = public.current_org_id());

create policy "org_id: select" on public.bot_settings for select to authenticated using (org_id = public.current_org_id());
create policy "org_id: insert" on public.bot_settings for insert to authenticated with check (org_id = public.current_org_id());
create policy "org_id: update" on public.bot_settings for update to authenticated using (org_id = public.current_org_id());

create policy "org_id: all" on public.organization_ai_settings for all to authenticated
  using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

create policy "org_id: select" on public.calendar_blocks for select to authenticated using (org_id = public.current_org_id());

create policy "org_id: select" on public.business_services for select to authenticated using (org_id = public.current_org_id());
create policy "org_id: insert" on public.business_services for insert to authenticated with check (org_id = public.current_org_id());
create policy "org_id: update" on public.business_services for update to authenticated using (org_id = public.current_org_id());
create policy "org_id: delete" on public.business_services for delete to authenticated using (org_id = public.current_org_id());

create policy "org_id: select" on public.appointment_services for select to authenticated using (org_id = public.current_org_id());
create policy "org_id: insert" on public.appointment_services for insert to authenticated with check (org_id = public.current_org_id());
create policy "org_id: delete" on public.appointment_services for delete to authenticated using (org_id = public.current_org_id());

-- 4) Sızıntılar
-- calendars: herkese (anon dahil) açıktı → yalnız kendi işletmesi (sahip ya da üye). Herkese açık randevu sayfası yok.
drop policy if exists "Calendars are viewable by everyone" on public.calendars;
create policy "Merchants can view their own calendars" on public.calendars for select to authenticated using (merchant_id = auth.uid());
-- calendar_services: herkese açıktı → takvimi kendi işletmesine ait olanlar
drop policy if exists "Calendar services are viewable by everyone" on public.calendar_services;
create policy "org_id: select via calendar" on public.calendar_services for select to authenticated
  using (exists (select 1 from public.calendars c where c.id = calendar_services.calendar_id and c.org_id = public.current_org_id()));
-- appointment_events: oturum açmış herkes bütün işletmelerin olaylarını okuyabiliyordu
drop policy if exists "Allow authenticated users to read events" on public.appointment_events;
create policy "org_id: select via appointment" on public.appointment_events for select to authenticated
  using (exists (select 1 from public.appointments a where a.id = appointment_events.appointment_id and a.org_id = public.current_org_id()));

-- 5) (aynı gün, test sonrası) tr_sync_org_id yalnız organizations (id ↔ owner_id) eşlemesini okur ve çağıranın
--    RLS'inden bağımsız olmalı; yetki kararı tabloların RLS kurallarında kalır.
alter function public.tr_sync_org_id() security definer;
alter function public.tr_sync_org_id() set search_path = public;
revoke execute on function public.tr_sync_org_id() from public, anon, authenticated;
