# TALİMAT 50 — E-posta doğrulama akışı: doğrulama sonrası girişe yönlendirme (flow / mobil)

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00` (flow komutları). Betik/regex/toplu değiştirme YASAK (README satırı yamanın İÇİNDE; ortamda betik bırakma); `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. **HAZIR YAMA** (K2). Veritabanı/Edge Function YOK. **EAS BAŞLATMA.** Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## Kullanıcı isteği (09.10.2026)
Supabase'te "Confirm email" açıldı. Mobilde e-posta doğrulandıktan sonra kullanıcı GİRİŞ ekranına yönlendirilmeli.

## Kod incelemesinde bulunanlar (hazır yama bunları düzeltir)
1. `VerifyEmailScreen.js` derin bağlantıyı yalnız `supabase.auth.getSession()` ile "yeniliyordu" (hiçbir şey yapmıyordu; bağlantı belirteçlerini işlemiyor, ekran değişmiyordu).
2. Doğrulanmamış hesapla girişte ham İngilizce Supabase hatası ("Email not confirmed") gösteriliyordu.
3. Doğrulama ekranındaki tüm metin sabit Türkçeydi.
4. E-posta şablonu İngilizce varsayılan ve tek dil.

## Yama (7 dosya)
- Yeni `src/shared/lib/authLink.js`: doğrulama bağlantısını çözer (`type=signup` → doğrulandı; `error`/`error_code` → hata). Ağ/oturum işlemi yapmaz (8 durumla denendi).
- `App.js`: uygulama bağlantıyla açılınca (soğuk başlangıç ve açıkken) doğrulandıysa Doğrulama ekranını kapatıp GİRİŞ ekranını gösterir; oturum KURMAZ (kullanıcı kendisi girer).
- `AuthScreen.js`: "E-postanız doğrulandı" / "bağlantının süresi dolmuş" bildirimi; doğrulanmamış girişte Doğrulama ekranı açılır; kayıtta `locale` gönderir.
- `VerifyEmailScreen.js`: çevirili; işlevsiz bağlantı dinleyicisi kaldırıldı.
- `locales/{tr,en,de}.json`: `authScreen.notice.*`, `verifyEmail.*`. README satırı.

## Önemli: mevcut akış korunur
Kayıt → (artık) e-posta doğrulama → giriş → **işletme formu (Onboarding)** → ana ekran. Yama yalnız "doğrulama → giriş" arasını düzeltir; Onboarding'in tetiklenmesi (`AppNavigator.js`, `complete_onboarding`) AYNEN kalır ve DEĞİŞTİRİLMEZ.

## SIRA: önce kullanıcı (Supabase paneli), sonra yama
### 0) KULLANICI yapar (ajan yapmaz)
a) Supabase → Authentication → **URL Configuration → Redirect URLs** listesinde şu satırlar OLMALI: `workigomflow://**` (yayın derlemesi) ve `workigomflow://` ; geliştirme için `exp://**` (Expo Go kullanılıyorsa). Yoksa ekle. (Yoksa doğrulama bağlantısı uygulamayı açmaz, Site URL'ye gider.)
b) Authentication → Emails → **Confirm sign up**: gövdeyi `docs/supabase/eposta-sablonu-confirm-signup.html` içeriğiyle değiştir (Source sekmesi); konu satırı dosyanın başında yazılı.
Claude "PANEL TAMAM" demeden yamayı uygulama (yama panelden bağımsız çalışır ama test panel ayarına bağlı).

### 1) flow
`git am --3way <yol>/docs/patches/50-flow-eposta-dogrulama.patch`. Kontroller (AYNEN; hepsi OK): `bash scripts/ci/check-bom.sh`; `bash scripts/ci/check-names.sh src App.js`; `node scripts/ci/check-assets.mjs src App.js`; `node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de`; `node scripts/ci/check-root-map.mjs`; `git show --stat --oneline HEAD` (7 dosya); `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 50 — flow <commit>`. EAS'ı kullanıcı alır.

## Kullanıcı testi (yeni APK; GERÇEK telefon, yayın derlemesi — Expo Go değil)
1. Uygulamada yeni e-postayla kayıt ol → Doğrulama ekranı açılır.
2. Telefondaki e-posta uygulamasından bağlantıya dokun → uygulama açılmalı → **Giriş ekranı + yeşil "E-postanız doğrulandı" bildirimi**.
2b. Giriş yapınca (e-posta + şifre) **işletme kurulum formu (Onboarding: ad soyad, telefon, işletme adı)** açılmalı; doldurup onaylayınca ana ekrana geçmeli. (Bu form kayıtla birlikte hep vardı; yama ona DOKUNMAZ. Onboarding'i `AppNavigator` tetikler: oturum açılınca `profiles.onboarding_completed = false` ise.)
3. Bağlantıyı ikinci kez dene → "bağlantının süresi dolmuş/kullanılmış" bildirimi.
4. Doğrulamadan girişe çalış → ham hata yerine Doğrulama ekranı ("Tekrar Gönder" çalışmalı).
5. Dil İngilizce/Almanca iken kayıt ol → e-posta o dilde gelmeli.
