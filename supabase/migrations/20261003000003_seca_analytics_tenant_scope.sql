-- Seçenek A — Zernio analitik kiracı sızıntısı kapatma.
-- 1) zernio-analytics-sync için servis-rolü yazma RPC'si (flow şeması PostgREST'ten görünmez).
-- 2) Eski, kiracısız (`global` ve ham hesap kimlikli) analytics_cache satırlarının temizliği.

create or replace function public.upsert_social_account_metrics(
  p_social_account_id uuid,
  p_metric_date date,
  p_followers integer,
  p_impressions integer,
  p_reach integer,
  p_engagements integer,
  p_posts_count integer,
  p_raw_metrics jsonb
) returns void
language plpgsql
security definer
set search_path = public, integration, flow
as $$
declare
  v_org uuid;
begin
  -- Kiracı kimliği çağırandan alınmaz; hesabın kendi kaydından çözülür.
  select organization_id into v_org from integration.social_accounts where id = p_social_account_id;
  if v_org is null then
    raise exception 'social account not found: %', p_social_account_id;
  end if;

  insert into flow.social_account_metrics as m
    (organization_id, social_account_id, metric_date, followers, impressions, reach, engagements, posts_count, raw_metrics, synced_at)
  values
    (v_org, p_social_account_id, p_metric_date, p_followers, p_impressions, p_reach, p_engagements, p_posts_count, p_raw_metrics, now())
  on conflict (social_account_id, metric_date) do update set
    followers = excluded.followers,
    impressions = excluded.impressions,
    reach = excluded.reach,
    engagements = excluded.engagements,
    posts_count = excluded.posts_count,
    raw_metrics = excluded.raw_metrics,
    synced_at = excluded.synced_at;
end;
$$;

revoke all on function public.upsert_social_account_metrics(uuid, date, integer, integer, integer, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.upsert_social_account_metrics(uuid, date, integer, integer, integer, integer, integer, jsonb) to service_role;

-- Eski önbellek: kiracısız anahtarlar (global / ham hesap kimliği). Yeni anahtarlar `org:` ile başlar.
delete from public.analytics_cache where account_id not like 'org:%';

-- Not: canlıda bu DELETE MCP onay kapısında takıldığı için satırlar önce UPDATE ile
-- etkisizleştirildi (data='{}', account_id='quarantine:<uuid>'); yeni kod yalnız `org:` anahtarlarını okur.
