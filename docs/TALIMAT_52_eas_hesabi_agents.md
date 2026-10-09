# TALİMAT 52 — flow `AGENTS.md`: EAS derleme hesabı (workigom) kayda geçirilir

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00` (güncel "Ek kurallar" dahil). Betik/regex YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. **HAZIR YAMA** (K2); yalnız `AGENTS.md` (+2 satır). Deploy YOK. **EAS BAŞLATMA** (bu talimatta). Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## Neden
Kullanıcı kararı: Expo ücretsiz limiti nedeniyle derlemeler `workigom` hesabında (`bb7e7d28-…`) alınıyor; `expo/skills` kullanıcı tarafından yüklendi. Bu bilgi tek kural kaynağında (AGENTS.md) yoksa ajanlar eski hesaba (`3914afac-…`) geri dönebilir ya da `eas init`'i yeniden çalıştırabilir. Yama ayrıca `.agents/skills`'in kural kaynağı olmadığını ve imza anahtarının yedeklenmesi gerektiğini yazar.

## Adımlar
1. K1 (flow `main`, temiz). `git am --3way <yol>/docs/patches/52-flow-agents-eas-hesabi.patch`.
2. Kontroller (AYNEN; hepsi OK): `bash scripts/ci/check-bom.sh`; `node scripts/ci/check-root-map.mjs`; `git show --stat --oneline HEAD` (1 dosya: AGENTS.md); `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 52 — flow <commit>`.

## Kullanıcıya not (Claude)
- Imza anahtarı `workigom` hesabında üretildi → Play Store'a çıkmadan önce `npx eas-cli credentials` ile yedeklenmeli. Telefondaki eski (volkanakbulut imzalı) uygulama silinip yeni APK kurulur.
- Çoklu ücretsiz hesapla limit aşmanın Expo kullanım koşullarına uygunluğu ve hesap askıya alma riski kullanıcıya aittir; kalıcı çözüm: ücretli plan ya da yerel (Linux/WSL) derleme.
