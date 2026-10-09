# TALİMAT 57 — Kalite Faz 6A (flowweb): Analiz sayfası i18n (hazır yama)

**Depo:** flowweb. **Başlangıç:** `origin/main` = `b83cc13` (K1 çıktıları rapora; tutmazsa DUR).
**Yama:** `docs/patches/57-flowweb-i18n-analiz.patch` (ledger, `claude/new-session-hrbrhq`).

## Ne yapar
`src/app/(dashboard)/analiz/page.tsx` içindeki ~100 sabit Türkçe/İngilizce metin (kart başlıkları, tablo sütunları, grafik etiketleri, gün kısaltmaları, ısı haritası ipucu, Gelen Kutusu analizleri) `analizPage.*` anahtarlarına taşınır. `messages/{tr,en,de}.json` dosyalarına 76 yeni anahtar (üç dile birden). README satırı yamada.

## Yapılacaklar
1. K1 başlangıç komutları.
2. `git am --3way docs/patches/57-flowweb-i18n-analiz.patch` (içerik değiştirilmez; başka dosyaya dokunulmaz).
3. Kontroller — **altısı da rapora AYNEN** (Git Bash; önce `npm ci --ignore-scripts --no-audit --no-fund`):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
npx tsc --noEmit -p .
node scripts/ci/eslint-ratchet.mjs scripts/ci/eslint-baseline.json src
```
   Beklenen: i18n her dilde `eksik 0`; tsc boş; çıta `0 hata, 38 uyarı`.
4. K4 push + GitHub Actions + Vercel yeşil. **Derleme/EAS yapma.**

## Elle test (kullanıcı, web)
Analiz sayfası: dil Türkçe/İngilizce/Almanca yapılınca kart başlıkları, tablo sütunları, grafik ipuçları ve Gelen Kutusu sekmesi seçilen dilde görünür; grafik ve tablolar eskisi gibi çalışır; ısı haritası ipucu 24 saat biçimli.
