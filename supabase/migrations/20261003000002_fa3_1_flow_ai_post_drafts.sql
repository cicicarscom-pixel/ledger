-- FA3-1 — Flow AI gönderi taslakları (03.10.2026, Claude; canlıya Claude uygular, dosya kayıt amaçlı).
-- prepare_post_draft aracı (PREPARE) taslağı yazar; mobil AI Üretim ekranı draftId ile açıp alanları doldurur (FA3-3).
-- Taslak YAYINLAMAZ: paylaşımı kullanıcı mevcut Paylaş düğmesiyle kendisi yapar.
-- Yazma yalnız sunucu (service_role); kullanıcı yalnız kendi taslağını okur/siler.
-- NOT: DROP/DELETE içeren komutlar MCP onay kapısında takılıyor; bu dosyada DROP ... IF EXISTS yok.

create table if not exists public.flow_ai_post_drafts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.flow_ai_conversations(id) on delete set null,
  caption text not null check (char_length(caption) between 1 and 5000),
  platforms text[] not null default '{}' check (cardinality(platforms) <= 10),
  status text not null default 'draft' check (status in ('draft','used','discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);
create index if not exists flow_ai_post_drafts_org_user_idx on public.flow_ai_post_drafts (org_id, user_id, created_at desc);
create trigger tr_flow_ai_post_drafts_updated before update on public.flow_ai_post_drafts
  for each row execute function public.set_updated_at();

alter table public.flow_ai_post_drafts enable row level security;

create policy flow_ai_post_drafts_select on public.flow_ai_post_drafts for select to authenticated
  using (org_id = public.current_org_id() and user_id = auth.uid());
create policy flow_ai_post_drafts_delete on public.flow_ai_post_drafts for delete to authenticated
  using (org_id = public.current_org_id() and user_id = auth.uid());

revoke all on public.flow_ai_post_drafts from anon;
revoke all on public.flow_ai_post_drafts from authenticated;
grant select, delete on public.flow_ai_post_drafts to authenticated;
grant all on public.flow_ai_post_drafts to service_role;
