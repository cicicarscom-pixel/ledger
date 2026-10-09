# TALİMAT 56 — Kalite Faz 5: CI kapıları (flow + flowweb, hazır yamalar)

İki depo, iki yama. **Sırayla** uygula; her biri ayrı rapor, ayrı CI yeşili.

| Depo | Başlangıç | Yama |
|---|---|---|
| flow | `origin/main` = `4073887` | `docs/patches/56-flow-ci-kapilari.patch` |
| flowweb | `origin/main` = `8cf1f3f` | `docs/patches/56-flowweb-ci-kapilari.patch` |

## Ne yapar
CI'ya üç adım eklenir: `npm ci` → `tsc --noEmit` (hata varsa kırmızı) → **ESLint çıtası** (`scripts/ci/eslint-ratchet.mjs`): hata/uyarı sayısı kayıtlı tabanı (`scripts/ci/eslint-baseline.json`) **aşamaz**. Taban: flow 211 hata / 122 uyarı (React Compiler kuralları, sabit metinler; sonraki fazlarda azalır), flowweb 0 hata / 38 uyarı. Yeni kod mevcut kaliteyi bozamaz.
Yama ayrıca `AGENTS.md` "CI'ın yerel karşılığı" bloğunu ve `README.md` "Son Güncellemeler"i günceller.

## Her depo için
1. K1 başlangıç komutları (başlangıç commit'i yukarıdaki tabloyla aynı olmalı; değilse DUR).
2. `git am --3way <yama>` (içerik değiştirilmez; başka dosyaya dokunulmaz).
3. Yerel kontrol — **hepsi rapora AYNEN** (Git Bash):
   - flow: önce `npm ci --ignore-scripts --no-audit --no-fund` (değişen `node_modules` push'a girmez), sonra
     `bash scripts/ci/check-bom.sh` · `bash scripts/ci/check-names.sh src App.js` · `node scripts/ci/check-assets.mjs src App.js` · i18n-parity · `node scripts/ci/check-root-map.mjs` · `npx tsc --noEmit -p .` · `node scripts/ci/eslint-ratchet.mjs scripts/ci/eslint-baseline.json src App.js`
   - flowweb: aynı şekilde `npm ci` sonrası check-bom, `check-names.sh src`, i18n-parity, check-root-map, `npx tsc --noEmit -p .`, `node scripts/ci/eslint-ratchet.mjs scripts/ci/eslint-baseline.json src`
   Beklenen: `OK`/boş; çıta satırı flow `211 hata, 122 uyarı`, flowweb `0 hata, 38 uyarı`.
4. K4 push + GitHub Actions: **yeni adımlar dahil yeşil** (ilk koşuda `npm ci` adımı süre alır; kırmızı olursa DUR, tam hata çıktısını raporla — düzeltmeye çalışma).
5. Taban sayısını değiştirme, `ci.yml`'i elle düzenleme (K2/K5).
