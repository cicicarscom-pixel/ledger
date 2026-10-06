-- WAHA secret adı beyaz listesi (güvenlik; Claude canlıya 06.10.2026 uyguladı, dosya kayıt amaçlı).
-- Sorun: admin_upsert_waha_server herhangi bir BÜYÜK_HARFLİ secret adını kabul ediyordu (örn. SUPABASE_SERVICE_ROLE_KEY).
-- Sunucu kaydındaki adres admin tarafından belirlendiği için, o secret'ın değeri X-Api-Key başlığıyla adresine gönderilebilirdi.
-- Çözüm: API anahtarı adı WAHA_API_KEY[_...], webhook anahtarı adı WAHA_WEBHOOK_SECRET[_...] olmak zorunda.

create or replace function public.admin_upsert_waha_server(
  p_id uuid, p_name text, p_base_url text, p_api_key_secret_name text, p_webhook_secret_name text,
  p_fill_order int, p_max_sessions int, p_warn_percent int default 80)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_base_url is null or p_base_url not like 'https://%' then raise exception 'HTTPS_REQUIRED' using errcode = '22023'; end if;
  if p_api_key_secret_name !~ '^WAHA_API_KEY(_[A-Z0-9]+)*$' or p_webhook_secret_name !~ '^WAHA_WEBHOOK_SECRET(_[A-Z0-9]+)*$' then
    raise exception 'INVALID_SECRET_NAME' using errcode = '22023';
  end if;
  if p_id is null then
    insert into public.waha_servers (name, base_url, api_key_secret_name, webhook_secret_name, fill_order, max_sessions, warn_percent)
    values (btrim(p_name), btrim(p_base_url), p_api_key_secret_name, p_webhook_secret_name, p_fill_order, p_max_sessions, p_warn_percent)
    returning id into v_id;
  else
    update public.waha_servers set name = btrim(p_name), base_url = btrim(p_base_url), api_key_secret_name = p_api_key_secret_name,
      webhook_secret_name = p_webhook_secret_name, fill_order = p_fill_order, max_sessions = p_max_sessions, warn_percent = p_warn_percent
    where id = p_id returning id into v_id;
    if v_id is null then raise exception 'NOT_FOUND'; end if;
  end if;
  return v_id;
end $$;
