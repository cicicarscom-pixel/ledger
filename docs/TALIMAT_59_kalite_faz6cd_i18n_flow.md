# TALİMAT 59 — Kalite Faz 6C/6D (flow, mobil): i18n (hazır yama)

**Depo:** flow. **Başlangıç:** `origin/main` = `3bac94e` (K1 çıktıları rapora; tutmazsa DUR).
**Yama:** `docs/patches/59-flow-i18n-6c6d.patch` (ledger, `claude/new-session-hrbrhq`). 11 dosya.

## Ne yapar
`AiUretimScreen`, `AnalyticsScreen`, Müşteri detay/liste, Sohbet, Gelen Kutusu ve Sosyal Medya ekranlarındaki ~110 sabit metin `tr/en/de` anahtarlarına taşınır (79 yeni anahtar, üç dile birden). ESLint sabit-metin hataları 211 → 101; **çıta tabanı (`eslint-baseline.json`) 101/122'ye düşer (yamada; elle değiştirme)**. Marka adları ve para simgesi bilerek sabit.

## Yapılacaklar
1. K1 başlangıç komutları.
2. `git am --3way docs/patches/59-flow-i18n-6c6d.patch` (içerik değiştirilmez; başka dosyaya dokunulmaz).
3. Kontroller — **yedisi de rapora AYNEN** (Git Bash; önce `npm ci --ignore-scripts --no-audit --no-fund`):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
npx tsc --noEmit -p .
node scripts/ci/eslint-ratchet.mjs scripts/ci/eslint-baseline.json src App.js
```
   Beklenen: i18n her dilde `eksik 0` (tr 868 / en 872 / de 872); tsc boş; çıta `101 hata, 122 uyarı (taban: 101 hata, 122 uyarı)`.
4. K4 push + GitHub Actions yeşil. **Derleme yapma** (kullanıcı isterse).

## Elle test (kullanıcı, yeni APK'da)
Sosyal Medya → Paylaşım (AiUretim): her platform formundaki etiketler seçili dilde; Analiz ekranı kart/sütun başlıkları; Müşteri detayı; Sohbet seçim çubuğu. Dil Türkçe/İngilizce/Almanca arasında değiştirilerek bakılır.
