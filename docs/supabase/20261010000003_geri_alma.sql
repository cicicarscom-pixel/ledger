-- Geri alma: comments.is_read sütununu kaldırır (web sayaç kodu sütun yokken yorum rozetini göstermez).
alter table public.comments drop column if exists is_read;
