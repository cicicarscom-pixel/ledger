# TALİMAT 29 — Flow AI: randevu detayı, boş-yanıt hatası, konuşma kesilmesi, tekrar paylaşım mesajı (ledger + flow)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00`. Betik YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; yalnız aşağıda adı geçen dosyalar (+ README); rapor yalnız gerçekten yapılanı anlatır; "CI yeşil" demeden önce GitHub'da "completed successfully" gör. EAS derlemesi başlatma. Veritabanına DOKUNMA.
**İki bölüm, iki repo, iki ayrı commit.** Sıra: A (ledger) → `KONTROL 29A` → Claude ONAY → deploy → B (flow).

## Cihaz testi ve sunucu günlüğü (08.10.2026, `c9a0d8e` APK) — kök nedenler
1. **AI randevu ayrıntısını bilmiyor.** "Salih Güney'in kiminle randevusu var" → "göremiyorum". Sebep: `get_appointments_overview` randevulardan yalnız `date, customer_name, status` seçiyor; hangi takvime (doktora) ve hangi hizmete ait olduğu modele HİÇ verilmiyor. (Tabloda `calendar_id`, `service_id` var; `calendars.name`, `business_services.name` var.)
2. **"Şu an yanıt veremedim"** — sunucu günlüğü: `Gemini boş yanıt döndürdü (finishReason: STOP)` iki deneme sonra → `flow-ai-agent` 502. Kullanıcı yarım/kesik cümle söylediğinde model bazen boş dönüyor. 502 yerine nazik bir yanıt dönmeli.
3. **Konuşma kesik gidiyor** — Google tanıyıcısı kısa duraklamada cümleyi bitirip gönderiyor ("peynir İzmir videosuna karşılık Saadet Partisi'nin" yarım gitti).
4. **Paylaşımda "Zernio createPost Hatası: This exact content is already scheduled… within the last 24 hours"** — hata GERÇEK ve doğru (aynı video+metin test için tekrar tekrar paylaşıldı); ama ham İngilizce metin kullanıcıya gösteriliyor.

---
## BÖLÜM A — ledger (deploy: `flow-ai-agent`, YALNIZ Claude ONAY'ından sonra)

### A1) `supabase/functions/shared/ai/flow/tools/FlowTools.ts` — `GetAppointmentsOverviewTool`
- `appointments` sorgusunun `select`'ini `'date, customer_name, status, calendar_id, service_id'` yap (`.eq('org_id', …)` aynen kalsın).
- Randevular geldikten SONRA tek seferde adları çöz (N+1 YOK):
```ts
const calIds = [...new Set((appts ?? []).map((a: any) => a.calendar_id).filter(Boolean))];
const svcIds = [...new Set((appts ?? []).map((a: any) => a.service_id).filter(Boolean))];
const calNames = new Map<string, string>();
const svcNames = new Map<string, string>();
if (calIds.length) {
  const { data: cs } = await this.admin.from('calendars').select('id, name').eq('org_id', context.organizationId).in('id', calIds);
  for (const c of (cs ?? []) as any[]) calNames.set(String(c.id), c.name);
}
if (svcIds.length) {
  const { data: ss } = await this.admin.from('business_services').select('id, name').eq('org_id', context.organizationId).in('id', svcIds);
  for (const s of (ss ?? []) as any[]) svcNames.set(String(s.id), s.name);
}
```
  (Bu iki sorgunun hatası randevu listesini ÖLDÜRMESİN: hata olursa `console.error` + adlar boş kalsın; `ERROR` dönme.)
- Çıktı satırı: `{ time, customer, calendar: calNames.get(String(a.calendar_id)) ?? null, service: svcNames.get(String(a.service_id)) ?? null, status }`.
- `description`'a ekle: `Her randevu için müşteri, takvim (doktor/çalışan) ve hizmet adı döner; "X'in randevusu kimde/kiminle" sorularını bu araçla yanıtla.`
- `FlowTools.test.ts`'e test: sahte `admin` ile iki randevu + iki takvim + bir hizmet; çıktıda `calendar`/`service` alanları adlarla dolu; takvim sorgusu hata verirse randevular yine döner (`calendar: null`).

### A2) `supabase/functions/flow-ai-agent/index.ts` — boş yanıtta 502 yerine nazik yanıt
`orchestrator.run` `catch` bloğunda (mevcut `console.error` KALSIN): hata mesajı `'boş yanıt'` içeriyorsa 502 DÖNME; `result`'ı şöyle ata ve akış normal devam etsin:
```ts
result = { text: 'Tam anlayamadım, biraz daha açık söyler misiniz?', actions: [], usage: { rounds: 0, toolCalls: 0 } };
```
(`let result;` tipi bunu kabul etmeli; gerekirse `let result: any;`.) Diğer hatalar AYNEN 502 kalsın. `GeminiClient.ts`'e DOKUNMA (WhatsApp asistanıyla ortak).

