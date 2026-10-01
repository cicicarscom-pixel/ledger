# STRUCTURE — ledger (platform backend + mali müşavir paneli) kök dizin haritası

> Kök dizindeki her klasör ve dosya burada açıklanır. **Yeni bir kök öğe eklemek için önce bu tabloya satır ekle**; CI (`scripts/ci/check-root-map.mjs`) haritada olmayan kök öğeyi reddeder.
> **Ajan sütunu:** **Dokunma** = talimat olmadan değiştirilmez · **Talimatla** = yalnız talimattaki iş · **Serbest** = kurallara (AGENTS.md) uyarak çalışılır.

| Öğe | Ne işe yarar | Uygulama buna bağlı mı | Ajan |
|---|---|---|---|
| `supabase/` | **Platform backend:** `migrations/` (şema; yalnız Claude), `functions/` (Edge Functions: WhatsApp/Instagram asistanı, AI Core, Ledger işleyici) | **Evet** (canlı servisler) | Talimatla |
| `apps/` | `apps/ledger` (mali müşavir paneli, Next.js), `apps/admin` | **Evet** | Talimatla |
| `packages/` | Ortak paketler (ai, auth, database, i18n, types…) | **Evet** (apps) | Talimatla |
| `tooling/` | Ortak ESLint/Prettier/TypeScript ayarları | **Evet** (apps) | Dokunma |
| `package.json` | Çalışma alanı bağımlılıkları | **Evet** | Talimatla |
| `package-lock.json` | Bağımlılık kilidi (npm) | **Evet** | Dokunma |
| `pnpm-lock.yaml` | Bağımlılık kilidi (pnpm) — npm kilidiyle birlikte; netleştirilecek | Belirsiz | Dokunma |
| `pnpm-workspace.yaml` | pnpm çalışma alanı | **Evet** | Dokunma |
| `deno.lock` | Edge Functions (Deno) kilidi | **Evet** | Dokunma |
| `types.ts` | Eski Supabase tip dökümü, **UTF-16 kodlu**; hiçbir kod kullanmıyor (Faz F'de kaldırılacak) | Hayır | Dokunma |
| `scripts/` | CI kontrolleri (`scripts/ci/`), persona tohumlama, yardımcı betikler | Hayır | Talimatla |
| `.github/` | GitHub Actions CI | Hayır (CI) | Dokunma |
| `docs/` | Belgeler; `docs/archive/` yalnız tarihsel | Hayır | Serbest |
| `archive/` | Eski/el yazımı SQL (`archive/sql/`); **migration zinciri DEĞİL**, çalıştırılmaz | Hayır | Dokunma |
| `AGENTS.md` | **Tek geçerli ajan kuralları** | Hayır | Talimatla |
| `STRUCTURE.md` | Bu harita | Hayır (CI) | Talimatla |
| `README.md` | Proje belgesi | Hayır | Serbest |
| `LEDGER_README.md` | Ledger mimarisi ve Mimar/İşleyici şema kuralları | Hayır | Serbest |
| `README_LEDGER.md` | Ledger kısa belgesi | Hayır | Serbest |
| `.agents/` | Ledger mimari bilgi notları ve beceri belgeleri. Kural kaynağı DEĞİL; çelişirse `AGENTS.md` geçerli | Hayır | Talimatla |
| `skills-lock.json` | Ajan becerileri kilidi | Hayır | Dokunma |
| `.editorconfig` | Editör ayarı (UTF-8, BOM'suz) | Hayır | Dokunma |
| `.gitignore` | Git dışı dosyalar | Hayır | Talimatla |
