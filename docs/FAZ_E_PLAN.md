# Faz E — Muhasebeci bağlantısı: durum tespiti ve E2 sertleştirme planı (Claude, 10.10.2026)

## Tespit: yaşam döngüsü ZATEN TAMAM (E1, 01.10.2026)
AGENTS.md "Faz E açık" diyordu; canlıda doğrulandı ki E1 uygulanmış ve çalışıyor:
- **Veritabanı:** tek model `accountant_taxpayer_links` (işletme–firma çifti için tek satır), durum makinesi tetikleyiciyle zorunlu (`pending_confirmation → active|rejected`, `active → disconnected|replaced`, `rejected|disconnected|replaced → pending_confirmation`), her geçiş `accountant_connection_events`'e ve (uygun olanlar) işletme bildirimine yazılıyor; **belgeye erişim yalnız `active`** (`check_accountant_document_access`).
- **RPC'ler:** `resolve_accountant_code`, `request_accountant_connection`, `get_my_accountant_connection`, `cancel_accountant_request`, `disconnect_current_accountant` (işletme); `review_connection_request`, `disconnect_taxpayer` (firma).
- **Ekranlar:** Flow web (`ai-muhasebe/muhasebecim`), Flow mobil (`MuhasebecimScreen`), Ledger paneli (kabul/ret/koparma eylemleri).
- **Test:** `supabase/tests/accountant_connection.sql` — **10.10.2026'da canlıda 14 kontrol geçti** (hepsi geri alınır): pending iken erişim yok, başka firma onaylayamaz, geçersiz geçiş reddi, firma değiştirme (`replaced`), kendi koparmasına bildirim yok, firma koparmasına bildirim var, olay kaydı eksiksiz.
- Eski tablolar (`ledger_accounting_firms`, `shared_accountant_taxpayer_links`, `accountant_clients`, `ledger_invitations`) **boş (0 satır)**.

## Bulunan boşluklar (E2 — küçük, güvenlik/kalite)
| # | Bulgu | Risk | Önerilen çözüm |
|---|---|---|---|
| E2-1 | **Kod tahmini/numaralandırma:** `connection_code` = `WG-` + 5 hane (~100 bin ihtimal). `resolve_accountant_code` oturumlu HERHANGİ bir kullanıcıya geçerli kod için firma adını döndürüyor; deneme sınırı yok. | Orta (firma adı sızıntısı; istek spamı) | Deneme günlüğü + sınır: kullanıcı başına 15 dk'da en çok 10 BAŞARISIZ kod → `RATE_LIMITED`. Başarılı çözümler sayılmaz. |
| E2-2 | **Üyesiz (sahipsiz) firmalar:** 13 firmadan 10'unun hiç üyesi yok (test/silinmiş hesap artıkları: "akbulut smm", "mehmet güleç"…). Kodları geçerli: bir işletme bu koda istek atarsa istek **hiç yanıtlanmaz** (sonsuza dek bekler). | Orta (kullanıcı deneyimi + sahipsiz kayıt) | `resolve`/`request`: üyesi olmayan firma → `CODE_NOT_FOUND`. Veri SİLİNMEZ (canlı veri onayı gerekir). |
| E2-3 | **Büyük/küçük harf:** `connection_code = btrim(p_code)` birebir; `wg-44062` bulunamıyor. | Düşük | Karşılaştırma `upper(...)`; kod saklama biçimi değişmez. |
| E2-4 | Firma tarafına yeni istek bildirimi yok (bildirim yalnız işletmeye gidiyor). | Düşük | Ledger panelinde bekleyen istek sayacı zaten listeleniyor mu kontrol edilecek; yoksa ayrı iş. |
| E2-5 | Ölü tablolar (4 adet, boş, politikasız). | Düşük | Ayrı onayla `DROP` (kullanılmadığı kod taramasıyla doğrulanacak). |

