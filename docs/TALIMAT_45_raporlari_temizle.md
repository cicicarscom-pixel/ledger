# TALİMAT 45 — Anasayfa "Randevu Bildirimleri" için "Raporları Temizle" düğmesi: ledger (veritabanı) + flowweb + flow

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK (README satırları yamaların İÇİNDE; ortamda betik bırakma); `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. Üç **HAZIR YAMA** (K2): içeriklerini DEĞİŞTİRME. **EAS derlemesi BAŞLATMA.** Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## İstek (kullanıcı, 09.10.2026): "Raporları Temizle olmalı ve ihtiyaç var"
Eski "Raporları Temizle" yalnız ekranda kullanılmayan bir bileşendeydi ve işletmenin TÜM konuşma kayıtlarını siliyordu (tehlikeli). Yerine Anasayfa "Randevu Bildirimleri" listesine **güvenli** bir düğme eklenir:
- Yalnız `notifications` tablosundaki `appointment_created` kayıtlarını siler. **Randevular ve müşteri konuşmaları (`ai_communication_logs`) SİLİNMEZ.**
- Onay sorar ("geri alınamaz"). Liste boşsa düğme görünmez.
- Silme sunucu fonksiyonuyla yapılır (`clear_appointment_notifications()`): kimlik istemciden gelmez (`current_org_id()`), yalnız işletme sahibi; `notifications` tablosunda istemci için DELETE politikası yoktur.

## SIRA (önemli): önce veritabanı, sonra ekranlar
### 0) Veritabanı — KULLANICI yapar (Claude'un MCP bağlantısı DDL'de zaman aşımına uğruyor; Supabase SQL editöründe çalışıyor)
Kullanıcı `supabase/migrations/20261009000001_clear_appointment_notifications.sql` içeriğini Supabase → SQL Editor'de çalıştırır. Claude sonra canlıda doğrular. **Bu yapılmadan 1 ve 2'yi uygulama** (düğme hata verir).

### 1) ledger (yalnız migration dosyası, deploy YOK)
`git am --3way <yol>/docs/patches/45-ledger-raporlari-temizle-migration.patch`. Kontroller: `bash scripts/ci/check-bom.sh`; `EXTRA_TSC_FLAGS="--allowImportingTsExtensions" bash scripts/ci/check-names.sh supabase/functions`; `git show --stat --oneline HEAD` (2 dosya: README.md, migration); `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 45L — ledger <commit>`.

### 2A) flowweb
`git am --3way <yol>/docs/patches/45-flowweb-raporlari-temizle.patch` (başlangıç `7d6c187`). Kontroller (AYNEN; hepsi OK): `bash scripts/ci/check-bom.sh`; `bash scripts/ci/check-names.sh src`; `node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de`; `node scripts/ci/check-root-map.mjs`; `git show --stat --oneline HEAD` (2 dosya: README.md, AppointmentNotifications.tsx); `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 45A — flowweb <commit>`.

### 2B) flow
`git am --3way <yol>/docs/patches/45-flow-raporlari-temizle.patch` (başlangıç `9b80547`). Kontroller (AYNEN; hepsi OK): `bash scripts/ci/check-bom.sh`; `bash scripts/ci/check-names.sh src App.js`; `node scripts/ci/check-assets.mjs src App.js`; `node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de`; `node scripts/ci/check-root-map.mjs`; `git show --stat --oneline HEAD` (5 dosya: README.md, locales/de|en|tr.json, DashboardScreen.js); `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 45B — flow <commit>`. EAS'ı kullanıcı alır.

## Kullanıcı testi
Web (Vercel sonrası, Ctrl+F5): Anasayfa → Randevu Bildirimleri → sağ altta kırmızı "Raporları Temizle" → onay → liste boşalır, zil rozeti sıfırlanır; Randevu sayfasındaki randevular ve Gelen Kutusu konuşmaları yerinde kalır. Mobil: yeni APK'da Anasayfa'da aynısı.
