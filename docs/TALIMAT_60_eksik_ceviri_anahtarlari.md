# TALİMAT 60 — Eksik çeviri anahtarları (flowweb + flow, hazır yamalar)

Kodda `t("…")` ile çağrılıp `tr/en/de` dosyalarında **bulunmayan** anahtarlar (ekranda ham anahtar adı ya da yalnız Türkçe yedek metin görünüyordu). Tüm çağrılar çeviri dosyalarıyla taranarak bulundu.

| Depo | Başlangıç | Yama | Not |
|---|---|---|---|
| flowweb | `origin/main` = `7ce3912` (58 uygulanmış) | `docs/patches/60-flowweb-eksik-anahtar.patch` | 1 anahtar: `common.cancel` |
| flow | **Talimat 59 uygulanmış olmalı** (`origin/main` = Talimat 59'un commit'i) | `docs/patches/60-flow-eksik-anahtarlar.patch` | 31 anahtar + 5 küçük çağrı düzeltmesi |

**flow için sıra:** önce Talimat 59 (`59-flow-i18n-6c6d.patch`), sonra bu talimat. 59 uygulanmadan flow yaması UYGULANMAZ (DUR ve bildir).

## flow yaması ne yapar
- Muhasebecim "bağlı" ekranı ham anahtar gösteriyordu (`muhasebecimScreen.connected.title/actionsTitle/…`): çağrılar mevcut anahtarlara bağlandı + `connected.viewInvoices` eklendi.
- Sosyal Medya (bağlantıyı kes uyarısı/etiketler), Sohbet menüsü, Randevu rezervasyon penceresi, AI Muhasebe kartları, Gelen Kutusu "Seçildi": eksik anahtarlar tr/en/de eklendi. Bağlantıyı kes onayı `{{platform}}` parametresi alır.

## Her depo için
1. K1 başlangıç komutları (başlangıç commit'i tabloyla uyuşmalı; değilse DUR).
2. `git am --3way <yama>` (içerik değiştirilmez; başka dosyaya dokunulmaz).
3. Kontroller — **hepsi rapora AYNEN** (Git Bash; önce `npm ci --ignore-scripts --no-audit --no-fund`):
   - flowweb: `check-bom.sh`, `check-names.sh src`, i18n-parity (`messages …`), `check-root-map.mjs`, `npx tsc --noEmit -p .`, `eslint-ratchet.mjs … src` → çıta `0 hata, 37 uyarı`.
   - flow: `check-bom.sh`, `check-names.sh src App.js`, `check-assets.mjs src App.js`, i18n-parity (`src/core/i18n/locales …`), `check-root-map.mjs`, `npx tsc --noEmit -p .`, `eslint-ratchet.mjs … src App.js` → çıta `101 hata, 122 uyarı`.
   Beklenen: i18n her dilde `eksik 0`; tsc boş.
4. K4 push + GitHub Actions yeşil. **Derleme yapma.**

## Elle test (kullanıcı)
- Mobil: Muhasebecim (bağlı hesap) başlık ve hızlı eylemler; Sosyal Medya'da bağlı hesabın "Bağlantıyı Kes" uyarısı; Sohbet'te mesaj düzenle/sil menüsü.
- Web: Randevu → rezervasyon penceresinde "İptal" düğmesi.
