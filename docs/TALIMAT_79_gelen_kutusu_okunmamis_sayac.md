# TALİMAT 79 — Gelen Kutusu sekme sayaçları: okunmamış (ledger + flowweb, 2 yama)

**Sorun:** Mesajlar/Yorumlar/Değerlendirmeler sekmelerindeki rozet toplam sayıyı gösteriyordu ("2" = iki sohbet, "39" = tüm yorumlar), sekme açıkken bile duruyordu. Yorumlarda okundu bilgisi hiç yoktu.
**Çözüm:** `comments.is_read` (Claude canlıda uyguladı: mevcut yorumlar okundu, yenileri okunmamış). Web: rozet = okunmamış sayısı (Mesajlar: `unread_count > 0` sohbet; Yorumlar: `is_read = false`; Değerlendirmeler: yanıtsız; Bildirimler zaten okunmamış). Sohbet ya da gönderi açılınca okundu işaretlenir.

| # | Depo | Başlangıç | Yama |
|---|---|---|---|
| 84 | ledger | `origin/main` = `9840496` | `docs/patches/84-ledger-comments-is-read-migration.patch` (yalnız migration dosyası; veritabanı zaten güncel) |
| 83 | flowweb | `origin/main` = `23604bb` | `docs/patches/83-flowweb-gelen-kutusu-okunmamis-sayac.patch` (1 commit) |

Claude yerelde doğruladı (flowweb): `tsc` boş, ESLint 0/24 (taban aynı), check-bom/names OK.

## Yapılacaklar
1. K1 (iki depo).  2. ledger: `git am --3way` yama 84 → K4 push → CI yeşil. **Deploy yok.**
3. flowweb: `git am --3way` yama 83 → yedi kontrol AYNEN → K4 push → GitHub Actions yeşil, Vercel Ready.
4. `--amend` yok, ESLint tabanına dokunulmaz.

## Kullanıcı testi
Gelen Kutusu: Mesajlar ve Yorumlar rozetleri artık yok (okunmamış yok). Başka birinden yeni yorum/DM geldiğinde ilgili rozet çıkar, sohbeti/gönderiyi açınca söner.
