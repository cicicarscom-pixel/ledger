# TALİMAT 65 — ACİL: Vercel derleme hatası (flowweb, hazır yama)

**Neden:** `a246676` (Talimat 64) Vercel'de **Build Failed**: `Command "pnpm install" exited with 1` (`ERR_PNPM_OUTDATED_LOCKFILE`: `pnpm-lock.yaml` `next-intl` 4 ile uyumsuz). Depoda iki kilit dosyası vardı (`package-lock.json` + eski `pnpm-lock.yaml`); Vercel pnpm'i seçti. Önceki canlı sürüm ayakta kalıyor, ama yeni sürüm yayınlanamıyor.

**Depo:** flowweb. **Başlangıç:** `origin/main` = `a246676` (K1 çıktıları rapora; tutmazsa DUR).
**Yama:** `docs/patches/66-flowweb-vercel-kilit.patch` (ledger, `claude/new-session-hrbrhq`).

## Ne yapar
`pnpm-lock.yaml` ve `pnpm-workspace.yaml` **silinir** (`git rm` yamada); tek kilit dosyası `package-lock.json` (GitHub CI ile aynı ağaç). `STRUCTURE.md`, `AGENTS.md`, `README.md` güncellenir. Yerelde doğrulandı: temiz `npm install` kilidi değiştirmiyor, `next build` başarılı.

## Yapılacaklar
1. K1 başlangıç komutları.
2. `git am --3way docs/patches/66-flowweb-vercel-kilit.patch` (içerik değiştirilmez).
3. `npm ci --ignore-scripts --no-audit --no-fund`, sonra **altı kontrol rapora AYNEN** (check-bom, check-names src, i18n-parity, check-icu, check-root-map, tsc, eslint-ratchet) — root-map `22/22` olmalı.
4. K4 push — **push çıktısındaki commit kimliği GitHub'dakiyle aynı olmalı**; GitHub Actions yeşil.
5. **Vercel → flowweb projesi → Deployments:** yeni dağıtımın durumunu (Ready/Error) rapora yaz. Error ise **tam log'u yapıştır, düzeltmeye çalışma**.
6. **Derleme/EAS yapma.**

## Kullanıcı (Vercel paneli, 1 dakika)
Vercel → flowweb projesi → **Settings → Build & Development Settings → Install Command**: kutu **boş/varsayılan** olmalı (Override kapalı). Elle `pnpm install` yazılıysa kapat.
