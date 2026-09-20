create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.profiles (id, full_name, email, onboarding_completed)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    false
  )
  on conflict (id) do nothing;

  insert into public.organizations (owner_id, name)
  values (new.id, null)
  on conflict (owner_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
