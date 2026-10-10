# TALİMAT 66 — Kalite Faz 9A: Analiz sayfasını bölme (flowweb, hazır yama)

**Amaç:** `src/app/(dashboard)/analiz/page.tsx` (1544 satır, tek bileşen) veri katmanı ve iki sekme bileşenine bölünür. **Birebir taşımadır; davranış ve görünüm değişmez.** Test ve bakım kolaylaşır.

**Depo:** flowweb. **Başlangıç:** `origin/main` = `f91d79c` (K1 çıktıları rapora; tutmazsa DUR).
**Yama:** `docs/patches/67-flowweb-faz9a-analiz.patch` (ledger, `claude/new-session-hrbrhq`).

## Yamanın içeriği (yalnız `analiz/` klasörü + README)
- `analizConfig.ts` — PLATFORMS / TIME_RANGES sabitleri ve tipleri
- `CustomTooltip.tsx` — grafik ipucu bileşeni
- `useAnalyticsData.ts` — veri katmanı (kendi sayaçları + Zernio çağrıları, yarış durumu koruması dahil)
- `PostingAnalytics.tsx`, `InboxAnalytics.tsx` — iki sekme
- `page.tsx` — 168 satır: filtre menüleri, sekmeler, alt bileşenlere props
- `README.md` — "Son Güncellemeler" satırı

Yerelde doğrulandı: `tsc` boş, ESLint çıtası 24/24, check-names OK, `next build` başarılı.

## Yapılacaklar
1. K1 başlangıç komutları.
2. `git am --3way docs/patches/67-flowweb-faz9a-analiz.patch` (içerik değiştirilmez).
3. `npm ci --ignore-scripts --no-audit --no-fund`, sonra yedi kontrol rapora AYNEN (check-bom, check-names src, i18n-parity, check-icu, check-root-map, tsc, eslint-ratchet).
4. K4 push — commit kimliği GitHub'dakiyle aynı; GitHub Actions yeşil; **Vercel dağıtımının Ready olduğu** rapora yazılır.
5. **Derleme/EAS yapma.**

## Kullanıcı testi (Vercel Ready olunca, 3 dakika)
Analiz sayfasında: (a) "Paylaşım" ve "Gelen Kutusu" sekmeleri açılıyor mu, (b) platform ve zaman aralığı menüsü değişince veriler yenileniyor mu, (c) grafikler ve tablolar önceki gibi mi, (d) konsolda kırmızı hata var mı. Önceki sürümle fark görürsen ekran görüntüsü gönder.
