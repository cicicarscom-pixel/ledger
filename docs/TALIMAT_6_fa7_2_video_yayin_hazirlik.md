# TALİMAT 6 — FA7-2: video yükleme + yayın planı HAZIRLAMA (Antigravity uygular)

Önce `TALIMAT_00_sira_ve_ortak_kurallar.md` kurallarını oku; hepsi geçerli. **Veritabanına dokunma** (FA7-1 canlıda: `flow_ai_media`, `social_format_rules`, `flow_ai_publish_plans`, `flow_ai_publish_targets`, `org_ai_autopublish` ve özel `flow-ai-media` depolama kovası). Bu talimat **yayınlamaz**: onay, yayın ve zamanlama FA7-3'tedir. Bu fazın hiçbir aracı bir planı `confirmed`/`scheduled`/`publishing`/`done` yapamaz.

Çalışma: `C:\ledger`. Yalnız bu belgede adı geçen dosyalara dokun.

## Akış (bu fazın sonunda)
Kullanıcı Flow AI paneline video yükler (istemci) → sunucu medya kaydını açar → sohbette "Tüm hesaplarımda yayınla / yarın 14:00'te paylaş" der → yapay zekâ **plan taslağı** hazırlar (hedef hesaplar, uygunluk, metinler, saat) ve özetler. Yayın düğmesi FA7-3'te gelecek; bu fazda plan yalnız taslaktır.

## A. Yeni Edge Function: `supabase/functions/flow-ai-media/index.ts` (verify_jwt AÇIK)
Kimlik: JWT'den kullanıcı (`userClient.auth.getUser()`); işletme: `flow-ai-agent/index.ts` içindeki `resolveOrg(userId)` ile **aynı mantık** (kopyala; istemciden kimlik alma). Hizmet rolü istemcisi `admin`. CORS başlıkları `flow-ai-agent` ile aynı. Gövde `{ action, ... }`. Yanıtlar JSON; iç hata ayrıntısı dönme.

**1) `create-upload`** — gövde `{ mimeType, sizeBytes }`
- `mimeType` listede olmalı: `video/mp4`, `video/quicktime`, `video/webm`, `image/jpeg`, `image/png`, `image/webp`; değilse 400 `UNSUPPORTED_TYPE`.
- `sizeBytes` tam sayı, `1..104857600` (100 MB); aşarsa 413 `TOO_LARGE`.
- Hız sınırı: son 24 saatte bu işletme için `flow_ai_media` kayıt sayısı ≥ 20 ise 429 `RATE_LIMITED`.
- Yol: `<orgId>/<crypto.randomUUID()>.<uzantı>` (uzantı mime'dan: mp4/mov/webm/jpg/png/webp). `admin.storage.from('flow-ai-media').createSignedUploadUrl(path)` → `{ uploadUrl: signedUrl, token, path, bucket: 'flow-ai-media', expiresInSec: 7200 }` dön.

**2) `register`** — gövde `{ path, mimeType, durationSec?, width?, height? }` (yükleme bittikten sonra)
- `path` **`<orgId>/` ile başlamak zorunda** (başka işletmenin yolu → 403) ve `..` içeremez.
- Nesnenin gerçekten var olduğunu ve boyutunu **depodan** doğrula: `admin.storage.from('flow-ai-media').list(<orgId>, { search: <dosyaAdı> })` → `metadata.size`, `metadata.mimetype`. Yoksa 404 `NOT_UPLOADED`. **`size_bytes` istemciden değil depodan alınır**; mime depodaki ile uyuşmuyorsa 400.
- Video ise `durationSec` (0 < d ≤ 43200), `width`, `height` (1..16384) **zorunlu**; yoksa 400 `MISSING_METADATA`. Bunlar istemci beyanıdır (not: yalnız ön elemede kullanılır).
- `flow_ai_media`'ya ekle: `org_id`, `user_id`, `media_type` (video/image), `mime_type`, `storage_bucket='flow-ai-media'`, `storage_path`, `size_bytes`, `duration_sec`, `width`, `height`, `status='ready'`. Aynı `storage_path` için ikinci kayıt açma (varsa onu dön).
- Yanıt: `{ mediaId, durationSec, width, height, aspectRatio, sizeMb }`.

## B. Yayın planı araçları: `supabase/functions/shared/ai/flow/tools/PublishPlanTools.ts` (yeni) + `FormatEligibility.ts` (yeni, saf işlev)
`PublishTools.ts` desenini izle (`ITool`, `riskLevel`, `AIContext` — `context.organizationId`, `context.customerId` = kullanıcı). `localToUtcIso`, `normalizePlatform` ve süre sabitlerini (`MIN_LEAD_MS`, `MAX_LEAD_MS`) `PublishTools.ts`'ten **içe aktar** (kopyalama; yalnız eksikse `export` ekle).

