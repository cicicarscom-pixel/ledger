# Persona Seed Files (Phase 1)

Bu klasör, Persona Engine için ilk 5 "cassette" kaydını içerir. Her `.json`
dosyası `public.ai_personas` tablosuna karşılık gelen tek bir satırdır.

## İçerik
- `einstein.json`
- `adam-smith.json`
- `shakespeare.json`
- `mimar-sinan.json`
- `tesla.json`
- `seed-personas.mjs` — bu dosyaları `public.ai_personas` tablosuna
  `upsert` eden Node script'i (service role key gerektirir).

## Kullanım sırası
1. Önce migration'ı uygula: `ledger/supabase/migrations/20260828120000_ai_personas_schema.sql`
   (bkz. `supabase db push` veya Supabase Dashboard SQL Editor).
2. Sonra bu klasörde:
   ```bash
   npm install @supabase/supabase-js
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node seed-personas.mjs
   ```

## Güvenlik notları
- Tüm personalar `status: "draft"` olarak eklenir. Hiçbiri Faz 7'deki
  uyumluluk test paketinden geçip "published" yapılmadan gerçek müşteri
  trafiğine çıkmaz (kilitli kural).
- Bu script yalnızca `public.ai_personas` tablosuna yazar. `bot_settings`,
  `organization_ai_settings` veya Ledger'ın kendi şemalarına (core/finance/
  audit/analytics/ai) hiçbir şekilde dokunmaz.
- `avatar_url` / `thumbnail_url` alanları şimdilik boş bırakılmıştır —
  Storage bucket (`ai-personas`) oluşturma ve görsel yükleme, bu oturumun
  erişemediği bir adımdır (Supabase Admin API/CLI kimlik bilgisi yok);
  bu adım ayrıca sizin veya Antigravity tarafından tamamlanmalıdır.
