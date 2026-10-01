-- FAZ E1 — Muhasebeci bağlantısı: güvenlik açığı + yaşam döngüsü (Claude, 01.10.2026; canlıya Claude uygular).
-- Tek model: accountant_taxpayer_links (bir işletme–firma çifti için tek satır; durum bu satırda değişir).
-- Durumlar ve izinli geçişler:
--   (yeni) → pending_confirmation   | (yeni, yalnız source='whatsapp_invitation') → active
--   pending_confirmation → active | rejected
--   active → disconnected | replaced
--   rejected | disconnected | replaced → pending_confirmation   (yeniden istek)
-- Belgeye erişim YALNIZ status = 'active'. Her durum değişikliği accountant_connection_events'e otomatik yazılır.

-- 0) Bir çift için tek satır (tablo boş; güvenli)
create unique index if not exists accountant_taxpayer_links_pair_key
  on public.accountant_taxpayer_links (taxpayer_organization_id, accounting_firm_id);

-- 1) GÜVENLİK: erişim yalnız aktif bağlantıyla (finance_documents SELECT/UPDATE/DELETE kuralları bunu kullanıyor)
create or replace function public.check_accountant_document_access(doc_org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.accounting_firm_members afm
    join public.accountant_taxpayer_links atl on atl.accounting_firm_id = afm.accounting_firm_id
    where afm.user_id = auth.uid() and atl.taxpayer_organization_id = doc_org_id and atl.status = 'active'
  );
$$;

-- 2) Geçiş kuralı + zaman damgaları (her yazma yolu için: RPC, Ledger yönetici istemcisi, elle SQL)
create or replace function public.tr_atl_transition_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not (new.status = 'pending_confirmation' or (new.status = 'active' and new.source = 'whatsapp_invitation')) then
      raise exception 'ATL_INVALID_INITIAL_STATUS: %', new.status using errcode = 'check_violation';
    end if;
  elsif new.status is distinct from old.status then
    if not (
         (old.status = 'pending_confirmation' and new.status in ('active', 'rejected'))
      or (old.status = 'active' and new.status in ('disconnected', 'replaced'))
      or (old.status in ('rejected', 'disconnected', 'replaced') and new.status = 'pending_confirmation')
    ) then
      raise exception 'ATL_INVALID_TRANSITION: % -> %', old.status, new.status using errcode = 'check_violation';
    end if;
  end if;
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    new.connected_at := now();
    new.disconnected_at := null; new.disconnected_by_user_id := null; new.disconnect_reason := null; new.disconnect_source := null;
  elsif new.status = 'disconnected' and (tg_op = 'INSERT' or old.status is distinct from 'disconnected') then
    new.disconnected_at := coalesce(new.disconnected_at, now());
    new.disconnected_by_user_id := coalesce(new.disconnected_by_user_id, auth.uid());
  elsif new.status = 'pending_confirmation' and tg_op = 'UPDATE' and old.status is distinct from 'pending_confirmation' then
    new.confirmed_by_user_id := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists tr_atl_transition_guard on public.accountant_taxpayer_links;
create trigger tr_atl_transition_guard
  before insert or update on public.accountant_taxpayer_links
  for each row execute function public.tr_atl_transition_guard();

