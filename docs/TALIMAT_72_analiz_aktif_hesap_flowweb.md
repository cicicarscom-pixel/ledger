# TALİMAT 72 — Analiz: bağlantısı kopmuş hesap sorgulanıyordu (flowweb, hazır yama)

**Bulgu (kullanıcı konsolu, 10.10.2026):** Analiz → Instagram seçilince `get-instagram-demographics` ve `get-instagram-follower-history` "Forbidden: Account not owned by this organization" uyarısı veriyor. **Neden:** `integration.social_accounts`'ta bağlantısı kopmuş bir Instagram kaydı duruyor (`is_active=false`, `needs_reconnection=true`, `disconnected_at=2026-10-09`). Analiz sayfası hesapları bu alanlara bakmadan okuyup kopuk hesabın kimliğiyle istek atıyordu. Gelen Kutusu, Paylaşım ve Sosyal Medya sayfaları zaten `is_active` süzgeci kullanıyor; Analiz'e aynı süzgeç eklenir (`is_active=true`, `needs_reconnection=false`).

**Depo:** flowweb. **Başlangıç:** `origin/main` = `2e58c42` (K1 çıktıları; tutmazsa DUR).
**Yama:** `docs/patches/72-flowweb-analiz-aktif-hesap.patch` (tek satır + README).

## Yapılacaklar
1. K1.  2. `git am --3way docs/patches/72-flowweb-analiz-aktif-hesap.patch` (içerik değiştirilmez, `--amend` yok).
3. `npm ci --ignore-scripts --no-audit --no-fund` + yedi kontrol AYNEN (ESLint taban değeri **dokunulmaz**).
4. K4 push; GitHub Actions yeşil; Vercel Ready. 5. Derleme/EAS yapma.

## Kullanıcı testi
Analiz → Instagram seç: konsolda "Forbidden" uyarısı **çıkmamalı** (veri boş görünür; bağlı Instagram hesabı yok). Facebook ve YouTube seçimleri eskisi gibi.

## Not (ayrı iş, bu talimatın dışında)
`get-inbox-volume` / `get-inbox-performance` "Bilinmeyen action" uyarıları ayrı bir konu: canlı `zernio-client` fonksiyonu bu iki işlemi tanımıyor. Fonksiyonun kaynağı depoda yok; ayrı planlanacak. Mobil `AnalyticsScreen` aynı hesap sorgusunu kullanıyor; düzeltmesi bir sonraki mobil toplu pakete eklenecek (derleme sayısı az olsun diye).
