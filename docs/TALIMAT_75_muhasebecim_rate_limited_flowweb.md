# TALİMAT 75 — Muhasebecim: `RATE_LIMITED` mesajı (flowweb, hazır yama)

**Neden:** Faz E2 ile (canlıda uygulandı) muhasebeci bağlantı kodu için deneme sınırı geldi: 15 dakikada 10 hatalı kod → veritabanı `RATE_LIMITED` döner. Web sayfası bu durumu bilmediği için genel "işlem hatası" gösterirdi; çevrili, anlaşılır mesaj eklenir (tr/en/de).

**Depo:** flowweb. **Başlangıç:** `origin/main` = `1225b39` (K1 çıktıları; tutmazsa DUR).
**Yama:** `docs/patches/78-flowweb-muhasebecim-rate-limited.patch` (3 dil dosyası + sayfa, +8 satır, README).

## Yapılacaklar
1. K1.  2. `git am --3way docs/patches/78-flowweb-muhasebecim-rate-limited.patch` (içerik değiştirilmez, `--amend` yok).
3. `npm ci --ignore-scripts --no-audit --no-fund` + yedi kontrol AYNEN (ESLint taban değerine **dokunulmaz**; i18n: tr 1044 / en 1046 / de 1046, eksik 0 beklenir).
4. K4 push; GitHub Actions yeşil; Vercel Ready. 5. Derleme/EAS yapma.

## Kullanıcı testi (isteğe bağlı)
Ai Muhasebe → Muhasebecim → bağlantı kodu alanına arka arkaya 10 yanlış kod yaz → 11'incide "Çok fazla hatalı kod denediniz… 15 dakika sonra tekrar deneyin." çıkmalı. (15 dk bekleyince tekrar çalışır.)
