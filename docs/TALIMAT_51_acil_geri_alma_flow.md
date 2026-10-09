# ⛔ TALİMAT 51 İPTAL EDİLDİ (09.10.2026) — UYGULAMA

> Kullanıcı, `d0a74f1`'in kendi kararı olduğunu doğruladı: Expo ücretsiz derleme limiti nedeniyle yeni `workigom` hesabının açılmasını ve derlemelerin orada alınmasını, ayrıca `expo/skills` yüklenmesini kendisi istedi. Geri alma YAPILMAYACAK; `51-flow-geri-alma.patch` silindi. Yerine Talimat 52 (AGENTS.md'ye hesabı kaydet) geçerlidir. Aşağıdaki metin yalnız tarihçedir.

# TALİMAT 51 — ACİL: talimat dışı `d0a74f1` ve `b94aff9` (flow) GERİ ALINIYOR

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK; `--amend`/force-push/`reset`/`rebase` YASAK (geri alma YENİ commit ile; yama bunu hazır yapar); yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. **HAZIR YAMA** (K2). **EAS BAŞLATMA. `eas init`, `eas build`, `npx skills …`, `expo skills …` ÇALIŞTIRMA.** Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## Ne oldu (Claude'un denetimi, 09.10.2026)
Talimat 48–50 işlerinin dışında `flow/main`'e iki commit girmiş (hiçbir talimatta YOK; K2 "talimatta olmayan dosyaya dokunulmaz" ihlali):
- `d0a74f1` "remove projectId from app.json and install expo skills": **139 dosya, 19.721 satır**:
  - `app.json`: EAS `projectId` `3914afac-6620-4e3f-9000-4c003a57df58` → `bb7e7d28-5325-4a50-ae1e-7b134bdda455` ve `"owner": "workigom"` eklendi.
  - 138 dosya üçüncü taraf `expo/skills` içeriği (`.agents/skills/*`, `skills-lock.json`).
- `b94aff9` "remove npx folder": `d0a74f1`'in yanlışlıkla eklediği boş `npx` dosyası.

## Neden ciddi
1. **EAS kimliği değişirse Android imzalama anahtarı (keystore) değişir.** Yeni derlenen APK, telefondaki mevcut uygulamanın üstüne GÜNCELLENEMEZ; Play Store'a yüklenince "yanlış imza" olur. Derleme hesabı kullanıcının (`volkanakbulut`) hesabıdır; kimlik/hesap değişikliği YALNIZ kullanıcı kararıdır.
2. **Üçüncü taraf "skill" dosyaları** ajanların okuyup talimat olarak izleyebileceği metinlerdir; AGENTS.md "tek geçerli kural kaynağı" ilkesine ve depo güvenliğine aykırı (talimat enjeksiyonu yüzeyi), ayrıca 19 bin satır gürültü.

## Yama (`51-flow-geri-alma.patch`; 139 dosya, geri alma commit'i + README satırı)
`d0a74f1` ve `b94aff9` tamamen geri alınır: `app.json` eski hâline döner (`projectId` `3914afac-…`, `owner` satırı yok), `.agents/skills` içine o commit'te eklenenler ve `skills-lock.json` farkı silinir. Başka hiçbir dosyaya dokunmaz.

## Adımlar
1. K1 (flow `main`, temiz; başlangıç `97d7b18`). `git am --3way <yol>/docs/patches/51-flow-geri-alma.patch`.
2. Kontroller (AYNEN; hepsi OK): `bash scripts/ci/check-bom.sh`; `bash scripts/ci/check-names.sh src App.js`; `node scripts/ci/check-assets.mjs src App.js`; `node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de`; `node scripts/ci/check-root-map.mjs`; `git grep -n "projectId\|\"owner\"" -- app.json` (çıktı: yalnız `projectId` satırı, değeri `3914afac-6620-4e3f-9000-4c003a57df58`; `owner` YOK); `git show --stat --oneline HEAD`; `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 51 — flow <commit>`.
3. Raporda AYRICA şunları yaz: (a) `d0a74f1`'i hangi komut/araç üretti (örn. `eas init`, `npx skills add`)? (b) Expo'da `workigom` hesabı altında yeni bir proje (`bb7e7d28-…`) oluşturuldu mu? (c) herhangi bir EAS derlemesi başlatıldı mı (varsa bağlantısı)?

## YASAK (bundan sonra, kalıcı)
`eas init`, `eas build`, `eas update`, `eas submit`, `eas credentials`, `npx skills …`, `npx expo-skills …`, `.agents/`, `skills-lock.json`, `app.json`, `eas.json`, `package.json` dosyalarına **talimatta açıkça yazılmadıkça** dokunmak. **EAS derlemesini YALNIZ kullanıcı** `C:\Users\roman\flow` içinden kendi Expo hesabıyla (`volkanakbulut`) alır.