### A3) Kontroller (ledger; hepsi OK) + rapor
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh apps/ledger apps/admin
EXTRA_TSC_FLAGS="--allowImportingTsExtensions" bash scripts/ci/check-names.sh supabase/functions
node scripts/ci/check-root-map.mjs
git show --stat --oneline HEAD
```
Birim testi çalışıyorsa (`deno test supabase/functions/shared/ai/flow/tools/FlowTools.test.ts`) çıktısı da. Push, GitHub "completed successfully". Rapor sonu: `KONTROL 29A — ledger <commit>`. **DEPLOY YOK** (onay bekle). Onaydan sonra: `npx supabase@latest functions deploy flow-ai-agent --project-ref qybzidylewzsnmlofjul --use-api` (çıktı AYNEN).

---
## BÖLÜM B — flow (A deploy edildikten sonra)

### B1) `src/modules/flow_ai/useFlowVoice.js` — cümle kesilmesini azalt
`start()` içinde `options` nesnesine ekle (Android'de Google tanıyıcısı bu ek değerleri okur; bazı sürümlerde etkisiz kalabilir — etkisi cihazda ölçülecek):
```js
androidIntentOptions: {
  EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
  EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
  EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 2000,
},
```
Başka hiçbir mantığa dokunma.

### B2) `FlowAiHost.js` + 3 dil dosyası — tekrar paylaşım mesajı
- `share-result` olayında `ok:false` ise: `/already (scheduled|posted)|exact content/i.test(payload.message || '')` doğruysa mesaj `t('flowAi.share.duplicate')`, değilse mevcut `t('flowAi.share.failed', {…})`.
- Yeni anahtar `flowAi.share.duplicate` (tr/en/de BİRDEN):
  - tr: `Bu video ve metin son 24 saat içinde bu hesapta zaten paylaşılmış ya da zamanlanmış. Metni değiştirip tekrar deneyin.`
  - en: `This exact video and text was already posted or scheduled on this account in the last 24 hours. Change the text and try again.`
  - de: `Dieses Video mit diesem Text wurde auf diesem Konto in den letzten 24 Stunden bereits veröffentlicht oder geplant. Ändere den Text und versuche es erneut.`
- README: `08.10.2026 — Flow AI: randevu ayrıntıları (doktor/hizmet) artık biliniyor; boş model yanıtında hata yerine nazik cevap; konuşmada duraklama toleransı artırıldı; tekrar paylaşımda anlaşılır Türkçe uyarı.` (README yalnız ilgili repoda: A için ledger README, B için flow README.)

### B3) Kontroller (flow; hepsi OK)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git grep -n "flowAi.share.duplicate\|\"duplicate\"" src
git show --stat --oneline HEAD
```
`--stat`: useFlowVoice.js, FlowAiHost.js, tr.json, en.json, de.json, README.md. Rapor sonu: `KONTROL 29B — flow <commit>`.

## Sonraki cihaz testi
1) "Salih Güney'in kiminle randevusu var" → doğru müşteri adı. 2) Uzun cümle söyle (3-4 duraklamalı): kesilme azaldı mı? Hâlâ kesiliyorsa Claude cümle birleştirme penceresi (client-side) ekleyecek. 3) Aynı videoyu aynı metinle ikinci kez paylaş → Türkçe uyarı.

---

# 29A-2 — EK DÜZELTME (KONTROL 29A `ab5fa6f` RET)

Claude'un diff incelemesi: **düzeltme ÇALIŞMAZ**, çünkü `select` satırı değişmemiş:
`.select('date, customer_name, status')` hâlâ eski. `calendar_id` ve `service_id` hiç çekilmiyor → `a.calendar_id` her zaman `undefined` → `calendar`/`service` her zaman `null`. Ayrıca raporda "yapıldı" denenler commit'te yok: `description` güncellenmemiş; `FlowTools.test.ts` testi eklenmemiş (rapor bunu "mevcut testler geçti" diye geçiştirmiş — istenen YENİ testti); girinti bozuk (`const calIds` 12 boşluk, `catch` 8 boşluk).

Aynı dalda YENİ commit (amend/force YASAK), yalnız `FlowTools.ts`, `FlowTools.test.ts`, `flow-ai-agent/index.ts` (yalnız girinti):
1. `FlowTools.ts`: `.select('date, customer_name, status')` → `.select('date, customer_name, status, calendar_id, service_id')`.
2. `description` → `'İşletmenin belirli günler için randevu doluluğunu ve randevularını özetler. Her randevu için müşteri, takvim (doktor/çalışan) ve hizmet adı döner; "X\'in randevusu kimde/kiminle" sorularını bu araçla yanıtla.'` (tırnak kaçışına dikkat; derleme hatası olmasın).
3. `const calIds` satırını diğer satırlarla aynı 6 boşluk girintiye getir (yalnız boşluk).
4. `flow-ai-agent/index.ts`: `} catch (error: any) {` satırını 4 boşluk girintiye getir (yalnız boşluk).
5. `FlowTools.test.ts`'e YENİ test (mevcut testleri DEĞİŞTİRME): sahte `admin` — `rpc('_slot_grid_org')` → `{ data: [], error: null }`; `from('appointments')` zinciri iki satır döndürsün (`calendar_id: 'c1'`/`'c2'`, `service_id: 's1'`); `from('calendars')` → `[{id:'c1', name:'Dr.A'}, {id:'c2', name:'Dr.B'}]`; `from('business_services')` → `[{id:'s1', name:'Muayene'}]`. Beklenen: çıktıdaki randevularda `calendar` = `'Dr.A'`/`'Dr.B'`, `service` = `'Muayene'`. İkinci test: `calendars` sorgusu `{ data: null, error: {...} }` dönerse randevular yine döner (`calendar: null`, `status: 'SUCCESS'`).
6. Kontroller: Talimat 29 §A3 listesi + `deno test supabase/functions/shared/ai/flow/tools/FlowTools.test.ts` çıktısı AYNEN (yeni testler adıyla görünmeli) + `git grep -n "calendar_id, service_id" supabase/functions/shared/ai/flow/tools/FlowTools.ts` (1 satır dönmeli) + `git show --stat --oneline HEAD`.
Rapor sonu: `KONTROL 29A-2 — ledger <commit>`. DEPLOY YOK (ONAY bekle).