### B1. `FormatEligibility.ts` (saf, test edilebilir)
```ts
export interface FormatRule { platform: string; format: string; media_type: string; min_duration_sec: number|null; max_duration_sec: number|null; min_aspect: number|null; max_aspect: number|null; max_file_mb: number|null; max_caption_chars: number }
export interface MediaFacts { media_type: string; duration_sec: number|null; aspect_ratio: number|null; size_bytes: number }
export function pickFormat(platform: string, media: MediaFacts): string        // aşağıdaki kurallar
export function checkEligibility(rule: FormatRule, media: MediaFacts): { ok: true } | { ok: false; reason: string }  // Türkçe sebep
```
- `pickFormat`: instagram→`reel`; youtube→ süre ≤ 180 ve en-boy ≤ 1.0 ise `short`, değilse `video`; facebook→ süre ≤ 90 ve en-boy ≤ 0.8 ise `reel`, değilse `video`; tiktok/linkedin/twitter/threads/bluesky→`video`.
- `checkEligibility` sebepleri (örnekler; Türkçe, sade): "Video 120 sn; bu biçim en fazla 90 sn kabul eder.", "Video çok kısa (en az 3 sn).", "Yatay çekilmiş (16:9); bu biçim dikey (9:16) ister.", "Dosya 180 MB; bu biçim en fazla 100 MB kabul eder." Sınırlar kural satırından okunur, **kodda sabit değer YOK**. Kural `null` ise o kontrol atlanır. `media_type` kuralla uyuşmazsa "Bu biçim yalnız video kabul eder".
- **Bu fazda yalnız video planlanır:** `media.media_type !== 'video'` ise araçlar `UNSUPPORTED_MEDIA` döner ("Şimdilik yalnız video yayın planı hazırlayabiliyorum").

### B2. Araçlar (hepsi yalnız KENDİ işletme + KENDİ kullanıcı kaydına erişir; `org_id` ve `user_id` filtresi her sorguda)
| Araç | Risk | İş |
|---|---|---|
| `inspect_media` `{ mediaId }` | READ | Medya özeti (tür, süre, en-boy oranı, boyut MB) + bağlı her platform için `eligible`/sebep. Başkasının ya da süresi dolmuş/`ready` olmayan medya → `NOT_FOUND`. |
| `prepare_publish_plan` `{ mediaId, platforms?, scheduledLocal?, captionHint? }` | PREPARE | Plan taslağı oluşturur/günceller (aşağıda). |
| `update_publish_plan` `{ planId, removePlatforms?, addPlatforms?, captions?, scheduledLocal?, clearSchedule? }` | WRITE_REVERSIBLE | Yalnız `draft` plan. |
| `cancel_publish_plan` `{ planId }` | WRITE_REVERSIBLE | `draft` → `cancelled`. |

**`prepare_publish_plan` adımları** (sırayla):
1. Medyayı oku (`ready`, süresi dolmamış, video). Yoksa/uygunsuzsa hata sonucu.
2. Bağlı hesaplar: `integration.social_accounts` (`organization_id = orgId`, `is_active`, `needs_reconnection = false`) → platform ve `zernio_account_id`. `platforms` verilmediyse **bağlı hepsi**; verildiyse `normalizePlatform` ile eşle. İstenen ama bağlı olmayan platform → hedef `skipped`, sebep "Hesap bağlı değil" (hata değil).
3. Her platform için `pickFormat`, `social_format_rules`'tan (`platform`,`format`,`is_active`) kural oku; kural yoksa `skipped` ("Bu platform için biçim kuralı tanımlı değil"); `checkEligibility` başarısızsa `skipped` + sebep.
4. Uygun hedefler için **metin**: `CaptionService`'i (`flow/CaptionService.ts`) **önce oku**, mevcut imzasıyla platforma göre çağır (`captionHint` varsa ekle). Dönen metin kuraldaki `max_caption_chars`'ı aşarsa **yeniden iste** (en çok 1 deneme); hâlâ aşıyorsa hedefi `skipped` yap ("Metin bu platformun sınırını aşıyor"). Metni sessizce **kırpma**.
5. Zaman: `scheduledLocal` ("YYYY-MM-DD HH:mm", işletme saat dilimi = `context` saat dilimi) → `localToUtcIso`. Geçersiz/DST boşluğu → hata; `now + 5 dk`'dan yakınsa hata ("En erken 5 dakika sonrasına planlanabilir"); 365 günden uzaksa hata. Verilmediyse `scheduled_for = null` ("hemen").
6. Yaz: aynı kullanıcı + medya için süresi dolmamış bir `draft` plan **varsa onu güncelle** (hedefleri sil-yeniden ekle, `expires_at` yenile); yoksa yenisini aç. Kullanıcının açık `draft` planı ≥ 10 ise `LIMIT` hatası. `status` **daima `draft`**, `mode='approved'`, `payload_hash` **boş**.
7. Yanıt (`ToolResult.data`): `planId`, `scheduledLocalText` (işletme saat diliminde, gün adıyla: "Yarın, 8 Ekim Çarşamba 14:00" ya da "Hemen"), `targets: [{ platform, format, status: 'planned'|'skipped', skipReason?, captionPreview (ilk 120 karakter) }]`. `message`: modele "plan TASLAK; henüz yayınlanmadı, yayın onayı sonraki adımda eklenecek" der.

