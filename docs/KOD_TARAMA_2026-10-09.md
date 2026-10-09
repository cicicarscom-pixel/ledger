# Kod taraması — flow (mobil) ve flowweb (web) — 09.10.2026

Hazırlayan: Claude. Kapsam: `flowweb` `b8037e2` ve `flow` `4ec84bd` (origin/main), canlı Supabase (`qybzidylewzsnmlofjul`) güvenlik ve RLS denetimi. Yöntem: tam `tsc` (strict), ESLint (depoların kendi yapılandırması), `npm audit --omit=dev`, desen taraması, RLS/advisor sorguları. **Hiçbir depoya ve canlı veritabanına dokunulmadı** (yalnız okuma). Cihazda/tarayıcıda çalıştırma yapılmadı; "doğrula" denen maddeler okumadan çıkarım.

## Özet
| | flowweb | flow |
|---|---|---|
| Tip denetimi (strict tsc) | 2 hata, ikisi de `docs/archive/` çöpünde (uygulama kodu temiz) | 23 satır / 6 gerçek hata türü |
| ESLint | 5 hata, 96 uyarı | 213 "hata", 211 uyarı (çoğu React Compiler kuralı) |
| `npm audit` (prod) | 6 (4 yüksek) | 42 (1 kritik, 27 yüksek) |

## A) Öncelikli (canlıya çıkmadan)
1. **flow: doğrudan bağımlılık `xlsx` (SheetJS 0.18.5)** bilinen güvenlik açıkları (prototype pollution / ReDoS) taşıyor. **Gerçek etki düşük:** `AiAssistantScreen.js` onu yalnız Excel DIŞA AKTARMAK (`XLSX.write`) için kullanıyor; açıklar güvenilmeyen dosyayı OKURKEN (`XLSX.read`) tetiklenir ve uygulamada okuma yok. Kabul edilen risk olarak kayıtlı; ileride dosya okuma eklenirse SheetJS'in resmi 0.20.x sürümüne (CDN paketi) geçilmeli. (İlk taramada "öncelikli" yazılmıştı; kod okununca düzeltildi.)
2. **flowweb: `src/actions/zernio.ts:7`** `ZERNIO_API_KEY = process.env.ZERNIO_API_KEY || process.env.NEXT_PUBLIC_ZERNIO_API_KEY`. `NEXT_PUBLIC_*` değişkenler tarayıcıya gömülür; Vercel'de bu ad tanımlıysa anahtar herkese açık olur. Yedek (`NEXT_PUBLIC_…`) kaldırılmalı, Vercel'de o değişken varsa silinip anahtar yenilenmeli.
3. **Supabase güvenlik uyarıları (advisor):** 13 `SECURITY DEFINER` fonksiyon `anon` rolüyle çağrılabiliyor (çoğu tetikleyici fonksiyon + `handle_new_user`, `complete_onboarding`, `is_admin`, `org_today`, `get_financial_report_summary`). Okunan gövdelerde `auth.uid()`/`is_admin()` denetimi var (doğrudan veri sızıntısı görmedim) ama savunma derinliği için `anon` EXECUTE geri alınmalı; 21 fonksiyonda `search_path` sabit değil (özellikle `SECURITY DEFINER` olanlar: `update_business_profile`, `complete_onboarding`, `get_financial_report_summary`, `sync_*`); **Auth "sızdırılmış parola koruması" kapalı** (Supabase panelinde açılır); `vector`, `pg_net`, `btree_gist` eklentileri `public` şemasında.
4. **Tablolarda RLS politikası eksikliği olası işlev bozukluğu:** `accounting_drafts` yalnız SELECT politikası var ama `approveDraft` UPDATE yapıyor (RLS satırı sessizce güncellemez); `analytics_cache` RLS açık, politika yok, `getAnalyticsOverview` kullanıcı oturumuyla okuyor (hep boş döner). Bu sunucu işlemleri hiçbir ekrandan çağrılmıyor (ölü kod, `src/actions/accounting.ts`, `insights.ts`); ölü sunucu işlemleri silinmeli.
5. **Tarih kuralı ihlali (AGENTS §4):** flow `OdemeTakvimiScreen.js:70` `todayStr` cihaz saat dilimine göre `toISOString().split("T")[0]`; işletme saat dilimi (`todayInTimezone`) kullanılmalı. (`useAppointments.ts:16 toDateString` kullanılmıyor, silinmeli. `OdemeTakvimiScreen.js:30–31` `Date.UTC` ile UTC tabanlı olduğundan güvenli.)

