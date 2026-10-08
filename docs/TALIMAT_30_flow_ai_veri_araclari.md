# TALİMAT 30 — Flow AI'a müşteri, finans özeti ve ödeme takvimi araçları (ledger)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. Bu iş **HAZIR YAMA**dır (K2): içeriği DEĞİŞTİRME.

## Ne yapılıyor
Asistan şu an yalnız randevu doluluğu ve sosyal medya verisini görüyor. Bu işle 4 salt-okunur araç eklenir: `get_customers`, `get_customer_history`, `get_finance_summary`, `get_payment_calendar`.

- **Veritabanı tarafı Claude tarafından YAPILDI ve CANLIDA** (migration `supabase/migrations/20261008000001_flow_ai_org_read_functions.sql`): ekranların kullandığı fonksiyonların işletme-parametreli kardeşleri `_get_customers_org`, `_get_customer_appointments_org`, `_get_finance_summary_org`, `_get_payment_calendar_org`; yalnız `service_role` çağırabilir; çıktıları ekran fonksiyonlarıyla birebir eşit olduğu doğrulandı. **Sen veritabanına DOKUNMA** (kural 1).
- Edge Function kodu hazır yama: `docs/patches/30-flow-ai-veri-araclari.patch` (yeni `DataTools.ts` + `DataTools.test.ts`; `FlowTools.ts`'e kayıt; eski testin araç listesi güncellendi; sistem istemine kural 15).
- Tutarlar araçta HAZIR biçimlenir (`1.739,99 ₺`); model hesap yapmaz. Telefon yalnız `phone_display`. İşletme yalnız bağlamdan gelir.

## Adımlar
1. K1 başlangıç: `main`'de, temiz. `git fetch origin` + `git merge origin/claude/new-session-hrbrhq` (migration dosyası ve yama buradan gelir; migration'ı ÇALIŞTIRMA).
2. Yamayı uygula: `git am --3way docs/patches/30-flow-ai-veri-araclari.patch` (içeriği değiştirme). Uygulanmazsa DUR ve çıktıyı bildir.
3. README (editörde, ayrı commit): "Son Güncellemeler"e `08.10.2026 — Flow AI: müşteriler, finans özeti ve ödeme takvimi artık sorulabilir (salt okunur araçlar).`
4. Kontroller (AYNEN; hepsi OK):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh apps/ledger apps/admin
EXTRA_TSC_FLAGS="--allowImportingTsExtensions" bash scripts/ci/check-names.sh supabase/functions
node scripts/ci/check-root-map.mjs
deno test --no-check --allow-all supabase/functions/shared/ai/flow/tools/DataTools.test.ts
deno test --no-check --allow-all supabase/functions/shared/ai/flow/tools/FlowTools.test.ts
deno test --no-check --allow-all supabase/functions/shared/ai/flow/FlowPromptBuilder.voice.test.ts
git show --stat --oneline HEAD~1
git show --stat --oneline HEAD
git status -sb
```
Beklenen: DataTools 11 test, FlowTools 12 test, voice testi — hepsi geçer. `git show --stat HEAD~1` (yama commit'i): `DataTools.ts`, `DataTools.test.ts`, `FlowTools.ts`, `FlowTools.test.ts`, `FlowPromptBuilder.ts` (5 dosya). `check-names` kırmızıysa kodu DEĞİŞTİRME; çıktıyı AYNEN bildir (Claude düzeltir).
5. Push (K4 çıktıları AYNEN) ve GitHub "completed successfully". Rapor sonu: `KONTROL 30 — ledger <commit>`. **DEPLOY YOK** — Claude ONAY'ından sonra: `npx supabase@latest functions deploy flow-ai-agent --project-ref qybzidylewzsnmlofjul --use-api` (çıktı AYNEN).

## Deploy sonrası cihaz testi (kullanıcı; APK gerekmez, sunucu tarafı)
"Kaç müşterim var", "Ahmet Yavuz kim, ne zaman gelmişti", "Bu ay ne kadar gelir/gider var", "Bu hafta ödenecek neyim var", "Geciken ödeme var mı".