**`update_publish_plan`:** kullanıcı "açıklamayı kısalt", "TikTok'u çıkar", "yarın 15:00 yap" derse. `addPlatforms` için B2-2/3 adımlarını yinele; `captions` verilen metin kural sınırını aşıyorsa reddet. `scheduledLocal`/`clearSchedule` aynı zaman kuralları. Plan `draft` değilse `NOT_EDITABLE`.

**Kural (Deno testiyle zorunlu):** hiçbir araç `flow_ai_publish_plans.status`'u `draft`/`cancelled` dışına yazmaz; kayıt defterinde `confirm_*` ya da `publish_plan` adlı araç **yoktur**.

### B3. Kayıt ve istemci eki
- `flow-ai-agent/index.ts` içinde araçları **hem `mobile` hem `web` kayıt defterine** ekle (mevcut ekleme biçimiyle).
- İstek gövdesine isteğe bağlı `attachments: [{ mediaId }]` (en çok 3). Her biri **bu işletme + bu kullanıcı + `ready`** olmalı; değilse yok say (hata verme). Geçerli ekler için kullanıcı mesajının sonuna bir satır ekle (modele görünür, `flow_ai_messages` kaydındaki `content`'e **eklenmez**): `[Ekli video: mediaId=<id>, süre <n> sn, <en-boy>, <MB> MB]`.
- `FlowPromptBuilder.ts`'e kısa bir bölüm ekle (Türkçe): "Kullanıcı video eklediğinde: `inspect_media` ile bak, platformları sor ya da bağlı hepsini öner, `prepare_publish_plan` ile TASLAK hazırla ve planı kısaca özetle (hangi hesaplar, hangi biçim, hangi saat, atlananlar sebebiyle). Planı ASLA 'yayınlandı' diye sunma; yayın için kullanıcı onayı gerekir. Saati belirsizse sor, uydurma."

## C. Testler (Deno; `deno test --no-check --allow-all`)
- `FormatEligibility.test.ts`: her `pickFormat` dalı; süre/oran/boyut ihlalleri; kural alanı `null` iken atlama; sebep metinleri.
- `PublishPlanTools.test.ts` (sahte `admin` ile): başkasının medyası/planı erişilemez; bağlı olmayan platform `skipped`; uygunsuz video `skipped`+sebep; metin sınırı aşımı `skipped`; geçmiş/5 dk'dan yakın/365 günden uzak zaman hata; ikinci `prepare` aynı taslağı günceller (çoğaltmaz); 10 taslak sınırı; **`confirmed` yazan yol yok**; kayıt defterinde `confirm_*` yok.
- `flow-ai-media` için saf doğrulama işlevleri (mime/boyut/yol önek kontrolü) ayrı dosyada test edilir.

## Kontroller (push öncesi; AYNEN rapora)
Ortak kontroller (ledger bölümü) +
```
deno test --no-check --allow-all supabase/functions/shared/ai/flow/tools/PublishPlanTools.test.ts
deno test --no-check --allow-all supabase/functions/shared/ai/flow/tools/FormatEligibility.test.ts
deno test --no-check --allow-all supabase/functions/shared/ai/flow/tools/PublishTools.test.ts
deno test --no-check --allow-all supabase/functions/shared/ai/flow/tools/FlowTools.test.ts
```
README "Son Güncellemeler" maddesi. Push → CI "completed successfully" → `KONTROL 6 — ledger <commit>`. **Rapora:** değişen dosyalar, `CaptionService`'in gerçek imzası ve nasıl çağrıldığı, `resolveOrg` kopyasının kaynağı.

## Deploy (yalnız Claude ONAY'ından sonra; sırayla, tek tek, `--use-api`)
1. `npx supabase@latest functions deploy flow-ai-media --project-ref qybzidylewzsnmlofjul --use-api` (**yeni**, `verify_jwt` açık kalacak; `--no-verify-jwt` KULLANMA)
2. `npx supabase@latest functions deploy flow-ai-agent --project-ref qybzidylewzsnmlofjul --use-api`

## Kabul (Claude kontrol eder)
| # | Ölçüt |
|---|---|
| 1 | Hiçbir araç plan durumunu `draft`/`cancelled` dışına yazmıyor; `confirm_*` yok (Deno testi) |
| 2 | Başka işletmenin medyası/planı/hesabı kullanılamıyor |
| 3 | `register` başka işletmenin yolunu ve depoda olmayan nesneyi reddediyor; boyut depodan geliyor |
| 4 | Uygunsuz platform atlanıyor, sebebi Türkçe; metin kırpılmıyor |
| 5 | Zaman işletme saat dilimiyle çözülüyor; 5 dk / 365 gün sınırları |
| 6 | Aynı medya için ikinci hazırlama taslağı çoğaltmıyor |
| 7 | Canlı: yüklenen küçük bir video için "Tüm hesaplarımda yayınla" → plan özeti geliyor, **hiçbir gönderi oluşmuyor** |
