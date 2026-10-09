# TALİMAT 53 — KALİTE FAZ 3: flowweb ESLint hataları, erişilebilirlik, tarih testi

Hazırlayan: Claude, 09.10.2026. Program: `docs/KALITE_PROGRAMI.md`. **Önce Faz 1–2 (Talimat 48–49) ONAYLI** (onaylandı). Ortak kurallar: `TALIMAT_00` (güncel "Ek kurallar" dahil). Betik/regex YASAK (README satırı yamanın İÇİNDE); `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır, yamanın dışında dosya değişikliği varsa BUNU yazar. **HAZIR YAMA** (K2). Veritabanı/Edge Function YOK. Deploy YOK. Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## Ne düzeliyor (Claude yerelde doğruladı: strict `tsc` 0 hata, ESLint hata 5→0, alt-text uyarısı 8→0, `deno test` 5/5)
- `prefer-const` ×4 (`RandevuClient.tsx`, `(dashboard)/page.tsx`); `(dashboard)/page.tsx`'teki hiç kullanılmayan `inc/exp` satırı silindi.
- 8 `<img>` için alt metni: süs avatarlar (yanında ad yazılı) `alt=""` (erişilebilirlik standardı); zaten alt'ı olan görsele dokunulmaz.
- `src/lib/dates.test.ts`: `// @ts-nocheck` kaldırıldı ve test artık fonksiyonların KOPYASINI değil GERÇEK `./dates.ts` modülünü sınıyor (kopya, gerçek kod bozulsa da geçiyordu). `tsconfig.json` ve `eslint.config.mjs` Deno testlerini (`src/**/*.test.ts`) dışlar (Next derlemesinin parçası değil).
- Davranış değişikliği: YOK (görünür metin/akış aynı).

## Adımlar (flowweb, başlangıç: Faz 2 sonrası `main`)
1. K1. `git am --3way <yol>/docs/patches/53-flowweb-kalite-faz3.patch`.
2. Kontroller (AYNEN; hepsi OK): `bash scripts/ci/check-bom.sh`; `bash scripts/ci/check-names.sh src`; `node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de`; `node scripts/ci/check-root-map.mjs`; `npx tsc --noEmit -p .` (çıktı BOŞ olmalı; node_modules yoksa `npm ci --ignore-scripts` önce); `npx eslint src` (ÇIKTIDA "error" OLMAMALI; uyarılar kalır); `git show --stat --oneline HEAD` (7 dosya); `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 53 — flowweb <commit>`.
3. Raporda `npx eslint src` özet satırını AYNEN yapıştır ("✖ N problems (0 errors, N warnings)").

## Sonraki
Faz 3b: 45 kullanılmayan değişken/içe aktarma + 18 `exhaustive-deps` (her biri ayrı incelenir; davranışı değiştirebilir).
