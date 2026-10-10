# TALİMAT 68 — Kalite Faz 9B: FlowAiHost görünümünü bölme (flow/mobil, hazır yama)

**Amaç:** `src/modules/flow_ai/FlowAiHost.js` (802 satır) içindeki panel **görünümü** yedi sunum bileşenine taşınır (`src/modules/flow_ai/ui/`). **Birebir taşımadır; davranış değişmez.** Sesli sohbet durum makinesi, onay/paylaşım mantığı ve tüm işleyiciler `FlowAiHost` içinde kalır (cihaz testinde sorun çıkarabilecek kısım bilerek dokunulmadı).

**Depo:** flow (mobil). **Başlangıç:** `origin/main` = `51b30d4` (K1 çıktıları rapora; tutmazsa DUR).
**Yama:** `docs/patches/69-flow-faz9b-flowaihost.patch` (ledger, `claude/new-session-hrbrhq`).

## Yamanın içeriği
`ui/GuideBanner`, `MessageList`, `PendingActions`, `SharePendingCard`, `PlatformPickCard`, `AttachmentChip`, `Composer` + `FlowAiHost.js` (802 → 604) + README satırı.
Yerelde doğrulandı: `tsc` boş, ESLint çıtası eşit (101/122), check-bom/names/assets/root-map OK, `npx expo export --platform android` başarılı.

## Yapılacaklar
1. K1 başlangıç komutları.
2. `git am --3way docs/patches/69-flow-faz9b-flowaihost.patch` (içerik değiştirilmez).
3. `npm ci`, sonra CI'ın yerel karşılığının **hepsi AYNEN** rapora (check-bom, check-names src App.js, check-assets, i18n-parity, check-root-map, tsc, eslint-ratchet).
4. K4 push, commit kimliği GitHub'dakiyle aynı, GitHub Actions yeşil.
5. **Derleme/EAS yapma** (derlemeyi kullanıcı ister).

## Kullanıcı testi (cihazda, yeni derleme isteyince)
Flow AI orb → panel: mesaj gönder, öneri çipleri, onay kartı (Onayla/Reddet), video ekle + paylaşım kartı + platform seçimi, sesli sohbet (mikrofon, "Bitir"), rehber modu. Önceki sürümle fark varsa ekran görüntüsü.
