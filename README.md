# Workigom Ecosystem Architecture

Workigom projesi monorepo mimarisinden bağımsız ve modüler 4 ayrı projeye (repository) bölünmüştür. Bu yapı, her bir ürünün bağımsız geliştirilmesini, deploy edilmesini ve yönetilmesini sağlar.

## Repolar ve Görevleri

1. **Workigom (Marketing Hub)**
   - **Repo:** cicicarscom-pixel/workigom
   - **Domain:** www.workigom.com
   - **Görev:** Ana landing page ve pazarlama sitesidir. /flow ve /ledger tanıtım sayfalarını içerir. Kullanıcı kayıt/giriş işlemlerini yürütmez, doğrudan uygulamanın login sayfasına yönlendirir.
   
2. **Workigom Flow (Ana Uygulama)**
   - **Repo:** cicicarscom-pixel/flow (Eski adıyla i_muhasebeci)
   - **Domain:** low.workigom.com
   - **Görev:** Flow'un gerçek yapay zeka ve otomasyon uygulamasıdır. Supabase ve arka plan API'lerine bağlıdır. Çalışması için Vercel üzerinde Environment Variables (Ortam Değişkenleri) yapılandırmasına ihtiyaç duyar.

3. **Workigom Ledger (Ana Uygulama)**
   - **Repo:** cicicarscom-pixel/ledger
   - **Domain:** ledger.workigom.com
   - **Görev:** Muhasebe ve Ledger platformunun gerçek uygulamasıdır.

4. **Workigom FlowWeb (Legacy / Standalone Landing)**
   - **Repo:** cicicarscom-pixel/flowweb
   - **Görev:** Flow için hazırlanmış eski bağımsız tanıtım projesidir (Şu an tanıtım sayfaları ana Workigom reposuna taşındığı için daha pasif durumdadır).

## Geliştirme ve Deployment Kuralları
- **Yönlendirmeler:** Tanıtım sayfalarındaki "Giriş Yap" butonları (örn: www.workigom.com/flow veya /ledger), direkt olarak uygulamanın kendi domain'indeki (örn: https://flow.workigom.com/login) giriş sayfalarına yönlendirmelidir.
- **Environment Variables:** low ve ledger gibi gerçek uygulama repoları Vercel'de deploy edilirken .env dosyasındaki tüm API ve veritabanı değişkenleri eksiksiz olarak Vercel paneline girilmelidir, aksi takdirde 500 Internal Server Error hatası alınır.
- **Root Directory:** Repolar ayrıldığı için Vercel üzerindeki Root Directory ayarları boş bırakılmalıdır (Eskiden pps/flow vs. idi, artık tüm repolar kendi kök dizininde çalışır).

---

# Workigom (AI Muhasebeci) Proje Dokümantasyonu

Bu belge, **Workigom Ledger** ve **Workigom Flow** projelerinin mimari yapısını, tasarım kararlarını, kullanılan animasyonları ve yapılandırma detaylarını içerir. Bu dosya, projede yapılacak yeni geliştirmelerde bir rehber olarak kullanılmalıdır.

## 🏗️ Proje Yapısı
Proje, bir **Turborepo** monorepo yapısı üzerine inşa edilmiştir.

