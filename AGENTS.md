## 🚨 Kritik Kural: Deploy Süreci ve Yasaklı Fonksiyonlar
Deploy komutları ASLA toplu (supabase functions deploy argümansız) çalıştırılmaz, her zaman hedef fonksiyon adıyla tek tek çalıştırılır. Deploy sırasında yasaklı veya hedef dışı bir fonksiyonda hata çıkarsa, o dosyaya dokunulmaz — durum olduğu gibi raporlanır ve talimat beklenir.

| flow-reset-ai-data | Test/müşteri veri sıfırlama — sadece organization_id/profile_id/merchant_id filtresiyle çalışır, bağlantı verilerine (bot_settings, social_accounts) dokunmaz. |
---
## [16.09.2026] Zernio Senkronizasyon, UI Bug Fix'leri ve Veri Kaybı Önlemleri
- **Bug 1 (UI Flicker):** Sosyal Medya sayfasında (flowweb) her girişte hesap listesinin boşalıp Zernio'dan yanıt dönene kadar dönüp durması sorunu çözüldü. `useEffect` içerisinde `fetchAccounts(false)` çağrılarak yerel verinin anında render edilmesi, arka planda ise Zernio senkronizasyonunun sessizce devam etmesi sağlandı.
- **Bug 2 (Silinemeyen Bağlantılar):** Zernio'da halihazırda kopmuş (needs_reconnection=true) olan hesapların, "Yeniden Bağlan" kartlarındaki çöp kutusuna basıldığında `disconnectAccount` API'sinden dönen "404 Not Found" hatası nedeniyle yerelden silinememesi sorunu çözüldü. Artık "not found" durumunda yerel veritabanındaki kayıt güvenle siliniyor (ledger-repo / zernio-client).
- **Bug 3 (Kritik Veri Kaybı Önlemi):** `zernio-client` içindeki `sync-posts` işleminin, boş/yeni bir profile bağlandığında Zernio'dan boş liste dönmesi sonucu yerel veritabanındaki tüm eski gönderileri (sanki silinmişler gibi) kalıcı olarak silmesi engellendi. `postsList.length === 0` durumunda silme bloğu tamamen atlanarak güvenlik kemeri eklendi.
- **Bug 4 (TikTok Caption Kaybı & ID Uyuşmazlığı):** TikTok gönderilerindeki "Gönderi detayı bulunamadı" hatasını çözmek için webhook içine REST fallback'i eklendi. Ancak webhook'un döndürdüğü TikTok'a ait native ID ile Zernio'nun REST API'sindeki Mongo tabanlı ID eşleşmediği için fallback çalışmadı. Çözüm olarak `zernio-client` içine `ZERNIO_POST_PLATFORMS_RAW` logu eklendi; buradan TikTok'un gerçek native ID'sinin nasıl geldiği tespit edilip ID eşleştirme ve temizlik yapılacak.

## [25.09.2026] AI Asistan Çoklu Takvim (Faz 5) Geçişi ve Bildirim FK Hatalarının Giderilmesi
- **Çoklu Takvim Geçişi (Faz 5):** AI Asistan'a ait randevu sistemi başarıyla Faz 5'e (Çoklu Takvim / Çoklu Hizmet) yükseltildi. Bot artık 'multi_calendar_enabled' ayarını okuyup, aktif takvimleri (doktorları) ve hizmet listesini kullanarak randevu kararlarını alabiliyor. \waha-webhook\ altındaki PromptBuilder güncellendi.
- **Bug 1 (Owner_id vs ID Kargaşası & Bildirim FK Hatası):** Waha'dan (WhatsApp webhook) gelen \merchantId\'nin aslında \owner_id\ olmasından dolayı, \AppointmentRepository\ içindeki bildirim oluşturma (\
otifications.profile_id\) ve randevu oluşturma kısımlarının hatalı foreign-key'ler (owner_id) ile çalışmaya çalışıp patlaması engellendi. Çözüm olarak \HandleIncomingMessageUseCase\ içinde \owner_id\ üzerinden \organizations.id\ sorgulanarak AI context'e gerçek organizasyon ID'si basıldı.
- **Deno Deploy Fixes:** \shared/infrastructure/zernio/types.ts\ dosyasındaki typescript (union type) hatası ve \ZernioClient.ts\ içindeki \ZERNIO_API_KEY\ yokluğunda patlayan fırlatıcı engellenerek \waha-webhook\ fonksiyonunun Vercel benzeri Edge Runtime üzerine (Deno) başarılı bir şekilde deploy alınması sağlandı.
- **Hafızayı Sıfırlama UI:** Flowweb panelinde 'Ai Asistan -> Randevu' sayfasına, testleri kolaylaştırmak adına \i_communication_logs\ tablosunu (ilgili işletme için) temizleyen 'Hafızayı Sil (Test)' butonu eklendi.


## Session: Phase 1 (Draft Engine) - Anti-Hallucination & Timezone Fixes
**Date**: 2026-09-26

### Core Issues Addressed
1. **AI Hallucinations on Booking Actions**: 
   The AI claimed to have created or updated appointments without actually successfully calling the required tools (e.g., `create_pending_appointment`). It also claimed time slots were full without calling `list_available_slots`.
   - **Solution**: Implemented an end-of-turn check in `AIOrchestrator.ts`. A regex-based unicode-aware check catches Turkish and English phrases like "oluşturdum", "ayarladım", "booked". If these exist in the output text but a successful tool call wasn't made, the Orchestrator injects a hidden system error instructing the AI to actually call the tools. If it persists, it blocks the message completely.
2. **Timezone Offset Bugs (3-Hour Shift)**: 
   The AI (via WhatsApp) sent local time (e.g., 11:00) without offset, which Deno's `new Date()` interpreted as UTC, shifting it by 3 hours when converted back to Istanbul time.
   - **Solution**: Added `localToUtc` and `offsetAt` custom functions to `AppointmentRepository.ts` to perform robust local-to-UTC conversion matching the `flowweb` implementation. `starts_at` is now correctly saved in UTC, and the `timezone` column is populated. The legacy `date` column is no longer written directly (relies on DB trigger).
3. **Prompt Conflicts & Deprecations**: 
   Rule 2 and Rule 10 in `PromptBuilder.ts` conflicted regarding asking for services. The `update_appointment` tool was causing hallucinated moves because it only updated the legacy date field and returned fake successes.
   - **Solution**: Merged the service rules, instructing the AI to gracefully fallback to `customerRequestRaw` without forcing questions if no services exist. Added the WhatsApp single-star formatting rule. Temporarily removed `update_appointment` from `ToolRegistry` and removed prompt references (Rule 6g, Rule 8) until the proper reschedule mechanics are ready.
4. **Security Vulnerability**: 
   Hardcoded WAHA API Key and IP address in `WahaClient.ts`.
   - **Solution**: Migrated credentials to Supabase Secrets (`WAHA_API_KEY` and `WAHA_BASE_URL`) accessed via `Deno.env.get()`.
5. **Frontend Label Bug**:
   Doctor labels were failing to display on the timeline if no specific calendar was filtered.
   - **Solution**: Fixed the condition `activeCalendarId === null` in `RandevuClient.tsx` so doctor labels appear on all views.

### Action Plan Achieved
- `waha-webhook` edge function successfully deployed to Supabase.
- `flowweb` frontend UI fixes and timezone support committed and pushed to Vercel.
- Project architectural README updated.
