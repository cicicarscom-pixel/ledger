# AGENTS.md — Workigom — platform backend + Ledger (ledger)

> **Bu dosya bu depodaki TEK geçerli ajan kural kaynağıdır** (geçerlilik: 01.10.2026).
> Başka bir dosya (`.agents/*`, `docs/*`, eski notlar, sohbet geçmişi) bununla çelişirse **bu dosya geçerlidir.**
> Okuma sırası: 1) bu dosya → 2) `STRUCTURE.md` (klasör haritası) → 3) `docs/` → 4) `docs/archive/` (yalnız tarihsel bilgi; kural kaynağı DEĞİL).
> 30.09.2026 öncesi notlar: `docs/archive/AGENTS-eski-2026-09-30.md`.

## 1. Rol dağılımı

| Kim | Ne yapar |
|---|---|
| **Claude** | Veritabanı (migration, SQL, RPC, tetikleyici), Edge Function kodu, CI ve **hazır yamalar** (`.patch`); her işin doğrulaması ve onayı. |
| **Ajan** (Antigravity vb.) | Claude'un yamalarını `git am` ile uygular, talimattaki ekran işlerini yapar, kurallara uygun rapor verir. |
| **Kullanıcı** | Kararlar, onaylar, cihaz testleri, güvenlik işlemleri (anahtar/parola yenileme). |

Bir iş ya da faz, **Claude "ONAY" demeden kapanmaz.** Ajan onay beklemeden sonraki işe geçmez.

## 2. Zorunlu çalışma kuralları

**K1 — Başlangıç.** Çalışma klasörleri: `C:\flow`, `C:\flowweb`, `C:\ledger` (başka kopyada çalışılmaz). Her işin başında, çıktılar rapora AYNEN:
```
git remote -v ; git fetch origin ; git status -sb ; git log --oneline -1 origin/main ; git log --oneline -1 HEAD
```
`## main...origin/main` (ahead/behind yok), değişmiş/takipsiz dosya yok, `HEAD` = `origin/main` = talimattaki başlangıç commit'i. Biri tutmazsa **DUR ve bildir.**

**K2 — Değişiklik yöntemi.**
- Kod/metin değişikliği yalnız: (a) Claude'un hazır yaması (`git am --3way`, içerik değiştirilmez) ya da (b) talimatta açıkça "editörde düzenle" denen küçük işler.
- **YASAK:** Node.js/PowerShell/Python betiğiyle dosya yazmak, `Set-Content`, `Out-File`, `>` yönlendirmesi, regex ile toplu değiştirme. (Bu yöntemler dosyaları bozdu, BOM ve UTF-16 ekledi.)
- **YASAK:** Claude'un yaması yerine kendi kodunu/SQL'ini/migration'ını/CI betiğini yazmak. Yama yoksa ya da uygulanmıyorsa **DUR ve bildir.**
- Talimatta olmayan dosyaya dokunulmaz. Fark ettiğin sorunu **raporla**, düzeltme.
- Dosya taşıma/silme yalnız `git mv` / `git rm` ile, talimattaki tam listeyle (glob yok).

**K3 — Kontroller.** Talimattaki komutlar AYNEN; bayrak eklenmez/çıkarılmaz (ör. `--ignoreConfig` diye bir `tsc` seçeneği YOK; kontrolü hiç çalıştırmaz). `@ts-ignore`, `eslint-disable`, kod gizleme (`['default' + 'Value']` gibi) YASAK. Kontrol yanlış görünüyorsa kodu ona uydurma; raporda nedenini yaz.

**K4 — Push doğrulaması.** "Push ettim" yalnız şu çıktıyla geçerlidir (rapora kısaltmadan):
```
git push ; git fetch origin ; git status -sb ; git log --oneline -3 origin/main ; git show --stat --oneline HEAD
```
**Force push, `--amend` sonrası push, `rebase`, `reset` ile geçmişi yeniden yazmak YASAK.** Hata varsa üstüne yeni commit. Rapordaki commit kimliği GitHub'dakiyle aynı olmalı.

**K5 — CI.** Her push'ta `.github/workflows/ci.yml` çalışır. **CI kırmızıysa iş bitmemiştir.** Push'tan sonra GitHub → Actions'ta son koşunun yeşil olduğu rapora eklenir. CI'ı geçmek için kontrolü değiştirmek/devre dışı bırakmak YASAK.

