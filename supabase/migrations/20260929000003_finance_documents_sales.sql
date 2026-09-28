-- Ledger paneli satış faturasını finance_documents.type = 'sales' ile tanıyor (ApprovalPage, ApprovedPage, Excel/XML).
-- Kısıt yalnız income/expense kabul ettiği için satış faturaları hiç kaydedilemiyordu.
-- Claude tarafından 29.09.2026'da canlıya uygulandı.
alter table public.finance_documents drop constraint if exists finance_documents_type_check;
alter table public.finance_documents add constraint finance_documents_type_check
  check (type in ('income', 'expense', 'sales'));

-- Takvime aktarım: 'sales' -> 'income'.
-- flow_payment_status boşsa: vadesi gelecekte değilse ödenmiş sayılır. Bugün hiçbir akış bu alanı boş
-- bırakmıyor (mobil ve web AI veri girişi taslağı 'unpaid' açar, ledger-isleyici-api paid/unpaid yazar);
-- bu yalnız ileride eklenecek bir yol için güvenli varsayılan. Not: Ledger'da muhasebecinin fatura yükleme
-- akışı YOK (apps/ledger'daki upload/process-document kodu ve ledger-process-document fonksiyonu kullanılmıyor).
create or replace function public.tr_finance_document_to_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tx_type text;
  v_today date;
begin
  if tg_op = 'DELETE' then
    delete from public.transactions where document_id = old.id::text;
    return old;
  end if;

  v_tx_type := case new.type when 'sales' then 'income' when 'income' then 'income' when 'expense' then 'expense' else null end;
  v_today := public.org_today(new.organization_id);

  if coalesce(new.document_status, 'draft') <> 'cancelled' and new.archived_at is null
     and v_tx_type is not null and coalesce(new.amount_minor, 0) > 0 then
    insert into public.transactions
      (profile_id, type, title, amount_minor, currency_code, date, due_date, payment_status, document_id, source, tax_details)
    values (
      new.organization_id,
      v_tx_type,
      coalesce(nullif(new.title, ''), nullif(new.counterparty_name, ''), 'Fatura'),
      coalesce(new.amount_minor, 0),
      coalesce(new.currency_code, 'TRY'),
      (new.created_at at time zone coalesce((select timezone from public.organizations where id = new.organization_id), 'Europe/Istanbul'))::date,
      new.due_date,
      case
        when new.flow_payment_status = 'paid' then 'paid'
        when new.flow_payment_status = 'partial' then 'partial'
        when new.flow_payment_status = 'unpaid' then 'pending'
        when new.due_date is not null and new.due_date > v_today then 'pending'
        else 'paid'
      end,
      new.id::text,
      'invoice_scan',
      new.tax_details
    )
    on conflict (document_id) where document_id is not null do update set
      type = excluded.type,
      title = excluded.title,
      amount_minor = excluded.amount_minor,
      currency_code = excluded.currency_code,
      date = excluded.date,
      due_date = excluded.due_date,
      payment_status = excluded.payment_status,
      tax_details = excluded.tax_details;
  else
    delete from public.transactions where document_id = new.id::text;
  end if;
  return new;
end;
$$;
