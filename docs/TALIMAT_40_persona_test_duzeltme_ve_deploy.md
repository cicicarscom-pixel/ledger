# TALİMAT 40 — `persona-test` açılmıyor: yinelenen import düzeltmesi + TEK fonksiyon deploy (ledger)

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00` (ledger komutları). Betik/regex/toplu değiştirme YASAK (README satırı yamanın İÇİNDE hazır; ayrıca betikle README'ye satır EKLEME); `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` olarak MASKELE.

## Belirti (kullanıcı, 09.10.2026)
AI Asistan sayfasındaki "Canlı Test" simülasyonunda "merhaba" yazınca: `Hata: Failed to send a request to the Edge Function`.

## Kök neden (Supabase günlüklerinde doğrulandı)
`function_logs`: `worker boot error: Uncaught SyntaxError: Identifier 'serve' has already been declared at …/persona-test/index.ts:39:10`. Kaynakta (`supabase/functions/persona-test/index.ts` satır 39–40) `serve` iki kez içe aktarılmış (std@0.168.0 ve std@0.177.0; araya `76679fb` commit'iyle girmiş). İşçi açılışta çöküyor, istek hiç işlenmiyor.
Neden CI yakalamadı: `check-names.sh` TS2300 (yinelenen tanım) hatasını aramıyordu. Yama bunu da ekler (flow/flowweb'de TS2300 sayısı 0, ledger'da yalnız bu dosya; yanlış alarm yok).

## Yama içeriği (3 dosya)
- `supabase/functions/persona-test/index.ts`: yinelenen `std@0.168.0` import satırı silinir (diğer fonksiyonlar 0.177.0 kullanıyor).
- `scripts/ci/check-names.sh`: hata deseni `TS(2300|2304|…)`.
- `README.md`: 1 satır.

## Adımlar
1. K1 başlangıç (ledger `main`, temiz; başlangıç `2ee7619`). `git am --3way <ledger yolu>/docs/patches/40-persona-test-serve-duzeltme.patch`.
2. Kontroller (AYNEN; hepsi OK):
```
bash scripts/ci/check-bom.sh
EXTRA_TSC_FLAGS="--allowImportingTsExtensions" bash scripts/ci/check-names.sh supabase/functions
git grep -n "import { serve }" -- supabase/functions/persona-test/index.ts
git show --stat --oneline HEAD
git status -sb
```
`git grep` tek satır (std@0.177.0) göstermeli. `--stat` 3 dosya.
3. K4 push doğrulaması; GitHub'da CI "completed successfully" gör.
4. **Deploy (K6, YALNIZ bu fonksiyon, tek komut):**
```
npx supabase@latest functions deploy persona-test --project-ref qybzidylewzsnmlofjul --use-api
```
Çıktı AYNEN rapora. Başka fonksiyon deploy ETME (özellikle `process-ai-jobs`, `zernio-webhook`: canlı paketleri eski, dokunulmaz). Fonksiyonu elle ÇAĞIRMA (test kullanıcıda).
5. Rapor sonu: `KONTROL 40 — ledger <commit>`.

## Kullanıcı testi
AI Asistan → sağdaki "Asistan ile konuşun" kutusuna "merhaba" yaz → persona yanıtı gelmeli (hata çıkmamalı). Sonra "yarın saat 15 için randevu istiyorum" gibi bir şey dene (simülasyon: gerçek randevu AÇMAZ).
