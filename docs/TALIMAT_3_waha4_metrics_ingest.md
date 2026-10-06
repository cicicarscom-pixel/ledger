# TALİMAT 3 — WAHA-4: sunucu CPU/RAM ölçümü (`waha-metrics-ingest`)

Önce `TALIMAT_00_sira_ve_ortak_kurallar.md` kurallarını oku. **Veritabanına dokunma**: gereken tablolar canlıda var (`waha_server_metrics` → `cpu_percent`, `mem_used_mb`, `mem_total_mb` sütunları; `waha_servers`; `waha_alerts`).

## Amaç
WAHA sunucusunda çalışan küçük bir betik 5 dakikada bir CPU ve RAM kullanımını **imzalı bir istekle** `waha-metrics-ingest` fonksiyonuna gönderir; fonksiyon bunu `waha_server_metrics` tablosuna yazar. Admin panelindeki "CPU / RAM" sütunu ve grafik bununla dolar (şu an "Ölçülmüyor").

## 1. Yeni Edge Function: `supabase/functions/waha-metrics-ingest/index.ts`
- **`verify_jwt = false`** (çağıran WAHA sunucusudur, JWT yok). Güvenlik **yalnız HMAC** ile sağlanır; bu yüzden aşağıdaki doğrulamalar **atlanamaz**.
- Yalnız `POST`. Gövde **en çok 2048 bayt** (`Content-Length` ve gerçek uzunluk ikisi de kontrol; aşarsa 413).
- İstek gövdesi (JSON): `{ "serverId": "<uuid>", "ts": <unix saniye>, "cpuPercent": <0-100>, "memUsedMb": <int>, "memTotalMb": <int> }`.
- **Sıra** (hepsi geçmeden hiçbir yazma yapılmaz):
  1. Ham gövdeyi `await req.text()` ile oku, sonra `JSON.parse` (parse hatasında 400).
  2. Tür/aralık doğrulaması: `serverId` UUID biçiminde; `ts` tam sayı; `cpuPercent` 0–100 sayı; `memUsedMb` ve `memTotalMb` 0–10_000_000 arası tam sayı ve `memUsedMb <= memTotalMb`. Geçersizse 400.
  3. **Tekrar saldırısı koruması:** `Math.abs(now - ts) > 300` (5 dk) ise 401.
  4. `waha_servers` tablosundan `serverId` ile sunucuyu service-role istemcisiyle oku; **yoksa ya da `is_active = false` ise 401** (varlık bilgisi sızdırma: yanıt gövdesi her zaman aynı `{"error":"Unauthorized"}`).
  5. İmza anahtarının secret adı: **`WAHA_METRICS_SECRET_<fill_order>`** (örn. sunucu 1 → `WAHA_METRICS_SECRET_1`). `Deno.env.get` ile oku; yoksa 500 `{"error":"SERVER_MISCONFIGURED"}` ve günlüğe **yalnız secret adını** yaz (değer asla).
  6. İmza başlığı: **`X-Metrics-Signature`** = HMAC-SHA256(ham gövde, secret) **küçük harf onaltılık**. WebCrypto ile hesapla, **sabit süreli** karşılaştır (`shared/infrastructure/waha/webhookAuth.ts` içindeki `verifyWahaHmac` SHA-512 kullanıyor; **onu değiştirme**, bu fonksiyon için aynı kalıpta ayrı bir `verifyHmacSha256` yaz ve **`supabase/functions/shared/infrastructure/waha/metricsAuth.ts`** dosyasına koy + test).
  7. İmza geçersizse 401. Ayrıca `waha_alerts` tablosuna **`kind = 'webhook_auth_failed'`** uyarısı yaz **ama** o sunucu için son 1 saatte açık aynı tür uyarı varsa yazma (uyarı tablosu doldurulamasın). Mesaj: `Metrik imzası doğrulanamadı`.
- **Yazma:** `waha_server_metrics` tablosunda o sunucu için **son 10 dakikadaki en yeni satırı** bul (`waha-health` bunu yazar). **Varsa** o satırı `update` ile `cpu_percent`, `mem_used_mb`, `mem_total_mb` alanlarıyla güncelle; **yoksa** yeni satır ekle (`server_id`, `cpu_percent`, `mem_used_mb`, `mem_total_mb`; diğer alanlar boş).
- Başarıda 200 `{"success":true}`. Hata yanıtlarında iç ayrıntı (SQL hatası, secret adı) **dönme**; yalnız günlüğe.
- `serve` + `createClient` kalıbı için `supabase/functions/waha-health/index.ts` dosyasına bak.

