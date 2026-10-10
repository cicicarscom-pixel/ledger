# TALİMAT 70 — Kalite Faz 9C: Mobil büyük ekranları bölme (TEK PAKET, tek push, TEK derleme)

**Neden tek paket:** Kullanıcı kararı (10.10.2026): mobilde derleme sayısı az olsun. Bu paket, mobilde kalan **bütün** Faz 9 işlerini içerir; ardından yalnız **bir** EAS Android derlemesi alınır ve cihazda topluca test edilir. Bu pakete başka mobil iş eklenmez.

**Depo:** flow (mobil). **Başlangıç:** `origin/main` = `5e1706f` (K1 çıktıları rapora AYNEN; tutmazsa DUR).
**Yama:** `docs/patches/71-flow-faz9c-ekran-bolme.patch` (ledger, `claude/new-session-hrbrhq`) — **7 commit'lik tek dosya**.

## İçerik (hepsi birebir taşıma; davranış değişmez)
| Ekran | Önce → sonra (satır) | Yeni klasör |
|---|---|---|
| `DashboardScreen` | 1689 → 594 | `src/screens/dashboard/` |
| `AiUretimScreen` | 1891 → 1106 | `…/sosyal_medya/presentation/screens/aiuretim/` |
| `BotYonetimiScreen` | 1618 → 606 | `…/screens/botyonetimi/` |
| `AnalyticsScreen` | 1257 → 382 | `…/screens/analytics/` |
| `InboxScreen` | 1132 → 61 | `…/screens/inbox/` |
| `RandevuScreen` | 1211 → 397 | `src/modules/randevu/presentation/screens/randevu/` |
Son commit: ESLint **uyarı** tabanı 122 → 120 (**Claude'un kararı; ajan baseline'a dokunmaz**), `PostsScreen.js.rej` ve `AnalyticsScreen.js.rej` (eski başarısız yama artıkları) `git rm`, README satırı.

Claude yerelde doğruladı: `git am` sonrası ağaç, kaynak ağacıyla **birebir aynı**; `tsc` boş; check-bom/names/assets/i18n/root-map OK; ESLint 101 hata / 120 uyarı; **`npx expo export --platform android` başarılı** (bu adım, taşınan `require('../../assets/…')` yollarını da doğruladı).

## Yapılacaklar (sırayla)
1. K1 başlangıç komutları (`HEAD` = `origin/main` = `5e1706f`; temiz ağaç).
2. `git am --3way docs/patches/71-flow-faz9c-ekran-bolme.patch` — **tek komut, 7 commit**. İçerik değiştirilmez, `--amend`/rebase/reset **yok**. Çakışırsa **DUR**, çıktıyı yapıştır.
3. `npm ci`, ardından CI'ın yerel karşılığının **hepsi AYNEN** rapora:
   `check-bom`, `check-names src App.js`, `check-assets`, `i18n-parity`, `check-root-map`, `npx tsc --noEmit -p .`, `eslint-ratchet`.
   Beklenen: ESLint `101 hata, 120 uyarı (taban: 101 hata, 120 uyarı)`; `tsc` boş. **Yerel sayı farklı çıkarsa (Windows ölçümü 1 sapabilir) DUR ve bildir; baseline'ı değiştirme.**
4. `npx expo export --platform android --output-dir ../flow_export_test` çalıştır, çıktının son 15 satırını AYNEN yapıştır (bundle hatasız bitmeli). Sonra `../flow_export_test` klasörünü sil (depoda değil).
5. K4 push (tek `git push`). Rapora: push çıktısı, `git log --oneline -8`, **GitHub Actions'ta bu push'un koşusunun YEŞİL olduğu** (kırmızıysa log, düzeltme yok).
6. **Derleme/EAS yapma.** Derlemeyi kullanıcı, CI yeşil olduktan sonra ister.

## Kullanıcı testi (tek derlemede, cihazda) — liste
- **Anasayfa:** hero (profil, bildirim zili, AI anahtarı, uzun basınca arka plan değiştirme), bugünkü randevular, gelir/gider, fatura kartı, sosyal özet, son aktiviteler, yaklaşan ödemeler, bildirim listesi.
- **AI Üretim:** medya seç, platform seçimi, her platformun ayar formu (YouTube, Facebook, Instagram, LinkedIn, X, TikTok, Pinterest, Bluesky, Google İşletme, Reddit, Telegram), yayın/zamanlama bölümü.
- **Bot Yönetimi:** durum kartı, asistan talimatı, bağlı servisler (WhatsApp/Drive modalları), kişilik bölümü, saat dilimi/randevu kartı, kaydet düğmesi, canlı önizleme sohbeti, tehlikeli bölge modalı.
- **Analiz:** gönderi ve gelen kutusu sekmeleri, platform/zaman filtreleri, tüm kartlar ve grafikler.
- **Gelen Kutusu:** Mesajlar, Yorumlar, Değerlendirmeler, Bildirimler sekmeleri.
- **Randevu:** takvim seçici, gün şeridi, boşluk ısı haritası, zaman çizelgesi, yeni randevu/rezervasyon formları, personel yönetimi modalı.
- **Flow AI paneli** (Faz 9B) ve **sesli sohbet**.
Bir ekranda fark varsa ekran görüntüsü + hangi ekran/adım.

## Kalıcı kurallar (yeniden)
`--amend` yok; ESLint tabanına ajan dokunmaz; yama içeriği değiştirilmez; tek paket = tek derleme.
