# TALİMAT 78 — Yorum gönderi başlığı: kimlik uyuşmazlığı düzeltmesi (ledger, 1 yama, deploy)

**Durum:** Talimat 77 canlıya çıktı ama yorumlar hâlâ bağlanmadı (canlı veri: 39 yorum, 0 bağlı, 0 stub).
**Kök neden (Zernio yanıtıyla doğrulandı):** Gelen kutusu listesi (`listInboxComments`) **platform kimliklerini** döndürüyor (`299546523968023_…`, YouTube video kimliği). Yorumlarda kayıtlı kimlik ise **Zernio gönderi kimliği** (`6ac…`). İki kimlik hiç eşleşmediği için stub oluşmadı.
**Çözüm:** `sync-comments`, `post_id` boş yorumların Zernio kimliklerini toplar, `posts` kaydı olmayanlar için gönderiyi Zernio'dan doğrudan çeker (`getPost`: metin + medya) ve `posts` kaydını oluşturur; ardından mevcut sahipsiz-yorum bağlama adımı yorumları bağlar. `PostApi.getPost` eklendi. 5 kimlik canlıda denendi: hepsi içerik ve video adresi döndürdü.

**Depo:** yalnız **ledger**. **Başlangıç:** `origin/main` = `10525c0`. **Yama:** `docs/patches/82-ledger-sync-comments-getpost.patch` (1 commit; `zernio-client/index.ts` + `shared/.../PostApi.ts`). Web değişmez.

## Yapılacaklar
1. K1 (ledger).  2. `git am --3way docs/patches/82-ledger-sync-comments-getpost.patch` (içerik değişmez, `--amend` yok).
3. K4 push; GitHub Actions yeşil.
4. Deploy (K6): `npx supabase@latest functions deploy zernio-client --project-ref qybzidylewzsnmlofjul --use-api` — çıktı AYNEN.
5. Başka dosyaya dokunma, derleme yok.

## Kullanıcı testi
Gelen Kutusu › Yorumlar sayfasını aç (senkronizasyon sonrası liste kendiliğinden yenilenir, gerekirse bir kez yenile): gönderi başlıkları ve görselleri görünmeli.

## Temizlik (kullanıcı, panel)
Supabase Dashboard › Edge Functions › `tmp-inbox-diag` fonksiyonunu **sil** (tanılama için geçici açıldı, şu an yalnızca 410 döndürüyor; MCP ile silinemedi).
