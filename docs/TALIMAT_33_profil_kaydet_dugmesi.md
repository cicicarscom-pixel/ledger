# TALİMAT 33 — Profil: "Profili Kaydet" düğmesi (mobil flow + web flowweb)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. İki **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Veritabanına DOKUNMA.

## Ne yapılıyor (kullanıcı isteği)
Profili kaydet düğmesine basınca **"Kaydedildi" yazsın ve düğme pasif olsun**; kullanıcı bir alanı yeniden değiştirirse düğme tekrar etkinleşsin ve "Profili Kaydet" yazsın.
- Düğme yalnız kaydedilmemiş değişiklik varken etkin (form ilk yüklendiğinde de pasif).
- Mobil: başarılı kayıtta açılan "Başarılı" uyarı penceresi kaldırıldı; geri bildirim düğmedir.
- Web: profil kaydı artık hatayı sessizce yutmaz (hata olursa "Kaydedildi" yazmaz, hata mesajı gösterir).
- Yeni çeviri anahtarı (3 dilde yamanın içinde): mobil `profil.saved`, web `profilPage.actions.saved`. README maddeleri yamanın içinde.

## Adımlar (iki ayrı iş; sırayla)
### A) flow (mobil)
1. K1 başlangıç: `main`'de, temiz, `git fetch origin` sonrası `HEAD = origin/main`.
2. `git am --3way <ledger yolu>/docs/patches/33-flow-profil-kaydet.patch` (ledger dosyasını flow klasörüne kopyalama; tam yol ver).
3. Kontroller (AYNEN; hepsi OK):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git show --stat --oneline HEAD
git status -sb
```
`--stat` beklenen 5 dosya: `README.md`, `de.json`, `en.json`, `tr.json`, `src/screens/ProfilScreen.js`.
4. Push (K4 çıktıları AYNEN), GitHub "completed successfully". Rapor sonu: `KONTROL 33A — flow <commit>`.

### B) flowweb (web)
1. K1 başlangıç; `git am --3way <ledger yolu>/docs/patches/33-flowweb-profil-kaydet.patch`.
2. Kontroller (AYNEN):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git show --stat --oneline HEAD
git status -sb
```
`--stat` beklenen 5 dosya: `README.md`, `messages/{de,en,tr}.json`, `src/app/(dashboard)/profil/page.tsx`.
3. Push; GitHub "completed successfully" (Vercel `next build` de yeşil olmalı). Rapor sonu: `KONTROL 33B — flowweb <commit>`.

## Notlar
- Mobil için yeni EAS derlemesini KULLANICI alır (sen başlatma).
- Deploy YOK. Yama uygulanmazsa DUR ve çıktıyı AYNEN bildir.
