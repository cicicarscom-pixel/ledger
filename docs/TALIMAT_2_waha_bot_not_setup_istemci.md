# TALİMAT 2 — İstemciler: "bot kurulmamış" (`BOT_NOT_SETUP`) durumunu hata sayma (flow + flowweb)

Önce `TALIMAT_00_sira_ve_ortak_kurallar.md` kurallarını oku. **Bu iş iki ayrı depoda, ayrı commit'lerle yapılır** (önce flow, sonra flowweb). Çalışma klasörleri: `C:\flow`, `C:\flowweb`. Her depoda K1 çıktısı ayrı.

## Arka plan
WAHA-2'den beri `waha-session` Edge Function'ı, işletmeye henüz WhatsApp sunucusu atanmamışsa (`status`, `qr`, `stop`, `pairing-code` eylemlerinde) **HTTP 404 `{ success: false, error: 'BOT_NOT_SETUP' }`** döndürür. Yeni (henüz bot kurmamış) bir kullanıcı için bu **hata değil, "bağlı değil" durumudur**. Şu an:
- **Mobil:** `callWaha` 404'ü `Error('BOT_NOT_SETUP')` olarak fırlatır → `getSessionStatus` `{ data: null, error }` döner; arayüz bunu hata gibi işleyebilir.
- **Web:** `callWaha` `success:false` + genel "oturum bilgisi alınamadı" metni döner (hata mesajı gösterebilir).

## 1. flow (mobil) — yalnız `src/modules/sosyal_medya/infrastructure/services/WahaService.ts`
- `callWaha(body)` içinde, `error` bloğunda gövdeden okunan `code` değeri `'BOT_NOT_SETUP'` ise **ve** `body.action === 'status'` ise: **hata fırlatma**; `{ data: null, error: null }` döndür (günlüğe yazma).
- Diğer eylemlerde (`start`, `qr`, `pairing-code`, `stop`) davranış **aynen** kalır (`BOT_NOT_SETUP` orada gerçekten hata).
- `data.success === false && data.error === 'BOT_NOT_SETUP'` yolu için de aynı kural (status → boş veri).
- Başka dosya değişmez. Yeni i18n anahtarı gerekmez.

Kontroller: ortak kontroller (**flow** bölümü). Push → CI "completed successfully".

## 2. flowweb — yalnız `src/actions/waha.ts`
- `callWaha` imzasına isteğe bağlı üçüncü parametre ekleme; basit tut: işlev içinde `body.action === 'status'` ve gövdeden/`data`'dan gelen kod `'BOT_NOT_SETUP'` ise `return { success: true, data: null }` döndür.
- `startWahaSession`, `getWahaQrCode`, `getWahaPairingCode`, `stopWahaSession` (varsa) davranışı **aynen** kalır.
- `src/app/(dashboard)/ai-asistan/page.tsx` **değişmez** (zaten `success && data` kontrolü yapıyor; `data: null` "bağlı değil" demek).
- Yeni i18n anahtarı gerekmez (`messages/*.json` değişmez).

Kontroller: ortak kontroller (**flowweb** bölümü) + `npm run build` çıktısı (Vercel de çalıştırır; **tam çıktıyı, son satırlara kadar**, rapora yaz; kesme).

## README
İki depoda da `README.md` → "Son Güncellemeler": "[06.10.2026] WhatsApp durum sorgusunda 'bot kurulmamış' durumu hata sayılmaz (yeni kullanıcı)."

## Rapor ve onay
Her depo için ayrı K10 raporu; `KONTROL 2 — flow <commit>` ve `KONTROL 2 — flowweb <commit>`. **Deploy yok** (istemci; flowweb'i Vercel kendisi derler).

## Kabul
- Henüz sunucu atanmamış bir hesapla WhatsApp bağlantı ekranı açılınca hata/uyarı yok; "Bağlı değil" + QR/başlat düğmesi görünür.
- Atanmış (bugünkü) hesaplarda durum eskisi gibi çalışır (WORKING / STOPPED / SCAN_QR_CODE).
- `start` / `qr` / `stop` hataları hâlâ kullanıcıya hata olarak gösterilir.
