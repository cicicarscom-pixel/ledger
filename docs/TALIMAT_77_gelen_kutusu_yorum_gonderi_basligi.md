# TALİMAT 77 — Gelen Kutusu › Yorumlar: "Gönderi detayı bulunamadı" düzeltmesi (ledger + flowweb, 2 yama, deploy)

**Sorun:** Yorumlar sekmesinde her gönderi "Gönderi detayı bulunamadı." ve gri görsel gösteriyor.
**Kök neden (canlı veriyle doğrulandı):** `comments` tablosundaki 39 yorumun hepsinde `post_id` boş; yorumlardaki 6 `zernio_post_id` için `posts` tablosunda satır yok. Başlık `posts.content`, görsel `posts.media_urls[0]` alanından geliyor; ikisi de bulunamıyor. (9D'den bağımsız, eski veri durumu.)
**Çözüm:** `zernio-client` › `sync-comments`, Zernio `listInboxComments` yanıtındaki `content` ve `picture` ile yorum alan her gönderi için eksik `posts` kaydını oluşturur, boş alanları doldurur ve sahipsiz yorumları (`post_id` boş, kendi işletmesinin) bağlar. Web, senkronizasyondan sonra yorumları bir kez yeniden yükler.

## Yamalar
| # | Depo | Başlangıç | Yama |
|---|---|---|---|
| 81 | **ledger** | `origin/main` = `0bbf2b0` | `docs/patches/81-ledger-sync-comments-posts-kaydi.patch` (1 commit, `supabase/functions/zernio-client/index.ts`) |
| 80 | **flowweb** | `origin/main` = `d85a3f8` | `docs/patches/80-flowweb-yorum-gonderi-baslik.patch` (1 commit, `gelen-kutusu/page.tsx` + README) |

Claude yerelde doğruladı: iki yama temiz uygulanıyor; flowweb'de `tsc` boş, check-bom/names OK, ESLint 0/24 (taban aynı); edge function söz dizimi temiz.

## Sıra (önce ledger, sonra web)
1. **K1** her iki depoda (tutmazsa DUR).
2. **ledger:** `git am --3way docs/patches/81-ledger-sync-comments-posts-kaydi.patch` → K4 push → CI yeşil.
3. **Deploy (K6, yalnız bu fonksiyon):** `npx supabase@latest functions deploy zernio-client --project-ref qybzidylewzsnmlofjul --use-api` — çıktı AYNEN.
4. **flowweb:** `git am --3way docs/patches/80-flowweb-yorum-gonderi-baslik.patch` → yedi kontrol AYNEN → K4 push → GitHub Actions yeşil, Vercel Ready.
5. ESLint tabanına dokunulmaz; `--amend` yok; mobil derleme yok.

## Kullanıcı testi
Gelen Kutusu › Yorumlar sayfasını aç (yorumlar senkronizasyondan sonra kendiliğinden yenilenir, gerekirse sayfayı bir kez yenile): gönderi başlığı ve görseli görünmeli. Hâlâ "Gönderi detayı bulunamadı" kalan varsa kaç tane olduğunu ve ekran görüntüsünü gönder (Facebook'un kendi ID biçimindeki eski bir gönderi, Zernio'nun eşleştiremediği bir kayıt olabilir; Claude veriyi inceler).
