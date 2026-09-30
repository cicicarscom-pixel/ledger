# "Bağlantıyı Kes / İptal Et" Entegrasyon Planı

Ledger (Web) ve Flow (Mobil) uygulamaları için bağlantı kesme veya beklemedeki davetleri iptal etme senaryolarını devreye alacağız. 

Bu işlemlerin güvenli bir şekilde yapılabilmesi için aşağıdaki planı hazırladım:

## 1. Veritabanı (Supabase SQL)
Mobil kullanıcının yalnızca kendi işletmesinin aktif bağlantısını güvenli şekilde kesebilmesi için yeni bir RPC fonksiyonu eklenecek:
- `disconnect_accountant()`: Bu fonksiyon `auth.uid()` üzerinden organizasyonu tespit edecek ve `accountant_taxpayer_links` tablosundaki `status` alanını `active` konumundan `disconnected` konumuna alacak (ve `disconnected_at` tarihini kaydedecek).

## 2. Mobil Uygulama (AI-Esnaf)
`MuhasebecimScreen.js` ekranındaki **Bağlı (Connected)** durum paneline "Bağlantıyı Kes" butonu eklenecek.
- Kullanıcı butona bastığında onay penceresi çıkacak ("Emin misiniz?").
- Onaylanırsa `supabase.rpc('disconnect_accountant')` çağrılacak.
- Başarılı yanıtta ekran başa (`initial` state) dönecek.

## 3. Ledger (Web) Paneli
- **Server Action:** Müşavirin bir bağlantıyı kesebilmesi için `disconnectClientAction.ts` adında yeni bir Next.js server action yazılacak. Bu action `accountant_taxpayer_links` statüsünü güncelleyecek.
- **Arayüz (ClientConnection.tsx):** 
  - Şu anda sadece bekleyenler için var olan "İptal Et" butonu bu action'a bağlanacak.
  - Aktif bağlanan mükellefler için (isConnected = true) "Bağlantıyı Kes" butonu eklenecek ve yine aynı action'a bağlanacak.
  - İşlem sonrası sayfa yenilenecek (veya router.refresh ile güncel liste getirilecek).

Bu işlem planını onaylıyor musunuz? (Proceed derseniz hemen RPC fonksiyonunu ve kodları yazmaya başlayacağım.)
