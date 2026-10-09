# TALİMAT 58 — Kalite Faz 6B (flowweb): i18n + e-posta doğrulama sayfası (hazır yama)

**Depo:** flowweb. **Başlangıç:** `origin/main` = `f972e09` (K1 çıktıları rapora; tutmazsa DUR).
**Yama:** `docs/patches/58-flowweb-i18n-6b.patch` (ledger, `claude/new-session-hrbrhq`). 19 dosya.

## Ne yapar
- **Doğrulama sayfası** (`verify-email`): üç dil; "Tekrar Gönder" 60 sn bekleme sayacı; hız sınırında anlaşılır uyarı; hesap zaten doğrulanmışsa yanıltmayan mesaj; "Giriş sayfasına dön" bağlantısı.
- **Kayıtta dil**: `actions/auth.ts` kayıt sırasında kullanıcının dilini (`locale`) Supabase'e iletir (e-posta şablonu bu dile göre seçilir).
- **i18n:** Onboarding, Müşteriler, Randevu (takvim yönetimi + rezervasyon penceresi), Gönderiler tablosu, Paylaşım uyarıları, Gelen Kutusu uyarıları, Çoklu Takvim anahtarı, Fatura kartı, Kenar çubuğu, Randevu bildirim erişilebilirlik etiketi → 78 yeni anahtar (tr/en/de).
- ESLint uyarısı 38 → 37; **taban dosyası da 37'ye düşer** (yamada; elle değiştirme).

## Yapılacaklar
1. K1 başlangıç komutları.
2. `git am --3way docs/patches/58-flowweb-i18n-6b.patch` (içerik değiştirilmez; başka dosyaya dokunulmaz).
3. Kontroller — **altısı da rapora AYNEN** (Git Bash; önce `npm ci --ignore-scripts --no-audit --no-fund`):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
npx tsc --noEmit -p .
node scripts/ci/eslint-ratchet.mjs scripts/ci/eslint-baseline.json src
```
   Beklenen: i18n her dilde `eksik 0`; tsc boş; çıta `0 hata, 37 uyarı (taban: 0 hata, 37 uyarı)`.
4. K4 push + GitHub Actions + Vercel yeşil. **Derleme/EAS yapma.**

## Elle test (kullanıcı, web)
- Yeni e-postayla kayıt → "E-postanızı Doğrulayın" sayfası seçili dilde; "Tekrar Gönder" → mesaj + 60 sn sayaç; ardından e-posta (gelmezse spam).
- Doğrulama bağlantısı → giriş → Onboarding formu (dil seçili dilde) → ana sayfa.
- Müşteriler, Randevu (takvim yönetimi/rezervasyon), Gönderiler, Ayarlar'da çoklu takvim anahtarı: metinler seçili dilde, işlevler eskisi gibi.
