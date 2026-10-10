# TALİMAT 81 — Mobil toplu paket (flow, hazır yama, 2 commit, derleme YOK)

**Amaç:** Cihaz testinde çıkan sorunlar ve bekleme listesinden küçük/güvenli işler tek pakette. **Bu talimatta EAS derlemesi yoktur**; derleme kullanıcı isteyince ayrı talimatla alınır.

| # | İş |
|---|---|
| 9 | **İşletmem:** uzun başlıklı kayıt taşmıyor (sol blok `flex-1`, başlık en çok 2 satır, tutar sütunu sabit) |
| 13 | **İşletmem durum rozeti:** ham `pending` yerine çeviri; `pending/paid/partial/unpaid` = Beklemede/Ödendi/Kısmi/Ödenmedi (eski "Devretti"/"Bekliyor" yanlışları düzeltildi; en/de dahil) |
| 10 | **Gelen Kutusu sekmeleri:** etiket tek satır (`adjustsFontSizeToFit`), "Bildirimler" artık çeviriden (`sosyalMedya.inbox.tabs.notifications`) |
| 11 | **Mesajlar:** `participant_picture` gösterilir (platform simgesi küçük rozet); resmi olmayanlar için `get-inbox-pictures` ile bir kez tamamlanır |
| 12 | **Sohbet balonu:** `maxWidth` dıştaki kaba (%88), balon `flexShrink:1` — ekranın ~%58'ine sıkışma biter |
| 14 | **Tüm Gönderiler:** kart altı istatistik satırı kaldırıldı (web ile aynı) |
| 1 | **Analiz:** `needs_reconnection=false` süzgeci; `get-youtube-daily-views` çağrısı kaldırıldı |
| 8 | **Muhasebecim:** `RATE_LIMITED` yanıtı için çevrilmiş mesaj (tr/en/de) |
| 2 | **AGENTS.md** tenant düzeltmesi (eski yama 75, bu pakete **dahil**; ayrıca uygulanmaz) |

**Depo:** flow. **Başlangıç:** `origin/main` = `5e9f9af` (K1 çıktıları AYNEN; tutmazsa DUR).
**Yama:** `docs/patches/86-flow-mobil-toplu-paket.patch` — tek dosya, **2 commit** (AGENTS + düzeltmeler). 75 numaralı yamayı **uygulama**.

**Claude'un yerelde doğrulaması:** yama `5e9f9af`'e temiz uygulanıyor; check-bom/names/assets/i18n-parity (905 anahtar eşit)/root-map OK; `tsc` boş; ESLint **101 hata / 120 uyarı = taban** (aynı); **`expo export --platform android` başarılı**.

## Yapılacaklar
1. K1.  2. `git am --3way docs/patches/86-flow-mobil-toplu-paket.patch` — tek komut, 2 commit; içerik değişmez, `--amend` yok.
3. `npm ci` + yedi kontrol AYNEN (§5 yerel CI listesi). **ESLint tabanına dokunulmaz.**
4. K4 push (tek `git push`); commit kimlikleri GitHub'dakiyle aynı; **GitHub Actions yeşil.**
5. Derleme alma. Kullanıcı isteyince ayrı talimatla.

## Cihaz testi (derleme sonrası, kullanıcı)
- **İşletmem:** uzun başlıklı kayıt taşmıyor; "pending" yazısı yerine "Beklemede".
- **Gelen Kutusu:** dört sekme tek satır ("Değerlendirmeler" bölünmüyor); Mesajlar'da Volkan Akbulut'un profil resmi; sohbet balonu daha geniş ("merhaba" tek satır).
- **Tüm Gönderiler:** kart altında beğeni/yorum satırı yok, çöp kutusu yerinde.
- **Analiz:** bağlantısı kopuk hesap (Instagram) seçenekte çıkmıyor; YouTube seçince konsol uyarısı yok.
- **Muhasebecim:** çok hatalı kod denemesinde "Çok sık denediniz…" mesajı.

## Bekleme listesinde KALANLAR (bu pakette yok)
#3 katman ihlalleri, #4 React Compiler kuralları, #5 sabit metin i18n süpürmesi, #6 FlowAiHost/YorumlarTab bölme, #7 CaptionSection. Hepsi büyük refaktör (geniş cihaz testi gerektirir); ayrı ve tek derlemelik bir paket olarak sonra.
