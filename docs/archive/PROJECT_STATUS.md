# Workigom / AI Muhasebeci Proje Durumu

## Flow (Mobil/Mükellef Tarafý)
- Mobil arayüz ekranlarý (Müþavir ekleme, kod girme vb.) **zaten oluþturuldu.** Yeniden tasarlanmasýna gerek yok.
- Kod girme ve baðlantý onaylama adýmlarý mevcut.

## Ledger (Web/Müþavir Tarafý)
- Kayýt/Giriþ (Auth) ve Supabase baðlantýsý yapýldý.
- Zombi kullanýcý engelleyici ve güvenli kayýt (auth.actions.ts) devrede.
- Mükellefler (Clients) sayfasýndaki mock datalar kaldýrýldý. Gerçek Supabase verisi çekiliyor (get-clients.action.ts).
- Davet atma sisteminde gerçek firma ID'si dinamik olarak çekiliyor.

Lütfen yeni bir taska baþlarken bu dosyayý okuyun ve mevcut durumu göz önüne alýn.
