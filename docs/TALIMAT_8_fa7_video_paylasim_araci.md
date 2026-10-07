# TALİMAT 8 — FA7 (basit sürüm): `prepare_video_share` aracı (ledger, sunucu)

Önce `TALIMAT_00_sira_ve_ortak_kurallar.md` kurallarını oku. **Veritabanına dokunma. Yeni tablo, yeni Edge Function, depolama YOK.** Video sunucuya GİTMEZ; yalnız videonun *bilgileri* (süre, oran, boyut) gelir. Videoyu paylaşan, kullanıcının kendi istemcisidir (TALİMAT 9 ve 10).

## Akış
Kullanıcı panele video ekler ve "tüm hesaplarda paylaş / yarın 14:00'te" der → model `prepare_video_share` çağırır → araç **dış etkisi olmayan** bir hazırlık yapar (hesap seçimi, uygunluk, metin, saat) ve istemciye `share_video` eylemi döner → istemci Paylaşım Merkezi'ni doldurur → kullanıcı panelde "Onayla ve paylaş"a basar. Araç hiçbir şey yayınlamaz. (Onay dokunuşu istemcidedir; paylaşımı kullanıcının kendi oturumu mevcut `zernio-client create-post` yoluyla yapar.)

## 1. `supabase/functions/shared/ai/types.ts`
`AIContext`'e isteğe bağlı alan: `attachment?: { kind: 'video'; mimeType: string; durationSec: number; width: number; height: number; sizeBytes: number; fileName?: string }`.

