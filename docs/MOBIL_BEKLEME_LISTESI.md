# Mobil bekleme listesi (kullanıcı kararı, 10.10.2026)

Mobilde derleme sayısı az olsun diye aşağıdaki işler **birikir**; kullanıcı "paketi hazırla" deyince tek talimat + tek derleme olarak verilir. Yeni bir madde bulunca buraya eklenir. Son derleme: `b5ea2a89` (Faz 9B+9C, `5e9f9af`).

| # | İş | Kaynak | Hazır yama | Derleme gerekir mi |
|---|---|---|---|---|
| 1 | `AnalyticsScreen`: (a) hesap sorgusuna `is_active=true` ve `needs_reconnection=false` süzgeci (web Talimat 72 ile aynı hata); (b) `get-youtube-daily-views` çağrısı kaldırılır (videoId gerektirir; web Talimat 74 ile aynı, `AnalyticsScreen.js:265`) | konsol uyarıları | yok (üretilecek) | evet |
| 2 | `AGENTS.md` §3/§6 gerçek duruma getirme + README satırı (yalnız belge) | Faz D/F kapanışı | `75-flow-agents-tenant.patch` | hayır (kod yok; pakete eşlik eder) |
| 3 | Katman ihlalleri: `no-restricted-imports` 9 hata (relative `../../domain` vb. → takma ad) | Faz 9 kalanı | yok | evet |
| 4 | React Compiler `react-hooks/refs` (34) ve `set-state-in-effect` (18) | Faz 9 kalanı | yok | evet |
| 5 | Sabit Türkçe metinlerin i18n'i: `BotYonetimi`, `Randevu`, `Analytics`, `Inbox`, `AiMuhasebe` (dosya başı `eslint-disable i18next/no-literal-string` borcu; ~140 metin) | Faz 6 kalanı | yok | evet |
| 6 | `FlowAiHost` sesli sohbet durum makinesi ayrı kancaya; `YorumlarTab` (679 satır) mantık/görünüm ayrımı | Faz 9 kalanı | yok | evet (cihaz testi şart) |
| 7 | `AiUretimScreen.CaptionSection` (modül düzeyinde `persisted*` değişkenlerine yazıyor) taşınamadı: durum yönetimi yeniden tasarlanmalı | Faz 9C | yok | evet |
| 8 | `MuhasebecimScreen`: yeni `RATE_LIMITED` durumu (muhasebeci kodu çok deneme) için çeviri + mesaj (Faz E2 onaylanırsa) | Faz E2 | yok | evet |
| 9 | **İşletmem** (`IsletmemScreen.js:277-292`): uzun başlıklı kayıt (ör. "FURKAN MÜHENDİSLİK ELEKTRONİK TURİZM İN…") taşıyor; sol blok `flex-1 min-w-0` + `numberOfLines={2}`, tutar sütunu sabit (`shrink-0`) | cihaz ekran görüntüsü (10.10) | yok | evet |
| 10 | **Gelen Kutusu üst sekmeleri** (`InboxScreen.js:43-57`): "Değerlendirmeler" iki satıra bölünüyor; dört sekme için etiket tek satır (`adjustsFontSizeToFit`/küçük yazı) ve sekme aralığı; "Bildirimler" etiketi sabit metin → `t()` | cihaz ekran görüntüsü | yok | evet |
| 11 | **Mesajlar profil resmi** (`MesajlarTab.js:189-196`): `participant_picture` hiç kullanılmıyor, yalnız platform simgesi var. Canlı veride Volkan Akbulut'un resmi dolu, Sıtkı Turacı'nınki boş. Çözüm: resim varsa `Image`, yoksa baş harf/platform simgesi; eksikler web'deki gibi `get-inbox-pictures` ile tamamlanır | cihaz ekran görüntüsü | yok | evet |
| 12 | **Sohbet balonu dar** (`ChatScreen.js:419` `maxWidth:'80%'` + dıştaki `TouchableOpacity flexShrink:1`): yüzde, kendi daralan kabına göre hesaplandığından balon ekranın ~%58'ine sıkışıyor ("merh/aba" bölünüyor). Çözüm: `maxWidth` dıştaki dokunma kabına (~%88), balon `flexShrink:1` | cihaz ekran görüntüsü | yok | evet |
| 13 | **İşletmem ham durum metni**: ödeme durumu `pending` ham basılıyor (`getBadge` varsayılanı `status`); ayrıca `isletmemScreen.badges` etiketleri tuhaf (`partial`="Bekliyor", `unpaid`="Devretti"). `pending`/`paid`/`partial`/`unpaid` için doğru çeviri (AGENTS §4: ham durum basılmaz; web'deki karşılıklarla eşleştirilecek) | cihaz ekran görüntüsü | yok | evet |

Kural: bu paket tek `git am` ile giren commit dizisi olarak, `expo export` doğrulamasıyla hazırlanır (Talimat 70 yöntemi).
