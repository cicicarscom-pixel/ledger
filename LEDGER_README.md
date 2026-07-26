# Ledger & Flow Entegrasyon Dokümantasyonu (V1 Kurgusu)

Bu doküman, **Ledger** (Mali Müşavir Paneli) ve **Flow** (Mükellef Uygulaması / Mobil & Web) arasındaki mimariyi, veritabanı yapılandırmalarını ve backend süreçlerini detaylandırmak amacıyla oluşturulmuştur.

Özellikle gelecekte geliştirilecek mobil uygulamaların (React Native / Expo) aynı backend (Supabase & Next.js API) altyapısını sorunsuz kullanabilmesi için tüm entegrasyon süreçleri burada kayıt altına alınmaktadır.

---

## 1. Mimari Felsefe (Veri Ayrıştırıcı & Dışa Aktarıcı)

Önceki karmaşık ERP ve muhasebe fişi mantıkları tamamen terk edilmiştir. Sistem "Veri Ayrıştırıcı ve Dışa Aktarıcı (Data Extractor & Exporter)" olarak çalışır.
* **Flow (Esnaf):** Evrakı yükler, sadece gelir-gider ve tahmini net bakiye metriklerini basitçe görür.
* **Ledger AI (Müşavir):** Belirlenen özel JSON şemasına (kurallara) göre gelen belgeleri Edge Function (Gemini) aracılığıyla okur ve ayrıştırır. Müşavir onaylar ve Excel/XML/PDF olarak dışa aktarır.

