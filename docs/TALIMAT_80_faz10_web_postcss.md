# TALİMAT 80 — Faz 10 (web): `postcss` güvenlik bulguları (flowweb, 1 yama)

**Neden:** `npm audit` 11 bulgu veriyordu; ikisi (Next ve `postcss`) Next.js'in içinde gömülü eski `postcss` kopyasından geliyordu (sourceMappingURL ile dosya okuma, `</style>` XSS). `package.json` zaten `postcss ^8.5.23` içeriyordu ama Next'in kendi kopyası eskiydi.
**Çözüm:** `package.json` → `"overrides": { "postcss": "^8.5.23" }` ve `package-lock.json` güncellemesi. Sonuç: bulgular 11 → 9; `npm ls postcss` her yerde 8.5.29.
**Kalan 9 bulgu:** yalnız geliştirme/derleme aracı (Tailwind 3 ve `eslint-config-next` içindeki `braces`, `chokidar`, `micromatch`, `fast-glob`); çözümleri büyük sürüm geçişi (Tailwind 4, Next 16). Üretimde işlenmiyorlar; ayrı iş (yapılmayacak şimdilik).

**Depo:** flowweb. **Başlangıç:** `origin/main` = `cb6c1d4`. **Yama:** `docs/patches/85-flowweb-postcss-overrides.patch` (1 commit: `package.json`, `package-lock.json`, `README.md`).
**Claude'un yerelde doğrulaması:** yama temiz uygulanıyor; `tsc` boş; ESLint 0/24 (taban aynı); BOM OK; **`next build` başarılı**.

## Yapılacaklar
1. K1.  2. `git am --3way docs/patches/85-flowweb-postcss-overrides.patch` (içerik değişmez, `--amend` yok).
3. **`npm ci --ignore-scripts --no-audit --no-fund`** (kilit dosyası yeni) + yedi kontrol AYNEN. Ek olarak çıktıları rapora koy: `npm ls postcss` ve `npm audit` (özet satırı).
4. K4 push; GitHub Actions yeşil; **Vercel Ready** (derleme kullanıcı tarafında da doğrulanır).
5. Mobil (`flow`) bağımlılıkları bu işte YOK (derleme gerektirir, mobil toplu pakete girer).

## Kullanıcı testi
Vercel Ready olunca siteyi bir kez gez (Anasayfa, Gelen Kutusu, Analiz): görünüm aynı olmalı (CSS işleyicisi değişti).
