# TALİMAT 54 — Kalite Faz 3b (flowweb): kullanılmayan değişken uyarıları (hazır yama)

**Depo:** flowweb. **Başlangıç:** `origin/main` = `64fd181` (K1 çıktıları rapora; tutmazsa DUR).
**Yama:** `docs/patches/54-flowweb-kalite-faz3b.patch` (ledger, `claude/new-session-hrbrhq`).

## Ne yapar
- ESLint uyarıları 86 → 38; `no-unused-vars` 45 → 1 (kalan `muhasebecim/page.tsx` `handleDisconnect`: bilerek bırakıldı, Faz E'de kullanılacak).
- Anasayfa (`(dashboard)/page.tsx`): sonucu hiçbir yerde kullanılmayan ödeme takvimi RPC'si ve 4 platform sayacı sorgusu kaldırıldı. Ekran görünümü değişmez.
- 4 `useEffect` bağımlılığına `supabase` eklendi (tarayıcıda tek örnek; davranış değişmez).
- `README.md` → "Son Güncellemeler" satırı yamada var.

## Yapılacaklar
1. K1 başlangıç komutları.
2. `git am --3way docs/patches/54-flowweb-kalite-faz3b.patch` (içerik değiştirilmez; başka dosyaya dokunulmaz).
3. Kontroller (AYNEN, hepsi rapora; atlanmaz — Windows'ta Git Bash kullan):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
npx tsc --noEmit -p .
npx eslint src
```
   Beklenen: tsc çıktısı boş; eslint `0 errors, 38 warnings`.
4. K4 push + GitHub Actions + Vercel yeşil.

## Elle test (kullanıcı)
Anasayfa açılır; Bugünkü/Yaklaşan Randevular, finans kartları, takipçi sayısı, bildirimler eskisi gibi görünür. Sosyal Medya, Gönderiler, Paylaşım ve AI Muhasebe sayfaları açılır.
