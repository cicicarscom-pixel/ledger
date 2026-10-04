-- F5-C geri alma: eski sütunları, tetikleyicileri, kısıtları ve indeksleri geri getirir.
-- Değerler her zaman organizations.owner_id'dir (org_id üzerinden), bu yüzden veri kaybı olmaz.
-- Yalnız F5-C uygulandıktan sonra, eski kodun geri gerekmesi durumunda kullanılır.

begin;

-- 1) Eşitleme işlevi
create or replace function public.tr_sync_org_id()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  c text := tg_argv[0];
  v_owner uuid := (to_jsonb(new) ->> c)::uuid;
  v_old_owner uuid;
  v_old_org uuid;
begin
  if tg_op = 'UPDATE' then
    v_old_owner := (to_jsonb(old) ->> c)::uuid;
    v_old_org := old.org_id;
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
$function$;

-- 2) Sütunlar (önce boş), sahip kimliğiyle doldurma, NOT NULL ve FK
alter table public.ai_communication_logs add column merchant_id uuid;
alter table public.appointment_services add column organization_id uuid;
alter table public.appointments add column organization_id uuid;
alter table public.bot_settings add column merchant_id uuid;
alter table public.business_services add column merchant_id uuid;
alter table public.calendar_blocks add column organization_id uuid;
alter table public.calendars add column merchant_id uuid;
alter table public.customers add column organization_id uuid;
alter table public.organization_ai_settings add column merchant_id uuid;
alter table public.waha_sessions add column merchant_id uuid;

update public.ai_communication_logs t set merchant_id = o.owner_id from public.organizations o where o.id = t.org_id;
update public.appointment_services t set organization_id = o.owner_id from public.organizations o where o.id = t.org_id;
update public.appointments t set organization_id = o.owner_id from public.organizations o where o.id = t.org_id;
update public.bot_settings t set merchant_id = o.owner_id from public.organizations o where o.id = t.org_id;
update public.business_services t set merchant_id = o.owner_id from public.organizations o where o.id = t.org_id;
update public.calendar_blocks t set organization_id = o.owner_id from public.organizations o where o.id = t.org_id;
update public.calendars t set merchant_id = o.owner_id from public.organizations o where o.id = t.org_id;
update public.customers t set organization_id = o.owner_id from public.organizations o where o.id = t.org_id;
update public.organization_ai_settings t set merchant_id = o.owner_id from public.organizations o where o.id = t.org_id;
update public.waha_sessions t set merchant_id = o.owner_id from public.organizations o where o.id = t.org_id;

alter table public.appointment_services alter column organization_id set not null;
alter table public.business_services alter column merchant_id set not null;
alter table public.calendar_blocks alter column organization_id set not null;
alter table public.calendars alter column merchant_id set not null;
alter table public.customers alter column organization_id set not null;
alter table public.organization_ai_settings alter column merchant_id set not null;

alter table public.ai_communication_logs add constraint ai_communication_logs_merchant_id_fkey foreign key (merchant_id) references auth.users(id) on delete cascade;
alter table public.appointment_services add constraint appointment_services_organization_id_fkey foreign key (organization_id) references auth.users(id) on delete cascade;
alter table public.appointments add constraint appointments_organization_id_fkey foreign key (organization_id) references auth.users(id) on delete cascade;
alter table public.bot_settings add constraint bot_settings_merchant_id_fkey foreign key (merchant_id) references auth.users(id) on delete cascade;
alter table public.business_services add constraint business_services_merchant_id_fkey foreign key (merchant_id) references auth.users(id) on delete cascade;
alter table public.calendar_blocks add constraint calendar_blocks_organization_id_fkey foreign key (organization_id) references auth.users(id) on delete cascade;
alter table public.calendars add constraint calendars_merchant_id_fkey foreign key (merchant_id) references auth.users(id) on delete cascade;
alter table public.customers add constraint customers_organization_id_fkey foreign key (organization_id) references auth.users(id) on delete cascade;
alter table public.organization_ai_settings add constraint organization_ai_settings_merchant_id_fkey foreign key (merchant_id) references auth.users(id) on delete cascade;
alter table public.waha_sessions add constraint waha_sessions_merchant_id_fkey foreign key (merchant_id) references auth.users(id) on delete cascade;

-- 3) Birincil anahtar, benzersiz kısıt ve indeksler
alter table public.organization_ai_settings drop constraint organization_ai_settings_pkey;
create unique index organization_ai_settings_org_id_key on public.organization_ai_settings (org_id);
alter table public.organization_ai_settings add constraint organization_ai_settings_pkey primary key (merchant_id);
alter table public.customers add constraint customers_organization_id_phone_key unique (organization_id, phone);
create index idx_appointment_services_org on public.appointment_services (organization_id);
create index idx_appointments_org_date on public.appointments (organization_id, date);
create index calendar_blocks_org_time_idx on public.calendar_blocks (organization_id, starts_at, ends_at);
create index idx_customers_org_phone on public.customers (organization_id, phone);
drop index if exists public.appointments_org_id_date_idx;
drop index if exists public.calendar_blocks_org_id_time_idx;

-- 4) Tetikleyiciler
create trigger a00_sync_org_id before insert or update on public.ai_communication_logs for each row execute function tr_sync_org_id('merchant_id');
create trigger a00_sync_org_id before insert or update on public.appointment_services for each row execute function tr_sync_org_id('organization_id');
create trigger a00_sync_org_id before insert or update on public.appointments for each row execute function tr_sync_org_id('organization_id');
create trigger a00_sync_org_id before insert or update on public.bot_settings for each row execute function tr_sync_org_id('merchant_id');
create trigger a00_sync_org_id before insert or update on public.business_services for each row execute function tr_sync_org_id('merchant_id');
create trigger a00_sync_org_id before insert or update on public.calendar_blocks for each row execute function tr_sync_org_id('organization_id');
create trigger a00_sync_org_id before insert or update on public.calendars for each row execute function tr_sync_org_id('merchant_id');
create trigger a00_sync_org_id before insert or update on public.customers for each row execute function tr_sync_org_id('organization_id');
create trigger a00_sync_org_id before insert or update on public.organization_ai_settings for each row execute function tr_sync_org_id('merchant_id');
create trigger a00_sync_org_id before insert or update on public.waha_sessions for each row execute function tr_sync_org_id('merchant_id');

commit;
