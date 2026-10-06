# TALİMAT — WAHA-3: Admin paneli "WhatsApp Sunucuları" sayfası (Antigravity uygular)

Hazırlayan: Claude, 06.10.2026. Bağlam: `TALIMAT_WAHA_coklu_sunucu.md` (WAHA-3 bölümü), `AGENTS.md`.
**Durum:** WAHA-1 (veritabanı) ve WAHA-2 (Edge Functions) canlıda ve doğrulandı. Canlıda 1 sunucu var (`WAHA-1 (mevcut)`, `base_url = NULL`, `fill_order = 1`, `max_sessions = 550`) ve 4 oturum atanmış. `waha-health` 5 dakikada bir ölçüm yazıyor.

Bu iş **iki yerde** değişiklik yapar: `apps/admin` (yeni sayfa) ve `supabase/functions/admin-waha` (tek yeni eylem: `test-connection`). Veritabanına **dokunulmaz.**

---

## KESİN KURALLAR
1. **Veritabanına dokunma.** Migration yazma, `db query` / `db push` çalıştırma. Gereken bütün RPC'ler canlıda var (aşağıda, imzalarıyla).
2. **RPC parametre adlarını bu belgeden AYNEN kopyala** (K8). Tahmin etme; yanlış ad = "fonksiyon bulunamadı".
3. **Kodu editörde yaz.** Betik, regex, `Set-Content`, `>` yönlendirmesi yok. UTF-8, **BOM yok**, LF.
4. **Yalnız bu belgede adı geçen dosyalara dokun.** Başka sorun görürsen raporla, düzeltme.
5. **Yeni npm bağımlılığı EKLEME.** Grafik için kütüphane yok; saf SVG/CSS kullan. `package.json` ve `package-lock.json` değişmez.
6. **`@ts-ignore`, `eslint-disable`, `any` ile hata gizleme yok.** Mevcut sayfalardaki (`whatsapp/page.tsx`) yazım tarzına uy.
7. **API anahtarı ve webhook anahtarı DEĞERLERİ hiçbir yerde görünmez:** ekranda, formda, günlükte, yanıtta, hata mesajında. Yalnız secret **adı** işlenir.
8. **Servis anahtarı (service role) admin uygulamasında KULLANILMAZ.** Bütün çağrılar giriş yapmış süper adminin oturumuyla (`createClient()` from `@/utils/supabase/server`) yapılır. Yetki kontrolünü RPC'ler ve `admin-waha` kendisi yapar.
9. **Oturum taşıma işlemi YOK.** Hiçbir yerde "oturumu başka sunucuya taşı" düğmesi, eylemi ya da kodu olmayacak.
10. **DEPLOY ETME.** Push et, CI yeşil olsun, kullanıcıya `KONTROL WAHA-3 — ledger <commit>` yazdır. Deploy yalnız Claude ONAY'ından sonra, belgenin sonundaki sırayla.
11. **Raporda gerçek çıktılar olsun** (K10 şablonu). "OK" diye özetleme; komut çıktısını kopyala-yapıştır. "CI yeşil" demeden önce GitHub'da "completed successfully" yazısını gör.
12. **K1 çıktısı eksiksiz:** `git remote -v ; git fetch origin ; git status -sb ; git log --oneline -1 origin/main ; git log --oneline -1 HEAD`. `HEAD` satırını atlama. Jetonu gösteren `remote -v` satırlarını raporda `https://***@github.com/...` diye maskele.

---

## 0. Başlangıç noktası (okuyarak öğren; değiştirme)
- `apps/admin/src/app/(dashboard)/whatsapp/page.tsx` ve `actions.ts`: mevcut oturum listesi. **Stil ve desen buradan alınır** (Tailwind sınıfları: `bg-card`, `border-border`, `text-text-muted`, `text-success`, `text-warning`, `text-danger`, `text-primary`; kart: `bg-card border border-border rounded-2xl`).
- `apps/admin/src/app/(dashboard)/layout.tsx`: `is_admin` kontrolü zaten var; yeni sayfa aynı `(dashboard)` grubunda olacağı için süper admin dışındakiler **otomatik** `/login?error=unauthorized`'a gider. Bu kontrolü kaldırma, kopyalama, değiştirme.
- `apps/admin/src/components/Sidebar.tsx`: menü listesi (`navigation`).
- `supabase/functions/admin-waha/index.ts`: `list`, `refresh-webhooks`, `disconnect` eylemleri var. `list` zaten her satıra `server_id`, `server_name` ve `orphan` ekliyor.

