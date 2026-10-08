# TALİMAT 32 — "WhatsApp randevu hatırlatma" düğmesi: mobil (flow) + web (flowweb)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. İki **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Veritabanına DOKUNMA (RPC'ler canlıda: `get_reminder_settings`, `set_reminder_settings`).

## Ne yapılıyor
Hatırlatma sistemi canlı ama işletme sahibinin açıp kapatacağı düğme yok. Düğme, çoklu takvim düğmesinin hemen altına eklenir:
- **Mobil:** Bot Yönetimi ekranı. **Web:** AI Asistan sayfası.
- Yalnız işletme SAHİBİ değiştirebilir (sunucu doğrular; değilse "yalnızca işletme sahibi" uyarısı). Varsayılan KAPALI. Hata olursa düğme eski haline döner.
- Çeviri anahtarları 3 dilde yamanın içinde. README maddeleri yamanın içinde (ayrıca README'ye dokunma).

## Adımlar (iki depo, AYRI işler; sırayla)
### A) flow (mobil)
1. K1 başlangıç: `main`'de, temiz. Yama dosyası ledger deposunda: `docs/patches/32-flow-hatirlatma-dugmesi.patch`. (ledger'daki dosyayı flow klasörüne KOPYALAMA; tam yolu ver: `git am --3way <ledger yolu>/docs/patches/32-flow-hatirlatma-dugmesi.patch`.)
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
`--stat` beklenen 5 dosya: `README.md`, `de.json`, `en.json`, `tr.json`, `BotYonetimiScreen.js`.
3. Push (K4 çıktıları AYNEN), GitHub "completed successfully". Rapor sonu: `KONTROL 32A — flow <commit>`.

### B) flowweb (web)
1. K1 başlangıç; yama: `docs/patches/32-flowweb-hatirlatma-dugmesi.patch` → `git am --3way <ledger yolu>/docs/patches/32-flowweb-hatirlatma-dugmesi.patch`.
2. Kontroller (AYNEN):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git show --stat --oneline HEAD
git status -sb
```
`--stat` beklenen 7 dosya: `README.md`, `messages/{de,en,tr}.json`, `src/actions/reminderSettings.ts`, `src/app/(dashboard)/ai-asistan/page.tsx`, `src/components/settings/ReminderToggle.tsx`.
3. Push; GitHub "completed successfully" (Vercel `next build` de kırmızı olmamalı; yeşilini yaz). Rapor sonu: `KONTROL 32B — flowweb <commit>`.

## Notlar
- Mobil için yeni EAS derlemesini KULLANICI alır (sen başlatma).
- Deploy YOK (Edge Function değişmedi).
