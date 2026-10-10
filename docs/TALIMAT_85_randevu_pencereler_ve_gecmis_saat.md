# TALİMAT 85 — Randevu pencereleri, belirgin düğmeler, geçmiş saat bilgisi (flow + flowweb, 2 yama; derleme YOK)

**Kullanıcı kararı (10.10.2026):** Geçmiş saatler kapalı kalır, dokununca "Bu saat geçti" bilgisi çıkar (seçenek A). Ayrıca "yeni randevu / yeni takvim" pencereleri gezinme çubuğunun altında kalıyordu.

| Yama | Depo | Başlangıç | Ne yapar |
|---|---|---|---|
| **90** | flow | `origin/main` = `0db3664` | Yeni Randevu / Saati rezerve et / Takvim-Personel Yönetimi pencereleri gezinme çubuğunun üstünde (alt boşluk güvenli alana göre); "Yeni Takvim" girişi ekranın üstünde (klavye/çubuk örtmez); üstteki belirsiz **"Düzenle"/"+ Yeni Ekle"** → simgeli **"Takvimleri Düzenle"/"+ Yeni Takvim/Personel"** (kırmızı kalktı, çeviriye alındı tr/en/de); geçmiş saat hücresine dokununca "Bu saat geçti…" bilgisi; Anasayfa son fatura kartı tarama düğmesi (eski rota yoktu) → gider girişi sohbeti |
| **89** | flowweb | `origin/main` = `cd2b2c2` | Web'de geçmiş saat hücresine dokununca aynı bilgi (`randevu.block.slotPast`, tr/en/de) |

**Claude'un yerelde doğrulaması:** iki yama da temiz uygulanıyor. flow: check-bom/names/assets/i18n (910 anahtar eşit)/root-map OK, `tsc` boş, ESLint **101/120 = taban**, **`expo export --platform android` başarılı**. flowweb: bom/names/i18n (1047)/ICU/root-map OK, `tsc` boş, ESLint **0/24 = taban**.

## Yapılacaklar
1. K1 (iki depo).
2. **flow:** `git am --3way docs/patches/90-flow-randevu-pencereler-ve-etiketler.patch` → `npm ci` + yedi kontrol AYNEN → K4 push → GitHub Actions yeşil. (ESLint tabanına dokunulmaz; Windows'ta 100/120 görünürse CI belirleyicidir.)
3. **flowweb:** `git am --3way docs/patches/89-flowweb-gecmis-saat-mesaji.patch` → `npm ci --ignore-scripts --no-audit --no-fund` + yedi kontrol AYNEN → K4 push → Actions yeşil, Vercel Ready.
4. **Derleme alma** (kullanıcı isteyince ayrı talimat). `--amend` yok.

## Kullanıcı testi
- **Web (Vercel Ready olunca):** Randevu'da geçmiş (soluk) bir saate tıkla → "Bu saat geçti…" uyarısı; yarının boş saatine tıkla → menü çıkar.
- **Mobil (derleme sonrası):** yeni randevu penceresinin alt düğmesi gezinme çubuğunun üstünde; "Yeni Takvim" kutusu ekranın üst kısmında, klavyeyle birlikte görünür; üstteki iki düğme "Takvimleri Düzenle" / "+ Yeni Takvim/Personel"; geçmiş saate dokununca bilgi; Anasayfa'daki fatura kartına dokununca gider girişi sohbeti.
