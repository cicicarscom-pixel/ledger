# TALİMAT 5 — "WhatsApp Sunucuları" sayfasına "Yeni sunucu nasıl eklenir?" kılavuzu

Önce `TALIMAT_00_sira_ve_ortak_kurallar.md` kurallarını oku; hepsi geçerli. **Veritabanına ve Edge Function'lara dokunma; deploy yok** (yalnız admin arayüzü; Vercel derler).

## Amaç
`apps/admin/src/app/(dashboard)/whatsapp-sunuculari/page.tsx` sayfasında **"Yeni Sunucu Ekle" formunun hemen üstüne**, açılıp kapanan (varsayılan **kapalı**), adım adım, sade Türkçe bir kılavuz eklenir. Yeni sunucu ekleyen kişi (teknik olmayabilir) formu doldurmadan önce ne yapacağını bu kılavuzdan görür.

## Yapılacak
1. **Yeni dosya:** `apps/admin/src/app/(dashboard)/whatsapp-sunuculari/YeniSunucuKilavuzu.tsx` — sunucu bileşeni (`'use client'` YOK; yeni paket YOK). HTML `<details>`/`<summary>` ile aç/kapa. Stil: sayfadaki diğer kartlarla aynı (`bg-card border border-border rounded-2xl p-6`, başlıklar `text-white`, açıklamalar `text-text-muted`; kod blokları `bg-surface border border-border rounded-lg p-3 text-xs font-mono overflow-x-auto`, `<pre>`). **`bg-background` sınıfını KULLANMA** (admin Tailwind ayarında tanımlı değil).
2. **`page.tsx`:** içe aktar ve `<AddServerForm highestOrder={highestOrder} />` satırının **hemen üstüne** `<YeniSunucuKilavuzu />` koy. Başka satıra dokunma.
3. **README:** "Son Güncellemeler" maddesi.
4. Metin aşağıdaki **KILAVUZ METNİ**'dir; **kelimesi kelimesine** kullan (yazım ve noktalama dahil). Adımlar numaralı liste (`<ol>`), uyarılar sarı kutu (`bg-warning/10 border border-warning/20 text-warning rounded-lg p-3 text-sm`), bilgi notları gri kutu. Sır değeri örneği YAZMA; yer tutucu olarak `<...>` kullanılan yerler olduğu gibi kalır.

## KILAVUZ METNİ

**Özet başlığı (`<summary>`):** `Yeni sunucu nasıl eklenir? (adım adım kılavuz)`

**Giriş (tek paragraf):**
Sunucular sırayla dolar: önce Sunucu 1, o dolunca (ya da "yeni kayıt almayı durdur" denince) yeni işletmeler Sunucu 2'ye gider. Mevcut işletmeler **taşınmaz**, bağlantıları kopmaz. Yeni sunucu eklemek için aşağıdaki 7 adımı sırayla yapın. Önce 1–4. adımları bitirin, formu en son doldurun.

**Adım 1 — Yeni bir sunucu (VPS) alın ve WAHA'yı kurun**
- Ubuntu 24.04 yüklü yeni bir VPS alın. Boyut seçerken bilin: 1 çekirdek / 4 GB RAM'li bir makine çok az oturum taşıyabilir; kapasiteyi 7. adımda ölçümle belirleyeceksiniz.
- WAHA'yı Sunucu 1'i kurduğunuz yöntemle (WAHA dokümantasyonu: `WAHA_DOKUMANTASYONU.md`) kurun. **Motor NOWEB** olmalı. WAHA'nın kendi **API anahtarını** (`WAHA_API_KEY` ortam değişkeni) bir sonraki adımda üreteceğiniz değerle başlatın.

**Adım 2 — Sunucuya HTTPS ile erişilebilir bir adres verin**
- Bu sayfa yalnız `https://` ile başlayan adresleri kabul eder (şifresiz `http://` kabul edilmez).
- Bir alan adı seçin (örnek: `waha2.alanadiniz.com`) ve DNS'te bu adın **A kaydını** yeni sunucunun IP adresine yönlendirin.
- Sunucuda Caddy kurup şu iki satırlık ayarı kullanırsanız sertifikayı otomatik alır:
```
waha2.alanadiniz.com {
  reverse_proxy 127.0.0.1:3000
}
```
- Tarayıcıda `https://waha2.alanadiniz.com` adresini açıp WAHA'nın yanıt verdiğini kontrol edin. **WAHA'nın 3000 numaralı portunu internete doğrudan açık bırakmayın** (güvenlik duvarında yalnız 80 ve 443 açık olsun).

