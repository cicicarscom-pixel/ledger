-- Geri alma: Faz E2 (muhasebeci kod sertleştirme). E1 gövdelerini geri yükler, E2 nesnelerini siler.
begin;
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
  v_exists := found;
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
drop function if exists public._accountant_firm_by_code(text);
drop function if exists public._accountant_code_rate_limited(uuid);
drop function if exists public._accountant_code_log_failure(uuid);
drop table if exists public.accountant_code_attempts;
commit;
