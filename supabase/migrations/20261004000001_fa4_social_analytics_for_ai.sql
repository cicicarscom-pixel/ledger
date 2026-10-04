-- FA4 — Flow AI salt-okunur sosyal analitik özeti.
-- Yalnız service_role; kiracı p_org parametresiyle (sunucuda JWT'den çözülmüş organizations.id) verilir.
create or replace function public.get_social_analytics_for_ai(p_org uuid, p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, integration, flow
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 90));
  v_from date := current_date - (greatest(1, least(coalesce(p_days, 30), 90)) - 1);
  v_accounts jsonb;
  v_posts jsonb;
begin
  if p_org is null then
    raise exception 'p_org required';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_accounts from (
    select
      a.platform,
      a.username,
      (array_agg(m.followers order by m.metric_date desc))[1] as followers_now,
      (array_agg(m.followers order by m.metric_date asc))[1] as followers_start,
      coalesce(sum(m.impressions), 0) as impressions,
      coalesce(sum(m.reach), 0) as reach,
      coalesce(sum(m.engagements), 0) as engagements,
      count(m.id) as days_with_data,
      max(m.metric_date) as last_metric_date
    from integration.social_accounts a
    left join flow.social_account_metrics m
      on m.social_account_id = a.id and m.organization_id = p_org and m.metric_date >= v_from
    where a.organization_id = p_org and a.is_active = true
    group by a.id, a.platform, a.username
    order by a.platform
  ) t;

  select jsonb_build_object(
    'total', count(*),
    'by_status', coalesce((select jsonb_object_agg(s, c) from (select status s, count(*) c from public.posts where profile_id = p_org and created_at >= v_from group by status) x), '{}'::jsonb),
    'by_platform', coalesce((select jsonb_object_agg(pl, c) from (select pl, count(*) c from public.posts p, unnest(p.platforms) pl where p.profile_id = p_org and p.created_at >= v_from group by pl) y), '{}'::jsonb)
  ) into v_posts
  from public.posts where profile_id = p_org and created_at >= v_from;

  return jsonb_build_object('days', v_days, 'from', v_from, 'accounts', v_accounts, 'posts', v_posts);
end;
$$;

revoke all on function public.get_social_analytics_for_ai(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_social_analytics_for_ai(uuid, integer) to service_role;
