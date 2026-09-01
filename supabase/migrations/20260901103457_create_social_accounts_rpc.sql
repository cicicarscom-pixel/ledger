create or replace function public.get_active_social_accounts_for_sync()
returns setof integration.social_accounts
language sql security definer set search_path = integration, public as $$
  select * from integration.social_accounts where is_active = true and enabled = true;
$$;
