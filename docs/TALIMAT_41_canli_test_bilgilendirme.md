# TALİMAT 41 — Canlı Test bilgilendirme notu: web (flowweb) + mobil (flow)

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK (README satırları yamanın İÇİNDE hazır; betikle README'ye satır EKLEME; ortamda betik bırakma); `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. İki **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Veritabanına/Edge Function'a DOKUNMA; deploy YOK. **EAS derlemesi BAŞLATMA.** Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## İstek (kullanıcı, 09.10.2026)
AI Asistan "Canlı Test" simülasyonunda kullanıcıya şu bilgi verilsin: asistanın hafızası yoktur, ilk karşılaşma testi içindir.

## Ne ekleniyor
Canlı Test panelinin/kartının başlığının altına sürekli görünen mavi bilgi şeridi (tr/en/de):
> "Bu test sohbeti hafızasızdır: her mesaj, müşterinin asistanla ilk karşılaşması gibi değerlendirilir. Önceki mesajlar hatırlanmaz; yalnızca asistanın ilk izlenimini denemek içindir. Gerçek randevu açılmaz, kimseye mesaj gitmez."
Doğruluk: `persona-test` yalnız tek mesajı alır (geçmiş göndermez), simülasyon modunda gerçek kayıt/mesaj yoktur.

## Adımlar (iki ayrı iş; sırayla)
### A) flowweb
1. K1 (`main`, temiz; başlangıç `d18fd19`). `git am --3way <ledger yolu>/docs/patches/41-flowweb-canli-test-bilgi.patch`.
2. Kontroller (AYNEN; hepsi OK):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git show --stat --oneline HEAD
git status -sb
```
`--stat` 5 dosya: README.md, messages/de|en|tr.json, LiveTestPanel.tsx. K4 push + CI yeşil. Rapor sonu: `KONTROL 41A — flowweb <commit>`.

### B) flow
1. K1 (`main`, temiz; başlangıç `356f132`). `git am --3way <ledger yolu>/docs/patches/41-flow-canli-test-bilgi.patch`.
2. Kontroller (AYNEN; hepsi OK):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git show --stat --oneline HEAD
git status -sb
```
`--stat` 5 dosya: README.md, locales/de|en|tr.json, BotYonetimiScreen.js. K4 push + CI yeşil. Rapor sonu: `KONTROL 41B — flow <commit>`. EAS derlemesini kullanıcı alır.

## Kullanıcı testi
Web: AI Asistan sayfasında Canlı Test başlığının altında mavi şerit görünmeli (TR/EN/DE değiştirince dil değişmeli). Mobil: Bot Yönetimi → Canlı Test kartında aynı şerit (yeni APK).
