# TALİMAT 73 — zernio-client: gelen kutusu analitiği işlemleri (ledger, hazır yama + TEK fonksiyon deploy)

**Bulgu:** Web Analiz > "Gelen Kutusu Analizi" `get-inbox-volume` ve `get-inbox-performance` işlemlerini çağırıyor; canlı `zernio-client` bu işlemleri tanımıyor (`UNKNOWN_ACTION`), kartlar hep boş. (Kaynak depoda VAR ve canlıyla aynı; eksik olan yalnız bu iki işlem.)

**Ne yapar:** Zernio SDK'nın `inboxanalytics` çağrılarını (hacim, en çok yazışılan hesaplar, kaynak dağılımı, ısı haritası, yanıt süresi) sunucuda web'in beklediği şekle çevirir. Kiracı kapsamı, önbellek ve sahiplik denetimi mevcut `scopedAnalytics` üzerinden (yeni bir yetki yolu yok). Web ve mobil kodu **değişmez**.

**Depo:** ledger (`C:\ledger`). **Başlangıç:** `origin/main` (K1 çıktıları rapora AYNEN; temiz ağaç).
**Yama:** `docs/patches/76-ledger-zernio-inbox-analytics.patch` — ledger'ın `claude/new-session-hrbrhq` dalındaki `docs/patches/` klasöründe. Yama `main` üzerine hazırlandı (base `43311e2`).

## Claude'un yerel doğrulaması
`check-names supabase/functions` OK (101 dosya), check-bom OK, check-root-map OK; 9 birim test (4 yeni) geçti (CI'ın Deno testlerine zaten dahil: `analyticsMapping.test.ts`). SDK sürümleri (canlıdaki dönemin ve en yeni) `inboxanalytics.*` ve kullanılan bütün diğer metotlar için aynı imzaya sahip.

## Yapılacaklar
1. K1 (ledger).
2. `git am --3way docs/patches/76-ledger-zernio-inbox-analytics.patch` (içerik değiştirilmez, `--amend` yok).
3. CI'ın yerel karşılığı (AGENTS.md §5) AYNEN rapora: `check-bom`, `check-names supabase/functions` (EXTRA_TSC_FLAGS ile), `check-names apps/ledger apps/admin`, `deno test --no-check --allow-all …analyticsMapping.test.ts`, `check-root-map`.
4. K4 push; GitHub Actions yeşil (rapora).
5. **Deploy (K6) — yalnız bu, tek:** `npx supabase@latest functions deploy zernio-client --project-ref qybzidylewzsnmlofjul --use-api`. Çıktı AYNEN rapora.
   - `supabase/functions/shared/infrastructure/zernio/*` değişti: bunu kullanan diğer fonksiyonlar raporda **listelenir** ama **DEPLOY EDİLMEZ** (`zernio-webhook`, `persona-test`, `process-ai-jobs` ASLA).
6. Derleme/EAS yapma.

## Kullanıcı testi (deploy sonrası)
Web → Analiz → "Gelen Kutusu Analizi": kartlar (alınan/gönderilen/okunan, zaman grafiği, platform dağılımı, en çok yazışılan hesaplar, yanıt süresi dağılımı, gönderim kaynağı, mesaj yoğunluk haritası) dolmalı; konsolda `get-inbox-volume`/`get-inbox-performance` "Bilinmeyen action" uyarısı **çıkmamalı**.
Not: Zernio hesabında gelen kutusu özelliği/izni yoksa Zernio kendisi hata dönebilir; o durumda kartlar boş kalır ve konsolda Zernio'nun mesajı görünür (raporla).