**Adım 3 — İki gizli anahtar üretin (kendi bilgisayarınızda)**
- İki ayrı rastgele değer üretin. Komut: `openssl rand -hex 32` (iki kez çalıştırın). Windows PowerShell kullanıyorsanız: `$b=New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b|%{$_.ToString('x2')})`
- **1. değer = API anahtarı** (WAHA'ya girilir). **2. değer = Webhook anahtarı** (imza doğrulama için).
- Bu değerleri bir parola yöneticisine kaydedin. **Hiçbir sohbete, e-postaya ya da bu forma yapıştırmayın.**

**Adım 4 — Anahtarları Supabase'e "secret" olarak ekleyin**
- Supabase → Edge Functions → Secrets bölümünde iki secret ekleyin. Sunucu 2 için örnek adlar:
  - `WAHA_API_KEY_2` → 1. değer (API anahtarı)
  - `WAHA_WEBHOOK_SECRET_2` → 2. değer (webhook anahtarı)
- **Ad kuralı:** API anahtarının adı `WAHA_API_KEY` ile, webhook anahtarının adı `WAHA_WEBHOOK_SECRET` ile **başlamalı**; sonuna `_2`, `_3` gibi sıra eklenir. Başka bir ad bu sayfada kabul edilmez.
- Uyarı kutusu: Secret'ı **önce** ekleyin; "Bağlantıyı test et" düğmesi secret'ı bulamazsa "Supabase'de ... secret'ı yok" der.

**Adım 5 — Formu doldurun** (aşağıdaki "Yeni Sunucu Ekle" kutusu)
Tablo (iki sütun: Alan / Ne yazılır):
- Ad → `WAHA-2` gibi sizin göreceğiniz bir ad
- Adres (base_url) → `https://waha2.alanadiniz.com`
- API Gizli Adı → `WAHA_API_KEY_2` (4. adımdaki ad)
- Webhook Gizli Adı → `WAHA_WEBHOOK_SECRET_2` (4. adımdaki ad)
- Sıra (fill_order) → kendiliğinden gelen sayıyı bırakın (mevcut en büyük sıra + 1). Her sunucunun sırası farklı olmalı.
- Kapasite (max_sessions) → ölçmeden **küçük** başlayın (örnek: 25). Ölçümden sonra panelden "Kapasiteyi değiştir" ile artırırsınız.
- Uyarı Yüzdesi → 80 (sunucu %80 dolunca uyarı çıkar)
Bilgi notu: Formda anahtarın **değeri** istenmez; yalnız adı yazılır.

**Adım 6 — "Bağlantıyı Test Et", sonra "Kaydet"**
- Önce **Bağlantıyı Test Et**'e basın. Yeşil "Bağlandı" görmelisiniz. Hata olursa anlamları:
  - "Adres https:// olmalı" → adresi `https://` ile yazın.
  - "Bu adrese bağlanılamaz (dahili adres)" → internetten erişilebilir bir adres yazın.
  - "Supabase'de ... secret'ı yok" → 4. adımdaki secret'ı ekleyin ve adı doğru yazdığınızı kontrol edin.
  - "WAHA anahtarı reddedildi" → Supabase'deki API anahtarı ile WAHA'ya girdiğiniz anahtar farklı.
  - "Zaman aşımı" / "Sunucuya ulaşılamadı" → adres, DNS ve güvenlik duvarı ayarlarını kontrol edin.
- Test başarılıysa **Kaydet**. Yukarıdaki tabloda yeni sunucu satırı görünür.
- Test başarısız olsa da kaydedebilirsiniz ama bunun için kutuyu işaretlemeniz gerekir; yalnız ne yaptığınızı biliyorsanız yapın.

**Adım 7 — Doğrulayın ve (isteğe bağlı) ölçümü kurun**
- Yeni sunucu tabloda "Aktif" görünmeli. Sunucu 1 dolana kadar yeni işletmeler yine Sunucu 1'e gider; "SIRADAKİ" etiketi hangi sunucuya gidileceğini gösterir.
- Yeni işletmeleri hemen yeni sunucuya yönlendirmek isterseniz Sunucu 1'de **"Yeni kayıt almayı durdur"** düğmesine basın.
- CPU/RAM ölçümü için: Supabase'e `WAHA_METRICS_SECRET_2` secret'ı ekleyin ve yeni sunucuya ölçüm betiğini kurun (adımlar: `docs/waha4/KURULUM.md`). Betikte `SERVER_ID` olarak bu sunucunun kimliği kullanılır; kimliği Claude'dan ya da yönetici veritabanı kaydından alın.
- Birkaç gün sonra ölçüme bakıp "Kapasiteyi değiştir" ile gerçekçi bir üst sınır girin.

**Sık yapılan hatalar (sarı uyarı kutusu, madde madde):**
- Anahtar değerlerini forma yazmak (yalnız secret **adı** yazılır).
- Webhook anahtarını sonradan değiştirip "Webhook ayarını yenile"ye basmamak: bot, yenileme yapılana kadar mesajlara cevap vermez. Anahtarı değiştirirseniz hemen o sunucunun satırında **"Webhook ayarını yenile"**'ye basın.
- Aynı sıra numarasını iki sunucuda kullanmak ("Bu sıra numarası başka bir sunucuda kullanılıyor" hatası verir).
- WAHA'yı `http://` ile açık bırakmak.

## Kontroller (push öncesi; AYNEN rapora)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh apps/ledger apps/admin
EXTRA_TSC_FLAGS="--allowImportingTsExtensions" bash scripts/ci/check-names.sh supabase/functions
node scripts/ci/check-root-map.mjs
cd apps/admin && npm run build   # çıktının TAMAMI, son satıra kadar
```
Push → CI "completed successfully" → `KONTROL 5 — ledger <commit>`.

## Kabul (Claude kontrol eder)
| # | Ölçüt |
|---|---|
| 1 | Sayfada formun üstünde kapalı bir "Yeni sunucu nasıl eklenir?" kutusu var; açınca 7 adım ve "Sık yapılan hatalar" görünür |
| 2 | Metin bu belgedekiyle aynı; sır değeri ya da gerçek anahtar yok |
| 3 | Kod blokları (Caddy ve openssl) taşmadan yatay kaydırılır; telefon genişliğinde sayfa bozulmaz |
| 4 | Başka hiçbir dosya değişmedi (yalnız yeni bileşen, `page.tsx`'te iki satır, README) |
| 5 | `npm run build` hatasız |
