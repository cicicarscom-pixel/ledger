# TALİMAT 55 — Kalite Faz 4 (flow, mobil): tip hataları, tarih, import temizliği (hazır yama)

**Depo:** flow. **Başlangıç:** `origin/main` = `6ba1155` (K1 çıktıları rapora; tutmazsa DUR).
**Yama:** `docs/patches/55-flow-kalite-faz4.patch` (ledger, `claude/new-session-hrbrhq`). 38 dosya.

## Ne yapar
- `tsc --noEmit` 20 hata → 0 (`core/i18n/index.ts`, `Customer.ts`, `Appointment.ts`, `AppointmentMapper.ts`).
- **Gerçek hata düzeltmesi:** iptal nedeni (`cancel_reason`) varlığa hiç aktarılmıyordu; Randevular ekranındaki "neden" rozeti hiç görünmüyordu.
- **Ödeme Takvimi:** ay sınırları `monthRangeYmd` ile, "bugün" işaretçisi işletmenin saat dilimine göre (`todayInTimezone`); `toISOString().split('T')` kalktı.
- 19 tekrarlı `import` birleştirildi; kullanılmayan import ve `catch (e)` bağlayıcıları temizlendi (`no-unused-vars` 127 → 61).
- `README.md` "Son Güncellemeler" satırı yamada var.
- Mevcut `eslint-disable` yorumlarına dokunulmadı.

## Yapılacaklar
1. K1 başlangıç komutları.
2. `git am --3way docs/patches/55-flow-kalite-faz4.patch` (içerik değiştirilmez; başka dosyaya dokunulmaz).
3. Kontroller — **altısı da rapora AYNEN** (Windows'ta Git Bash kullan; atlanmaz):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
npx tsc --noEmit -p .
```
   Beklenen: hepsi `OK`; `tsc` çıktısı boş.
4. K4 push + GitHub Actions yeşil.
5. **Derleme yapma** (kullanıcı isterse).

## Elle test (kullanıcı, yeni APK'da)
- Randevular: iptal edilmiş bir randevuda neden varsa rozet görünür.
- Ödeme Takvimi: ay değişir, bugünün günü işaretli, ödemeler doğru günde.
- Genel: ekranlar açılır (silinen importlar yüzünden çökme olmamalı).
