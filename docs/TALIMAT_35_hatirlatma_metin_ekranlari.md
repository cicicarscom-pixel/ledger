# TALİMAT 35 — Hatırlatma metnini düzenleme ekranları: mobil (flow) + web (flowweb)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. İki **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Veritabanına DOKUNMA (RPC'ler canlıda: `get_reminder_settings`, `set_reminder_template`).

**Önce Talimat 34** (Edge Function) bitmiş ve ONAYLANMIŞ olmalı; bu iş ondan bağımsız uygulanabilir ama kullanıcıya birlikte teslim edilir.

## Ne yapılıyor
Hatırlatma açıkken, düğmenin altında:
- **Mesaj dili** seçimi (Türkçe / English / Deutsch / Français / Español).
- **Hatırlatma metni** (en çok 700 karakter): işletme kendi metnini yazar. Yer tutucu düğmeleri ({name} {first_name} {business} {date} {time} {doctor} {service}) imlecin olduğu yere ekler.
- **Önizleme** (örnek bilgilerle), **"Varsayılan metne dön"**, **Kaydet** (değişiklik varken etkin; kaydedince "Kaydedildi" yazıp pasif; hata olursa kırmızı uyarı).
- Hitap (Sayın / Mr. / Herr…) kodda YOK; ipucu metni bunu söyler.
- Mobil: yeni dosya `ReminderTemplateEditor.js` + `BotYonetimiScreen.js`'e 6 satır. Web: `ReminderToggle.tsx` genişledi, `reminderSettings.ts`'e `setReminderTemplate` eklendi.

## Adımlar (iki ayrı iş; sırayla)
### A) flow (mobil)
1. K1 başlangıç: `main`'de, temiz. `git am --3way <ledger yolu>/docs/patches/35-flow-hatirlatma-metin.patch`.
2. Kontroller (AYNEN; hepsi OK):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git show --stat --oneline HEAD
git status -sb
```
`--stat` beklenen 6 dosya: `README.md`, `de.json`, `en.json`, `tr.json`, `ReminderTemplateEditor.js` (yeni), `BotYonetimiScreen.js`.
3. Push (K4 çıktıları AYNEN), GitHub "completed successfully". Rapor sonu: `KONTROL 35A — flow <commit>`.

### B) flowweb (web)
1. K1 başlangıç; `git am --3way <ledger yolu>/docs/patches/35-flowweb-hatirlatma-metin.patch`.
2. Kontroller (AYNEN):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git show --stat --oneline HEAD
git status -sb
```
`--stat` beklenen 6 dosya: `README.md`, `messages/{de,en,tr}.json`, `src/actions/reminderSettings.ts`, `src/components/settings/ReminderToggle.tsx`.
3. Push; GitHub "completed successfully" (Vercel `next build` yeşil). Rapor sonu: `KONTROL 35B — flowweb <commit>`.

## Notlar
- Mobil için yeni EAS derlemesini KULLANICI alır (sen başlatma). Deploy YOK. Yama uygulanmazsa DUR ve çıktıyı AYNEN bildir.
