# TALİMAT 47 — Web Anasayfa "Yaklaşan Randevular" boş durum metni (flowweb)

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK (README satırı yamanın İÇİNDE; ortamda betik bırakma); `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Veritabanına/Edge Function'a DOKUNMA; deploy YOK. Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## Belirti (kullanıcı, 09.10.2026)
Web Anasayfa: "Bugünkü Randevular" 13:00 randevusunu gösterirken, yanındaki "Yaklaşan Randevular" kutusunda "Bugün için planlı randevu yok." yazıyor (çelişki).

## Kök neden
`(dashboard)/page.tsx`: "Yaklaşan Randevular" kutusunun boş durumu `todayEmpty` ("Bugün için planlı randevu yok.") anahtarını kullanıyordu (kopyala-yapıştır hatası). Kutu zaten "yarın ve sonrası" randevuları listeler; bugünküler soldaki kutudadır. Veri doğru; yalnız metin yanlıştı. Mobil doğruydu ("Yaklaşan randevu veya rezervasyon bulunmuyor.").

## Yama (5 dosya)
`messages/{tr,en,de}.json`: yeni `dashboardAppointments.appointments.upcomingEmpty`; `page.tsx`: boş durum bu anahtarı kullanır; `README.md`: 1 satır.

## Adımlar
1. K1 (flowweb `main`, temiz; başlangıç `3c8c2e0`). `git am --3way <ledger yolu>/docs/patches/47-flowweb-yaklasan-bos-metin.patch`.
2. Kontroller (AYNEN; hepsi OK): `bash scripts/ci/check-bom.sh`; `bash scripts/ci/check-names.sh src`; `node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de`; `node scripts/ci/check-root-map.mjs`; `git show --stat --oneline HEAD` (5 dosya); `git status -sb`.
3. K4 push + CI yeşil. Rapor sonu: `KONTROL 47 — flowweb <commit>`.

## Kullanıcı testi (Vercel sonrası, Ctrl+F5)
Anasayfa: "Yaklaşan Randevular" kutusunda (yarın ve sonrası randevu yoksa) "Yaklaşan randevu veya rezervasyon bulunmuyor." yazmalı; "Bugünkü Randevular" aynen kalır.