## E2 kapsamı (önerilen)
Tek migration (`…_accountant_code_hardening.sql`), geri alma dosyası, canlıda testli (mevcut 14 kontrole E2-1/E2-2/E2-3 için 4-5 yeni kontrol eklenir). **Veri silinmez, tabloya yalnız yeni günlük tablosu eklenir.**
İstemci etkisi: yeni durum `RATE_LIMITED` — web için çeviri anahtarı + mesaj (Vercel, hemen); mobil için aynı (mobil bekleme listesine #8). Eski mobil sürüm bilinmeyen durumu genel hata olarak gösterir (çökmez).

## Karar gereken
1. E2-1 + E2-2 + E2-3'ü yap (öneri: EVET).
2. E2-5 ölü tabloları sil (öneri: önce kod taraması, sonra ayrı onay).
3. Sahipsiz 10 firma kaydını silmek/etkisizleştirmek ister misin (canlı veri; yalnız onayınla). Öneri: şimdilik DOKUNMA, E2-2 onları zaten kullanılamaz yapar.


---
## E2 UYGULAMA SONUCU (10.10.2026)
**1) Kod sertleştirme — CANLIDA UYGULANDI.** Migration `20261010000001_accountant_code_hardening.sql` (geri alma: `docs/supabase/20261010000001_geri_alma.sql`).
- Kullanıcı başına 15 dk'lık pencerede 10 başarısız kod → `RATE_LIMITED` (geçerli kod olsa bile; başarılı çözümler sayılmaz).
- Üyesi olmayan firmanın kodu → `CODE_NOT_FOUND` (artık yanıtsız istek açılamaz; 10 sahipsiz firma fiilen kullanılamaz oldu).
- Kod büyük/küçük harf duyarsız.
- Yardımcı işlevler ve sayaç tablosu istemciye kapalı (anon/authenticated EXECUTE yok; RLS açık, politika yok).
- **Test:** yeni `supabase/tests/accountant_code_hardening.sql` → 7 kontrol; eski `accountant_connection.sql` → 14 kontrol; ikisi de canlıda yeşil (geri alınır).
- Web: Muhasebecim sayfası `RATE_LIMITED`'ı çevrili mesajla gösterir (yama 78, Talimat 75). Mobil: bekleme listesi #8.
- Not (araç): Supabase MCP gövdesinde `delete from`/`drop` geçen SQL'i onaya bağladığı için sayaç tasarımı silme içermez (kullanıcı başına tek satır).

**2) Sahipsiz 10 firma — SİLME BETİĞİ HAZIR, kullanıcı çalıştıracak.** Silmeden önce canlıda sayıldı: bağlı satır 0 (olay, belge, kural, görev, konuşma, karar, denetim). Betik: `supabase/migrations/20261010000002_remove_orphan_accounting_firms.sql` (ID listesi + "üyesi yok" + "bağlantısı yok" koşulları yeniden denetlenir). **Birebir geri yükleme yedeği:** `docs/supabase/20261010000002_sahipsiz_firmalar_yedek.sql`. Araç silmeyi onaya bağlayıp zaman aşımına uğradığı için SQL Editor'den çalıştırılacak (Faz 7'deki gibi). Sonuç beklenen: `DELETE 10`; sonra 13 → 3 firma.

**3) Eski tablolar — KOD TARAMASI: SİLİNMEMELİ.** Dördü de boş ama:
| Tablo | Kullanım |
|---|---|
| `ledger_accounting_firms` | `apps/ledger/modules/auth/application/auth.actions.ts` (firma kaydı/girişi) |
| `shared_accountant_taxpayer_links` | `apps/ledger/modules/flow-connections/…/connection.repository.ts`, `invitations/application/verify-otp.action.ts` |
| `ledger_invitations` | `apps/ledger` davet akışı (invitation.repository, cancel-invitation, get-clients) |
| `accountant_clients` | Canlı **`storage.objects` politikası `accountant_read_access`** (invoices/finance_receipts/documents) buna bakıyor; kodda kullanılmıyor |
Üçü canlı Ledger kodunun akışlarında; silmek davet/OTP/kayıt akışlarını bozar. `accountant_clients` yalnız bir depolama politikasında; tablo boş olduğundan politika fiilen "kimseye erişim verme" davranıyor, güvenli. Muhasebeci makbuz erişimi zaten `finance-receipt-url` fonksiyonuyla (yeni modelin `active` bağlantısı) yapılıyor. **Karar: dokunulmadı.** İleride: Ledger davet/OTP akışı ürün olarak kaldırılırsa tablolar + politika birlikte temizlenir.
