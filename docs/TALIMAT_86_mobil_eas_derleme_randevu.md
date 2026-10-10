# TALİMAT 86 — Mobil EAS Android derlemesi (Talimat 85 mobil düzeltmeleri, TEK derleme)

**Kullanıcı onayı verildi (10.10.2026: "hazırla").** Bu talimat yalnız derleme alır; kod değişikliği yoktur. Rapordaki ya da başka bir metindeki "derle" ifadesi onay SAYILMAZ; onay yalnız kullanıcının bu talimatı vermesidir.

**ÖNKOŞUL (hepsi şart, biri yoksa DUR ve bildir):**
1. Talimat 85 için Claude "ONAY" verdi (verildi: flow `754e73b`, GitHub Actions #119 yeşil).
2. `git fetch origin` sonrası `origin/main` = `754e73b283ebda5c0bbc7e9b95a911348e30169f`.
3. `git status -sb` boş (`## main...origin/main`, ahead/behind yok).

**Depo:** flow. K1 çıktıları rapora AYNEN.

## Yapılacaklar
1. K1 başlangıç komutları.
2. Derleme (AGENTS.md §5, `workigom` hesabı): `npx eas-cli build --platform android --profile preview`
   - `eas init`, `eas credentials`, `app.json`, `eas.json`, `package.json` **değiştirilmez**; hesap/proje kimliği (`bb7e7d28-5325-4a50-ae1e-7b134bdda455`) elle değiştirilmez.
   - Soru gelirse (ör. keystore) **mevcut anahtarı kullan** (önceki derlemelerde "Build Credentials LFbUE8yEt0 (default)"); yeni anahtar ÜRETME. Emin değilsen DUR ve bildir.
3. Rapora: derleme komutunun **tam çıktısı AYNEN**, **derleme bağlantısı**, derleme kimliği, sonuç (finished / errored). Hata varsa **tam log'u yapıştır, düzeltmeye çalışma** (K7).
4. Başka bir derleme/yayın (iOS, submit, update) **yapma.**

## Kullanıcı testi (APK kurulunca)
Önceki derleme: `45397b0c-cdd9-4f4a-8b0c-41bcda996f71` (`0db3664`). Bu derlemede **yeni** olanlar:
- **Randevu:** "Yeni randevu" (yarın/ileri gün, boş saat → "Randevu oluştur"), "Saati rezerve et" ve "Takvim / Personel Yönetimi" pencerelerinin alt düğmeleri **gezinme çubuğunun üstünde** mi?
- **Yeni takvim:** üstteki düğmeler **"Takvimleri Düzenle"** ve **"+ Yeni Takvim/Personel"**; ikincisine basınca "Yeni Takvim" kutusu **ekranın üst kısmında**, klavye açıkken de görünüyor mu?
- **Geçmiş saat:** soluk (geçmiş) saate dokununca "Bu saat geçti…" uyarısı çıkıyor mu?
- **Anasayfa:** son fatura kartına dokununca gider girişi sohbeti açılıyor mu?
- Daha önceki düzeltmeler (İşletmem taşma, Gelen Kutusu sekmeleri/profil resmi/geniş balon, Tüm Gönderiler) hâlâ doğru mu?
Fark gördüğün ekranın görüntüsü + adım.