**K6 — Deploy** (yalnız talimat isterse). Fonksiyon **adıyla, tek tek**, `--use-api`: `npx supabase@latest functions deploy <ad> --project-ref qybzidylewzsnmlofjul --use-api`. Argümansız toplu deploy YASAK. Çıktı AYNEN rapora.

**K7 — Hata.** Beklenmedik sonuçta **DUR**, kendi başına düzeltmeye çalışma, çıktıyı olduğu gibi raporla.

**K8 — RPC parametre adları** veritabanındaki imzadan **kopyalanır**, tahmin edilmez (bkz. §4). Yanlış ad = "fonksiyon bulunamadı".

**K9 — Kodlama.** Bütün metin dosyaları **UTF-8, BOM'suz.** Editörde "UTF-8 with BOM" ya da "UTF-16" seçilmez. CI BOM'u yakalar.

**K10 — Rapor şablonu.**
```
<İŞ> — RAPOR
1) K1 başlangıç çıktıları
2) Yapılanlar (madde madde; komut ya da dosya:satır)
3) Kontrol çıktıları (AYNEN)
4) K4 push doğrulama çıktıları (AYNEN) + CI durumu
5) Yapılamayanlar / fark ettiklerim (dokunmadan)
```
Rapor yalnız **gerçekten yapılanı** anlatır. Yapılmamış bir şey "yapıldı" yazılmaz.

## 3. Kimlik sözleşmesi (tenant)

Veritabanında **tek tenant kimliği** vardır: `organizations.id` (10.10.2026 canlı veride doğrulandı: veri içeren bütün tablolar bu kimliği taşır; eski "sahibin `auth.users.id`'si" modeli Faz F ile bitti ve eski sütunlar kaldırıldı). **Sütun adı tabloya göre değişir; anlamı aynıdır:**

| Sütun adı | Tablolar (örnek) |
|---|---|
| `org_id` | `appointments`, `customers`, `calendars`, `calendar_blocks`, `business_services`, `appointment_services`, `bot_settings`, `flow_ai_*`, `waha_sessions`, `ai_communication_logs`… |
| `organization_id` | `finance_documents`, `organization_*` tabloları, `extraction_schemas`, `organization_members`, `integration.social_accounts` |
| `profile_id` | `transactions`, `posts`, `comments`, `messages`, `notifications`, `reviews`, `conversations`, `accounting_*`, `company_documents` (**= `organizations.id`**, kullanıcı kimliği DEĞİL) |

Kullanıcı kimliği (`auth.users.id`) ayrı bir kavramdır: `organizations.owner_id`, `organization_members.user_id`, `*.user_id`.

Kurallar:
1. **Yeni tablolar `org_id uuid` (organizations.id) kullanır.**
2. Kimlik **istemciden gönderilmez**; veritabanında çözülür: `current_org_id()` → `organizations.id`, `current_org_owner_id()` → sahibin `auth.users.id`'si. RPC'ler bunları kullanır. `*_for_owner` ve `_slot_grid(p_owner…)` gibi işlevler yalnız servis tarafı (WhatsApp AI) sarmalayıcılarıdır; motor `*_org(org_id…)` işlevidir.
3. `profile_id` adı `organizations.id` demektir. `session.user.id` ile `organizations.id` karıştırılmaz.

## 4. Platform haritası — tek doğru kaynaklar

Bu konularda ekran **kendi hesabını yapmaz** (müsaitlik, toplam, eşleştirme, durum); yalnız bu fonksiyonları çağırır.

| Konu | Veritabanı fonksiyonu (imza) | Kullanan ekranlar |
|---|---|---|
| Ödeme takvimi | `get_payment_calendar(p_from, p_to)`, `create_finance_entry(p_type, p_title, p_amount, p_date, p_due_date, p_payment_status, p_category)`, `set_transaction_payment_status(p_id, p_status)` | Ödeme Takvimi (web + mobil), Veri Girişi |
| Finans özetleri | `get_finance_summary(p_from, p_to)` — tutarlar **kuruş** | Anasayfa, AI Muhasebe, İşletmem |
| Müşteriler | `get_customers()`, `get_customer_appointments(p_customer_id)`, `update_customer_notes(p_customer_id, p_notes)`, `create_customer(p_name, p_phone)` | Müşteriler (web + mobil) |
| Müsaitlik | `get_day_schedule(p_date, p_calendar_id, p_service_id)` (ızgara), `get_available_slots(p_date, p_calendar_id, p_service_id)` (randevu penceresi), `get_available_slots_for_owner(p_owner, p_date, p_service_ids, p_calendar_id)` (yalnız WhatsApp AI, service_role) | Randevu (web + mobil), WhatsApp asistanı |
| Rezervasyon | `create_calendar_block(p_calendar_id, p_local_start, p_local_end, p_reason, p_note)`, `delete_calendar_block(p_block_id)` | Randevu ızgarası |
| Randevu yazma | `create_manual_appointment(…)`, `cancel_appointment(…)`, `delete_appointment(…)` | Randevu (web + mobil) |