**Kullanılan Teknolojiler:**
* **Frontend (Web - Ledger & Marketing):** Next.js (App Router), React, TailwindCSS
* **Frontend (Mobil - Flow):** İleride C:\Users\roman\Flow_ai dizininde bağımsız bir proje olarak geliştirilecektir. (Monorepo'dan ayrıldı)
* **Backend & Veritabanı:** Supabase (PostgreSQL, Auth, Storage)
* **Backend Motoru (AI):** Supabase Edge Functions + Gemini 1.5 Flash Vision API (`response_mime_type: "application/json"`)
* **AI Asistanı:** Çoklu format (JPG, PNG, PDF, ## 2. Veritabanı Yapısı (Supabase - V2 Ledger AI Kurgusu)

Sistemdeki en önemli tablolar ve AI ilişkileri V2 mimarisiyle baştan yazılmıştır:

### `auth.users` (Supabase Varsayılan Tablosu)
* Tüm kullanıcıların (Müşavir ve Mükellef) giriş bilgileri burada tutulur.

### `invoice_schemas` (Global Müşavir Şema Tablosu - Mimar AI Çıktısı)
Müşavirin "AI Ayarları" (ai-settings) ekranında oluşturduğu ve Mimar AI'ın karar verdiği global okuma şemasını barındırır.
* `id`, `created_at`
* `schema_rules` (JSONB) - Mimar AI'ın çıkarttığı dinamik eşleştirme kuralları.
* `analyzer_instructions` (TEXT) - İşleyici AI'a gönderilen özel prompt.
* **NOT:** Eskiden belirli bir mükellefe (`taxpayer_id`) bağlıydı, ancak artık sistemde global bir şablon olarak çalışması için `taxpayer_id` bağımlılığı (constraint) kaldırılmıştır.

### `invoices` (Dinamik Fatura Tablosu - İşleyici AI Çıktısı)
İşleyici (Analyzer) AI tarafından okunan faturaların yapılandırılmış halde saklandığı tablodur.
* `id`, `created_at`, `status`
* `taxpayer_id` (UUID, FK) - Faturanın ait olduğu mükellef.
* `preview_data` (JSONB) - Mükellef adı, fatura yönü (ALIŞ/SATIŞ), kesen firma gibi temel görselleştirme verileri.
* `mapped_data` (JSONB) - Mimar AI'ın oluşturduğu `invoice_schemas` tablosundaki kolon başlıklarına birebir karşılık gelen dinamik veri kümesi (Örn: `{"%1'lik KDV": "100.00", "Fatura Tarihi": "12.04.2026"}`).
* `raw_ai_response` (JSONB) - AI'ın döndürdüğü ham veri.

### `accounting_documents` & `accounting_drafts` (Legacy / Eski V1 Tabloları)
* V1 mimarisinde kullanılan statik veri tutan tablolardır.

---

## 3. Akış Senaryoları (V2 AI Kurgusu)

### 3.1. Şema Kurulumu (Mimar AI - `ledger_mimar_google_api`)
1. Müşavir `/ai-settings` sayfasına girer.
2. Sisteme bir Örnek Fatura ve bir Muhasebe Programı (UI) Ekran Görüntüsü yükler.
3. İki görsel **Mimar AI** (Edge Function) fonksiyonuna yollanır.
4. **Mimar Kuralı:** Mimar AI fatura okumaz! Sadece UI görselindeki **TÜM** veri giriş alanlarını tespit eder ve faturada o alan boş olsa bile (Örn: o faturada %1 KDV yoksa bile) gelecekteki faturalar için "Bu gelirse buraya yazılacak" şeklinde bir harita (`schema_rules`) oluşturur.
5. Oluşturulan bu harita `invoice_schemas` tablosuna global olarak kaydedilir.

### 3.2. Fatura Okuma ve İşleme (İşleyici AI - `ledger-isleyici-api`)
1. Yeni bir fatura sisteme yüklendiğinde İşleyici AI devreye girer.
2. İşleyici AI, okumadan önce `invoices` tablosuna (veya işlem anındaki payload'a) kaydedilmiş olan `taxpayer_id`'yi alır, veritabanından mükellefin unvanını çeker.
3. **Yön Bulma Kuralı:** İşleyici AI'a "Şu an [Mükellef Unvanı] için işlem yapıyorsun. Eğer faturayı kesen bu firmaysa SATIŞ, fatura bu firmaya kesilmişse ALIŞ faturasıdır" kuralı (prompt) verilir.
4. İşleyici AI, global `invoice_schemas` tablosundan kolon kurallarını alır, faturayı okur ve veriyi `preview_data` ile `mapped_data` olarak `invoices` tablosuna kaydeder.

### 3.3. Onay Merkezi Dinamik Render (ApprovalPage.tsx)
1. Müşavir Onay Merkezine (`/approval`) girdiğinde, frontend statik bir form çizmez.
2. Sayfa yüklendiğinde `invoice_schemas` tablosuna gidip en güncel kural setini çeker.
3. Form alanları tamamen bu dinamik şemaya göre ekrana dizilir. Ekrana basılacak değerler `activeDocument.mapped_data` içinden çekilir.
4. Böylece AI Ayarlarında şema ne kadar değişirse değişsin, Onay Merkezi saniyesinde o şekle bürünür.

---

## 4. Kullanılan Yapay Zeka Altyapısı
* Tüm sistem yeni nesil **Gemini Interactions API** (`@google/genai`) üzerine kuruludur. Eski `generateContent` metodu terk edilmiştir.
* Model olarak yüksek hız ve mantıksal kavrama kapasitesi için `gemini-3.5-flash` kullanılmaktadır.
* Gelen JSON yapısının tutarlılığı için katı schema tanımlamaları (Structured Output) kullanılmıştır.

---

## 5. Proje Klasör Yapısı (Monorepo)

* **`apps/ledger`**: Mali müşavir uygulaması (Şu anki ana odak).
* **`apps/marketing`**: Ana tanıtım sitesi (www.workigom.com).
* **Flow (Mükellef Uygulaması)**: Monorepo'dan ayrılmış ve `C:\Users\roman\Flow_ai` yoluna taşınmıştır.
* **`supabase`**: Veritabanı fonksiyonları (Edge Functions), migrations ve kurguları.

Edge fonksiyonlarını (Mimar ve İşleyici) lokalde test etmek veya sunucuya göndermek için terminal (komut istemi) üzerinden şu komutlar kullanılır:
```bash
npx supabase functions deploy ledger_mimar_google_api
npx supabase functions deploy ledger-isleyici-api
```

Edge fonksiyonunu lokalde test etmek için `c:\ai_muhasebeci` dizininde:
```bash
supabase functions serve process-document --env-file ./supabase/.env.local
```bash
supabase functions deploy process-document
```

---

## 6. Operasyonel Ekstra Geliştirmeler (V2.1 - İş Akışı & Onay)

Son geliştirmelerle sistem daha sağlam bir RLS, UI ve AI entegrasyonuna kavuşmuştur:

### 6.1. Veritabanı ve RLS (Row Level Security) Optimizasyonları
- `finance_documents` tablosu üzerinde Müşavir (Accountant) erişim kontrolleri `accountant_taxpayer_links` ve `accounting_firm_members` üzerinden yapılandırılmıştır.
- **Güvenlikten Ödün Vermemek İçin:** RLS bypass (service_role vb.) kullanılmamış, ancak veriye erişim optimize edilerek sadece Müşavirin yetkili olduğu Mükelleflerin evraklarını görmesi sağlanmıştır.

### 6.2. AI Verilerinin Forma Bağlanması (Onay Ekranı)
- Edge Function tarafından çıkarılan `tax_details` (Fatura Numarası, Tarih vb. dinamik AI verisi), Onay Formu (`ApprovalPage.tsx`) üzerindeki `dynamicSchema` inputlarına otomatik `defaultValue` olarak bağlanmıştır.
- Faturanın `amount` değeri (ister `amount_minor / 100` ister `tax_details.amount`) doğrudan **Genel Toplam** olarak okunmaktadır.

### 6.3. Sahiplik Damgası ve Toplu Dışa Aktarma
- İş Akışı kartlarının (WorkflowPage) üzerine, Mükellefin adını (Örn: "Güleç Otomasyon") gösteren belirgin bir "Sahiplik Damgası" eklendi. Renk kodlamasıyla kolay ayırt edilebilir hale getirildi.
- "Onaylandı" sütunu, Mükelleflere (`organization_id`) göre gruplanarak **Akordeon/Grup** stiline geçirildi.
- Her gruba **"Toplu Dışa Aktar"** butonu eklendi; bu buton arka planda `bulk-export.action.ts` çağırarak `ledger_official_status`'u `archived` konumuna alıyor.

### 6.4. Edge Function Prompt Güncellemesi (Alış/Satış)
- `ledger-isleyici-api` adlı Edge Function, fatura tipi tespitini mükemmelleştirmek adına güncellendi.
- Artık çalışmadan önce `organization_id`'yi kullanarak **Mükellef Unvanını** çekiyor ve Gemini Prompt'una enjekte ediyor.
- *Prompt Kuralı:* "Faturanın üzerindeki 'Alıcı/Müşteri' kısmındaki unvan ile {Mükellef Unvanı} eşleşiyorsa (kısaltmalar dahil), bu bir 'expense' (gider) faturasıdır." mantığıyla `type` tespitini yapıp Supabase'e kaydediyor.


### [26.07.2026] Yapılan Son Güncellemeler
- **Veritabanı Uyumsuzlukları Giderildi:** `transactions` tablosundaki geçersiz `name` sütunu kod bazında temizlendi. AI Asistanın döndürdüğü `title`, `type` ve `status` alanlarının `SupabaseTransactionRepository` ve `TransactionMapper` tarafından sorunsuz işlenip veritabanına eklenmesi sağlandı. Veritabanındaki eski migration çakışmaları temizlendi.
- **OdemeTakvimiScreen Yeni Tasarım:** `OdemeTakvimiScreen`, grid yapısından "Neo-Fintech Noir" tarzı, dikey listeli ve Gelir/Gider olarak ikiye bölünmüş kart tasarımına geçirildi. Giderler kırmızı (`#ff3b30`), gelirler yeşil (`#22c55e`) olarak renklendirildi.
- **Filtreleme Mantığı Düzeltildi:** Takvim ekranında işlemlerin hem gelir hem gidere düşmesine neden olan `t.amount > 0` şartı kaldırılarak; `t.type === 'income'` / `'sales'` (gelir) ve `t.type === 'expense'` / `'ALIS'` (gider) kurallarıyla kesin bir ayrım yapıldı.
- **Gerçek Zamanlı Güncelleme:** `AiMuhasebeScreen` (Dashboard), `transactions` tablosuna yapılan eklemeleri de dinleyecek (realtime subscription) şekilde genişletildi ve `useFocusEffect` ile ekran açıldıkça verilerin anında güncellenmesi garantilendi.
