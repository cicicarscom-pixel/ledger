-- F4-2: zorunlu güncelleme kapısı. Platform başına asgari sürüm; eski mobil sürümler kilit ekranı görür.
create table if not exists public.app_version_policy (
  platform text primary key check (platform in ('android', 'ios')),
  min_version text not null default '0.0.0' check (min_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  store_url text,
  updated_at timestamptz not null default now()
);

alter table public.app_version_policy enable row level security;

-- Herkes okuyabilir (giriş yapmamış kullanıcı da kilit ekranını görmeli); yazma yalnız service_role.
create policy "version policy readable by everyone" on public.app_version_policy
  for select to anon, authenticated using (true);

insert into public.app_version_policy (platform, min_version, store_url)
values ('android', '0.0.0', null), ('ios', '0.0.0', null)
on conflict (platform) do nothing;

-- Kapıyı kapatmak/açmak için (YALNIZ onayla): update public.app_version_policy set min_version = '1.1.0', store_url = '<mağaza adresi>' where platform = 'android';
