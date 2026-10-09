# TALİMAT 00 — Sıra ve ortak kurallar (Antigravity)

Hazırlayan: Claude, 06.10.2026. Her talimat **ayrı bir iştir**; sırayla, birini bitirip Claude'dan ONAY almadan sonrakine geçme.

## Sıra
| # | Dosya | Repo(lar) | Deploy | Claude kontrolü |
|---|---|---|---|---|
| 1 | `TALIMAT_1_isleyici_musteri_rehberi.md` | ledger | `ledger-isleyici-api` | GEREKLİ |
| 2 | `TALIMAT_2_waha_bot_not_setup_istemci.md` | flow + flowweb | yok (istemci) | gerekmez (CI yeşilse) |
| 3 | `TALIMAT_3_waha4_metrics_ingest.md` | ledger | `waha-metrics-ingest` (yeni) | GEREKLİ |
| 6 | `TALIMAT_6_fa7_2_video_yayin_hazirlik.md` | — | **GERİ ÇEKİLDİ, uygulama** | — |
| 7 | `TALIMAT_7_bekleyen_birlestirmeler.md` | flowweb + flow | yok | GEREKLİ |
| 8 | `TALIMAT_8_fa7_video_paylasim_araci.md` | ledger | `flow-ai-agent` | GEREKLİ |
| 9 | `TALIMAT_9_fa7_web_video_paylasim.md` | flowweb | yok (Vercel) | GEREKLİ |
| 10 | `TALIMAT_10_fa7_mobil_video_paylasim.md` | flow | yok | GEREKLİ (cihaz testi kullanıcıda) |
| 11 | `TALIMAT_11_fa7_video_metin_sorma.md` | ledger | `flow-ai-agent` | GEREKLİ |
| 12 | `TALIMAT_12_fa7_platform_secici_sunucu.md` | ledger | `flow-ai-agent` | GEREKLİ |
| 13 | `TALIMAT_13_fa7_platform_secici_web.md` | flowweb | yok (Vercel) | GEREKLİ |
| 14 | `TALIMAT_14_fa7_mobil_secici_ve_hesap_yenileme.md` | flow + flowweb | yok (EAS derlemesi) | GEREKLİ (cihaz testi kullanıcıda) |
| 15 | `TALIMAT_15_fa7_mobil_platform_kaynagi.md` | flow | yok (EAS derlemesi) | GEREKLİ |
| 16 | `TALIMAT_16_sesli_flow_ai_mobil_v1.md` | flow | yok (yeni EAS derlemesi) | GEREKLİ (cihaz testi kullanıcıda) |
| 18 | `TALIMAT_18_ses_tanima_hata_tanisi.md` | flow | yok (EAS derlemesi) | GEREKLİ |
| 19 | `TALIMAT_19_ses_tanima_servis_secimi.md` | flow | yok (EAS derlemesi) | GEREKLİ |
| 20 | `TALIMAT_20_ses_tanima_yanlis_import.md` | flow | yok (EAS derlemesi) | GEREKLİ |
| 21 | `TALIMAT_21_sesli_sohbet_sunucu.md` | ledger | `flow-ai-agent` | GEREKLİ |
| 22 | `TALIMAT_22_sesli_sohbet_mobil.md` | flow | yok (EAS derlemesi) | GEREKLİ |
| 23 | `TALIMAT_23_sesli_sohbet_hepsi.md` (21+22 birleşik, bunu uygula) | ledger + flow | `flow-ai-agent` (ONAY sonrası) | GEREKLİ |
| 24 | `TALIMAT_24_sesli_sohbet_tani.md` | flow | yok (EAS derlemesi) | GEREKLİ |
| 25 | `TALIMAT_25_sesli_sohbet_isfinal_ve_appstate.md` | flow | yok (EAS derlemesi) | GEREKLİ |
| 26 | `TALIMAT_26_sohbet_kaydirma.md` | flow | yok (EAS derlemesi) | GEREKLİ |
| 27 | `TALIMAT_27_appstate_dongusu.md` | flow | yok (EAS derlemesi) | GEREKLİ |
| 28 | `TALIMAT_28_ses_temizlik_ve_bitirme_sozu.md` | flow | yok (EAS derlemesi) | GEREKLİ |
| 29 | `TALIMAT_29_ai_randevu_detay_bos_yanit_ses_susturma.md` | A: ledger, B: flow | A: `flow-ai-agent` (ONAY sonrası); B: yok | GEREKLİ (A→ONAY→deploy→B) |
| 30 | `TALIMAT_30_flow_ai_veri_araclari.md` (hazır yama) | ledger | `flow-ai-agent` (ONAY sonrası) | GEREKLİ |
| 31 | `TALIMAT_31_whatsapp_randevu_hatirlatma.md` (hazır yama) | ledger | `appointment-reminders` (yeni; ONAY sonrası) | GEREKLİ |
| 32 | `TALIMAT_32_hatirlatma_dugmesi.md` (hazır yama ×2) | flow + flowweb | yok (EAS derlemesi / Vercel) | GEREKLİ |
| 33 | `TALIMAT_33_profil_kaydet_dugmesi.md` (hazır yama ×2) | flow + flowweb | yok (EAS derlemesi / Vercel) | GEREKLİ |
| 34 | `TALIMAT_34_hatirlatma_sablon_ve_dil.md` (hazır yama) | ledger | `appointment-reminders` (ONAY sonrası) | GEREKLİ |
| 35 | `TALIMAT_35_hatirlatma_metin_ekranlari.md` (hazır yama ×2) | flow + flowweb | yok (EAS derlemesi / Vercel) | GEREKLİ |
| 36 | `TALIMAT_36_web_sesli_sohbet.md` (hazır yama) | flowweb | yok (Vercel) | GEREKLİ |
| 37 | `TALIMAT_37_web_paylasim_devri.md` (hazır yama) | flowweb | yok (Vercel) | GEREKLİ |
| 38 | `TALIMAT_38_web_sesli_bekleme_dinleme.md` (hazır yama) | flowweb | yok (Vercel) | GEREKLİ |
| 39 | `TALIMAT_39_mobil_sesli_dosya_ekle.md` (hazır yama) | flow | yok (EAS derlemesi) | GEREKLİ |
| 40 | `TALIMAT_40_persona_test_duzeltme_ve_deploy.md` (hazır yama) | ledger | persona-test (tek fonksiyon) | GEREKLİ |

