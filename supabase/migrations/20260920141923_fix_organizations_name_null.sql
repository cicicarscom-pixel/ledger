-- Mimari tutarlılık ve Faz 2 trigger'ı için name kolonundan NOT NULL kısıtlamasını kaldırıyoruz
ALTER TABLE public.organizations ALTER COLUMN name DROP NOT NULL;
