-- Anasayfa "Randevu Bildirimleri" randevularla SENKRON olsun: silinen veya iptal edilen randevunun bildirimi listede/sayaçta görünmez.
-- Tek doğru kaynak (AGENTS §4 ilkesi): web ve mobil bildirimleri doğrudan `notifications` tablosundan okumaz, bu iki fonksiyonu çağırır.
-- Kimlik istemciden gelmez: current_org_id() çözer. Bildirimin randevusu (metadata.appointment_id) yoksa ya da durumu 'Cancelled' ise gizlenir.
-- (delete_appointment zaten silinen randevunun bildirimlerini siler; bu fonksiyonlar diğer silme yollarını (AI aracı, sıfırlama, doğrudan SQL) ve iptalleri de kapsar.)

create or replace function public.get_appointment_notifications(p_limit integer default 10)
 returns table(id uuid, created_at timestamptz, is_read boolean, metadata jsonb)
 language sql stable security definer set search_path to 'public'
as $function$
  select n.id, n.created_at, n.is_read, n.metadata
  from public.notifications n
  where n.profile_id = public.current_org_id()
    and n.type = 'appointment_created'
    and (
      nullif(n.metadata->>'appointment_id', '') is null
      or exists (
        select 1 from public.appointments a
        where a.id::text = n.metadata->>'appointment_id'
          and a.org_id = n.profile_id
          and a.status::text <> 'Cancelled'
      )
    )
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 10), 100));
$function$;

create or replace function public.count_unread_appointment_notifications()
 returns integer
 language sql stable security definer set search_path to 'public'
as $function$
  select count(*)::integer
  from public.notifications n
  where n.profile_id = public.current_org_id()
    and n.type = 'appointment_created'
    and not n.is_read
    and (
      nullif(n.metadata->>'appointment_id', '') is null
      or exists (
        select 1 from public.appointments a
        where a.id::text = n.metadata->>'appointment_id'
          and a.org_id = n.profile_id
          and a.status::text <> 'Cancelled'
      )
    );
$function$;

revoke all on function public.get_appointment_notifications(integer) from public, anon;
revoke all on function public.count_unread_appointment_notifications() from public, anon;
grant execute on function public.get_appointment_notifications(integer) to authenticated, service_role;
grant execute on function public.count_unread_appointment_notifications() to authenticated, service_role;
