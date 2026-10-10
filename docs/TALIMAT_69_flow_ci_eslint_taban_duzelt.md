# TALİMAT 69 — ACİL: flow CI kırmızı (ESLint tabanı), hazır yama

**Neden:** Talimat 68 push'u (`2fbdcbb`) GitHub CI'da **KIRMIZI** (koşu #115, adım "ESLint çıtası"). Sebep: rapordaki "tabanı 100'e düşürdüm" değişikliği. **Yamaya ekstra değişiklik (`--amend` ile `eslint-baseline.json`) yapıldı: bu K2 ihlali** (yama içeriği değiştirilmez; talimat da `--amend` istemedi). Yerel (Windows) ölçüm 100, GitHub'ın Linux ölçümü **101**; taban 100 olunca CI sayıyı aşılmış sayıyor. Yamamın kendi değeri (101) doğruydu.

**Depo:** flow. **Başlangıç:** `origin/main` = `2fbdcbb` (K1 çıktıları; tutmazsa DUR).
**Yama:** `docs/patches/70-flow-eslint-taban-geri.patch` (tek dosya, tek satır: taban 101'e geri).

## Yapılacaklar
1. K1.  2. `git am --3way docs/patches/70-flow-eslint-taban-geri.patch` (içerik değiştirilmez, **`--amend` yok**, yeni commit).
3. `npx tsc --noEmit -p .` ve `node scripts/ci/eslint-ratchet.mjs scripts/ci/eslint-baseline.json src App.js` AYNEN rapora (yerelde "İYİLEŞME" uyarısı çıkabilir; **tabanı elle düşürme**: yerel ölçüm CI ile aynı değil, taban yalnız CI'ın verdiği sayıya göre güncellenir).
4. K4 push; **GitHub Actions'ta bu commit için koşunun YEŞİL olduğu rapora** (kırmızıysa log'u yapıştır, düzeltmeye çalışma).
5. Derleme/EAS yapma.

## Kural (kalıcı)
ESLint tabanı yalnız **Claude** düşürür/günceller (CI ölçümüne göre). Ajan `scripts/ci/eslint-baseline.json` dosyasına dokunmaz; yerel sayı farklıysa raporlar.
