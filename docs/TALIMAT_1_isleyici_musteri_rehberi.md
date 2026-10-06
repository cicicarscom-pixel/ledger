# TALİMAT 1 — `ledger-isleyici-api`: müşteri rehberini yeni bağlantı tablosundan oku

Önce `TALIMAT_00_sira_ve_ortak_kurallar.md` kurallarını oku; hepsi bu iş için de geçerlidir.

## Sorun
`supabase/functions/ledger-isleyici-api/index.ts` içinde (yaklaşık 154–173. satırlar, "Fetch Customers (Müşteri Rehberi)" bloğu) müşteri rehberi **eski** `shared_accountant_taxpayer_links` tablosundan (`accountant_id`, `taxpayer_id`) okunuyor. Bu tablo artık kullanılmıyor; yeni model:

`accounting_firm_members (user_id → accounting_firm_id)` → `accountant_taxpayer_links (accounting_firm_id, taxpayer_organization_id, status)` → `organizations (id, name, owner_id)`; telefon `profiles.phone_number` (işletme sahibinin `profiles.id = organizations.owner_id`).

Sonuç: müşavirin Ledger AI sohbetinde "Müşteri Rehberi" boş geliyor; yapay zekâ mükellef adlarını tanıyamıyor. (Faturayı işleme akışı bundan etkilenmez; dokunma.)

## Yapılacak (yalnız bu dosya: `supabase/functions/ledger-isleyici-api/index.ts`)
1. Eski bloğu şu mantıkla değiştir (aynı `try { ... } catch(e) { console.warn(...) }` kalıbını koru; **hata asla isteği düşürmemeli**):
   1. `accounting_firm_members` → `select('accounting_firm_id').eq('user_id', callerId)`; kimlik olarak dosyada zaten kullanılan `callerId` kullanılır (`profile_id` istemciden geliyorsa **ona güvenme**).
   2. `accountant_taxpayer_links` → `select('taxpayer_organization_id').in('accounting_firm_id', firmIds).eq('status', 'active')`. **Yalnız `active`**; başka durum rehbere girmez.
   3. `organizations` → `select('id, name, owner_id').in('id', orgIds)`.
   4. `profiles` → `select('id, business_name, phone_number').in('id', ownerIds)` (sahip kimlikleri).
   5. Rehber satırı: `- İsim: <organizations.name ?? profiles.business_name ?? 'İsimsiz'>, Telefon: <phone_number ?? 'Yok'>, Müşteri ID: <organizations.id>`.
2. **"Müşteri ID" artık `organizations.id`'dir** (eskiden kullanıcı kimliğiydi). `resolveTargetOrg` (aynı dosya, 56–67. satırlar) `customerId` olarak doğrudan işletme kimliğini de kabul ediyor; **bu işlevi değiştirme.**
3. Liste en çok **200** işletmeyle sınırlanır (`.slice(0, 200)`); fazlası için rehber sonuna "(… ve N mükellef daha)" satırı.
4. `shared_accountant_taxpayer_links` ifadesi dosyada **hiç kalmamalı** (dosyada aratıp rapora yaz: `grep -n shared_accountant_taxpayer_links supabase/functions/ledger-isleyici-api/index.ts` → çıktı boş).
5. Dosyadaki diğer her şey (fatura işleme, `finance_documents` akışı, `transactions` yazımı, sütun eşlemesi A→R) **aynen kalır.**

## Kontroller
Ortak kontroller (ledger bölümü) + yukarıdaki `grep` çıktısı. Push → CI "completed successfully" → `KONTROL 1 — ledger <commit>`.

## Deploy (yalnız Claude ONAY'ından sonra)
```
npx supabase@latest functions deploy ledger-isleyici-api --project-ref qybzidylewzsnmlofjul --use-api
```
Yalnız bu fonksiyon. `ledger_mimar_google_api` deploy edilmez.

## Kabul (Claude kontrol eder)
- `grep` çıktısı boş; fonksiyonda yeni üç tablo sorgusu var; yalnız `active` bağlantı.
- Canlı: müşavir sohbetinde "Müşteri Rehberi" bağlı mükellefi listeler; mükellef adıyla yazılan gelir/gider doğru işletmeye yazılır; fatura işleme bozulmamış.