---

## 1. Sayfa: `apps/admin/src/app/(dashboard)/whatsapp-sunuculari/`

Yeni dosyalar (hepsi bu klasörde):

| Dosya | Tür | İş |
|---|---|---|
| `page.tsx` | Sunucu bileşeni | Veriyi RPC'lerden çeker, bölümleri çizer |
| `actions.ts` | `'use server'` | Bütün yazma işlemleri (aşağıda) |
| `ServerActions.tsx` | `'use client'` | Bir sunucu satırındaki düğmeler ve kapasite penceresi |
| `AddServerForm.tsx` | `'use client'` | "Sunucu ekle" formu + "Bağlantıyı test et" |
| `AlertActions.tsx` | `'use client'` | Uyarıda "Çözüldü" düğmesi |
| `MetricsChart.tsx` | Sunucu ya da istemci | Saf SVG çizgi grafiği |

`export const dynamic = 'force-dynamic'` (mevcut sayfa gibi).

### 1.1 Veri çekme (`page.tsx`) — RPC imzaları (AYNEN)
```ts
supabase.rpc('get_waha_capacity')                                    // parametresiz
supabase.rpc('get_waha_alerts', { p_include_resolved: false })
supabase.rpc('get_waha_metrics', { p_server: <uuid>, p_days: 7 })    // her sunucu için
```
`get_waha_capacity()` her sunucu için şu alanları döndürür: `id, name, fill_order, assigned, max_sessions, percent, warn_percent, status, is_active, accepting_new, base_url_set, is_https, last_measured_at, sessions_working, api_ok, api_latency_ms, cpu_percent, mem_used_mb, mem_total_mb, open_alerts, is_next`.
`status` değerleri: `ok`, `warn`, `full`, `inactive`, `down`.
`get_waha_alerts` alanları: `id, server_id, server_name, kind, message, created_at, resolved_at`.
`get_waha_metrics` alanları: `measured_at, sessions_assigned, sessions_working, api_ok, api_latency_ms, cpu_percent, mem_used_mb, mem_total_mb`.

**Hata durumu:** RPC hata verirse sayfanın üstünde kırmızı uyarı kutusu (mevcut `whatsapp/page.tsx` ile aynı kutu) göster; sayfa çökmesin. `FORBIDDEN` (`42501`) gelirse "Bu sayfa yalnız süper admine açıktır" yaz.

### 1.2 Üst kartlar (3 adet, yan yana; dar ekranda alt alta)
1. **Toplam atanan / toplam kapasite:** `Σ assigned / Σ max_sessions` (yalnız `is_active` sunucular) + yüzde.
2. **Sıradaki yeni kullanıcının gideceği sunucu:** `is_next = true` olan sunucunun adı ve "X boş yer". Hiçbiri yoksa **kırmızı**: "Boş yer yok — yeni sunucu ekleyin."
3. **Açık uyarı sayısı:** `Σ open_alerts`. 0 ise yeşil, ≥1 ise sarı/kırmızı.

### 1.3 Sunucu tablosu (`fill_order` sırasıyla; RPC zaten sıralı döndürür)
Sütunlar: **Ad · Sıra · Atanan/Max · Doluluk çubuğu · Çalışan oturum · Gecikme · CPU/RAM · Son ölçüm · Durum · İşlemler.**

