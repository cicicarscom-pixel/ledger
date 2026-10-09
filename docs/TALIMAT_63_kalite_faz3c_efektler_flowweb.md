# TALİMAT 63 — Kalite Faz 3c (flowweb): React efekt bağımlılıkları (hazır yama)

**Depo:** flowweb. **Başlangıç:** `origin/main` = `4ac60ce` (K1 çıktıları rapora; tutmazsa DUR).
**Yama:** `docs/patches/63-flowweb-efekt-bagimliliklari.patch` (ledger, `claude/new-session-hrbrhq`). 11 dosya.

## Ne yapar
13 `react-hooks/exhaustive-deps` uyarısı giderilir (ESLint uyarısı 37 → 24; **çıta tabanı yamada 24'e iner, elle değiştirme**). Eksik bağımlılık = eski veriyi gösterme riski.
- Veri çeken işlevler `useCallback` ile sarıldı (AI Asistan, Muhasebecim, Ödeme Takvimi, Analiz, Anasayfa, Gelen Kutusu).
- Uzun ömürlü realtime abonelikleri ve sayfa açılış senkronu (Gelen Kutusu, Sosyal Medya): yeni `src/lib/useLatest.ts` ile her zaman en güncel işlev çağrılır; işlev kimliği değişince abonelik yeniden kurulmaz.
- Sosyal Medya → Gelen Kutusu (`sosyal-medya/inbox`): seçili sohbetin mesajları artık sohbet **listesi** her güncellendiğinde değil, yalnız seçili sohbet/sekme değişince çekilir.
- Doğrulandı (gerçek tarayıcı): `useTranslations()`, `useDialog()`, `createClient()` yeniden çizimlerde kararlı; eklenen bağımlılıklar sonsuz döngü ya da gereksiz yeniden çekme yaratmaz.

## Yapılacaklar
1. K1 başlangıç komutları.
2. `git am --3way docs/patches/63-flowweb-efekt-bagimliliklari.patch` (içerik değiştirilmez; başka dosyaya dokunulmaz).
3. Kontroller — **altısı da rapora AYNEN** (Git Bash; önce `npm ci --ignore-scripts --no-audit --no-fund`):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
npx tsc --noEmit -p .
node scripts/ci/eslint-ratchet.mjs scripts/ci/eslint-baseline.json src
```
   Beklenen: tsc boş; çıta `0 hata, 24 uyarı (taban: 0 hata, 24 uyarı)`.
4. K4 push + GitHub Actions + Vercel yeşil. **Derleme/EAS yapma.**

## Elle test (kullanıcı, web)
Anasayfa (kartlar/randevular yüklenir, dil değişince yenilenir), Gelen Kutusu (mesaj/yorum/değerlendirme/bildirim sekmeleri, yeni mesaj gelince canlı güncellenir, sayfa sürekli yenilenmez), Sosyal Medya (hesap listesi, "Senkronize Et"), Analiz (platform/zaman aralığı değişince veriler yenilenir), AI Muhasebe → Ödeme Takvimi (ay değişimi), Muhasebecim (bağlı hesap, canlı güncelleme), AI Asistan ayarları (açılışta ayarlar yüklenir).
