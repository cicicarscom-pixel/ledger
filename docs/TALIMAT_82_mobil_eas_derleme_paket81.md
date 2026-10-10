# TALİMAT 82 — Mobil EAS Android derlemesi (Talimat 81 paketi, TEK derleme)

**Kullanıcı onayı verildi (10.10.2026).** Bu talimat yalnız derleme alır; kod değişikliği yoktur.
**ÖNKOŞUL (hepsi şart, biri yoksa DUR ve bildir):**
1. Talimat 81 için **Claude "ONAY" verdi** (push doğrulandı).
2. `git fetch origin` sonrası `origin/main` = Talimat 81 raporundaki son commit; GitHub Actions o commit için **yeşil**.
3. `git status -sb` boş (`## main...origin/main`, ahead/behind yok).

**Depo:** flow. K1 çıktıları rapora AYNEN.

## Yapılacaklar
1. K1 başlangıç komutları.
2. Derleme (AGENTS.md §5, `workigom` hesabı): `npx eas-cli build --platform android --profile preview`
   - `eas init`, `eas credentials`, `app.json`, `eas.json`, `package.json` **değiştirilmez**; hesap/proje kimliği (`bb7e7d28-5325-4a50-ae1e-7b134bdda455`) elle değiştirilmez.
   - Soru gelirse (ör. keystore) **mevcut anahtarı kullan**; yeni anahtar ÜRETME. Emin değilsen DUR ve bildir.
3. Rapora: derleme komutunun çıktısı AYNEN, **derleme bağlantısı**, derleme kimliği, sonuç (finished / errored). Hata varsa **tam log'u yapıştır, düzeltmeye çalışma.**
4. Başka bir derleme/yayın (iOS, submit, update) **yapma.**

## Kullanıcı testi (APK kurulunca)
Talimat 81'deki "Cihaz testi" listesi: İşletmem (taşma, "Beklemede"), Gelen Kutusu (tek satır sekmeler, profil resmi, geniş balon), Tüm Gönderiler (istatistik yok), Analiz (kopuk hesap yok), Muhasebecim (çok deneme mesajı). Ek olarak önceki derlemenin (`b5ea2a89`) Talimat 70 listesi hâlâ geçerli: Anasayfa, AI Üretim, Bot Yönetimi, Randevu, Flow AI paneli, sesli sohbet. Fark gördüğün ekranın görüntüsü + adım.