-- 3) Olay kaydı + işletmeye bildirim (otomatik; RPC'ler ayrıca yazmaz)
create or replace function public.tr_atl_events()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old text := case when tg_op = 'INSERT' then null else old.status end;
  v_event text;
  v_source text := coalesce(nullif(current_setting('app.connection_source', true), ''), new.disconnect_source, 'system');
  v_firm text;
  v_msg text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  v_event := case
    when tg_op = 'INSERT' and new.status = 'pending_confirmation' then 'connection.requested'
    when tg_op = 'INSERT' and new.status = 'active' then 'connection.created_by_invitation'
    when v_old = 'pending_confirmation' and new.status = 'active' then 'connection.accepted'
    when v_old = 'pending_confirmation' and new.status = 'rejected' then 'connection.rejected'
    when v_old = 'active' and new.status = 'disconnected' then 'connection.disconnected'
    when v_old = 'active' and new.status = 'replaced' then 'connection.replaced'
    when new.status = 'pending_confirmation' then 'connection.re_requested'
    else 'connection.status_changed' end;
  insert into public.accountant_connection_events
    (event_type, actor_user_id, accounting_firm_id, taxpayer_organization_id, previous_status, new_status, reason, source)
  values (v_event, auth.uid(), new.accounting_firm_id, new.taxpayer_organization_id, v_old, new.status,
          coalesce(new.disconnect_reason, nullif(current_setting('app.connection_reason', true), '')), v_source);

  -- işletmeye bildirim (notifications.profile_id = organizations.id)
  select firm_name into v_firm from public.accounting_firms where id = new.accounting_firm_id;
  v_msg := case v_event
    when 'connection.accepted' then coalesce(v_firm, 'Mali müşaviriniz') || ' bağlantı isteğinizi kabul etti.'
    when 'connection.created_by_invitation' then coalesce(v_firm, 'Mali müşaviriniz') || ' ile bağlantınız kuruldu.'
    when 'connection.rejected' then case when v_source = 'ledger' then coalesce(v_firm, 'Mali müşavir') || ' bağlantı isteğinizi reddetti.' end
    when 'connection.disconnected' then case when v_source = 'ledger' then coalesce(v_firm, 'Mali müşaviriniz') || ' bağlantıyı sonlandırdı.' end
    when 'connection.replaced' then coalesce(v_firm, 'Önceki mali müşaviriniz') || ' ile bağlantınız yeni müşavirinizle değiştirildi.'
  end;
  if v_msg is not null then
    insert into public.notifications (profile_id, title, message, type, is_read, metadata)
    values (new.taxpayer_organization_id, 'Muhasebeci Bağlantısı', v_msg, 'system', false,
            jsonb_build_object('kind', 'accountant_connection', 'event', v_event, 'accounting_firm_id', new.accounting_firm_id, 'firm_name', v_firm));
  end if;
  return new;
end;
$$;
drop trigger if exists tr_atl_events on public.accountant_taxpayer_links;
create trigger tr_atl_events
  after insert or update of status on public.accountant_taxpayer_links
  for each row execute function public.tr_atl_events();
-- eski, bozuk bildirim tetikleyicisi (kullanıcı kimliğini organizations FK'sına yazıyordu)
drop trigger if exists trigger_notify_taxpayer_on_connection on public.accountant_taxpayer_links;
drop function if exists public.notify_taxpayer_on_connection();

-- 4) RPC'ler — İŞLETME tarafı (Flow web + mobil)
create or replace function public.resolve_accountant_code(input_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_firm record;
begin
  if auth.uid() is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  select id, firm_name into v_firm from public.accounting_firms where connection_code = btrim(input_code) limit 1;
  if not found then return jsonb_build_object('status', 'CODE_NOT_FOUND'); end if;
  return jsonb_build_object('status', 'SUCCESS', 'accounting_firm_id', v_firm.id, 'firm_name', v_firm.firm_name);
end;
$$;

create or replace function public.request_accountant_connection(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := public.current_org_id();
  v_firm record; v_link record; v_id uuid; v_exists boolean;
begin
  if auth.uid() is null or v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  select id, firm_name into v_firm from public.accounting_firms where connection_code = btrim(p_code) limit 1;
  if not found then return jsonb_build_object('status', 'CODE_NOT_FOUND'); end if;
  select id, status into v_link from public.accountant_taxpayer_links
   where taxpayer_organization_id = v_org and accounting_firm_id = v_firm.id;
  v_exists := found;  -- PERFORM, FOUND'u ezer; sonucu hemen sakla
  if v_exists and v_link.status = 'active' then return jsonb_build_object('status', 'ALREADY_CONNECTED', 'firm_name', v_firm.firm_name); end if;
  if v_exists and v_link.status = 'pending_confirmation' then return jsonb_build_object('status', 'REQUEST_PENDING', 'firm_name', v_firm.firm_name, 'link_id', v_link.id); end if;
  perform set_config('app.connection_source', 'flow', true);
  if v_exists then
    update public.accountant_taxpayer_links
       set status = 'pending_confirmation', source = 'advisor_code', initiated_by_user_id = auth.uid()
     where id = v_link.id;
    v_id := v_link.id;
  else
    insert into public.accountant_taxpayer_links (accounting_firm_id, taxpayer_organization_id, status, source, initiated_by_user_id)
    values (v_firm.id, v_org, 'pending_confirmation', 'advisor_code', auth.uid())
    returning id into v_id;
  end if;
  return jsonb_build_object('status', 'SUCCESS', 'firm_name', v_firm.firm_name, 'link_id', v_id);
end;
$$;

create or replace function public.get_my_accountant_connection()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object(
        'status', l.status, 'link_id', l.id, 'firm_name', f.firm_name,
        'connected_at', l.connected_at, 'requested_at', l.updated_at)
       from public.accountant_taxpayer_links l join public.accounting_firms f on f.id = l.accounting_firm_id
      where l.taxpayer_organization_id = public.current_org_id() and l.status in ('active', 'pending_confirmation')
      order by (l.status = 'active') desc, l.updated_at desc limit 1),
    jsonb_build_object('status', 'none'));
$$;

create or replace function public.cancel_accountant_request()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.current_org_id(); v_n int;
begin
  if auth.uid() is null or v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  perform set_config('app.connection_source', 'flow', true);
  perform set_config('app.connection_reason', 'işletme isteği geri çekti', true);
  update public.accountant_taxpayer_links set status = 'rejected'
   where taxpayer_organization_id = v_org and status = 'pending_confirmation';
  get diagnostics v_n = row_count;
  return jsonb_build_object('status', case when v_n = 0 then 'NO_PENDING_REQUEST' else 'SUCCESS' end);
end;
$$;

drop function if exists public.disconnect_current_accountant(text);
create or replace function public.disconnect_current_accountant(p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.current_org_id(); v_n int;
begin
  if auth.uid() is null or v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  perform set_config('app.connection_source', 'flow', true);
  update public.accountant_taxpayer_links
     set status = 'disconnected', disconnected_by_user_id = auth.uid(), disconnect_source = 'flow', disconnect_reason = nullif(btrim(p_reason), '')
   where taxpayer_organization_id = v_org and status = 'active';
  get diagnostics v_n = row_count;
  return jsonb_build_object('status', case when v_n = 0 then 'ACTIVE_CONNECTION_NOT_FOUND' else 'SUCCESS' end);
end;
$$;

-- 5) RPC'ler — MÜŞAVİR tarafı (Ledger)
drop function if exists public.review_connection_request(uuid, text);
create or replace function public.review_connection_request(p_link_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_link record;
begin
  if auth.uid() is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if p_action not in ('accept', 'reject') then return jsonb_build_object('status', 'INVALID_ACTION'); end if;
  select l.* into v_link from public.accountant_taxpayer_links l
    join public.accounting_firm_members m on m.accounting_firm_id = l.accounting_firm_id and m.user_id = auth.uid()
   where l.id = p_link_id;
  if not found then return jsonb_build_object('status', 'NOT_FOUND'); end if;
  if v_link.status <> 'pending_confirmation' then return jsonb_build_object('status', 'NOT_PENDING', 'current_status', v_link.status); end if;
  perform set_config('app.connection_source', 'ledger', true);
  if p_action = 'accept' then
    -- işletmenin başka aktif müşaviri varsa önce 'replaced' olur (tek aktif kuralı)
    update public.accountant_taxpayer_links set status = 'replaced'
     where taxpayer_organization_id = v_link.taxpayer_organization_id and status = 'active' and id <> v_link.id;
    update public.accountant_taxpayer_links set status = 'active', confirmed_by_user_id = auth.uid() where id = v_link.id;
  else
    update public.accountant_taxpayer_links set status = 'rejected' where id = v_link.id;
  end if;
  return jsonb_build_object('status', 'SUCCESS', 'new_status', case when p_action = 'accept' then 'active' else 'rejected' end);
end;
$$;

create or replace function public.disconnect_taxpayer(p_link_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if auth.uid() is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if not exists (
    select 1 from public.accountant_taxpayer_links l
    join public.accounting_firm_members m on m.accounting_firm_id = l.accounting_firm_id and m.user_id = auth.uid()
    where l.id = p_link_id
  ) then return jsonb_build_object('status', 'NOT_FOUND'); end if;
  -- Mevcut Ledger kuralı korunur: yalnız firma sahibi ya da yöneticisi koparabilir
  if not exists (
    select 1 from public.accountant_taxpayer_links l
    join public.accounting_firm_members m on m.accounting_firm_id = l.accounting_firm_id and m.user_id = auth.uid()
    where l.id = p_link_id and m.role in ('owner', 'admin')
  ) then return jsonb_build_object('status', 'FORBIDDEN_ROLE'); end if;
  perform set_config('app.connection_source', 'ledger', true);
  update public.accountant_taxpayer_links
     set status = 'disconnected', disconnected_by_user_id = auth.uid(), disconnect_source = 'ledger', disconnect_reason = nullif(btrim(p_reason), '')
   where id = p_link_id and status = 'active';
  get diagnostics v_n = row_count;
  return jsonb_build_object('status', case when v_n = 0 then 'NOT_ACTIVE' else 'SUCCESS' end);
end;
$$;

-- 6) Bozuk ve hiçbir ekrandan çağrılmayan eski fonksiyon (zorunlu alanları boş bırakıp her seferinde hata veriyordu)
drop function if exists public.connect_accountant(text);

-- 7) Yetkiler
revoke execute on function public.resolve_accountant_code(text) from public, anon;
revoke execute on function public.request_accountant_connection(text) from public, anon;
revoke execute on function public.get_my_accountant_connection() from public, anon;
revoke execute on function public.cancel_accountant_request() from public, anon;
revoke execute on function public.disconnect_current_accountant(text) from public, anon;
revoke execute on function public.review_connection_request(uuid, text) from public, anon;
revoke execute on function public.disconnect_taxpayer(uuid, text) from public, anon;
grant execute on function public.resolve_accountant_code(text) to authenticated;
grant execute on function public.request_accountant_connection(text) to authenticated;
grant execute on function public.get_my_accountant_connection() to authenticated;
grant execute on function public.cancel_accountant_request() to authenticated;
grant execute on function public.disconnect_current_accountant(text) to authenticated;
grant execute on function public.review_connection_request(uuid, text) to authenticated;
grant execute on function public.disconnect_taxpayer(uuid, text) to authenticated;
