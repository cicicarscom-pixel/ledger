# TALİMAT 74 — Analiz (YouTube): gereksiz `get-youtube-daily-views` çağrısı (flowweb, hazır yama)

**Bulgu (kullanıcı konsolu, 10.10.2026):** Analiz → YouTube seçilince konsola "`get-youtube-daily-views` başarısız: Invalid input: expected string, received undefined (ZERNIO_EXECUTION_FAILED)" düşüyor. **Neden:** Zernio'nun bu uç noktası tek bir **videoya** aittir (`videoId` zorunlu); sayfa videoId göndermiyor, çağrı her seferinde başarısız oluyor ve dönen veri zaten hiç kullanılamıyor (kod eski bir `rows` biçimini bekliyordu). Kanal zaman serisi `get-daily-metrics`'ten geliyor ve görünüm değişmiyor.

**Düzeltme:** çağrı ve ona bağlı ölü eşleme bloğu kaldırılır (`useAnalyticsData.ts`, −12 satır). Başka bir dosya/davranış değişmez.

**Depo:** flowweb. **Başlangıç:** `origin/main` = `67e5fca` (K1 çıktıları; tutmazsa DUR).
**Yama:** `docs/patches/77-flowweb-analiz-youtube-daily-views.patch`.

## Yapılacaklar
1. K1.  2. `git am --3way docs/patches/77-flowweb-analiz-youtube-daily-views.patch` (içerik değiştirilmez, `--amend` yok).
3. `npm ci --ignore-scripts --no-audit --no-fund` + yedi kontrol AYNEN (ESLint taban değerine **dokunulmaz**).
4. K4 push; GitHub Actions yeşil; Vercel Ready. 5. Derleme/EAS yapma.

## Kullanıcı testi
Analiz → YouTube: konsolda "get-youtube-daily-views" uyarısı çıkmamalı; grafikler/tablo eskisi gibi.
