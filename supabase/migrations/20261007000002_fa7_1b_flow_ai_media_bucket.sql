-- FA7-1b — Flow AI medya deposu (07.10.2026, Claude; canlıya Claude uyguladı, dosya kayıt amaçlı).
-- ÖZEL (private) kova: istemciler doğrudan okuyamaz/yazamaz (storage politikası YOK); yükleme yalnız sunucunun ürettiği imzalı adresle.
-- Yol düzeni: <org_id>/<uuid>.<uzantı>. Başlangıç sınırı 100 MB (sunucu tarafı aktarma belleğiyle uyumlu); ölçülünce artırılır.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flow-ai-media', 'flow-ai-media', false, 104857600,
  array['video/mp4','video/quicktime','video/webm','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