Ortak biçimler:
- **Telefon:** `customers.phone` = `90XXXXXXXXXX@c.us` (WhatsApp biçimi). Ekranda yalnız `phone_display` (`+90 5XX XXX XX XX`).
- **Para:** veritabanında kuruş (`amount_minor`). Ekranda `formatMoney` / `formatAmount` (`src/lib/money.ts`): kuruş varsa 2 hane, yoksa hiç; **asla yuvarlanmaz.**
- **Tarih:** işletme saat dilimi. `todayInTimezone`, `monthRangeYmd`, `addDaysYmd`, `dateFromYmd` (`src/lib/dates.ts`). **`toISOString().split('T')[0]` ile gün üretmek YASAK** (İstanbul'da bir gün kayar).
- **Durum metinleri** (`Pending`, `Approved`…) ekrana ham basılmaz; çeviriden geçer.

## 5. Bu depo: ledger (platform backend + mali müşavir paneli)

- **Kapsam:** `supabase/migrations` (veritabanı şeması), `supabase/functions` (WhatsApp/Instagram asistanı, AI Core, Ledger işleyici), `apps/ledger` (mali müşavir paneli), `apps/admin`.
- **Migration ve SQL yalnız Claude tarafından hazırlanır ve canlıya Claude uygular.** Depodaki migration dosyası kayıt amaçlıdır; ajan "veritabanına uygula" yapmaz, kendi SQL'ini yazmaz.
- **Deploy tek tek** (K6). `supabase/functions/shared` değişince onu kullanan **tüm** fonksiyonlar raporda listelenir; yalnız talimattaki deploy edilir. **Deploy EDİLMEYECEKLER:** `persona-test`, `process-ai-jobs`, `zernio-webhook` (canlı paketleri eski; Instagram hizalaması bekliyor).
- **`flow-reset-ai-data`:** yalnız işletme kimliği filtresiyle çalışır; bağlantı verilerine (`bot_settings`, `social_accounts`) dokunmaz.
- **Ledger paneli satış faturası işareti:** `finance_documents.type = 'sales'` (değiştirme). Takvime aktarırken tetikleyici `'income'`a çevirir.
- **Kullanılmayan kod:** `apps/ledger` içindeki belge yükleme/işleme akışı ve `ledger-process-document` fonksiyonu. Ledger'da muhasebecinin belge yükleme akışı **YOK**.
- **`ledger-isleyici-api`** fatura kolonlarını (A→R) sabit tanımlıyor; Mimar'ın kaydettiği şemayı dinamik okumuyor (açık iş).
- **CI'ın yerel karşılığı** (hepsi `OK` ile bitmeli):
```
bash scripts/ci/check-bom.sh
$env:EXTRA_TSC_FLAGS="--allowImportingTsExtensions"; bash scripts/ci/check-names.sh supabase/functions
bash scripts/ci/check-names.sh apps/ledger apps/admin
deno test --no-check --allow-all supabase/functions/shared/ai/guards/ResponseGuards.test.ts
node scripts/ci/check-root-map.mjs
```

## 6. Açık işler (özet)

- **Güvenlik (kullanıcı):** depoları özel (private) yap; WAHA API anahtarı ve panel parolası yenilenmeli (Git geçmişinde açıkta kaldılar); 31.97.37.208 root parolası.
- **Faz D: TAMAM** (müsaitlik regresyon testi `supabase/tests/scheduling_core.sql`, 15 kontrol, canlıda yeşil; doğrulanmamış "dolu" iddiası için tarafsız yedek yanıt `AppointmentTurnGuard`'da). **Faz F: TAMAM** (tenant kimliği `organizations.id`; yalnız sütun adları karışık, yeniden adlandırma gerekmez). **Faz E: TAMAM** (yaşam döngüsü E1 + kod sertleştirme E2, `docs/FAZ_E_PLAN.md`).
- Instagram asistanı hizalaması (`zernio-webhook`, `persona-test`, `process-ai-jobs` canlı paketleri eski — **deploy etme**), erteleme akışı, WhatsApp hatırlatmaları.