## 2. `supabase/functions/flow-ai-agent/index.ts`
- İstek gövdesinde isteğe bağlı `attachment` (aynı şekil). **Doğrula** (geçersizse yok say, hata verme): `kind==='video'`, `mimeType` ∈ {`video/mp4`,`video/quicktime`,`video/webm`,`video/3gpp`}, `durationSec` 0<d≤43200, `width`/`height` 1..16384 tam sayı, `sizeBytes` 1..5368709120, `fileName` ≤ 120 karakter ve yol ayırıcı içermez. Geçerliyse `buildContext` bağlamına `attachment` olarak koy.
- Geçerli ek varsa kullanıcı mesajının **modele giden** kopyasının sonuna şu satırı ekle (`flow_ai_messages.content`'e YAZMA): `[Ekli video: <süre> sn, <genişlik>x<yükseklik>, <MB> MB]`.
- `prepare_video_share`'i **hem `mobile` hem `web`** kayıt defterine ekle. Ek yoksa araç `NO_ATTACHMENT` döner.
- **İstemci eylemi izin listesi:** sunucunun istemciye gönderebildiği eylem türleri nerede tanımlıysa (`FlowToolExecutor` / `flowUiCatalog`; `open_post_draft` ve `highlight` nasıl geçiyorsa öyle) `share_video`'yu ekle. Bulduğun yeri ve değişikliği rapora yaz.

## 3. `supabase/functions/shared/ai/flow/tools/FormatEligibility.ts` (yeni, saf, test edilebilir)
```ts
export interface FormatRule { platform: string; format: string; media_type: string; min_duration_sec: number|null; max_duration_sec: number|null; min_aspect: number|null; max_aspect: number|null; max_file_mb: number|null; max_caption_chars: number }
export interface MediaFacts { durationSec: number; aspect: number; sizeBytes: number }
export function pickFormat(platform: string, m: MediaFacts): string
export function checkEligibility(rule: FormatRule, m: MediaFacts): { ok: true } | { ok: false; reason: string }
```
- `pickFormat`: instagram→`reel`; youtube→ süre ≤ 180 ve oran ≤ 1.0 ise `short`, değilse `video`; facebook→ süre ≤ 90 ve oran ≤ 0.8 ise `reel`, değilse `video`; tiktok/linkedin/twitter/threads/bluesky→`video`.
- `checkEligibility`: sınırlar **kural satırından** okunur (kodda sabit sayı YOK; alan `null` ise o kontrol atlanır). Türkçe sebep metinleri: "Video 120 sn; bu biçim en fazla 90 sn kabul eder.", "Video çok kısa (en az 3 sn).", "Yatay çekilmiş; bu biçim dikey (9:16) ister.", "Dosya 180 MB; bu biçim en fazla 100 MB kabul eder."
- `aspect = width / height`.

## 4. `supabase/functions/shared/ai/flow/tools/VideoShareTools.ts` (yeni)
`PublishTools.ts` desenini izle (`ITool`, `AIContext`). `localToUtcIso`, `normalizePlatform`, `MIN_LEAD_MS`, `MAX_LEAD_MS`'i oradan **içe aktar** (kopyalama; gerekirse `export` ekle). Araç: `prepare_video_share`, `riskLevel = 'PREPARE'`.

Şema: `{ platforms?: string[], scheduledLocal?: "YYYY-MM-DD HH:mm", caption?: string, captionHint?: string }`.

Adımlar (sırayla):
1. `context.attachment` yoksa `{ status: 'NO_ATTACHMENT', message: 'Önce panelden bir video ekleyin.' }`.
2. Bağlı hesaplar: `integration.social_accounts` (`organization_id = context.organizationId`, `is_active`, `needs_reconnection = false`) → platform listesi (`PublishTools.connectedPlatforms` ile aynı kaynak; mümkünse o işlevi dışa aç ve kullan). Bağlı hesap yoksa `NO_ACCOUNTS`.
3. Hedefler: `platforms` verildiyse `normalizePlatform` ile eşle, verilmediyse **bağlı hepsi**. İstenen ama bağlı olmayan platform → `skipped: "Hesap bağlı değil"` (hata değil).
4. Her hedef için `pickFormat` → `social_format_rules`'tan (`platform`, `format`, `is_active`) kural oku (tek sorguda hepsi) → `checkEligibility`. Kural yoksa `skipped: "Bu platform için biçim kuralı tanımlı değil"`. Başarısızsa `skipped` + sebep. **Uygun hedef kalmazsa** `{ status: 'NOTHING_ELIGIBLE', data: { skipped } }` ve istemci eylemi **gönderme**.
5. Metin: `caption` verildiyse onu kullan; yoksa `CaptionService.generate(...)` (**önce oku**; mevcut `CaptionRequest` şekliyle, uygun platformlar + `captionHint`). Ortak tek metin kullanılır. Metin bir platformun `max_caption_chars`'ını aşıyorsa **o platformu `skipped` yap** ("Metin bu platformun sınırını aşıyor"); **metni kırpma**.
6. Zaman: `scheduledLocal` varsa `localToUtcIso(local, context.timezone)`; geçersiz/DST boşluğu → `{ status: 'INVALID_TIME' }`; şimdiden `MIN_LEAD_MS`'den yakınsa `TOO_SOON`; `MAX_LEAD_MS`'den uzaksa `TOO_FAR`. Yoksa "hemen".
7. Sonuç: `{ status: 'SUCCESS', data: { caption, platforms: [uygun platformlar], skipped: [{ platform, reason }], scheduledText: <işletme saat diliminde gün adıyla, "Yarın, 8 Ekim Çarşamba 14:00"> | null, clientAction: { type: 'share_video', caption, platforms, skipped, scheduledLocal: <verilen yerel saat | null>, timezone: context.timezone } }, message: 'Paylaşım ekranı hazırlandı; kullanıcı panelde onaylayınca paylaşılacak. Henüz YAYINLANMADI.' }`.

**Bu araç hiçbir tabloya yazmaz** (kullanım ölçümü yürütücüde zaten yapılıyor), `zernio-client`'ı çağırmaz.

## 5. `FlowPromptBuilder.ts` (kısa bölüm, Türkçe)
"Kullanıcı bir video eklediyse ve paylaşmak istiyorsa `prepare_video_share` çağır. Kullanıcı platform söylemediyse bağlı hepsini kullan. Saati belirsizse sor, uydurma. Sonucu kısaca özetle (hangi hesaplar, hangi saat, atlananlar sebebiyle). Videoyu ASLA 'paylaşıldı' diye sunma: yayın için kullanıcı panelde 'Onayla ve paylaş'a basmalı."

## 6. Testler (Deno, `--no-check --allow-all`)
- `FormatEligibility.test.ts`: her `pickFormat` dalı; süre/oran/boyut ihlalleri; `null` alan atlanır; sebep metinleri.
- `VideoShareTools.test.ts` (sahte `admin`/`CaptionService` ile): ek yok → `NO_ATTACHMENT`; bağlı olmayan platform `skipped`; uygunsuz video `skipped`+sebep; hepsi uygunsuz → `NOTHING_ELIGIBLE` ve `clientAction` YOK; metin sınırı aşımı `skipped` (kırpma yok); geçmiş/5 dk'dan yakın/365 günden uzak zaman hatası; **araç hiçbir `insert/update/delete` ve `zernio` çağrısı yapmaz**; başka işletmenin hesapları kullanılamaz (`organization_id` filtresi).
- `flow-ai-agent` ek doğrulaması (geçersiz `attachment` yok sayılır) ayrı saf işlevde testlenir.

## Kontroller / rapor
Ortak kontroller (ledger) + 
```
deno test --no-check --allow-all supabase/functions/shared/ai/flow/tools/FormatEligibility.test.ts
deno test --no-check --allow-all supabase/functions/shared/ai/flow/tools/VideoShareTools.test.ts
deno test --no-check --allow-all supabase/functions/shared/ai/flow/tools/PublishTools.test.ts
deno test --no-check --allow-all supabase/functions/shared/ai/flow/tools/FlowTools.test.ts
```
README maddesi. Push → CI "completed successfully" → `KONTROL 8 — ledger <commit>`. Rapora: `CaptionService`'in gerçek imzası ve çağrısı; istemci eylemi izin listesinin bulunduğu dosya:satır.

## Deploy (yalnız Claude ONAY'ından sonra)
`npx supabase@latest functions deploy flow-ai-agent --project-ref qybzidylewzsnmlofjul --use-api` (yalnız bu; `verify_jwt` açık kalır).

## Kabul
1. Araç hiçbir şey yazmıyor/yayınlamıyor (Deno testi). 2. Ek yoksa çalışmıyor. 3. Uygunsuz platform sebebiyle atlanıyor, metin kırpılmıyor. 4. Zaman işletme saat diliminde. 5. Canlı: ekli küçük bir videoyla "tüm hesaplarda paylaş" → `clientActions` içinde `share_video`; **hiçbir gönderi oluşmuyor.**
