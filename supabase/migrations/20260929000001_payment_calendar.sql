-- Ödeme Takvimi (M0): transactions takvimin tek kaynağı.
-- Kaynaklar: manual (RPC create_finance_entry), ai_chat (ledger-isleyici-api),
-- invoice_scan (finance_documents confirmed -> tetikleyici).
-- "Gecikti" saklanmaz: get_payment_calendar içinde işletme saat dilimine göre hesaplanır.

-- 1) Kolonlar ve kısıtlar
alter table public.transactions add column if not exists source text not null default 'manual';
alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions add constraint transactions_source_check
  check (source in ('manual', 'ai_chat', 'invoice_scan'));

alter table public.transactions alter column payment_status drop default;
-- status (eski alan) varsayılanı 'pending' idi: açıkça gönderilen değerle ayırt edilemiyordu
alter table public.transactions alter column status drop default;
alter table public.transactions drop constraint if exists transactions_payment_status_check;
alter table public.transactions add constraint transactions_payment_status_check
  check (payment_status in ('paid', 'pending', 'partial'));

create unique index if not exists transactions_document_id_uidx
  on public.transactions (document_id) where document_id is not null;
create index if not exists transactions_profile_day_idx
  on public.transactions (profile_id, (coalesce(due_date, date)));

-- finance_documents: ledger-process-document 'ready_for_review' yazıyor, kısıt kabul etmiyordu
alter table public.finance_documents drop constraint if exists finance_documents_document_status_check;
alter table public.finance_documents add constraint finance_documents_document_status_check
  check (document_status in ('draft', 'ready_for_review', 'confirmed', 'cancelled'));

-- 2) Yardımcılar
create or replace function public.org_today(p_org uuid)
returns date language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce((select timezone from public.organizations where id = p_org), 'Europe/Istanbul'))::date;
$$;

-- Çağıranın işletmesi: sahibi olduğu, yoksa üyesi olduğu ilk işletme
create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select o.id from public.organizations o where o.owner_id = auth.uid() order by o.created_at limit 1),
    (select m.organization_id from public.organization_members m where m.user_id = auth.uid() order by m.created_at limit 1)
  );
$$;

-- 3) Normalleştirme: her yazım yolu aynı biçime gelir
create or replace function public.tr_transactions_normalize()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_today date;
begin
  v_today := public.org_today(new.profile_id);

  -- tutar: amount_minor (kuruş) esas, amount (TL) eski alan; ikisi senkron, her zaman pozitif
  if tg_op = 'INSERT' then
    if new.amount_minor is null and new.amount is not null then
      new.amount_minor := round(abs(new.amount) * 100);
    end if;
  elsif new.amount_minor is distinct from old.amount_minor then
    null; -- amount_minor değişti, aşağıda amount türetilir
  elsif new.amount is distinct from old.amount then
    new.amount_minor := round(abs(new.amount) * 100);
  end if;
  new.amount_minor := abs(coalesce(new.amount_minor, 0));
  new.amount := new.amount_minor / 100.0;

  new.currency_code := coalesce(nullif(new.currency_code, ''), 'TRY');
  new.date := coalesce(new.date, new.due_date, v_today);

  -- ödeme durumu: eski değerleri eşle, boşsa tarihe göre
  new.payment_status := case
    when new.payment_status in ('paid', 'pending', 'partial') then new.payment_status
    when new.payment_status = 'unpaid' then 'pending'
    when new.status in ('paid', 'completed') then 'paid'
    when new.status in ('pending', 'unpaid') then 'pending'
    when new.status = 'partial' then 'partial'
    when coalesce(new.due_date, new.date) > v_today then 'pending'
    else 'paid'
  end;

  if new.payment_status = 'paid' then
    new.paid_at := coalesce(new.paid_at, now());
  else
    new.paid_at := null;
  end if;

  new.status := new.payment_status;  -- eski alan, geriye uyumluluk
  return new;
end;
$$;

drop trigger if exists tr_transactions_normalize on public.transactions;
create trigger tr_transactions_normalize
  before insert or update on public.transactions
  for each row execute function public.tr_transactions_normalize();

