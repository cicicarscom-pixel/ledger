# KALİTE PROGRAMI — flow + flowweb (+ Supabase) — fazlar ve sıra

Hazırlayan: Claude, 09.10.2026. Kaynak: `docs/KOD_TARAMA_2026-10-09.md` (bulgular ve gerekçeler orada). Hedef: uluslararası standartta kod: güvenlik açığı yok, çeviri eksiği yok, tip/lint temiz, CI bunu otomatik zorlar.

## Çalışma kuralı (her faz için geçerli)
- Her faz ayrı talimat + HAZIR YAMA(lar) ile gelir (K2). Ajan faz bitince rapor verir; **Claude "ONAY" demeden sonraki faza geçilmez** (AGENTS §1).
- Bir fazın veritabanı adımı varsa **önce kullanıcı SQL Editor'de çalıştırır, Claude canlıda doğrular, sonra** ekran/kod yamaları uygulanır.
- Her faz sonunda CI yeşil + patch-id eşleşmesi Claude tarafından doğrulanır.
- Yeni özellik işleri bu programı BEKLETMEZ ama faz içindeki dosyalarla çakışırsa sırayı Claude belirler.

## Fazlar
| Faz | Konu | Talimat | Durum |
|---|---|---|---|
| 1 | **Güvenlik** (TAMAM): 1A flowweb ölü `zernio.ts` silinir (NEXT_PUBLIC anahtar riski); 1B Supabase fonksiyon yetkileri (SQL: kullanıcı); 1C Auth sızdırılmış parola koruması (panel: kullanıcı) | 48 | HAZIR |
| 2 | **Ölü kod temizliği** (flow + flowweb; risksiz silme) | 49 | TAMAM |
| 3 | **flowweb hata/lint**: 4× `prefer-const`, `@ts-nocheck`, 8 `<img alt>`, gerçek modülü sınayan tarih testi | 53 | TAMAM |
| 3b | flowweb: 44/45 kullanılmayan değişken + 4/18 `exhaustive-deps` (`supabase`). Kalan 14 `exhaustive-deps` (işlev bağımlılıkları, `useCallback` gerekir) → Faz 3c | 54 | HAZIR |
| 3c | flowweb: kalan 14 `exhaustive-deps` (gelen-kutusu, inbox, analiz, sosyal-medya, ai-asistan, odeme-takvimi, muhasebecim, Anasayfa, verify-email) — her biri davranış testi gerektirir | 54c | sırada |
| 4 | **flow tip ve tarih hataları**: kalan tsc hataları, `OdemeTakvimiScreen` saat dilimi, `import/no-duplicates`, kullanılmayan değişkenler | 55 | sırada |
| 5 | **CI kapıları**: tam `tsc` + ESLint (flow'da React Compiler kuralları hariç) CI'ya eklenir, `npm audit` bilgi amaçlı | 56 | sırada (3–4'ten sonra) |
| 6 | **i18n süpürmesi** (çok parçalı): 6A flowweb `analiz`; 6B flowweb `AICharacterPanel`+`RandevuClient`+diğerleri; 6C flow `AiUretimScreen`; 6D flow `AnalyticsScreen`+kalanlar | 57–60 | sırada |
| 7 | **DB sertleştirme**: 21 fonksiyonda `search_path`, `anon` EXECUTE kalanları, eklentiler (testli, tek tek) | 61 | sırada |
| 8 | **Ortak bileşenler**: `alert/confirm` yerine çevirili iletişim bileşeni (web + mobil), 69 çağrı | 62+ | sırada |
| 9 | **Mimari/refaktör**: `FlowAiHost.js` bölme + React Compiler ref kuralları, katman ihlalleri (10), sunucu işlemlerinde açık org kontrolü | 64+ | sırada |
| 10 | **Bağımlılıklar**: `npm audit` düzeltmeleri (web: nanoid/postcss/sharp/source-map-js; mobil: `expo install --fix` ile), `xlsx` kararı | 70+ | sırada |

3–10. fazların talimatları, bir önceki faz ONAYLANDIKÇA yazılır (her biri bir önceki fazın sonucuna ve dosyaların güncel hâline dayanır; yama güncel koddan üretilir).

## Faz 1 sonrası kullanıcı kontrol listesi
1. (Vercel'de yapılacak bir şey yok; `zernio.ts` silindiği için Zernio anahtarına Vercel'de gerek yok.)
2. SQL Editor'de `…000003` migration'ı çalıştır (Talimat 48 §0).
3. Supabase → Authentication → Sign In / Providers → Password → "Prevent use of leaked passwords" AÇ.
