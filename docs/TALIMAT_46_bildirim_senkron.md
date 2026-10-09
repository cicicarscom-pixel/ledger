# TALİMAT 46 — Anasayfa Randevu Bildirimleri randevularla senkron: ledger (migration) + flowweb + flow

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK (README satırları yamaların İÇİNDE; ortamda betik bırakma); `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. Üç **HAZIR YAMA** (K2): içeriklerini DEĞİŞTİRME. **EAS derlemesi BAŞLATMA.** Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## İstek (kullanıcı, 09.10.2026)
"Anasayfadaki randevu bildirimleri senkron olmalı; randevularda silinen randevular anasayfada görülmemeli."

## Çözüm (tek doğru kaynak)
Web ve mobil artık bildirimleri doğrudan `notifications` tablosundan OKUMAZ; iki sunucu fonksiyonunu çağırır:
- `get_appointment_notifications(p_limit)` → liste (en çok 100).
- `count_unread_appointment_notifications()` → zil sayacı.
Her ikisi: kimliği `current_org_id()` ile çözer; bildirimin randevusu (`metadata.appointment_id`) **silinmişse ya da `Cancelled` ise gizler**. (`delete_appointment` zaten bildirimi siliyordu; bu fonksiyonlar AI aracı, sıfırlama, doğrudan SQL gibi diğer silme yollarını ve iptalleri de kapsar.) Salt-okuma sorgusu canlıda denendi: 9 bildirimin 9'u görünür (hepsinin randevusu var).

## SIRA: önce veritabanı, sonra ekranlar
### 0) Veritabanı — KULLANICI yapar (Supabase SQL Editor; Claude'un MCP bağlantısı DDL'de zaman aşımına uğruyor)
`supabase/migrations/20261009000002_appointment_notifications_sync.sql` (ve önceki `…000001_clear_appointment_notifications.sql`, çalıştırılmadıysa) içeriği SQL Editor'de çalıştırılır. **Bu yapılmadan 2A/2B'yi uygulama**: ekranlar bu fonksiyonlar yoksa bildirimleri GÖSTEREMEZ (liste boş/hata).

### 1) ledger (yalnız migration dosyası, deploy YOK)
`git am --3way <yol>/docs/patches/46-ledger-bildirim-senkron-migration.patch`. Kontroller: `bash scripts/ci/check-bom.sh`; `EXTRA_TSC_FLAGS="--allowImportingTsExtensions" bash scripts/ci/check-names.sh supabase/functions`; `git show --stat --oneline HEAD` (2 dosya: README.md, migration); `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 46L — ledger <commit>`.

### 2A) flowweb
`git am --3way <yol>/docs/patches/46-flowweb-bildirim-senkron.patch` (başlangıç `e2776ab`). Kontroller (AYNEN; hepsi OK): `bash scripts/ci/check-bom.sh`; `bash scripts/ci/check-names.sh src`; `node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de`; `node scripts/ci/check-root-map.mjs`; `git show --stat --oneline HEAD` (2 dosya: README.md, AppointmentNotifications.tsx); `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 46A — flowweb <commit>`.

### 2B) flow
`git am --3way <yol>/docs/patches/46-flow-bildirim-senkron.patch` (başlangıç `8e412ef`). Kontroller (AYNEN; hepsi OK): `bash scripts/ci/check-bom.sh`; `bash scripts/ci/check-names.sh src App.js`; `node scripts/ci/check-assets.mjs src App.js`; `node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de`; `node scripts/ci/check-root-map.mjs`; `git show --stat --oneline HEAD` (2 dosya: README.md, DashboardScreen.js); `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 46B — flow <commit>`. EAS'ı kullanıcı alır.

## Kullanıcı testi (SQL çalıştırıldıktan ve yayından sonra)
Randevu sayfasından bir randevuyu SİL (ve bir diğerini İPTAL et) → Anasayfa'da Randevu Bildirimleri listesinde ve zil sayacında artık görünmemeli (web en geç 30 sn ya da sekmeye dönünce; mobilde Anasayfa'ya dönünce).
Kapsam dışı: Gelen Kutusu → Bildirimler sekmesi ayrı bir listedir; bu talimatta DEĞİŞMEDİ.
