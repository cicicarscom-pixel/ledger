# TALİMAT 61 — Kalite Faz 7: veritabanı sertleştirme (SQL — kullanıcı çalıştırır)

**Kim:** Kullanıcı (Supabase SQL Editor). Ajan gerekmez. **Migration:** `supabase/migrations/20261009000004_function_search_path_and_anon_execute.sql`.

## Ne yapar
1. **21 fonksiyonda `search_path` sabitlenir** (`public, pg_temp`). Gövdeler değişmez. (Linter 0011)
2. **`is_admin()`, `check_accountant_document_access(uuid)`, `org_today(uuid)`**: `anon`/PUBLIC EXECUTE kaldırılır; oturumlu kullanıcı + `service_role` kalır. (Linter 0028)
3. Bu fonksiyonları çağıran **8 RLS politikası** `public` → `authenticated` rolüne taşınır (hepsi `auth.uid()` kullandığı için anon zaten hiçbir satır göremiyordu; böylece anon sorgularında "permission denied" çıkmaz).

## Güvence
- Tek işlem; sonundaki doğrulama bloğu başarısızsa **hepsi geri alınır**.
- Aynı betik canlıda `ROLLBACK`'li denendi: tüm komutlar geçerli, doğrulama geçti, anon sorgu sayıları değişmedi (profiles 0, organizations 0, finance_documents 0, notifications 0, ai_communication_logs 0, broadcast_notifications 9).
- Geri alma: `docs/supabase/20261009000004_geri_alma.sql`.

## Çalıştırma
1. Supabase → SQL Editor → New query → migration dosyasının **tamamını** yapıştır (Ctrl+A ile eski metni sil) → Run.
2. Sonuç "Success" olmalı. Hata verirse çıktıyı Claude'a gönder; **tekrar çalıştırma**.
3. "Claude'a: çalıştırdım" yaz → Claude canlıyı doğrular (advisor + işlev testleri).

## Bilerek yapılmayanlar
- **Eklentiler `public` şemasında (`vector`, `pg_net`, `btree_gist`):** taşımak `vector` tipi ve `pg_net` kullanan fonksiyonları/tabloları bozabilir; planlı bakım penceresi gerekir. Risk düşük (eklenti fonksiyonları RLS ile korunan veriye erişmez). Faz F ile birlikte ele alınacak.
- **"RLS açık, politika yok" (20 tablo, INFO):** bilinçli kilit (yalnız service_role/definer RPC erişir: WAHA, muhasebeci yapay zekâ tabloları vb.). Kullanıcı arayüzü bu tablolara doğrudan erişmiyor.
- **Sızdırılmış parola koruması:** Supabase Pro planı özelliği; plan yükseltilince açılır (Authentication → Sign In / Providers → Password security).
- **Oturumlu kullanıcıya açık 42 `SECURITY DEFINER` RPC:** uygulamanın API'si; incelendi — `admin_*`/`get_waha_*` içeride `is_admin()` kontrol ediyor, `resolve_zernio_profile_for_platform` üyelik kontrolü yapıyor, `resolve_accountant_code` `auth.uid()` kontrol ediyor.