**Kontrol isteği biçimi:** `KONTROL <no> — <repo> <commit>` (+ deploy edilen fonksiyon adı).

## ORTAK KESİN KURALLAR (her talimat için geçerli)
1. **Veritabanına dokunma.** Migration yazma, `db query` / `db push` çalıştırma, SQL çalıştırma. Gerekirse DUR ve bildir; veritabanı değişikliğini Claude yapar.
2. **Kodu editörde yaz.** Betik, regex, `Set-Content`, `Out-File`, `>` yönlendirmesi yok. **UTF-8, BOM yok, LF.** `@ts-ignore` ve `eslint-disable` yok.
3. **Yalnız talimatta adı geçen dosyalara dokun.** Başka sorun görürsen raporla, düzeltme.
4. **Yeni npm / Deno bağımlılığı ekleme** (talimat açıkça istemedikçe).
5. **Sır değerleri** (API anahtarı, HMAC anahtarı, servis anahtarı, jeton) hiçbir yerde görünmez: kod, günlük, yanıt, rapor, commit mesajı. Raporda `git remote -v` çıktısındaki jetonu `https://***@github.com/...` diye maskele.
6. **K1 çıktısı eksiksiz:** `git remote -v ; git fetch origin ; git status -sb ; git log --oneline -1 origin/main ; git log --oneline -1 HEAD`. **`HEAD` satırını atlama.** `main`'de başla: `## main...origin/main` temiz olmalı; değilse DUR.
7. **Force push, `--amend` sonrası push, `rebase`, `reset` ile geçmiş yazma yasak.** Hata varsa yeni commit.
8. **Push sonrası GitHub Actions'ta "completed successfully" yazısını gör**; göremeden "CI yeşil" yazma. Kırmızıysa iş bitmemiştir.
9. **Deploy: yalnız Claude ONAY verdikten sonra, fonksiyon adıyla, tek tek, `--use-api`:**
   `npx supabase@latest functions deploy <ad> --project-ref qybzidylewzsnmlofjul --use-api`
   Toplu/argümansız deploy yasak. Çıktıyı AYNEN rapora yaz.
   **Deploy EDİLMEYECEKLER:** `persona-test`, `process-ai-jobs`, `zernio-webhook`, `test-query`, `zernio-admin-rename-profiles`, `ledger-process-document`, `ledger-generate-schema`, `flow-gemini-chat`, `ledger-gemini-chat` (son dördü bilinçli kapalı stub). **`ledger-isleyici-api` ve `ledger_mimar_google_api` AKTİFTİR; kapatma.**
10. **README:** her özellik/düzeltme `README.md` → "Son Güncellemeler" bölümüne tarihle (06.10.2026) eklenir.
11. **Raporda gerçek çıktılar:** komutun çıktısını kopyala-yapıştır; "OK" diye özetleme. Yapılmayanı "yapıldı" yazma. Rapor şablonu:
```
<İŞ> — RAPOR
1) K1 başlangıç çıktıları
2) Yapılanlar (madde madde; dosya:satır)
3) Kontrol çıktıları (AYNEN)
4) Push doğrulama çıktıları (AYNEN) + GitHub Actions durumu
5) Yapılamayanlar / fark ettiklerim (dokunmadan)
```

## Ortak kontroller (depoya göre; hepsi `OK` ile bitmeli)
**ledger:**
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh apps/ledger apps/admin
EXTRA_TSC_FLAGS="--allowImportingTsExtensions" bash scripts/ci/check-names.sh supabase/functions
node scripts/ci/check-root-map.mjs
```
**flow:**
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
```
**flowweb:**
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
```
