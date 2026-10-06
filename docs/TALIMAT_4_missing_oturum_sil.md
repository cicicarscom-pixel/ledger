# TALİMAT 4 — "WAHA'da oturumu olmayan" satırda "bağlantıyı kes" = atamayı sil

Önce `TALIMAT_00_sira_ve_ortak_kurallar.md` kurallarını oku; hepsi geçerli. **Veritabanına dokunma** (gereken işlev canlıda: `release_waha_assignment(p_org uuid)`, yalnız `service_role`).

## Sorun
Admin paneli → "WhatsApp Bağlantıları" sayfasında `MISSING` ("Atanmış, WAHA'da yok") satırlarında düğmeye basınca "Bağlantı kesilemedi. Lütfen tekrar deneyin." çıkıyor. Sebep: `admin-waha` `disconnect` eylemi oturumu WAHA'da bulamayınca **404 "Oturum bulunamadı"** döndürüyor; `supabase.functions.invoke` bunu hata sayıyor. Oysa kesilecek bir şey yok; yapılması gereken, boşta kalan **atama kaydını** (`waha_session_assignments`) silmek.

## Karar (kullanıcı): "oturum zaten yoksa doğrudan sil"

## 1. `supabase/functions/admin-waha/index.ts` — yalnız `disconnect` eylemi
Mevcut sunucu döngüsünü şöyle genişlet (başka eyleme dokunma):
1. Döngüde **hangi sunucuların çevrimdışı olduğunu** da tut (`listSessions(s)` `null` döndürürse o sunucu çevrimdışı; `list` eyleminde `offlineServers` kümesi zaten böyle kullanılıyor).
2. Oturum **hiçbir sunucuda bulunamazsa**:
   - **Çevrimdışı sunucu varsa** (bir sunucu yanıt vermedi): **silme.** `{ error: "Sunucuya ulaşılamadı; oturum durumu doğrulanamadı", code: "SERVER_UNREACHABLE" }` ve HTTP **503** döndür. (Oturum o sunucuda olabilir; yanlışlıkla atama silinmemeli.)
   - **Bütün aktif sunucular yanıt verdi ve oturum yoksa**: `organizations` tablosundan `owner_id = session` ile işletmeyi bul; varsa `admin.rpc('release_waha_assignment', { p_org: org.id })` çağır. Sonra `organization_audit_events` tablosuna mevcut `disconnect` yolundaki kalıpla bir kayıt ekle (`event_type: "waha_assignment_released_by_admin"`, `new_data: { session, reason: "no_waha_session" }`, `source: "admin-waha"`, `actor_user_id: user.id`).
   - Yanıt **HTTP 200**: `{ success: true, removedAssignment: true, steps: { assignment: "ok" } }`. İşletme bulunamazsa yine 200 `{ success: true, removedAssignment: false }` (silinecek bir şey yok).
3. Oturum bulunursa **mevcut davranış aynen kalır** (logout → stop → delete; ayrıca atamayı silme).
4. Başka hiçbir mantık değişmez; `refresh-webhooks`, `list`, `test-connection` dokunulmaz.

## 2. `apps/admin/src/app/(dashboard)/whatsapp/actions.ts`
`disconnectWhatsappSession` sonucunu şöyle ayır:
- `data?.removedAssignment === true` → `{ ok: true, message: 'WAHA'da oturum yoktu; sunucu ataması silindi.' }`
- `data?.removedAssignment === false` → `{ ok: true, message: 'Silinecek bir atama bulunamadı.' }`
- hata gövdesinde `code === 'SERVER_UNREACHABLE'` ise → `{ ok: false, message: 'WAHA sunucusuna ulaşılamadı; oturum durumu doğrulanamadı. Daha sonra tekrar deneyin.' }` (`error.context.json()` ile gövdeyi oku; `WahaService.ts` / `waha.ts` içindeki `try { code = (await error.context?.json?.())?.error ... }` kalıbı gibi).
- Diğer durumlar **aynen** (mevcut iletiler).

## 3. `apps/admin/src/app/(dashboard)/whatsapp/DisconnectButton.tsx` ve `page.tsx`
- `DisconnectButton`'a isteğe bağlı `missing?: boolean` özelliği ekle. `missing` ise:
  - onay metni: `${label} işletmesinin WAHA'da oturumu yok. Sunucu ataması silinecek (işletme WhatsApp'ı yeniden bağlayınca otomatik yeniden atanır). Devam edilsin mi?`
  - düğme `title`'ı: "Sunucu atamasını sil".
- `page.tsx` içinde `<DisconnectButton ... />` çağrısına `missing={r.missing_in_waha}` ekle (yalnız bu satır).

## Kontroller (ortak ledger bölümü) ve rapor
`bash scripts/ci/check-bom.sh`, `check-names.sh apps/ledger apps/admin`, `EXTRA_TSC_FLAGS=... check-names.sh supabase/functions`, `check-root-map.mjs`, **`cd apps/admin && npm run build` (çıktının tamamı, son satıra kadar)**. README "Son Güncellemeler" maddesi. Push → CI "completed successfully" → `KONTROL 4 — ledger <commit>`.

## Deploy (yalnız Claude ONAY'ından sonra)
`npx supabase@latest functions deploy admin-waha --project-ref qybzidylewzsnmlofjul --use-api` (yalnız bu fonksiyon). Admin uygulamasını Vercel kendisi derler.

## Kabul (Claude kontrol eder)
| # | Ölçüt |
|---|---|
| 1 | `MISSING` satırında düğme "WAHA'da oturum yoktu; sunucu ataması silindi." der ve satır listeden kalkar |
| 2 | WAHA sunucusu erişilemezken aynı düğme **silmez**, "sunucuya ulaşılamadı" der |
| 3 | `WORKING` satırı (Fahri alem) **etkilenmez**; onun bağlantı kesme davranışı eskisi gibi |
| 4 | Silinen işletme WhatsApp'ı yeniden bağlayınca `assign_waha_server` onu yeniden atar (Claude veritabanında doğrular) |
| 5 | Denetim kaydı yazılır |
