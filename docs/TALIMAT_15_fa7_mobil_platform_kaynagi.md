# TALİMAT 15 — Mobil: paylaşılacak platformlar ekran durumundan değil, onaylanan işten alınsın (flow)

Hazırlayan: Claude, 07.10.2026. Ön koşul: Talimat 14 (`54a84c4`) ve yeni EAS derlemesi. Ortak kurallar: `TALIMAT_00` (flow komutları). Betik YASAK; `--amend`/force-push YASAK; yalnız aşağıdaki dosya (+ README); "CI yeşil" demeden önce GitHub'da "completed successfully" gör.
**Önce** `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`.

## Cihaz testi (11:51)
Hesap seçici kartı çalıştı (kullanıcı "Seçilen hesaplar: facebook, youtube" gönderdi), "hesap bağlayın" hatası gitti. Ama "Onayla ve paylaş"ta `AiUretimScreen.publishPost` "Lütfen en az bir platform seçin." uyarısı verdi: ekranın `selectedPlatforms` durum nesnesi o anda boştu (ekran önbellekte tutuluyor; hesaplar/odak/draftPlatforms efektleri birbirini eziyor). Kullanıcı kartta hangi hesapları onayladıysa, paylaşım ONLARA gitmeli; bu, kırılgan ekran durumuna bağlı olmamalı.

## Yapılacaklar — yalnız `src/modules/sosyal_medya/presentation/screens/AiUretimScreen.js` (+ README tek satır)
1. `useRef` ile `const flowShareRef = useRef(null);` ekle (bileşen gövdesinde, `handleShareRef`'in yanında).
2. Handoff'tan iş alındığı yerde (`const job = flowAiShareHandoff.takeJob(); if (job) {` bloğu) hemen `flowShareRef.current = { platforms: (Array.isArray(job.platforms) ? job.platforms : []).map((p) => String(p).toLowerCase()) };` yaz.
3. `publishPost` başındaki `allowedPlatforms` satırını şununla DEĞİŞTİR:
```js
const jobPlatforms = flowShareRef.current ? flowShareRef.current.platforms : null;
let allowedPlatforms = jobPlatforms
  ? connectedAccounts.filter((acc) => jobPlatforms.includes(String(acc.platform).toLowerCase()))
  : connectedAccounts.filter(acc => selectedPlatforms[acc.platform]);
```
   (`jobPlatforms` boş dizi ise `allowedPlatforms` boş kalır ve mevcut "en az bir platform" uyarısı çıkar; bu doğru.)
4. `registerScreen` efektindeki `ready` hesabında `Object.values(selectedPlatforms).some(Boolean)` koşulunu `(flowShareRef.current ? flowShareRef.current.platforms.length > 0 : Object.values(selectedPlatforms).some(Boolean))` yap.
5. `handleShare` içinde işin SONUNDA (başarı `shareSuccess()` çağrısından hemen sonra VE `ok === false` dalında `shareError(...)` çağrısından hemen sonra VE `catch` bloğunda `shareError(...)` sonrasında) `flowShareRef.current = null;` çağır; böylece ekranın sonraki ELLE paylaşımları etkilenmez. Hesap yok / oturum yok erken `return`'lerinde de `flowShareRef.current = null;`.
6. Başka hiçbir mantığa dokunma (draftPlatforms efekti, loadAccounts aynen kalsın).

## Kontroller (AYNEN; hepsi OK)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
```
Push; GitHub'da "completed successfully" gör. Rapor sonu: `KONTROL 15 — flow <commit>`. Yeni EAS derlemesini kullanıcı alır.
