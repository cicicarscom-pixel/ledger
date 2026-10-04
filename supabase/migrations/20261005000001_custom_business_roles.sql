-- Kullanıcının kendi eklediği işletme rolleri (AI Asistan > İşletme Rolü kartları).
-- Rol seçilince organization_ai_settings.business_role'e ham metin olarak yazılır (mevcut davranış); bu tablo yalnız
-- "kendi rollerim" kartlarının listesini tutar. Kimlik istemciden gönderilmez: org_id = current_org_id() (varsayılan + RLS).

create table if not exists public.custom_business_roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.current_org_id() references public.organizations(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 60),
  created_at timestamptz not null default now()
);

create unique index if not exists custom_business_roles_org_label_key on public.custom_business_roles (org_id, lower(btrim(label)));
create index if not exists custom_business_roles_org_id_idx on public.custom_business_roles (org_id);

alter table public.custom_business_roles enable row level security;

create policy "org_id: select" on public.custom_business_roles
  for select to authenticated using (org_id = public.current_org_id());

-- En fazla 20 özel rol (kötüye kullanımı önler)
create policy "org_id: insert" on public.custom_business_roles
  for insert to authenticated
  with check (
    org_id = public.current_org_id()
    and (select count(*) from public.custom_business_roles r where r.org_id = public.current_org_id()) < 20
  );

create policy "org_id: delete" on public.custom_business_roles
  for delete to authenticated using (org_id = public.current_org_id());

revoke all on public.custom_business_roles from anon;
grant select, insert, delete on public.custom_business_roles to authenticated;
