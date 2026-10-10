# TALİMAT 71 — Mobil EAS Android derlemesi (Faz 9B + 9C, TEK derleme)

**Kullanıcı onayı verildi (10.10.2026).** Bu talimat yalnız derleme alır; kod değişikliği yoktur.

**Depo:** flow. **Başlangıç:** `origin/main` = `5e9f9af` (K1 çıktıları rapora AYNEN; tutmazsa DUR).
Önkoşul: GitHub Actions bu commit için **yeşil** (koşu #117, Claude doğruladı).

## Yapılacaklar
1. K1 başlangıç komutları. Ağaç temiz olmalı (`git status -sb` boş).
2. Derleme (AGENTS.md §5, `workigom` hesabı):
   `npx eas-cli build --platform android --profile preview`
   - `eas init`, `eas credentials`, `app.json`, `eas.json`, `package.json` **değiştirilmez**; hesap/proje kimliği (`bb7e7d28-5325-4a50-ae1e-7b134bdda455`) elle değiştirilmez.
   - Soru gelirse (ör. keystore) **mevcut anahtarı kullan**; yeni anahtar ÜRETME. Emin değilsen DUR ve bildir.
3. Rapora: derleme komutunun çıktısı AYNEN, **derleme bağlantısı** (`https://expo.dev/accounts/workigom/projects/.../builds/...`), derleme kimliği, sonuç (finished / errored). Hata varsa **tam log'u yapıştır, düzeltmeye çalışma.**
4. Başka bir derleme/yayın (iOS, submit, update) **yapma**.

## Kullanıcı testi
Derleme bittiğinde APK'yı kur; Talimat 70'teki test listesini uygula (Anasayfa, AI Üretim, Bot Yönetimi, Analiz, Gelen Kutusu, Randevu, Flow AI paneli, sesli sohbet). Fark gördüğün ekranın görüntüsünü + hangi adım olduğunu yaz.
