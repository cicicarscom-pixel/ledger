# AI Agent Kuralları & Konuşma Geçmişi (Workigom Ledger)

## 🚨 Kritik Kural: Otomatik Git Push
**HER DEĞİŞİKLİKTE GITHUB'A PUSH YAPILACAKTIR.** Yapılan geliştirmeler, hata düzeltmeleri veya dosya güncellemeleri tamamlandıktan hemen sonra, ilgili projenin (çalışılan dizinin) GitHub deposuna `git add .`, `git commit -m "..."` ve `git push` komutlarıyla gönderilmelidir.

## Alınan Mimari Kararlar ve Kurallar
1. **Mevcut Yapıyı Koruma:** Geliştirmeler yapılırken `apps/ledger/app/layout.tsx` dosyasındaki ana layout yapısına, kenar boşluklarına (padding), Sidebar'a veya wrapper yapısına dokunulmamalıdır. Yalnızca hedeflenen bileşenler içeriğe izole bir şekilde eklenmelidir.
2. **Küçük ve Kontrollü Onaylar:** Büyük özellikler geliştirilirken ("Mükellefler Operasyon Merkezi" ve "Floating AI") önce plan sunulur, sadece tek bir özellik için geliştirme yapılır ve onay alındıktan sonra ikinci aşamaya geçilir.
3. **UI/UX Prensipleri:** 
   - Workigom'un ana renk paletine (sci-fi karanlık, siber-uzaylı, yeşil/mavi neon, `#12151C`, `#161B22`) sadık kalınmalıdır.
   - Master-Detail veri gösterimi gibi layout'lar, sayfanın geneline esnek biçimde (grid ile) yayılmalı; sağ ve sol kolonlar dikey alan kullanımını maksimize etmelidir.
   - Gerekli durumlarda Global Header dinamikleştirilerek sayfa başlığı oraya taşınmalı, sayfadaki yer tasarrufu sağlanmalıdır (örn. Mükellefler başlığının global Header'a alınması).
4. **Floating Ledger AI (Kapsül Tasarımı) Kuralları:**
   - Oval, siyaha yakın yatay bir kapsüldür.
   - Kapsülün sol tarafında mor (`#9D5CFF`), sağ tarafında turkuaz (`#00DAF3`) parıltı (glow) efektleri kesinlikle bulunmalıdır. Fare üzerine geldiğinde bu efektler ve border'lar CSS mask ve glow ile belirginleşmelidir.
   - Next.js SSR (Sunucu Tarafında Oluşturma) hatalarını (hydration mismatch) önlemek için `window` nesnesi ölçümlerine dayalı işlemler (örn. Framer Motion drag sınırları) yalnızca istemciye (Client) monte edildikten (`useEffect` sonrası `isMounted`) sonra yüklenmelidir.

## Konuşma ve Geliştirme Özeti
- **Adım 1:** Mevcut arayüzdeki renk farklılıkları tespit edildi (Onay Merkezi vs. Dashboard). Tüm renkler, siber-uzaylı dark palet ( `#12151C` ve `#161B22` tonları) ile aynı hizaya getirildi.
- **Adım 2 (Faz 1):** Mükellefler Operasyon Merkezi (`/ledger/clients`) tasarlandı. Sol panelde liste, sağ panelde detay görünümü şeklinde bir master-detail ekran yapıldı.
  - Arama kutusu önce header'da duruyordu, ardından sol listeye sticky olacak şekilde yerleştirildi.
  - Sayfa başlığı ("Mükellefler") üstteki global Header'a alındı, böylece UI daha kompakt hale geldi. "Mükellef Ekle" butonları ise Müşavir Davet Kartının içine taşındı.
- **Adım 3 (Faz 2):** Yüzen global AI Asistan kapsülü (Floating Ledger AI) eklendi. SSR hataları çözülerek tüm Ledger yapısında bağımsız olarak çalışabilir hale getirildi. Kapsül, "Kapalı (Orb)" ve "Açık (Panel)" olmak üzere iki durum (state) barındırıyor ve ekranın sağ altında konumlanıyor.
- **Adım 4 (Faz 3 - Tam Ekran Chat):** AI Ayarları sayfası (`/ai-settings`) güncellendi. Bölünmüş ekran (Split-View) tamamen kaldırılarak tek bir geniş (Full-Width) sohbet deneyimine geçildi. Dosya yükleme özelliği sohbet input'unun içine alındı. Fatura analizleri (JSON yerine) Xero standartlarında (satır kalemleriyle birlikte) doğrudan AI mesaj balonunun içine "Analiz Sonucu" görsel tablosu olarak render edilmeye başlandı. Ayrıca `process-document` ve `gemini-chat` Edge Fonksiyonları bu yapıya göre optimize edilerek Supabase'e deploy edildi.
- **Adım 5 (Faz 2 & 3 - Dinamik Şema Onboarding):** Sistemde sabit, hardcoded şemalar ve tablolar tamamen kaldırıldı. `ai-settings` içerisine "1 Dakikalık Onboarding" altyapısı (Çift Yükleme - Fatura + Ekran Görüntüsü) entegre edildi. `generate-schema` Edge Fonksiyonu oluşturuldu ve Gemini Prompt'u güncellenerek "Boş Kolon Öngörüsü" (Örn: %1 KDV, Tevkifat) zorunlu kılındı. Bu dinamik OCR şemasına bağlı olarak hem `ai-settings/page.tsx` sohbet tablosu hem de `ApprovalPage.tsx` Onay Merkezi veri gösterim tablosu, gelen JSON (`columns` veya `line_items`) yapısına göre tamamen dinamik (Object.keys / map) render edilecek şekilde güncellendi.
---

## 📅 AI Muhasebe — Hafıza Notları (18 Temmuz 2026)

### 1. 4 Fazlı AI Fatura Entegrasyonu Mimari Kararları
Flow (Mükellef) ile Ledger (Müşavir) arasındaki entegrasyon için 4 fazlı akış kabul edildi:
1. **Veri Yakalama (Flow):** Fatura fotoğrafı/PDF'i yüklenir, Gemini AI JSON olarak veriyi ayrıştırır.
2. **Proaktif Chat (Flow):** AI mükellefe faturanın türüne göre soru sorar:
   - Alış Faturası: "Ödendi mi?" (Evet/Hayır) -> Hayır ise "Tarih?"
   - Satış Faturası: "Tahsil edildi mi?" (Evet/Hayır) -> Hayır ise "Tarih?"
3. **Draft Kuyruğu (Flow -> Backend):** Veriler doğrudan \	ransactions\ tablosuna yazılmaz. Yeni oluşturulan \submit-accounting-draft\ Edge Function'ı ile \ccounting_drafts\ tablosuna "pending_approval" statüsü ile iletilir. Mobil uygulamanın doğrudan DB yazma yetkisi (RLS) kısıtlandı.
4. **Müşavir Onayı (Ledger):** Müşavir kendi ekranında bu draft'ları Split-View (Görsel + Data) olarak inceler, onaylayarak \	ransactions\ tablosuna aktarır.

### 2. Türkiye (TR-TR) Fatura Ayrıştırma Şeması Kesin Kuralları
- **Düz (Flat) JSON:** İç içe obje kullanılmayacak. Tüm KDV ve matrah alanları (1, 8, 10, 18, 20) doğrudan \ at1Base\, \ at1Amount\ şeklinde döndürülecek. Bulunmayan veriler \ \ (sıfır) olacak, \
ull\ veya boş string dönülmeyecek.
- **İşlem Yönü (\invoiceType\):** Belgedeki alıcı/satıcı VKN'si ile Flow kullanıcısının (işletmenin) VKN'si karşılaştırılacak. İşletme alıcıysa \purchase_invoice\, satıcıysa \sales_invoice\ dönecek.
- **Açıklama (\description\):** Sadece karşı tarafın firma adı kullanılacak. Ürün, hizmet, işlem özeti uydurulmayacak veya eklenmeyecek.
- **Tevkifat:** Varsa aynen "1/10" gibi string olarak yazılacak.
- **Matematiksel Uyum:** Uyuşmazlık durumunda veriler değiştirilmeyecek, JSON içindeki \eviewFlags\ dizisine \AMOUNT_MISMATCH\ eklenecek.

### 3. V2 Ledger AI Mimarisi & Kararları (21 Temmuz 2026)
- **Mimar AI "Boş Kolon" Kuralı:** Mimar AI'ın (Şema Kurucu) sadece faturada görünen verileri değil, sağlanan muhasebe UI ekran görüntüsündeki **TÜM** veri giriş alanlarını (Örn: faturada %1 KDV olmasa dahi %1 KDV kutusunu) tespit edip şemaya (`invoice_schemas`) dahil etmesi kuralı getirildi. Bu sayede sonraki farklı faturalar için sistem kör kalmıyor.
- **Global Şema & Veritabanı:** `invoice_schemas` tablosundaki `taxpayer_id` bağımlılığı (foreign key constraint) kaldırılarak şema tamamen global bir "Sistem Şablonu" haline getirildi. Frontend (`ai-settings`) ve backend (Mimar & İşleyici AI) üzerindeki tüm `taxpayer_id` kısıtlamaları temizlendi.
- **Dinamik Onay Merkezi (ApprovalPage):** Önceden sabit (dummySchema) olan onay merkezi arayüzü, tamamen dinamik hale getirildi. Bileşen artık yüklendiğinde `invoice_schemas` tablosundan en güncel kuralları çekip, sağ taraftaki veri giriş alanlarını o kural setine göre (ve `activeDocument.mapped_data` içeriğiyle) render ediyor.
- **İşleyici AI Yön Kuralı (Alış/Satış):** İşleyici AI'a veritabanından faturanın ait olduğu mükellefin unvanı çekilerek gönderiliyor. AI'a verilen prompt: "Faturayı kesen bu firmaysa SATIŞ, fatura bu firmaya kesilmişse ALIŞ faturasıdır." olarak netleştirildi.
- **Gemini Interactions API Geçişi:** Eski `@google/genai` kütüphanesinin `generateContent` metodunun deprecate olup 500 hatası vermesi üzerine tüm Edge Fonksiyonları (Mimar ve İşleyici) yeni nesil **Interactions API** (`ai.interactions.create`) ve `gemini-3.5-flash` modeline taşındı. Structured Output için response_schema kuralları uygulandı.

### 4. Operasyonel Ekstra Geliştirmeler (23 Temmuz 2026)
- **RLS Bypass İptali ve Güvenlik:** Test aşamasında faturaların İş Akışı ekranına düşmemesi problemi incelendi. RLS (Row Level Security) kalkanını bypass etmek (service_role) yerine, Müşavir-Mükellef bağının kopuk olduğu senaryolarda `accountant_taxpayer_links` tablosu üzerinden dinamik bağlantı sorguları kullanılması gerektiğine karar verildi. Güvenlik ön planda tutuldu.
- **Dinamik Veri Bağlama (AI Data Binding):** `ApprovalPage.tsx` içerisinde input'ların sadece eski `mapped_data` ile değil, yeni sistemdeki `tax_details` (örneğin fatura numarası, tarih) objesiyle ve `amount_minor / 100` ile de çalışabilmesi için fallback zinciri kuruldu.
- **Sahiplik Damgası (Ownership Badge):** Tüm iş akışı kartlarına mükellef adının yazdığı renk kodlu bir damga (badge) eklendi.
- **Toplu Dışa Aktarım (Akordeon Gruplama):** `WorkflowPage.tsx` sayfasındaki "Onaylandı" kolonu mükelleflere (`organization_id`) göre gruplanarak listelendi. Yeni eklenen `bulk-export.action.ts` sayesinde bu gruplar toplu halde `archived` konumuna alınıyor.
- **Alış/Satış Tespit Promptu:** Edge Function `ledger-isleyici-api`'ye, faturanın türünü tespit edebilmesi için işlem öncesinde `organization_id` üzerinden Mükellef Unvanını çekme ve bu unvanı faturadaki "Alıcı/Müşteri" veya "Satıcı" ile kıyaslama komutu (prompt engineering) eklendi.


### 5. Dışa Aktarım ve Onay Merkezi (ApprovedPage) Geliştirmeleri (24 Temmuz 2026)
- **Sayfa Önbellekleme (Caching) İptali:** Next.js Server Components ve Supabase fetch işlemlerinin önbelleğe takılıp onaylanan faturayı anında göstermemesi sorunu `export const dynamic = 'force-dynamic';` ile çözüldü.
- **Supabase Realtime (Anlık Yenileme):** `WorkflowPage`, `ApprovalPage` ve `ApprovedPage` bileşenlerine (Client Component) Supabase `postgres_changes` aboneliği eklendi. `finance_documents` tablosunda herhangi bir değişiklik olduğunda `router.refresh()` çağrılarak Server Component'in arka planda veriyi güncelleyip ön yüze göndermesi sağlandı. Böylece manuel sayfa yenileme (`F5`) ihtiyacı ortadan kaldırıldı.
- **Supabase "Ambiguous Foreign Key" Hatası:** `finance_documents` tablosu `organizations` tablosuna (vendor ve taxpayer olarak) birden fazla foreign key ile bağlandığı için, `organizations (name)` şeklindeki standart seçme sorguları hata vermekteydi. Bu sorun, sorgunun `organizations:organization_id (id, name, logo_url)` şeklinde açıkça belirtilmesiyle çözüldü. Ayrıca `logo_url` sütunu bulunmadığı için Vercel üzerinde sessiz hataya (0 evrak dönmesine) sebep olan kod `organizations:organization_id (name)` şeklinde sadeleştirilerek güvenli hale getirildi.
- **Mükellef Bazlı Akordeon ve Dışa Aktarım (Export):** "Onaylananlar" sayfası (arşiv) baştan tasarlandı. Mükelleflere göre gruplama (Accordion) eklendi ve tablo tasarımı eklendi.
- **Evrensel Para Birimi ve Sayı Formatlama (`tr-TR`):** Dışa Aktarım fonksiyonlarında ve arayüzde ondalık sayıların her zaman virgülle (`,00`) ve binlik ayrıçların noktayla (Örn: `144.800,00`) gösterilmesi için global bir `formatNum` fonksiyonu yazıldı. Bu fonksiyon `ApprovedPage.tsx` içerisinde `parseTaxDetails` fonksiyonuna dahil edildi ve gelen tüm JSON sayılarında (KDV, Matrah, Toplam) mutasyon yapılarak Excel, CSV, XML ve PDF çıktılarına yansıtılması sağlandı.
- **CSV Dışa Aktarımı:** Türkçe Excel'de sütunların düzgün ayrışması için ayrıştırıcı (delimiter) olarak `,` yerine noktalı virgül (`;`) kullanıldı.
- **Excel Dışa Aktarımı (SpreadsheetML):** `\t` (Tab) ayrımıyla oluşturulan sahte `.xls` dosyaları, bölgesel ayarlara bağlı olarak bazı bilgisayarlarda tüm sütunları A hücresine sıkıştırdığı için, HTML tablo `<table>...</table>` formatına geçildi. Excel'in HTML tablolarını doğal olarak `.xls` olarak mükemmel şekilde sütunlara bölebilme yeteneği kullanıldı.
- **XML ve PDF Eksikleri:** XML dışa aktarım kodunda eksik olan `ALIŞ/SATIŞ` fallbacks'leri (varsayılan değerleri) ve tarih atamaları Excel çıktısıyla birebir aynı formata getirilerek XML'in muhasebe programlarıyla %100 uyumu sağlandı.

### [26.07.2026] Yapılan Son Güncellemeler
- **Veritabanı Uyumsuzlukları Giderildi:** `transactions` tablosundaki geçersiz `name` sütunu kod bazında temizlendi. AI Asistanın döndürdüğü `title`, `type` ve `status` alanlarının `SupabaseTransactionRepository` ve `TransactionMapper` tarafından sorunsuz işlenip veritabanına eklenmesi sağlandı. Veritabanındaki eski migration çakışmaları temizlendi.
- **OdemeTakvimiScreen Yeni Tasarım:** `OdemeTakvimiScreen`, grid yapısından "Neo-Fintech Noir" tarzı, dikey listeli ve Gelir/Gider olarak ikiye bölünmüş kart tasarımına geçirildi. Giderler kırmızı (`#ff3b30`), gelirler yeşil (`#22c55e`) olarak renklendirildi.
- **Filtreleme Mantığı Düzeltildi:** Takvim ekranında işlemlerin hem gelir hem gidere düşmesine neden olan `t.amount > 0` şartı kaldırılarak; `t.type === 'income'` / `'sales'` (gelir) ve `t.type === 'expense'` / `'ALIS'` (gider) kurallarıyla kesin bir ayrım yapıldı.
- **Gerçek Zamanlı Güncelleme:** `AiMuhasebeScreen` (Dashboard), `transactions` tablosuna yapılan eklemeleri de dinleyecek (realtime subscription) şekilde genişletildi ve `useFocusEffect` ile ekran açıldıkça verilerin anında güncellenmesi garantilendi.

### [03.08.2026] Marketing Landing Page ve Vercel Güncellemeleri
- **Eski Tasarıma Dönüş:** Kullanıcının talebi üzerine pps/marketing/app/ledger/page.tsx sayfası, 'Muhasebede Yeni Çağ' tasarımından eski 'Muhasebe Artık Daha Akıllı, Daha Kolay' tasarımına (Image 2) geri döndürüldü.
- **Video Entegrasyonu:** Hero (Ana ekran) alanındaki statik görsel yerine ideo1.mp4 eklendi. Yapay Zeka (AI Asistan) bölümünde bulunan yuvarlak robot ikonu ve sohbet balonları tamamen kaldırılarak, bu 2/3'lük geniş alana ideo2.mp4 yerleştirildi.
- **Logo ve Favicon:** Sitenin header (üst menü) ve footer (alt menü) kısımlarındaki standart SVG Workigom Ledger logoları, özel tasarım olan ledgerlogo1.png ile değiştirildi. Tarayıcı sekmesinde görünmesi için avicon-16x16.png dosyası Next.js 14 standartlarına uygun olarak pps/marketing/app/icon.png ve genel erişim için public/favicon.ico olarak sisteme dahil edildi.
- **Vercel DYNAMIC_SERVER_USAGE Hatası:** Vercel build esnasında pps/marketing/app/api/flow-connections/verify/route.ts yolunda çerez okuyan (cookies) GET metodunun statik olarak üretilmeye çalışılmasından kaynaklanan derleme hatası, bu rotaya xport const dynamic = 'force-dynamic'; eklenerek çözüldü.

### [11.08.2026] In-App Bildirim Sistemi & AI Entegrasyonu (Ledger)
- **Veritabanı Şeması:** Supabase'de \
otifications\ tablosu (RLS yetkileri ile birlikte) oluşturuldu.
- **AI Araçları (Function Calling):** Edge Function (\ledger-ai-chat/index.ts\) güncellendi. Gemini 3.5 Flash Interactions API kullanılarak AI asistanına iki yeni araç verildi:
  - \sendNotificationToUser\: Sadece ismini veya UUID'sini belirterek tek bir mükellefe/kullanıcıya özel sistem içi bildirim gönderir. İsim verilirse \profiles\ tablosundan otomatik \ilike\ sorgusuyla \profile_id\ bulur.
  - \sendNotificationToAllUsers\: Tüm \profiles\ tablosunu çekerek tek bir *Bulk Insert* ile herkese anlık yayın (broadcast) yapar.
- **Güvenlik:** RLS kurallarını aşabilmek için bu Edge Function araçları içerisinde \SUPABASE_SERVICE_ROLE_KEY\ kullanıldı.

### [21.08.2026] Müşavir Profil & Bağlantı Entegrasyonu (Flow & Ledger Senkronizasyonu)
1. **Ledger Profil Ekranı:** Müşavirlerin kendi profil bilgilerini (İşletme Adı, Yetkili Kişi Adı Soyadı, Telefon vb.) düzenleyebilecekleri ve cihazlarından resim yükleyebilecekleri (Supabase Storage 'avatars' bucket üzerinden) '/profil' ekranı eklendi.
2. **Flow Bağlantı Kartı:** Esnafın (Flow) "Muhasebecim" sayfasında yer alan sahte mock ekran kaldırılarak gerçek Supabase veritabanına bağlandı. Aktif bir bağlantı varsa doğrudan müşavirin profili, işletme adı ve avatarı şık bir "Bağlı" rozeti ile gösterilmektedir.