- **Paket Yöneticisi:** `pnpm`
- **Framework:** `Next.js 14` (App Router)
- **Stil Aracı:** `Tailwind CSS`
- **3D & Animasyonlar:** `Three.js`, `React Three Fiber`, `Framer Motion` (veya özel WebGL Shader'lar)

Klasör dizini şu şekildedir:
```text
ai_muhasebeci/
├── apps/
│   ├── ledger/          # Mali müşavir uygulaması (Ana odak)
│   └── marketing/       # Ana Landing Page uygulaması (www.workigom.com)
├── packages/            # Gelecekte eklenebilecek ortak kütüphaneler
├── supabase/            # Veritabanı fonksiyonları (Edge Functions) ve migrations
├── pnpm-workspace.yaml  # Monorepo yapılandırması
└── turbo.json           # Turborepo yapılandırması
```

---

## 🎨 Tasarım Sistemi ve Renk Paleti

Workigom, modern bir "Dark Mode" arayüzüne (Glassmorphism) sahiptir. Premium ve teknolojik bir his vermek için belirli renkler kullanılır.

### Renk Değerleri
- **Ana Arka Plan (Background):** `#0B0C0D` (Derin Siyah/Koyu Gri)
- **Yüzey (Surface):** `rgba(22, 24, 29, 0.6)` (Glassmorphism / Yarı saydam gri)
- **Vurgu Rengi 1 (Cyan - Flow):** `#00E5FF` (Neon Turkuaz - Sosyal Medya ve Akış için)
- **Vurgu Rengi 2 (Green - Ledger):** `#4edea3` (Zümrüt Yeşili - Muhasebe, Güven, Veri için)
- **İkincil Vurgu (Purple):** `#7B61FF` (Yapay Zeka ve Teknoloji hissi için)

### Glassmorphism (Cam Efekti) Yapısı
Projedeki kartlarda ve navigasyon barlarında "Bento Grid" mantığı kullanılır ve arka planlar yarı saydamdır:
```css
/* Tailwind CSS Örneği */
.glass-panel {
  @apply bg-[#16181D]/60 backdrop-blur-xl border border-white/5;
}
```

---

## 💫 Özel Animasyonlar ve Yapılandırmalar

Projede "Wow" efekti yaratmak için bazı karmaşık animasyonlar oluşturulmuştur. Lütfen bu yapıları bozmadan veya yeniden oluştururken bu kurallara uyun.

### 1. Gökkuşağı Border (Dönen Aura Efekti)
Sayfadaki önemli kartların veya elementlerin etrafında dönen ışık hüzmesi efekti için kullanılan yapılandırmadır.

**Nasıl Yapılır?**
Kartın içerisine absolute olarak bir `conic-gradient` eklenir ve `animate-spin` (veya benzeri bir sonsuz döngü) ile yavaşça döndürülür. Mask (padding) ile ortası boşaltılıp kenarlık (border) gibi görünmesi sağlanır.

**Tailwind Yapılandırması (`tailwind.config.ts`):**
```typescript
keyframes: {
  'flow-spin': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  }
},
animation: {
  'flow-spin': 'flow-spin 8s linear infinite',
}
```

**Kullanım Örneği:**
```tsx
<div className="relative rounded-2xl overflow-hidden p-[2px]">
  {/* Dönen Gökkuşağı Gradienti */}
  <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)] animate-flow-spin blur-md opacity-70"></div>
  
  {/* Kartın İçeriği (Arka Plan ile) */}
  <div className="relative bg-background w-full h-full rounded-xl z-10">
    İçerik buraya gelecek
  </div>
</div>
```

### 2. Aura Glow (Arkadan Vuran Mavi/Turkuaz Işık)
"Sistem Talimatı Kartı" veya "Hero Bölümü" gibi yerlerde arkadan hafifçe yansıyan dönen mavi bir ışık efekti yaratmak için kullanılır.

**Kullanım Örneği:**
```tsx
<div className="relative">
  {/* Arkadaki Glow */}
  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#00E5FF,#1e3a8a,#06b6d4,#00E5FF)] opacity-50 blur-[80px] animate-flow-spin -z-10"></div>
  
  {/* Ana Kart */}
  <div className="glass-panel p-8">
     İçerik
  </div>
</div>
```

### 3. WebGL ve Three.js Arka Planları (FlowShader)
Sayfanın ana arka planında fare hareketine duyarlı 3 boyutlu bir sıvı/akışkan veya küre (Icosahedron) efekti bulunur.

- **Konum:** `apps/marketing/components/flow/FlowThreeJs.tsx`
- **Mantık:** Fare ekranın neresindeyse ışık kaynağı ve kamera o yöne doğru yavaşça ivmelenerek (lerp kullanarak) hareket eder.
- **Renkler:** Işıklar genellikle `#00E5FF` ve `#7B61FF` renklerindedir.

---

## 🚀 Komutlar (Turborepo)

Projede geliştirme yapmak için her zaman **kök dizinde (root)** şu komutları çalıştırın:

- **Geliştirme Ortamı:** `pnpm dev` (apps altındaki tüm projeleri başlatır)
- **Derleme (Build):** `pnpm build`
- **Lint:** `pnpm lint`

---

## 🗺️ Navigasyon ve Rota Şeması (App Router)

Workigom Marketing (Next.js) uygulamasının sayfa akışı şu şekildedir:

1. **`/` (Ana Sayfa - `app/page.tsx`)**: Kök karşılama ekranı.
2. **`/flow` (`app/flow/page.tsx`)**: Turkuaz/Yeşil (`#00E5FF`) temalı, Otomasyon ve RAG Drive özelliklerini sergileyen ürün sayfası.
3. **`/ledger` (`app/ledger/page.tsx`)**: Koyu Mor/Lila (`#d0bcff`) uzay temalı, "Otonom Yapay Zeka İstasyonu" konseptli lüks muhasebe sayfası.
4. **`/ai-settings` (`app/ledger/app/ai-settings/page.tsx`)**: Ledger AI Asistanı. Split-View yerine tam ekran (Full-Width) sohbet (chat) arayüzüne sahiptir. Fatura yüklemeleri doğrudan sohbet içinden (inline) analiz edilip şık görsel tablolar olarak (Xero standartlarında satır kalemleri ile birlikte) sohbet geçmişine entegre edilir. Alt yapısında Supabase Edge Functions (`gemini-chat` ve `process-document`) kullanır.

**Bileşen İzolasyonu:** Her sayfa kendi WebGL efektini (örn: `LedgerThreeJs.tsx`) ve CSS yapılandırmasını barındırır.

---

## ⚠️ Stil ve Tailwind Kuralları

- **Utility Mapping:** Eğer harici bir HTML/Tailwind şablonu (farklı bir design-system'dan) entegre ediliyorsa, özel sınıf isimleri (örn. `px-margin-desktop`, `gap-xl`, `font-display-lg`) **mutlaka** projenin `design-system`'inde var olan veya standart Tailwind sınıflarıyla (örn. `px-8`, `gap-10`, `text-5xl font-bold`) değiştirilmelidir. Aksi takdirde Next.js derlemesinde veya tarayıcıda boşluk/tipografi çökmeleri yaşanır.
- **İzolasyon:** Flow ve Ledger gibi tamamen zıt renk paletlerine sahip projelerin aynı repoda çakışmaması için, sayfaya özgü renkler (`#d0bcff` vb.) doğrudan satır içi (arbitrary values) veya sadece o sayfanın `[sayfa].css` dosyasında tanımlanır.

**Not:** Bu dosya proje standartlarını korumak için oluşturulmuştur. Yeni bir "Wow" efekti eklendiğinde lütfen formülünü buraya not etmeyi unutmayın.

## 🤖 İŞLEYİCİ Aİ ve AI Ekosistemi Görev Dağılımı (Mimari Yapı)

Sistem, bir "Muhasebeci - Müşteri Ekosistemi" üzerine kuruludur. Her muhasebecinin sisteme özel bir kod ile bağlanan birden fazla (örn: 20-30) müşterisi/mükellefi bulunur. Sistemdeki Yapay Zeka (AI) asistanları doğrudan muhasebeciye bağlı olarak çalışır ve bu ekosistemdeki müşterileri yönetir.

Görev çakışmalarını önlemek ve veri bütünlüğünü sağlamak amacıyla AI mimarisi **İşleyici AI** ve **Flow AI** olmak üzere iki ana kola ayrılmıştır.

### 1. İşleyici AI (Arka Ofis / Ledger)
İşleyici AI, doğrudan muhasebecinin komutası altında çalışan ve ağır analitik süreçleri yöneten ana sistemdir.

* **Resmi Evrak İşleme:** Sisteme yüklenen resmi faturaları sadece Ledger arayüzünde işler.
* **Finansal Hafıza ve Raporlama:** Flow arayüzündeki AI Muhasebe ekranından erişilen "İşletmem" sayfasındaki toplam işlenen gelir-gideri ve geçmiş dönem kayıtlarını tutar/raporlar.
* **Ledger İletişim Kontrolü:** Ledger içerisindeki chat kutusunun yönetiminden sorumludur.
* **Muhasebeci Yönlendirmeli İletişim:** Muhasebecinin direktifleri doğrultusunda ekosisteme bağlı müşterilerle iletişime geçer. Muhasebecinin talebiyle belirli bir müşteriye soru sorabilir, bildirim iletebilir veya tüm müşterilere toplu mesaj/bildirim gönderebilir.
* **Veri Sınırı:** Sadece resmi faturaları Ledger'da işler; sözlü veya manuel girilen kayıtları işlemez, bunları Flow tarafında bırakır.

### 2. Flow AI (Ön Büro / Arayüz)
Flow AI, sistemin arayüz etkileşimlerini, manuel veri girişlerini ve müşteri iletişimini yürüten ön yüz (front-office) modülüdür.

* **Manuel Finansal Takip:** AI Muhasebe ekranında bulunan "Gelir Gir / Gider Gir" ekranları üzerinden girilen tüm cari veya resmi bilgileri tutar. Muhasebeciye bağlı tüm müşterilerin manuel gelir ve giderlerini kontrol eder.
* **Dinamik UI Güncellemesi:** Kullanıcının girdiği verilere dayanarak; AI Muhasebe ekranındaki "Bu Ay Gelir / Bu Ay Gider" kutularını, ödeme takvimini ve Dashboard'da yer alan genel gelir-gider özet kutularını anlık olarak günceller.
* **Müşteri İletişimi:** AI Muhasebe ekranındaki AI Asistan butonu üzerinden (sosyal medya/WhatsApp entegrasyonlarıyla) müşteriler ile günlük iletişimi kurar.
* **Veri Sınırı:** Sözlü olarak veya manuel olarak kaydedilen tüm işlemleri sadece Flow arayüzü tabanlı olarak kendi bünyesinde (transactions) tutar.

## [03.08.2026] UI/UX Kararları ve Yapılandırma Notları
- **Marketing Landing Page Tasarımı:** Yeni geliştirilen 'Muhasebede Yeni Çağ' konsepti iptal edilerek eski 'Muhasebe Artık Daha Akıllı, Daha Kolay' tasarımına kalıcı olarak geri dönülmüştür. pps/marketing/app/ledger/page.tsx bu tasarıma göre kilitlenmiştir.
- **Videolu Anlatım Alanları:** Statik mockuplar yerine ideo1.mp4 ve ideo2.mp4 dosyaları sisteme dahil edilmiştir. ideo2.mp4, eski tasarımdaki AI Asistan ikonunun ve sohbet pencerelerinin tamamının yerini alacak şekilde 2/3 genişlikte ayarlanmıştır.
- **Özel Logolar:** Sitenin header ve footer bileşenlerine standart SVG yerine ledgerlogo1.png atanmıştır. Tarayıcı favicon'u avicon-16x16.png olarak güncellenmiştir.
- **Next.js 14 Vercel Derlemesi:** API route'larda cookie okunan GET metotlarının statik build sırasında patlamasını önlemek için (DYNAMIC_SERVER_USAGE) ilgili dosyalara xport const dynamic = 'force-dynamic'; eklenmesi kuralı getirilmiştir.


## [16.08.2026] Sosyal Medya Optimizasyonları (Zernio Client)
- **Timezone Desteği:** `zernio-client` Supabase Edge Function'ına gönderi oluşturma (`create-post`) sırasında `timezone` parametresi eklendi. Zernio Node SDK'sı ile uyumlu çalışarak doğru saat diliminde planlama yapılması sağlandı.
- **Post Silme Endpoint:** Zernio üzerinden veya kalıcı platformdan gönderi silebilmek için `delete-post` fonksiyonu eklendi.

---

# 🧠 WORKIGOM AI CORE ARCHITECTURE (Ledger)

This section documents the massive infrastructure built for the **AI Core in the Ledger Application** (Implemented on August 20, 2026). It outlines the exact specifications, strict Typescript implementations, database migrations, and UI integration patterns.

## 1. Domain-Driven Design (DDD) Migration
Moved away from a single public schema. A strict schema-based isolation was introduced to protect core tenant data from AI and background task operations.
- **New Schemas:** audit, analytics, ai
- **Low-Risk Tables Migrated:** api_usage_logs, ai_audit_logs, organization_audit_events, analytics_cache, extraction_schemas, ai_decision_events, ledger_ai_rules, ledger_ai_settings, accountant_ai_tasks, accountant_ai_conversations, accountant_ai_messages.
- **Migration Script:** supabase/migrations/20260820_phase1_ai_audit_schemas.sql

## 2. Core Foundation & Tool Registry
Built inside apps/ledger/src/ai-core/ using strict Typescript.
- **Types (shared/types.ts):** Defined ToolRisk (read, write, external_action), ToolContext (must have userId, firmId), and ToolResult.
- **Registry (tools/registry.ts):** Singleton ToolRegistry mapping tool intents to executable blocks safely.

## 3. Fuzzy Entity Resolver (Turkish NLP)
- **Normalizer (entities/turkish-normalizer.ts):** Resolves Turkish character mismatches (ı->i, ş->s), lowercases, and performs simplified stemming (stripping suffixes like ın, ya, dan) to standardize user input.
- **Resolver (entities/taxpayer-resolver.ts):** Matches natural language names (e.g. Yılmazların borcu ne) to physical database tenants (organizations) scoped strictly by firmId. Assigns a 0 to 1 confidence score (e.g. confidence > 0.85).

## 4. Business Tools (Read & External Actions)
- **Read Tool (count_taxpayers):** Securely fetches the count of taxpayers connected to the firm.
- **Read Tool (get_taxpayer_balance):** Uses the taxpayerResolver to find the company and returns account balance data.
- **External Action Tool (send_notification):** Demonstrates high-risk operations. Evaluates policy, executes action, and mandates a cross-schema audit log (aiAuditRepository) via a finally block.

## 5. Security: Policy Engine & Cross-Schema Audit
- **Policy Engine (policy/policy-engine.ts):** Authorizes execution based on ToolRisk and RBAC roles (e.g. rejecting external_action if not an admin).
- **Audit Repository (repositories/ai-audit.repository.ts):** Overrides default schema by initializing Supabase with { db: { schema: 'audit' } } to ensure all AI operations are logged safely away from the public schema.

## 6. AI Router & Gemini Provider
- **Zod Schemas (router/intent.schemas.ts):** Enforces a strict schema (IntentResultSchema) expecting intent, risk, entityQuery, and confidence.
- **Gemini SDK (providers/gemini-provider.ts):** Utilizes Vercel AI SDK (generateObject) with @ai-sdk/google (gemini-1.5-flash) to force structured JSON output from natural language queries.
- **Fast Path Architecture (router/intent-router.ts):** Bypasses costly Agent Orchestrator loops by instantly executing the tool if confidence > 0.80 and risk === read.

## 7. UI Integration (Next.js Server Actions)
- **Server Action (actions/ai-actions.ts):** 
  - **Zero-Trust Client:** Ignores client-provided tenant data.
  - Fetches the active user via supabase.auth.getUser().
  - Queries accounting_firm_members to establish the secure firmId.
  - Injects this trusted ToolContext into the routerService.
- **Client Component (components/ai/LedgerAiChat.tsx):** Uses React 19 useTransition to cleanly stream loading states and present the resulting ToolResult or Error directly to the UI without blocking the main thread.

### [21.08.2026] Müşavir Profil & Bağlantı Entegrasyonu
- **Profil Yönetimi:** Ledger paneline /profil rotası ve sol menü kısayolu eklendi. Müşavirler artık cihazlarından (veya galerilerinden) Supabase altyapısıyla kendi profil fotoğraflarını yükleyebilir; İşletme Adı, Yetkili Adı-Soyadı ve Telefon numarası gibi bilgilerini anlık olarak veritabanında güncelleyebilirler.