- **Doluluk çubuğu:** genişlik = `percent` (en çok %100). Renk: `percent` < `warn_percent` → `bg-success`; `warn_percent` ≤ `percent` < 100 → `bg-warning`; dolu (`assigned >= max_sessions`) → `bg-danger`. Çubuğun yanında `assigned / max_sessions` ve `%percent`.
- **Çalışan oturum:** `sessions_working` (`null` ise "-").
- **Gecikme:** `api_latency_ms` + " ms" (`null` ise "-").
- **CPU / RAM:** `cpu_percent` ve `mem_used_mb / mem_total_mb`. Üçü de `null` ise "Ölçülmüyor" (WAHA-4'e kadar bu normal; hata değil).
- **Son ölçüm:** `last_measured_at` göreli zaman ("3 dk önce"); 15 dakikadan eskiyse sarı, `null` ise "Hiç ölçülmedi".
- **Durum rozeti** (öncelik sırasıyla):
  1. `is_active = false` → **Kapalı** (gri)
  2. `status = 'down'` → **Erişilemiyor** (kırmızı)
  3. `accepting_new = false` → **Yeni kayıt almıyor** (sarı)
  4. `status = 'full'` → **Dolu** (kırmızı)
  5. `status = 'warn'` → **Dolmak üzere** (sarı)
  6. aksi → **Aktif** (yeşil)
  Ayrıca `is_next = true` ise adın yanında küçük mavi "SIRADAKİ" etiketi.
- **`base_url_set = false`** olan sunucuda (bugün: WAHA-1) adres sütununda/ipucunda "Adres eski ortam değişkeninden (WAHA_BASE_URL)" notu göster. `is_https = false` olan **ve** `base_url_set = true` olan sunucuda kırmızı "HTTP — güvensiz" uyarısı.

### 1.4 Satır işlemleri (`ServerActions.tsx`)
Üç işlem; hepsi `actions.ts` içindeki sunucu eylemlerini çağırır; yükleniyor durumu ve sonuç iletisi gösterir (mevcut `DisconnectButton.tsx` desenine bak).

1. **"Yeni kayıt almayı durdur" / "Yeni kayıt almayı aç"** (düğme etiketi `accepting_new` değerine göre değişir). Onay penceresi gerekmez ama sonuç iletisi göster. Not: Durdurmak mevcut oturumları etkilemez; yalnız yeni atamaları bu sunucuya yöndendirmeyi keser.
2. **"Kapasiteyi değiştir":** küçük pencere + sayı girişi. Doğrulama (istemcide ve sunucuda): tam sayı, `>= 1`, `<= 100000`. **Değer `assigned`'dan küçükse** kırmızı uyarı: "Bu sunucuda şu an {assigned} oturum var. Daha düşük bir değer yeni kayıtları durdurur ama mevcut oturumları kesmez." ve ikinci bir "Yine de kaydet" onayı iste.
3. **"Webhook ayarını yenile":** **onay penceresi zorunlu**: "Bu sunucudaki {assigned} oturumun webhook ayarı güncellenecek. WhatsApp bağlantıları kopmaz, QR gerekmez. Devam edilsin mi?" Sonuç: `admin-waha`'nın döndürdüğü başarılı/başarısız sayısını göster ("12 başarılı, 0 başarısız"). Başarısız > 0 ise sarı vurgu.

Sunucu 1'in (`base_url_set = false`) **düzenle** işlemi **gösterilmez** (aşağıya bak, §1.5).

### 1.5 "Sunucu ekle" formu (`AddServerForm.tsx`)
Alanlar ve doğrulama (istemci + sunucu eylemi **ikisinde de**):

| Alan | Kural |
|---|---|
| Ad | boş olamaz, ≤ 80 karakter |
| Adres (`base_url`) | `https://` ile başlamak **zorunda**; boşluk içermez; sonunda `/` ya da `/api` varsa kullanıcıya dokunma, sunucuya olduğu gibi gönder (WAHA-2 kodu zaten normalize ediyor) |
| API anahtarı secret adı | `^[A-Z][A-Z0-9_]{2,63}$` (ör. `WAHA_API_KEY_2`) |
| Webhook secret adı | `^[A-Z][A-Z0-9_]{2,63}$` (ör. `WAHA_WEBHOOK_SECRET_2`); API anahtarı secret adıyla **aynı olamaz** |
| Sıra (`fill_order`) | tam sayı ≥ 1; öntanımlı = mevcut en büyük sıra + 1 |
| Kapasite (`max_sessions`) | tam sayı ≥ 1; öntanımlı 300 (temkinli; ölçümle ayarlanır) |
| Uyarı eşiği (`warn_percent`) | 1–100; öntanımlı 80 |

- **Anahtar DEĞERİ girişi YOK.** Formun üstünde sabit bilgi kutusu: "Sunucuyu kaydetmeden önce Supabase → Edge Functions → Secrets bölümüne iki secret ekleyin: API anahtarı ve webhook (HMAC) anahtarı. Burada yalnız secret **adları** yazılır; değerler asla bu forma girilmez."
- **"Bağlantıyı test et" düğmesi** (kaydetmeden önce): `admin-waha` `test-connection` eylemini çağırır (§2). Sonuç kartı: ✔ "Bağlandı — {sessionCount} oturum, {latencyMs} ms" ya da ✘ + nedeni (aşağıdaki hata kodlarının Türkçesi). **Test başarısızsa "Kaydet" yine mümkündür** ama kırmızı onay kutusu çıkar: "Bağlantı testi başarısız; yine de kaydetmek istiyorum."
- **Kaydet:** `admin_upsert_waha_server` (AYNEN):
```ts
supabase.rpc('admin_upsert_waha_server', {
  p_id: null,                       // yeni sunucu; düzenleme bu fazda YOK
  p_name, p_base_url,
  p_api_key_secret_name, p_webhook_secret_name,
  p_fill_order, p_max_sessions, p_warn_percent
})
```
- **Bilinen hata kodları → Türkçe ileti:**
  - `FORBIDDEN` → "Yetkiniz yok."
  - `HTTPS_REQUIRED` → "Adres https:// ile başlamalı."
  - `INVALID_SECRET_NAME` → "Secret adı BÜYÜK_HARF_VE_ALT_ÇİZGİ biçiminde olmalı."
  - PostgreSQL `23505` (benzersizlik; `fill_order`) → "Bu sıra numarası başka bir sunucuda kullanılıyor."
  - diğer → "Kaydedilemedi" + teknik kodu küçük yazıyla.
- **Düzenleme (`p_id` dolu) bu fazda YOK.** Sebep: sunucu 1'in `base_url`'ü `NULL` (eski ortam değişkeni) ve `admin_upsert_waha_server` `https` adresi **zorunlu** kıldığı için düzenleme sunucu 1'i bozar. Yalnız kapasite ve "yeni kayıt kabul" bayrakları değişir (§1.4).

### 1.6 Uyarılar listesi (`page.tsx` + `AlertActions.tsx`)
- Açık uyarılar, en yeni üstte: **tür** (Türkçe etiket), **sunucu** (`server_name`; boşsa "Genel"), **mesaj**, **zaman** (göreli + tam tarih ipucu), **"Çözüldü"** düğmesi → `admin_resolve_waha_alert` (`{ p_id }`).
- Tür etiketleri: `capacity_warn` → "Kapasite uyarısı", `capacity_full` → "Sunucu doldu", `no_capacity` → "Yer yok", `server_down` → "Sunucu erişilemiyor", `webhook_auth_failed` → "Webhook imza hatası". Renk: `capacity_warn` sarı; diğerleri kırmızı.
- Liste boşsa: "Açık uyarı yok" (yeşil).
- Altında "Çözülmüşleri göster" bağlantısı (`?resolved=1` sorgu parametresi → `p_include_resolved: true`; çözülmüşler soluk, düğmesiz).

### 1.7 Ölçüm grafiği (`MetricsChart.tsx`)
Sunucu başına, **son 7 gün**. Saf SVG, yeni kütüphane yok. İki grafik, kart içinde:
1. **Oturum sayısı:** iki çizgi: `sessions_assigned` (mavi/`primary`) ve `sessions_working` (yeşil).
2. **API gecikmesi (ms):** tek çizgi; `api_ok = false` olan noktalar kırmızı nokta.
- Veri yoksa: "Henüz ölçüm yok. `waha-health` 5 dakikada bir ölçüm yazar." Tek nokta varsa nokta çiz.
- Çok nokta olursa (7 gün × 288 ölçüm ≈ 2000): istemciye göndermeden önce **sunucuda** en çok ~200 noktaya indir (eşit aralıklı örnekleme). X ekseni: gün etiketleri; Y ekseni: en küçük/en büyük değer.
- Sunucu seçimi: birden fazla sunucu varsa kart başlığında sunucu adıyla her sunucu için ayrı grafik (en fazla ilk 6 sunucu; fazlası için "Daha fazla" gösterme, yalnız bir not).
- CPU/RAM çizgisi **yalnız** o sunucunun ölçümlerinde `cpu_percent` ya da `mem_used_mb` `null` olmayan nokta varsa çizilir (WAHA-4'e kadar yok).

### 1.8 Oturum listesi bağlantısı
Sayfanın sonunda, mevcut **"WhatsApp Bağlantıları"** sayfasına (`/whatsapp`) bağlantı. Ayrıca `/whatsapp/page.tsx` (mevcut dosya; **bu tek istisna**, yalnız şu küçük ekleme): tabloya **"Sunucu"** sütunu (`server_name`) ve `orphan` satırlarında "WAHA'da var, atanmamış" ya da "Atanmış, WAHA'da yok" rozeti. `admin-waha list` bu alanları zaten döndürüyor; **yeni istek ya da veri dönüşümü ekleme**. `Row` tipine `server_name: string | null` ve `server_id: string | null` ekle.

---

## 2. `actions.ts` — sunucu eylemleri
Hepsi `'use server'`; her biri başında `createClient()` ile oturum alır, **giriş yoksa hata döner**; sonunda `revalidatePath('/whatsapp-sunuculari')`. Dönüş biçimi: `{ ok: boolean; message: string; data?: unknown }` (mevcut `disconnectWhatsappSession` gibi).

| Eylem | Çağrı |
|---|---|
| `addServer(input)` | `rpc('admin_upsert_waha_server', {...})` (§1.5); girdiyi **sunucuda yeniden doğrula** |
| `setAcceptingNew(id, value)` | `rpc('admin_set_waha_server_flags', { p_id: id, p_is_active: null, p_accepting_new: value, p_max_sessions: null })` |
| `setMaxSessions(id, value)` | `rpc('admin_set_waha_server_flags', { p_id: id, p_is_active: null, p_accepting_new: null, p_max_sessions: value })` |
| `resolveAlert(id)` | `rpc('admin_resolve_waha_alert', { p_id: id })` |
| `refreshWebhooks(serverId)` | `functions.invoke('admin-waha', { body: { action: 'refresh-webhooks', serverId } })` → `data` içindeki başarılı/başarısız sayılarını oku (alan adlarını `admin-waha/index.ts` 123–175. satırlarından kopyala) |
| `testConnection(input)` | `functions.invoke('admin-waha', { body: { action: 'test-connection', baseUrl, apiKeySecretName } })` |

- **`is_active`'i değiştiren eylem YOK** (sunucuyu tamamen kapatmak bu fazda arayüzde yok; yanlışlıkla bütün oturumları keser). `p_is_active` her zaman `null`.
- Sayısal girdiler (`value`) için `Number.isInteger` doğrulaması; `NaN`/negatif/kesirli reddedilir.
- Hata iletilerinde ham veritabanı hatası kullanıcıya gösterilmez; yalnız §1.5'teki Türkçe karşılıklar. Teknik kod küçük yazıyla.

---

## 3. Edge Function: `supabase/functions/admin-waha/index.ts` — yeni eylem `test-connection`
**Yalnız bu eylemi ekle;** `list`, `refresh-webhooks`, `disconnect` ve yetki kontrolü **aynen** kalır.

Girdi: `{ action: 'test-connection', baseUrl: string, apiKeySecretName: string }`. Süper admin kontrolü dosyadaki mevcut `is_admin` çağrısıyla zaten yapılıyor (eylemden **önce**; atlama).

Sırayla:
1. `baseUrl` doğrulaması: **`https://` ile başlamalı** değilse `{ ok: false, error: 'HTTPS_REQUIRED' }`. `new URL()` ile ayrıştır; ayrıştırılamazsa `INVALID_URL`.
2. **Dahili adres koruması (SSRF):** ana makine adı şunlardan biriyse `{ ok: false, error: 'HOST_NOT_ALLOWED' }`: `localhost`, `*.local`, `*.internal`, IPv4 `127.*`, `10.*`, `192.168.*`, `172.16–31.*`, `169.254.*` (bulut meta veri), `0.*`; IPv6 `::1`, `fc..`/`fd..`, `fe80..`. (Ağ adı çözümleme yapma; yalnız yazılı ana makine adını denetle.)
3. `apiKeySecretName` `^[A-Z][A-Z0-9_]{2,63}$` değilse `INVALID_SECRET_NAME`.
4. `Deno.env.get(apiKeySecretName)` boşsa `{ ok: false, error: 'SECRET_MISSING', secretName: apiKeySecretName }`. **Değeri asla yanıta ya da günlüğe yazma.**
5. Adresi normalize et (sonunda `/api` yoksa ekle; mevcut `refresh-webhooks` bloğundaki `finalUrl` mantığını kullan).
6. `GET {finalUrl}/sessions?all=true`, başlıklar `X-Api-Key` + `Accept: application/json`, `AbortSignal.timeout(10000)`; süreyi `performance.now()` ile ölç.
7. Yanıt:
   - 2xx → `{ ok: true, latencyMs, sessionCount: <dizi uzunluğu> }`
   - 401/403 → `{ ok: false, error: 'WAHA_AUTH_FAILED', status }` (anahtar yanlış)
   - diğer HTTP → `{ ok: false, error: 'WAHA_HTTP_ERROR', status }`
   - zaman aşımı → `{ ok: false, error: 'TIMEOUT' }`; ağ hatası → `{ ok: false, error: 'UNREACHABLE' }`
8. HTTP durumu her zaman 200 (iş sonucu `ok` alanında). Yanıt gövdesine WAHA'dan gelen ham metni **koyma**.

İstemcideki Türkçe karşılıklar: `HTTPS_REQUIRED` "Adres https:// olmalı", `INVALID_URL` "Adres geçersiz", `HOST_NOT_ALLOWED` "Bu adrese bağlanılamaz (dahili adres)", `INVALID_SECRET_NAME` "Secret adı geçersiz", `SECRET_MISSING` "Supabase'de {secretName} secret'ı yok; önce ekleyin", `WAHA_AUTH_FAILED` "WAHA anahtarı reddedildi", `WAHA_HTTP_ERROR` "WAHA hata döndürdü ({status})", `TIMEOUT` "Zaman aşımı (10 sn)", `UNREACHABLE` "Sunucuya ulaşılamadı".

---

## 4. Menü: `apps/admin/src/components/Sidebar.tsx`
`navigation` dizisine, "WhatsApp Bağlantıları"nın **hemen altına** ekle:
```ts
{ name: 'WhatsApp Sunucuları', href: '/whatsapp-sunuculari', icon: Server },
```
`Server` simgesini mevcut `lucide-react` içe aktarmasına ekle (yeni paket yok). Başka hiçbir şeye dokunma.

---

## 5. README
`README.md` → "Son Güncellemeler" bölümüne tarihli bir madde: "[06.10.2026] Admin paneline 'WhatsApp Sunucuları' sayfası eklendi (kapasite, durum, uyarılar, ölçüm grafiği, sunucu ekleme, webhook yenileme); `admin-waha` fonksiyonuna `test-connection` eylemi eklendi."

---

## 6. Kontroller (push öncesi; çıktıları AYNEN rapora)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh apps/ledger apps/admin
EXTRA_TSC_FLAGS="--allowImportingTsExtensions" bash scripts/ci/check-names.sh supabase/functions
node scripts/ci/check-root-map.mjs
cd apps/admin && npm run build
```
- `npm run build` **hatasız** bitmeli (Vercel de bunu çalıştırır). Tip kontrolü atlanıyorsa yine de `npx tsc --noEmit -p apps/admin` çalıştır ve çıktıyı rapora koy; bu **yeni** dosyalarda hata vermemeli (eski dosyalardaki mevcut hataları listele ama düzeltme).
- Push → GitHub Actions'ta **"completed successfully"** → kullanıcıya: `KONTROL WAHA-3 — ledger <commit>`.

**Rapora eklenecekler:**
- değiştirilen/eklenen dosyaların listesi (bu belgede olmayan dosya varsa nedeni)
- `admin-waha` `test-connection` için kullandığın WAHA uç noktası (`GET /api/sessions?all=true`) ve ayrıştırdığın yanıt alanı
- `refresh-webhooks` yanıtından okuduğun alan adları (satır numarasıyla)
- ekran görüntüsü ya da yerel çalıştırma notu (varsa)

---

## 7. Kabul ölçütleri (Claude kontrol eder)
| # | Ölçüt |
|---|---|
| 1 | Süper admin olmayan kullanıcı sayfayı **göremez** (giriş sayfasına döner); RPC'leri doğrudan çağırması `FORBIDDEN` verir |
| 2 | Sayfa canlı veriyle açılır: 1 sunucu, atanan 4, `max_sessions` 550, yeşil çubuk, "SIRADAKİ" etiketi |
| 3 | `base_url_set = false` olan sunucu 1 için "düzenle" gösterilmez; kapasite ve "yeni kayıt kabul" düğmeleri çalışır ve **geri alınabilir** |
| 4 | Kapasiteyi `assigned`'dan küçük girince ikinci onay istenir; kayıt yine de mümkün |
| 5 | "Bağlantıyı test et": yanlış secret adı → `SECRET_MISSING`; `http://` adres → `HTTPS_REQUIRED`; `https://127.0.0.1` → `HOST_NOT_ALLOWED`; gerçek sunucu 1 ayarlarıyla (`WAHA_API_KEY`) → başarılı |
| 6 | Hiçbir yanıtta, sayfa kaynağında ya da günlükte anahtar değeri **yok** |
| 7 | Uyarı "Çözüldü" ile kapanır; çözülmüşler `?resolved=1` ile görünür |
| 8 | Grafik: `waha-health` ölçümleri görünür; veri yokken boş durum mesajı |
| 9 | `list` çıktısındaki `orphan` satırları ve "Sunucu" sütunu `/whatsapp` sayfasında görünür |
| 10 | Oturum taşıma ile ilgili kod/düğme **yok** |
| 11 | `is_active`'i değiştiren arayüz eylemi **yok** |

---

## 8. Deploy (YALNIZ Claude ONAY'ından sonra)
1. **Fonksiyon:** yalnız `admin-waha`, adıyla, `--use-api`:
   `npx supabase@latest functions deploy admin-waha --project-ref qybzidylewzsnmlofjul --use-api`
   Çıktıyı AYNEN rapora yaz. Başka fonksiyon deploy **edilmez**.
2. **Admin uygulaması:** `main`'e push zaten Vercel derlemesini tetikler; derlemenin başarılı olduğunu (Vercel ya da GitHub kontrolü) rapora yaz.
3. **Claude kontrolü:** süper admin oturumuyla sayfayı, `test-connection` eylemini ve yetki reddini canlıda sınar.

**Deploy EDİLMEYECEKLER:** `persona-test`, `process-ai-jobs`, `zernio-webhook`, `test-query`, `zernio-admin-rename-profiles`.

---

## 9. Bu fazda YAPILMAYACAKLAR (kapsam dışı; raporda "yapılmadı" diye yaz)
- Sunucu **düzenleme** (`p_id` dolu `admin_upsert_waha_server`): sunucu 1 `base_url = NULL` olduğu için ayrı bir karar gerekir.
- Sunucuyu **tamamen kapatma/açma** (`is_active`).
- Oturum taşıma, oturum silme (mevcut "bağlantıyı kes" işlemi `/whatsapp` sayfasında zaten var).
- CPU/RAM ölçümü: **WAHA-4** (`waha-metrics-ingest`); bu fazda sütunlar "Ölçülmüyor" gösterir.
