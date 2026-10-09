# TALİMAT 39 — Mobil: sesli sohbet sırasında da dosya (video) ekleme düğmesi (flow)

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00` (flow komutları). Betik/regex/toplu değiştirme YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Veritabanına/Edge Function'a DOKUNMA. **EAS derlemesi BAŞLATMA** (kullanıcı kendisi alır). Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## Kullanıcı isteği (09.10.2026)
Mobilde sesli sohbet (Dinliyorum/Konuşuyor) açıkken dosya ekleme düğmesi kayboluyor; web'deki gibi her zaman görünsün.

## Ne değişiyor (`FlowAiHost.js` + README)
- Sesli sohbet çubuğunun soluna "dosya ekle" (+) düğmesi eklendi (yanıt işlenirken pasif).
- Düğmeye basınca: bekleyen okuma/dinleme durdurulur, video seçici açılır. Seçici açıkken uygulama arka plana düşer; bu süre 4 sn'lik "arka plan → sohbeti kapat" sayacı **çalışmaz** (`pickingRef`). Seçimden/iptalden dönünce dinleme kendiliğinden sürer. Sohbet kapanmaz.
- Normal (yazılı) mod aynen kalır.

## Adımlar
1. K1 başlangıç (flow `main`, temiz; başlangıç `9d9a9a7`). `git am --3way <ledger yolu>/docs/patches/39-flow-sesli-dosya-ekle.patch`.
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
`--stat` 2 dosya: README.md, FlowAiHost.js.
3. K4 push doğrulaması; GitHub'da CI "completed successfully" gör. Rapor sonu: `KONTROL 39 — flow <commit>`. EAS derlemesini kullanıcı alır.

## Kullanıcı testi (yeni APK)
Sesli sohbeti aç → "Dinliyorum" iken + düğmesi görünmeli → bas, bir video seç → sohbet kapanmamalı, dönünce yeniden dinlemeli, video çip olarak görünmeli → "bu videoyu paylaş…" de.
