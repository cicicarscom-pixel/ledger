-- Gelen Kutusu › Yorumlar: okunmamış yorum sayacı için okundu durumu.
-- Mevcut yorumlar "okundu" sayılır (DEFAULT true ile eklenir); bundan sonra gelenler okunmamış (false) başlar.
-- webhook INSERT'ü is_read vermez, varsayılan false'tur.
alter table public.comments add column if not exists is_read boolean not null default true;
alter table public.comments alter column is_read set default false;