## B) Gerçek hata adayları (düzeltilmeli, riski düşük–orta)
- flow `AppointmentMapper.ts:44`: `entity.cancelReason` tipte yok (TS2339) → iptal nedeni eşleyicide yazılmıyor olabilir (iptal RPC üzerinden gidiyorsa etkisiz; doğrula).
- flow `CustomerMapper.ts:5`: `new Customer({...})` ama sınıfın kurucusu yok (TS2554) + `Customer.ts` 16 alan başlatılmamış (TS2564). Eşleyici kullanılmıyor (depo RPC'den ham satırı döner) → ölü kod; silinmeli ya da düzeltilmeli.
- flow `useCommunicationLogs.ts:53`: `platform` dizi tipinde (TS2339) → alan `undefined` okunuyor olabilir. Bu hook yalnız ölü `CommunicationLogsTable.js` tarafından kullanılıyor.
- flow `core/i18n/index.ts:66,74`: gizli `any` ve çağrılamaz olabilir nesne (TS2722, TS7006).
- flowweb: 18 `react-hooks/exhaustive-deps` uyarısı = bayat kapanış (stale closure) riski; en çok `gelen-kutusu/page.tsx` (5), `(dashboard)/page.tsx`, `sosyal-medya/*`, `analiz/page.tsx`.
- flowweb: 5 ESLint hatası: `prefer-const` ×4 (`RandevuClient.tsx:558`, `(dashboard)/page.tsx:53,192`), `@ts-nocheck` `lib/dates.test.ts:1`.
- flowweb `docs/archive/test_appts.ts`: derlenemeyen eski dosya; tam `tsc`'yi kırıyor (sil).

## C) Uluslararasılaşma (i18n) — hedefe doğrudan aykırı
- **flowweb sabit Türkçe metin (satır sayısı):** `analiz/page.tsx` ~53 ("Tümü", "Son 7 Gün", "Erişim", "Takipçi"…), `AICharacterPanel.tsx` ~34, `RandevuClient.tsx` ~31, `AppointmentNotifications.tsx` ~15 (Türkçe tümcecik fonksiyonu `appointmentSentence` hariç), `sosyal-medya/page.tsx` ~15, `ai-asistan/page.tsx` ~14, `MusterilerClient.tsx` ~9, `onboarding` ~7, `ReminderToggle.tsx` ~6, `verify-email` ~5. (Sezgisel sayım; yorumlar ve çeviri çağrıları ayıklandı, kalan tümü kullanıcıya görünen metin olmayabilir.)
- **flowweb 69 `alert()/confirm()`** doğal pencere çağrısı; 6'sında sabit Türkçe. Ortak, çevirili bir iletişim bileşeniyle değiştirilmeli.
- **flow ESLint `i18next/no-literal-string`: 127** (`AiUretimScreen.js` 70, `AnalyticsScreen.js` 40, `MusteriDetayScreen.js` 7, `IsletmemScreen.js` 4…); 3 `Alert.alert` sabit Türkçe; Canlı Test başlığı (`BotYonetimiScreen.js` "Canlı Test", "SİMÜLASYON") sabit.
- Tarih/sayı biçimleri çoğunlukla `Intl` ile yerelleştirilmiş (iyi); `appointmentSentence` yalnız Türkçe cümle kuruyor (`tr` dışı diller için ayrı yol var).

## D) Kod kalitesi / bakım
- **flow ESLint 213 hata:** çoğu `react-hooks/refs` (render sırasında ref okuma/yazma: `FlowAiHost.js` 31, `FlowAiOrb.js`), `set-state-in-effect` 17, `immutability` 10, `preserve-manual-memoization`. Bunlar React Compiler kuralları; çalışma zamanı hatası değil ama derleyici optimizasyonunu devre dışı bırakır. `FlowAiHost.js` (~800 satır) bölünmeli.
- **flow 10 mimari ihlal (`no-restricted-imports`):** `musteriler`, `randevu`, `persona_engine`, `AiUretimScreen.js:35` katman kurallarını (domain/infrastructure) atlıyor. 19 `import/no-duplicates`; 127 kullanılmayan değişken/içe aktarma.
- **flow 18 `console.log`, 10 boş `catch`, 6 TODO/FIXME**; flowweb 2 `console.log`, 3 boş `catch`, 47 `as any`, 59 `console.error` (günlükleme standardı yok).
- **flowweb erişilebilirlik:** 8 `<img>` alt metinsiz (`gelen-kutusu/page.tsx` 7, `(dashboard)/page.tsx` 1); 21 ham `<img>` (Next `Image` önerilir).
- **Ölü kod:** `LiveTestPanel.tsx` (silindi, 42'de) benzeri; flow `CommunicationLogsTable.js`, `useCommunicationLogs.ts`, `CustomerMapper.ts`, flowweb `accounting.ts`/`insights.ts` içindeki kullanılmayan sunucu işlemleri.
- Sunucu işlemleri (`businessServices.ts`, `social.ts`, `accounting.ts`) kimlik denetimini tamamen RLS'e bırakıyor (kodda `getUser()` yok). RLS bu tablolarda açık ve politikalar var (kontrol edildi) ama savunma derinliği için işlemlerde açık oturum/organizasyon kontrolü (`getCurrentOrgId`) önerilir.

## E) Bağımlılıklar (`npm audit --omit=dev`)
- **flowweb (6):** `nanoid`, `postcss`, `sharp`, `source-map-js` (4 yüksek, hepsi dolaylı, düzeltme mevcut) + 2 orta.
- **flow (42):** `shell-quote` (kritik, dolaylı: derleme araçları), `xlsx` (yüksek, **doğrudan**), `@xmldom/xmldom`, `node-forge`, `brace-expansion`, `braces`, `browserslist`, `js-yaml`, `nanoid`, `postcss`, `source-map-js` (yüksek, dolaylı; çoğu derleme zamanı araçları, çalışma zamanı etkisi sınırlı). `npm audit fix` önce yedekli bir dalda denenmeli (Expo SDK 57 uyumu için `npx expo install --fix`).

## F) Önerilen sıra (tek tek talimat)
1. flowweb: `zernio.ts` NEXT_PUBLIC yedeği kaldır (+ Vercel kontrolü, kullanıcı).
2. flow: `xlsx`'i güvenli sürüme geçir / kaldır.
3. Supabase: `anon` EXECUTE geri al + `search_path` sabitle (Claude hazırlar, kullanıcı SQL Editör'de çalıştırır); Auth sızdırılmış parola koruması (kullanıcı, panel).
4. Ölü kod temizliği (flow + flowweb) — risksiz, `git rm` ile.
5. flowweb: 4 `prefer-const`, `@ts-nocheck`, alt metinleri; 18 hook bağımlılığı tek tek incelenir.
6. i18n süpürmesi: önce `analiz/page.tsx` ve `AiUretimScreen.js`/`AnalyticsScreen.js`, sonra `alert/confirm` bileşeni.
7. CI güçlendirme: ESLint (uyarı sınırıyla) ve tam `tsc` CI'a eklenir; `npm audit --audit-level=high` bilgi amaçlı.
8. flow React Compiler/ref kuralları ve `FlowAiHost.js` bölme — daha büyük refaktör, sona.