-- 4) Fatura -> takvim: iptal edilmemiş, arşivlenmemiş ve tutarı > 0 olan belge takvimde.
--    (Flow'da resmi 'confirmed' onayı yok; o, muhasebecinin Ledger tarafı. Tutar şartı: mobil,
--    AI işlemeden önce amount_minor = 0 taslak satır açıyor.)
create or replace function public.tr_finance_document_to_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from public.transactions where document_id = old.id::text;
    return old;
  end if;

  if coalesce(new.document_status, 'draft') <> 'cancelled' and new.archived_at is null
     and new.type in ('income', 'expense') and coalesce(new.amount_minor, 0) > 0 then
    insert into public.transactions
      (profile_id, type, title, amount_minor, currency_code, date, due_date, payment_status, document_id, source, tax_details)
    values (
      new.organization_id,
      new.type,
      coalesce(nullif(new.title, ''), nullif(new.counterparty_name, ''), 'Fatura'),
      coalesce(new.amount_minor, 0),
      coalesce(new.currency_code, 'TRY'),
      (new.created_at at time zone coalesce((select timezone from public.organizations where id = new.organization_id), 'Europe/Istanbul'))::date,
      new.due_date,
      case new.flow_payment_status when 'paid' then 'paid' when 'partial' then 'partial' else 'pending' end,
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

drop trigger if exists tr_finance_document_to_transaction on public.finance_documents;
create trigger tr_finance_document_to_transaction
  after insert or update or delete on public.finance_documents
  for each row execute function public.tr_finance_document_to_transaction();

-- 5) RPC'ler (web + mobil)
create or replace function public.create_finance_entry(
  p_type text,
  p_title text,
  p_amount numeric,
  p_date date,
  p_due_date date default null,
  p_payment_status text default null,
  p_category text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := public.current_org_id();
  v_id uuid;
begin
  if auth.uid() is null or v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if p_type not in ('income', 'expense') then return jsonb_build_object('status', 'INVALID_TYPE'); end if;
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('status', 'INVALID_AMOUNT'); end if;
  if coalesce(btrim(p_title), '') = '' then return jsonb_build_object('status', 'TITLE_REQUIRED'); end if;
  if p_date is null then return jsonb_build_object('status', 'DATE_REQUIRED'); end if;
  if p_payment_status is not null and p_payment_status not in ('paid', 'pending', 'partial') then
    return jsonb_build_object('status', 'INVALID_STATUS');
  end if;

  insert into public.transactions (profile_id, type, title, amount, date, due_date, payment_status, category, source)
  values (v_org, p_type, btrim(p_title), p_amount, p_date, p_due_date, p_payment_status, nullif(btrim(p_category), ''), 'manual')
  returning id into v_id;

  return jsonb_build_object('status', 'SUCCESS', 'id', v_id);
end;
$$;

create or replace function public.set_transaction_payment_status(p_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := public.current_org_id();
  v_n int;
begin
  if auth.uid() is null or v_org is null then return jsonb_build_object('status', 'UNAUTHORIZED'); end if;
  if p_status not in ('paid', 'pending', 'partial') then return jsonb_build_object('status', 'INVALID_STATUS'); end if;
  update public.transactions set payment_status = p_status where id = p_id and profile_id = v_org;
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('status', 'NOT_FOUND'); end if;
  return jsonb_build_object('status', 'SUCCESS');
end;
$$;

create or replace function public.get_payment_calendar(p_from date, p_to date)
returns table (
  id uuid, type text, title text, amount_minor bigint, currency_code text,
  day date, due_date date, date date, payment_status text, is_overdue boolean,
  source text, document_id text, category text
) language sql stable security definer set search_path = public as $$
  select t.id, t.type, t.title, t.amount_minor, t.currency_code,
         coalesce(t.due_date, t.date) as day, t.due_date, t.date, t.payment_status,
         (t.payment_status in ('pending', 'partial') and coalesce(t.due_date, t.date) < public.org_today(t.profile_id)) as is_overdue,
         t.source, t.document_id, t.category
  from public.transactions t
  where t.profile_id = public.current_org_id()
    and coalesce(t.due_date, t.date) between p_from and p_to
  order by coalesce(t.due_date, t.date), t.type, t.created_at;
$$;

revoke execute on function public.create_finance_entry(text, text, numeric, date, date, text, text) from public, anon;
revoke execute on function public.set_transaction_payment_status(uuid, text) from public, anon;
revoke execute on function public.get_payment_calendar(date, date) from public, anon;
revoke execute on function public.current_org_id() from public, anon;
grant execute on function public.create_finance_entry(text, text, numeric, date, date, text, text) to authenticated;
grant execute on function public.set_transaction_payment_status(uuid, text) to authenticated;
grant execute on function public.get_payment_calendar(date, date) to authenticated;
grant execute on function public.current_org_id() to authenticated;
