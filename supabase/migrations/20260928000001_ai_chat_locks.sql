-- WhatsApp/sosyal AI asistanı: aynı sohbetin mesajlarını sırayla işlemek için kilit.
-- Kullanan: supabase/functions/shared/infrastructure/locks/ChatLock.ts (service_role).

create table if not exists public.ai_chat_locks (
  lock_key     text primary key,
  holder       uuid not null,
  locked_until timestamptz not null
);

alter table public.ai_chat_locks enable row level security;
revoke all on table public.ai_chat_locks from anon, authenticated;

create or replace function public.acquire_ai_chat_lock(
  p_key text,
  p_holder uuid,
  p_ttl_seconds integer default 120
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_holder uuid;
begin
  insert into public.ai_chat_locks as l (lock_key, holder, locked_until)
  values (p_key, p_holder, now() + make_interval(secs => greatest(p_ttl_seconds, 1)))
  on conflict (lock_key) do update
    set holder = excluded.holder,
        locked_until = excluded.locked_until
    where l.locked_until < now()
  returning l.holder into v_holder;

  return coalesce(v_holder = p_holder, false);
end;
$$;

create or replace function public.release_ai_chat_lock(
  p_key text,
  p_holder uuid
) returns void
language sql
security definer
set search_path = public
as $$
  delete from public.ai_chat_locks where lock_key = p_key and holder = p_holder;
$$;

revoke execute on function public.acquire_ai_chat_lock(text, uuid, integer) from public, anon, authenticated;
revoke execute on function public.release_ai_chat_lock(text, uuid) from public, anon, authenticated;
grant execute on function public.acquire_ai_chat_lock(text, uuid, integer) to service_role;
grant execute on function public.release_ai_chat_lock(text, uuid) to service_role;
