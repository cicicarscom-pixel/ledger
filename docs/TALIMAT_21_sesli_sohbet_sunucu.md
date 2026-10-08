# TALİMAT 21 — Sesli sohbet modu: sunucu tarafı (ledger)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00` (ledger komutları). Betik YASAK; `--amend`/force-push YASAK; yalnız aşağıdaki dosyalar; "CI yeşil" demeden önce GitHub'da "completed successfully" gör. Deploy yalnız Claude ONAY'ından sonra (`flow-ai-agent`, tek komut).
**ÖNEMLİ: Bu dosya `TALIMAT_23_sesli_sohbet_hepsi.md` içinde birleştirildi. YALNIZ 23 numaralı dosyayı uygula; bunu ayrıca uygulama.**

**Önce** `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`.

## Amaç
Kullanıcı eller serbest (hands-free) sesli sohbet yapacak: yanıtlar sesle OKUNACAK. İstemci isteğe `voice: true` ekler; asistan kısa, okunabilir, soruyla biten cümleler üretir. Mobil istemci Talimat 22'de.

## Yapılacaklar
1. `supabase/functions/shared/ai/types.ts` — `AIContext`'e `voiceMode?: boolean;` ekle.
2. `supabase/functions/flow-ai-agent/index.ts` — `buildContext` çağrısından hemen sonra: `if (body.voice === true) context.voiceMode = true;`
3. `supabase/functions/shared/ai/flow/FlowPromptBuilder.ts` — `build()` sonunda, `context.voiceMode` doğruysa mevcut metne şu ek bölümü ekle (web ek bölümünün mantığıyla, ayrı sabit `VOICE_ADDENDUM`):
```
SESLİ SOHBET MODU: Kullanıcı seninle SESLİ konuşuyor; yanıtın telefon tarafından yüksek sesle okunacak. Kurallar:
V1. En çok iki kısa cümle yaz. Markdown, madde işareti, tablo, emoji, URL ve parantez KULLANMA.
V2. Saat ve tarihi konuşma diliyle yaz ("yarın akşam altıda", "on dokuz Ekim, saat on").
V3. Kullanıcıdan bir seçim ya da bilgi gerekiyorsa seçenekleri TEK cümlede say ve cümleyi soruyla bitir ("Hangi hesaplarda paylaşalım: Facebook, YouTube ya da Instagram?").
V4. Onay gerektiren bir işi (paylaşım, planlama) önce kısaca özetle, sonra "Onaylıyor musun?" diye sor. İşi yaptım DEME; onay gelene kadar yapılmış sayılmaz.
V5. "Aşağıdaki karta bak", "ekrandaki düğmeye bas" gibi ekrana yönlendiren cümleler KURMA; kullanıcı ekrana bakmıyor olabilir.
V6. Araç sonucu yoksa ya da hata varsa bunu tek cümleyle söyle ve ne yapabileceğini öner.
```
4. Test (`FlowPromptBuilder` için mevcut test dosyası varsa ona, yoksa yeni `FlowPromptBuilder.voice.test.ts`): `voiceMode: true` iken prompt "SESLİ SOHBET MODU" içerir; `voiceMode` yokken içermez.

## Kontroller (AYNEN; hepsi OK)
```
deno test --allow-all supabase/functions/shared/ai/flow
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh apps/ledger apps/admin
EXTRA_TSC_FLAGS="--allowImportingTsExtensions" bash scripts/ci/check-names.sh supabase/functions
node scripts/ci/check-root-map.mjs
```
Push; GitHub'da "completed successfully" gör. Rapor sonu: `KONTROL 21 — ledger <commit>`. Deploy: ONAY'dan sonra `npx supabase@latest functions deploy flow-ai-agent --project-ref qybzidylewzsnmlofjul --use-api`.
