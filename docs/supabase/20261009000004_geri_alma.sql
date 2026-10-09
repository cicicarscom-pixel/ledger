-- Geri alma (yalnızca gerekirse): 20261009000004 değişikliklerini eski haline döndürür.
begin;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.check_accountant_document_access(uuid) to public, anon, authenticated, service_role;
grant execute on function public.org_today(uuid) to public, anon, authenticated, service_role;
alter policy "Admins can view all ai logs" on public.ai_communication_logs to public;
alter policy "admin_create_broadcast" on public.broadcast_notifications to public;
alter policy "Users and accountants can view documents" on public.finance_documents to public;
alter policy "Users and accountants can delete documents" on public.finance_documents to public;
alter policy "Users and accountants can update documents" on public.finance_documents to public;
alter policy "admin_send_to_anyone" on public.notifications to public;
alter policy "Admins can view all organizations" on public.organizations to public;
alter policy "Admins can view all profiles" on public.profiles to public;
-- search_path ayarlarını kaldırmak gerekirse (güvenlik için önerilmez):
-- alter function public.<ad>(<argümanlar>) reset search_path;
commit;