## 2. Test: `supabase/functions/shared/infrastructure/waha/metricsAuth.test.ts`
`deno test` ile: doğru imza geçer · yanlış imza reddedilir · imza yok reddedilir · gövde bir bayt değişince reddedilir · büyük/küçük harf farkı olan imza (`hex` büyük harf) **reddedilir ya da** normalleştirilerek kabul edilir (hangisini seçtiysen raporda yaz) · farklı uzunlukta imza reddedilir.

## 3. Sunucuda çalışacak betik: `docs/waha4/waha-metrics-cron.sh`
Bu dosya **depoya kayıt amaçlıdır**; Antigravity sunucuya kurmaz (kurulumu kullanıcı yapar). Bash, `set -euo pipefail`, **LF**.
- Ortam değişkenleri (dosyada **sabit değer YOK**): `SERVER_ID`, `METRICS_SECRET`, `INGEST_URL` (`https://qybzidylewzsnmlofjul.supabase.co/functions/v1/waha-metrics-ingest`), `WAHA_CONTAINER` (öntanımlı `waha`).
- CPU: `docker stats --no-stream --format '{{.CPUPerc}}' "$WAHA_CONTAINER"` (sonundaki `%` atılır). RAM kullanımı ve toplam: sunucunun **konteyner değil, makine** RAM'i için `free -m` (`Mem:` satırı: toplam, kullanılan).
- `ts=$(date +%s)`; gövde `printf` ile tek satır JSON; imza: `printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$METRICS_SECRET" -hex | awk '{print $NF}'`.
- `curl -sS --max-time 10 -X POST "$INGEST_URL" -H 'Content-Type: application/json' -H "X-Metrics-Signature: $SIG" -d "$BODY"`; çıkış kodu ve yanıtı **sır içermeyecek** şekilde `logger` ile sistem günlüğüne.
- Dosya başında cron satırı örneği yorum olarak: `*/5 * * * * /opt/waha-metrics-cron.sh`.
- **Dosyada anahtar değeri, adres dışında bir sır, jeton bulunmayacak.**

## 4. README ve belge
- `README.md` → "Son Güncellemeler": "[06.10.2026] WAHA-4: sunucu CPU/RAM ölçümü için `waha-metrics-ingest` fonksiyonu ve sunucu betiği eklendi."
- `docs/waha4/KURULUM.md` (kısa, Türkçe): (1) Supabase'e `WAHA_METRICS_SECRET_<sıra>` secret'ını ekle (rastgele 32+ bayt: `openssl rand -hex 32`), (2) betiği sunucuya kopyala, ortam değişkenlerini ayarla, (3) elle bir kez çalıştır: yanıt `{"success":true}` olmalı, (4) cron'a ekle, (5) admin panelinde "WhatsApp Sunucuları" sayfasında CPU/RAM görünmeli. **Secret değerini bu belgeye yazma.**

## Kontroller (push öncesi; AYNEN rapora)
Ortak kontroller (ledger bölümü) +
```
deno test --no-check --allow-all supabase/functions/shared/infrastructure/waha/metricsAuth.test.ts
deno test --no-check --allow-all supabase/functions/shared/infrastructure/waha/webhookAuth.test.ts
```
Push → CI "completed successfully" → `KONTROL 3 — ledger <commit>`.

## Deploy (yalnız Claude ONAY'ından sonra)
**1) Kullanıcı** Supabase'e `WAHA_METRICS_SECRET_1` secret'ını ekler. **2)** Yalnız bu fonksiyon, **`verify_jwt` KAPALI** olarak:
```
npx supabase@latest functions deploy waha-metrics-ingest --project-ref qybzidylewzsnmlofjul --use-api --no-verify-jwt
```
Deploy çıktısını AYNEN yaz. **Başka fonksiyon deploy edilmez.**

## Kabul (Claude kontrol eder)
| # | Ölçüt |
|---|---|
| 1 | İmzasız / yanlış imzalı / eski zaman damgalı / büyük gövdeli / bilinmeyen sunucu isteği → hepsi reddedilir, **hiçbir satır yazılmaz** |
| 2 | Aynı hata yanıtı bilinmeyen sunucu ile kapalı sunucu için ayırt edilemez |
| 3 | Doğru imzalı istek son `waha-health` satırını günceller (CPU/RAM dolar), yoksa yeni satır ekler |
| 4 | Uyarı tablosu saldırıyla şişirilemez (saatte en çok 1 açık uyarı) |
| 5 | Betikte ve belgede sır değeri yok |
| 6 | Admin panelinde CPU/RAM sütunu ve grafiği dolar (kullanıcı kurulumundan sonra) |
