# TALİMAT 83 — Flow AI: tüm uygulamayı bilen yardım kataloğu (ledger, 1 yama, `flow-ai-agent` deploy)

**Sorun:** Kullanıcı Flow AI'a bir düğmeyi/işlemi sorunca ("yeni takvim nasıl eklenir") "yardım başlığım yok / bilmiyorum" diyordu. Neden: yardım içeriği yalnız 5 elle yazılmış konuydan oluşuyordu; eşleşme olmayınca araç "bilmediğini söyle" talimatı veriyordu.
**Çözüm (genel, tek seferlik):**
1. **Katalog:** `helpTopics.ts` artık **34 konu** içerir ve uygulamadaki **her ekranı** kapsar (Anasayfa, Profil, Bildirimler, Randevu [oluşturma/iptal/rezerve/takvim-personel ekleme ve yönetimi], Hizmet Ayarları, Müşteriler, Ai Asistan/WhatsApp [bağlama, Drive, kişilik, talimat, canlı test, randevu ayarları, sıfırlama], Sosyal Medya [hesap bağlama, asistan, Paylaşım Merkezi, Tüm Gönderiler], Gelen Kutusu [mesaj/yorum/değerlendirme], Analiz, Ai Muhasebe [gelir/gider girişi, Ödeme Takvimi, İşletmem, Muhasebeci Bağlantısı]). İçerik **kodun kendisinden** (ekran dosyaları + `tr.json` etiketleri) çıkarıldı; düğme adları birebir.
2. **Arama:** Türkçe ek/kök eşleşmesi, ifade ağırlığı, en fazla 3 sonuç.
3. **Araç davranışı:** eşleşme yoksa "bulunamadı" yerine **tüm katalog** döner; model en yakın konuyu seçer.
4. **Sistem istemi kural 14:** uygulama sorusunda asla "bilmiyorum" denmez; katalogdan yanıtlanır, katalogda olmayan özellik uydurulmaz. Web için ek not.
5. **Kalıcı koruma:** `helpTopics.test.ts` (CI listesine eklendi) — her `FLOW_SCREENS` ekranının en az bir konusu olmalı + **57 gerçek kullanıcı cümlesi** doğru konuya düşmeli. Yeni ekran/düğme eklenince katalog güncellenmezse CI kırmızı olur.

**Depo:** ledger. **Başlangıç:** `origin/main` = `0901891`. **Yama:** `docs/patches/87-ledger-flow-ai-yardim-katalogu.patch` (1 commit; `helpTopics.ts`, `helpTopics.test.ts`, `FlowTools.ts`, `FlowPromptBuilder.ts`, `.github/workflows/ci.yml`).
**Claude'un yerelde doğrulaması:** yama temiz uygulanıyor; `helpTopics.test.ts` (4 test, 57 soru) ve `FlowTools.test.ts` (12) ile `FlowPromptBuilder.voice.test.ts` (2) **geçti**.

## Yapılacaklar
1. K1 (ledger).  2. `git am --3way docs/patches/87-ledger-flow-ai-yardim-katalogu.patch` (içerik değişmez, `--amend` yok).
3. K4 push; **GitHub Actions yeşil** (yeni `helpTopics.test.ts` CI'da çalışır).
4. **Deploy (K6, yalnız bu fonksiyon):** `npx supabase@latest functions deploy flow-ai-agent --project-ref qybzidylewzsnmlofjul --use-api` — çıktı AYNEN. Başka fonksiyon deploy etme (`zernio-webhook`, `persona-test`, `process-ai-jobs` canlı paketleri eski: dokunma).
5. Mobil/web derleme yok; web'e dokunma.

## Kullanıcı testi (derleme gerekmez; Flow AI'ı mevcut uygulamada dene)
Şunları sor, "bilmiyorum" gelmemeli ve düğme adları doğru olmalı:
- "yeni takvim nasıl ekleyeceğim" / "personel nasıl eklenir"
- "randevuyu nasıl iptal ederim", "öğle arasını nasıl kapatırım"
- "müşteri nasıl eklerim", "hizmet fiyatlarını nereden değiştiririm"
- "whatsapp'ı nasıl bağlarım", "asistanın karakterini nasıl değiştiririm"
- "fatura nasıl yüklerim", "ödemeyi ödendi nasıl işaretlerim", "muhasebeciye nasıl bağlanırım"
- "instagram hesabımı nasıl bağlarım", "gönderiyi nasıl silerim", "yorumlara nasıl cevap veririm"
- Katalogda olmayan bir şey (ör. "uçak bileti al"): uydurmadan, uygulamada olanları önermeli.
Yanlış/eksik yanıt gördüğün soruyu aynen yaz; kataloğa eklenir.
