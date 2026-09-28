-- Tüm özet ekranları (Anasayfa, AI Muhasebe, İşletmem; web + mobil) aynı tanımı kullanır.
-- Kaynak yalnız transactions (faturalar tetikleyiciyle buraya yansıyor; finance_documents ayrıca TOPLANMAZ).
--   income / expense     : dönem içinde (coalesce(due_date,date)) ÖDENMİŞ kayıtlar
--   receivable / payable : tarihten bağımsız, ödenmemiş (pending/partial) gelir / gider
--   overdue_*            : ödenmemiş ve günü bugünden (işletme saat dilimi) önce
-- Tutarlar kuruş (minor). Claude tarafından 29.09.2026'da canlıya uygulandı.
create or replace function public.get_finance_summary(p_from date, p_to date)
returns jsonb language sql stable security definer set search_path = public as $$
  with org as (select public.current_org_id() as id),
  t as (
    select tr.type, tr.amount_minor, tr.payment_status, coalesce(tr.due_date, tr.date) as day
    from public.transactions tr, org
    where tr.profile_id = org.id
  )
  select case when (select id from org) is null then jsonb_build_object('status', 'UNAUTHORIZED') else
    jsonb_build_object(
      'status', 'SUCCESS',
      'income',  coalesce(sum(amount_minor) filter (where type = 'income'  and payment_status = 'paid' and day between p_from and p_to), 0),
      'expense', coalesce(sum(amount_minor) filter (where type = 'expense' and payment_status = 'paid' and day between p_from and p_to), 0),
      'receivable', coalesce(sum(amount_minor) filter (where type = 'income'  and payment_status in ('pending','partial')), 0),
      'payable',    coalesce(sum(amount_minor) filter (where type = 'expense' and payment_status in ('pending','partial')), 0),
      'overdue_count',  count(*) filter (where payment_status in ('pending','partial') and day < public.org_today((select id from org))),
      'overdue_amount', coalesce(sum(amount_minor) filter (where payment_status in ('pending','partial') and day < public.org_today((select id from org))), 0),
      'currency', 'TRY'
    ) end
  from t;
$$;

revoke execute on function public.get_finance_summary(date, date) from public, anon;
grant execute on function public.get_finance_summary(date, date) to authenticated;
