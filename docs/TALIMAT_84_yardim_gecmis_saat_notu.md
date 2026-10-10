# TALİMAT 84 — Flow AI yardım kataloğu: geçmiş saat notu (ledger, 1 küçük yama, `flow-ai-agent` deploy)

**Talimat 83'ün devamıdır.** Neden: kullanıcı boş saate dokununca menünün çıkmadığını bildirdi; kod doğruydu, ekranlardaki bütün saatler **geçmişti** (bugünün 36 saati ve 5 Ekim'in tamamı `past`; geçmiş hücreler dokunulamaz). Flow AI bunu anlatmalı.

**Sıra:** Talimat 83 henüz uygulanmadıysa önce 83'ü, sonra bu talimatı uygula. Zaten uygulandıysa yalnız bu talimat; **deploy yeniden** (aynı fonksiyon).
**Depo:** ledger. **Başlangıç:** `origin/main` = Talimat 83 sonrası commit. **Yama:** `docs/patches/88-ledger-yardim-gecmis-saat-notu.patch` (1 commit, yalnız `helpTopics.ts`; 87'den sonra temiz uygulanıyor, Claude doğruladı; `helpTopics.test.ts` geçti).

## Yapılacaklar
1. K1.  2. `git am --3way docs/patches/88-ledger-yardim-gecmis-saat-notu.patch`.
3. K4 push; **GitHub Actions yeşil**.
4. Deploy (K6): `npx supabase@latest functions deploy flow-ai-agent --project-ref qybzidylewzsnmlofjul --use-api` — çıktı AYNEN. Başka fonksiyon yok.

## Kullanıcı testi
Flow AI'a "yeni randevu nasıl eklenir" de: yanıtın sonunda geçmiş saatlerin soluk ve dokunulamaz olduğunu, yarın/ileri günlerin boş saatlerine dokunmak gerektiğini söylemeli. Uygulamada **yarın (11 Ekim) ya da 12 Ekim** gününü seç, boş bir saate dokun: "Randevu oluştur / Rezerve et" menüsü çıkmalı.
