# TALİMAT 87 — Mobil: aksiyon menüleri, yorum gönderi resmi, Android klavye uyumu (flow, 1 yama; derleme YOK)

**Kullanıcı bildirimleri (10.10.2026, derleme `547d8004` testinden):**
1. Randevu'da boş saate dokununca çıkan **"Randevu oluştur / Rezerve et / İptal"** menüsü gezinme çubuğunun altında kalıyor.
2. **Gelen Kutusu › Yorumlar**'da gönderi resimleri gelmiyor (yalnız ilki geliyor).
3. **Gelen Kutusu › Mesajlar** sohbetinde yanıt kutusu klavyenin altında kalıyor.

**Kök nedenler (kodda doğrulandı):**
1. Menü `@expo/react-native-action-sheet`'in Android bileşeni; SDK 57'de Android kenardan kenara (edge-to-edge) çizildiği için alt boşluk yoktu. → `useSafeActionSheet` (menü kabına alt güvenli alan boşluğu). Aynı menüyü kullanan Randevu kart menüsü, Ödeme Takvimi, Profil ve Anasayfa da düzelir.
2. Gönderi kayıtlarındaki adresler video (`.mp4`); `Image` video çizemez. → Tüm Gönderiler'de zaten çalışan `expo-video` ilk-kare bileşeni ortak hâle getirildi (`PostVideoThumbnail`), Yorumlar ve gönderi yorumları başlığında kullanılır.
3. Aynı edge-to-edge nedeniyle klavye pencereyi küçültmüyor, ama 13 ekran/pencerede `KeyboardAvoidingView` Android'de kapalıydı (`undefined` ya da yalnız Android 10 ve altı için açık). → hepsi `behavior="padding"` (Sohbet, AI Sohbet, AI Asistan, Müşteri Detay, AI Üretim, Bot Yönetimi pencereleri, Randevu pencereleri, Flow AI paneli, Giriş).

**Depo:** flow. **Başlangıç:** `origin/main` = `754e73b283ebda5c0bbc7e9b95a911348e30169f` (K1 çıktıları AYNEN; tutmazsa DUR).
**Yama:** `docs/patches/91-flow-aksiyon-menusu-yorum-resmi-klavye.patch` (1 commit, 22 dosya).
**Claude'un yerelde doğrulaması:** yama temiz uygulanıyor; check-bom/names/assets/i18n/root-map OK; `tsc` boş; ESLint **101 hata / 120 uyarı = taban**; **`expo export --platform android` başarılı**.

## Yapılacaklar
1. K1.  2. `git am --3way docs/patches/91-flow-aksiyon-menusu-yorum-resmi-klavye.patch` (içerik değişmez, `--amend` yok).
3. `npm ci` + yedi kontrol (AGENTS.md §5) **AYNEN, kısaltmadan**. ESLint tabanına dokunulmaz (Windows'ta 100/120 görünürse CI belirleyicidir).
4. K4 push; **GitHub Actions yeşil**.
5. **Derleme alma.** Kullanıcı isteyince ayrı talimatla. Raporda "derle" gibi ifadeler onay SAYILMAZ.

## Kullanıcı testi (derleme sonrası)
- **Menü:** yarın/12 Ekim'de boş saate dokun → "Randevu oluştur / Rezerve et / İptal" menüsü gezinme çubuğunun ÜSTÜNDE. Randevu kartındaki ⋮, Ödeme Takvimi'nde bir kayda dokunma, Profil'de resim değiştirme menüleri de.
- **Yorumlar:** Gelen Kutusu › Yorumlar'da her gönderi kartında video ilk karesi (küçük play simgesi); bir gönderiye girince üstteki küçük resim de.
- **Klavye:** Mesajlar'da sohbet aç, yazı kutusuna dokun → kutu klavyenin ÜSTÜNDE. Aynısını: AI Sohbet (Gelir/Gider Gir), Müşteri notu, Yeni randevu formu, Saati rezerve et, Flow AI paneli, Giriş ekranı.
Fark gördüğün ekranın görüntüsü + adım.
