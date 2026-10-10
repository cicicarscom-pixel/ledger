# TALİMAT 76 — Kalite Faz 9D: büyük web sayfalarını bölme (flowweb, hazır yama, 4 commit)

**Amaç:** Üç dev sayfa, görünüm bölümleri ayrı bileşen dosyalarına **birebir taşınarak** küçültülür. Davranış değişmez; durum ve işleyiciler sayfada kalır, bileşenlere **tipli props** ile geçer (tipler TypeScript denetleyicisinden türetildi, `any` yalnız kaynakta zaten `any` olan yerlerde).

| Sayfa | Önce → sonra | Yeni dosyalar (aynı klasörde) |
|---|---|---|
| `gelen-kutusu/page.tsx` | 1400 → 827 | `InboxHeader`, `MessagesTab`, `CommentsTab`, `ReviewsTab`, `NotificationsTab` |
| `ai-asistan/randevu/RandevuClient.tsx` | 1181 → 486 | `RandevuHeader`, `CalendarSwitcher`, `WeekCalendarCard`, `AppointmentTimeline`, `NewAppointmentModal`, `ReserveModal`, `ManageCalendarsModal`, `PromptModal`, `ContextMenu` |
| `sosyal-medya/share/page.tsx` | 1065 → 641 | `MediaPickerSection`, `CaptionSection`, `AccountSelectorSection`, `Facebook/Instagram/Linkedin/Twitter/Tiktok/Pinterest/Youtube/BlueskySettings`, `PublishBar` |

**Depo:** flowweb. **Başlangıç:** `origin/main` = `6fef3e0` (K1 çıktıları AYNEN; tutmazsa DUR).
**Yama:** `docs/patches/79-flowweb-faz9d-sayfa-bolme.patch` — tek dosya, **4 commit** (3 bölme + README).

**Claude'un yerelde doğrulaması:** `git am` sonrası ağaç, kaynak ağacıyla **birebir aynı**; `tsc` boş; check-bom/names/root-map OK; ESLint 0 hata / 24 uyarı (taban aynı); **`next build` başarılı**.

## Yapılacaklar
1. K1.  2. `git am --3way docs/patches/79-flowweb-faz9d-sayfa-bolme.patch` — tek komut, 4 commit; içerik değiştirilmez, `--amend` yok.
3. `npm ci --ignore-scripts --no-audit --no-fund` + yedi kontrol AYNEN (i18n anahtar sayıları değişmez: tr 1044 / en 1046 / de 1046). **ESLint tabanına dokunulmaz.**
4. K4 push (tek `git push`); commit kimlikleri GitHub'dakiyle aynı; **GitHub Actions yeşil**; Vercel Ready.
5. Derleme/EAS yapma.

## Kullanıcı testi (Vercel Ready olunca, hepsi web)
- **Gelen Kutusu:** 4 sekme (Mesajlar, Yorumlar, Değerlendirmeler, Bildirimler) açılıyor mu; sohbet seç + mesaj gönder; yorum yanıtla / gizle / DM; seçim modu + toplu sil; bildirimler + "tümünü okundu yap".
- **Randevu:** ay ileri/geri; takvim/personel seçimi; haftalık şerit + saat ısı haritası; yeni randevu modalı (kaydet); rezervasyon (blok) modalı; personel yönetimi modalı; kart menüsü (sağ/⋯ menü); iptal/silme onay penceresi.
- **Sosyal Medya → Paylaş:** medya seç; açıklama + yapay zekâ ile yaz; hesap seçimi; her seçili platformun ayar formu (Facebook, Instagram, LinkedIn, X, TikTok, Pinterest, YouTube, Bluesky); alttaki "Paylaş" çubuğu.
Fark gördüğün ekranın görüntüsü + adım.
