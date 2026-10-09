-- Anasayfa "Randevu Bildirimleri" > "Raporları Temizle": işletmenin randevu bildirimlerini siler.
-- Yalnız `notifications` (type = 'appointment_created'); randevular ve müşteri konuşmaları (ai_communication_logs) SİLİNMEZ.
-- Kimlik istemciden gelmez: current_org_id() çözer (AGENTS §3). Yalnız işletme sahibi çalıştırır (notifications okuma/güncelleme politikasıyla aynı).
-- notifications tablosunda istemci için DELETE politikası yok; bu yüzden silme yalnız bu fonksiyonla yapılır.

create or replace function public.clear_appointment_notifications()
 returns jsonb
 language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_org uuid := public.current_org_id();
  v_n integer;
begin
  if v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if not exists (select 1 from public.organizations where id = v_org and owner_id = auth.uid()) then
    return jsonb_build_object('status', 'FORBIDDEN');
  end if;
  delete from public.notifications where profile_id = v_org and type = 'appointment_created';
  get diagnostics v_n = row_count;
  return jsonb_build_object('status', 'SUCCESS', 'deleted', v_n);
end;
$function$;

revoke all on function public.clear_appointment_notifications() from public, anon;
grant execute on function public.clear_appointment_notifications() to authenticated, service_role;
