# TALİMAT 62 — Kalite Faz 8 (flowweb): ortak uyarı/onay bileşeni (hazır yama)

**Depo:** flowweb. **Başlangıç:** `origin/main` = `2f24b35` (K1 çıktıları rapora; tutmazsa DUR).
**Yama:** `docs/patches/62-flowweb-dialog-bileseni.patch` (ledger, `claude/new-session-hrbrhq`). 20 dosya.

## Ne yapar
Tarayıcının `alert()`/`confirm()` pencerelerinin (67 çağrı, 14 dosya) yerine çevirili, erişilebilir ortak bileşen: `src/components/ui/DialogProvider.tsx` + `useDialog()`. Kök `layout.tsx` içinde `NextIntlClientProvider`'ın altına sarılır. Esc iptal, Enter onay, odak onay düğmesinde, birden çok uyarı sıraya girer, yıkıcı onaylar kırmızı. Yeni anahtarlar `dialog.ok/confirm/cancel` (tr/en/de). Sıfırlama paneli (`AiDataResetPanel`) artık "tamamlandı" mesajını sayfa yenilenmeden önce gösterir (eskiden `alert` bloklardı).
Mobil bu fazın dışında: `Alert.alert` zaten yerel ve çevirili.

## Yapılacaklar
1. K1 başlangıç komutları.
2. `git am --3way docs/patches/62-flowweb-dialog-bileseni.patch` (içerik değiştirilmez; başka dosyaya dokunulmaz).
3. Kontroller — **altısı da rapora AYNEN** (Git Bash; önce `npm ci --ignore-scripts --no-audit --no-fund`):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
npx tsc --noEmit -p .
node scripts/ci/eslint-ratchet.mjs scripts/ci/eslint-baseline.json src
```
   Beklenen: i18n her dilde `eksik 0`; tsc boş; çıta `0 hata, 37 uyarı`.
4. K4 push + GitHub Actions + Vercel yeşil. **Derleme/EAS yapma.**

## Elle test (kullanıcı, web)
- Randevu → takvim/personel silme: onay penceresi kırmızı "Onayla", "İptal" ile vazgeçilir.
- Sosyal Medya → hesabın bağlantısını kes: onay penceresi; Gelen Kutusu → seçilenleri sil.
- Ayarlar → AI veri sıfırlama: "tamamlandı" mesajı görünür, **Tamam**'a basınca sayfa yenilenir.
- Herhangi bir hata mesajı (ör. boş telefonla WhatsApp kodu): tarayıcı penceresi yerine uygulama penceresi, seçili dilde.
