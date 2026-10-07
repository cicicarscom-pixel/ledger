# TALİMAT 11 — Video paylaşımında metin yoksa kullanıcıya sor (ledger, sunucu)

Hazırlayan: Claude, 07.10.2026. Ön koşul: Talimat 8b (`32c186c`) canlıda. Ortak kurallar: `TALIMAT_00`.
**Önce** `git fetch origin` + `git merge origin/claude/new-session-hrbrhq` (bu dosya o dalda).

## Sorun (web testinde görüldü)
Kullanıcı "bu videoyu hesaplarımda paylaş" dedi. `CaptionService` videoda metin üretmeyi **bilerek reddediyor** (ürün politikası: "Videolarda metni kendin yaz"). Araç metinsiz `SUCCESS` döndü, `clientAction.caption` boş kaldı, istemci geçersiz sayıp sessizce düştü: onay kartı çıkmadı, model yine de "ekranı hazırladım" dedi.
Beklenen: metin yoksa Flow AI **önce metni sorar**; kullanıcı yazınca kart çıkar.

## Yapılacaklar (yalnız bu 3 dosya + test; editörde, betik yok)

### 1) `supabase/functions/shared/ai/flow/tools/VideoShareTools.ts`
`captionText` belirlendiği bloğu (`let captionText = ...` ile ona bağlı `if (!captionText) { const r = await this.captions.generate(...) ... }` bloğu) şununla DEĞİŞTİR. `captions.generate` çağrısı tamamen kalkar (kurucu imzası aynı kalsın, parametre kullanılmasa da silme):
```ts
const captionText = typeof args.caption === "string" ? args.caption.trim() : "";
if (!captionText) {
  return {
    status: "CAPTION_REQUIRED",
    data: { platforms: validPlatforms, skipped },
    message: "Gönderi metni yok. Videolarda metni AI üretmez. Kullanıcıya bu video için gönderi metnini ne yazmak istediğini SOR (metni UYDURMA). Kullanıcı yazınca prepare_video_share'i caption argümanıyla tekrar çağır."
  };
}
```
Bu blok, uygunluk kontrolü döngüsünden SONRA ve `validPlatforms.length === 0` → `NOTHING_ELIGIBLE` dönüşünden SONRA kalsın. Altındaki "başlık uzunluğu" döngüsü aynen kalsın (artık `captionText` her zaman dolu).

### 2) `supabase/functions/shared/ai/flow/FlowPromptBuilder.ts`
14. kuralın sonuna şu cümleyi ekle (başka satıra dokunma):
`Kullanıcı gönderi metnini vermediyse önce metni SOR (videolarda metni AI üretmez, generate_caption çağırma); kullanıcı yazınca prepare_video_share'i caption argümanıyla çağır. Araç CAPTION_REQUIRED dönerse "hazırladım" DEME, yalnız metni iste.`

### 3) `VideoShareTools.test.ts`
- Mevcut "vertical video success" testi `caption: "Merhaba"` veriyor, aynen kalsın.
- Yeni test: dikey video, `args = {}` → `status === "CAPTION_REQUIRED"`, `data.platforms` `["instagram"]`; sahte `captions.generate` çağrılırsa test **fail** olsun (çağrı sayacı 0).
- Yeni test: `args = { caption: "   " }` → yine `CAPTION_REQUIRED`.
- `UI_TOOLS` korumasına dokunma: `CAPTION_REQUIRED` SUCCESS değil, model "hazırladım" diyemez.

## Kontroller (AYNEN, hepsi OK)
```
deno test --allow-all supabase/functions/shared/ai/flow/tools/VideoShareTools.test.ts supabase/functions/shared/ai/flow/tools/FormatEligibility.test.ts supabase/functions/shared/ai/flow/tools/PublishTools.test.ts supabase/functions/shared/ai/flow/tools/FlowTools.test.ts
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh apps/ledger apps/admin
EXTRA_TSC_FLAGS="--allowImportingTsExtensions" bash scripts/ci/check-names.sh supabase/functions
node scripts/ci/check-root-map.mjs
```
Push et; CI için GitHub çalışma sayfasında **"completed successfully"** yazısını gör (görmeden "yeşil" yazma). Deploy YOK, ONAY'dan sonra. İstemci (web/mobil) değişmez.

Rapor sonu: `KONTROL 11 — ledger <commit>`.
