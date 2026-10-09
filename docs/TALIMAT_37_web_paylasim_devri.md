# TALİMAT 37 — Web: Flow AI'dan Paylaşım Merkezi'ne video devri düzeltmesi (flowweb)

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Veritabanına/Edge Function'a/zamanlayıcıya DOKUNMA. **Raporda `git remote -v` çıktısındaki erişim anahtarını (ghp_…) MASKELE** (`ghp_***`); anahtarı asla yapıştırma.

## Kullanıcı bildirimi (09.10.2026)
Web'de Flow AI paylaşım kartı açılıyor, onaylanınca paylaşılmıyor; panele yüklenen video Paylaşım Merkezi'ndeki medya alanında görünmüyor.

## Kök neden (kodda doğrulandı)
`sosyal-medya/share/page.tsx` Flow AI'dan gelen işi YALNIZ sayfa ilk açılırken (`useEffect([])`) alıyordu. Sayfa zaten açıksa ya da iş sayfa dışında hazırlandıysa video/metin/platformlar yüklenmiyor, sayfa "hazır" bildirmiyor, panel `NOT_READY` ("Sayfa hazırlanıyor…") durumunda kalıyordu. Ayrıca `handleShare` içindeki erken çıkışlar (metin/platform/tarih eksik) panele sonuç bildirmediği için panel sessizce takılıyordu.

## Ne değişiyor
- `flowAiShareHandoff.ts`: `subscribe()`; `setJob` dinleyicileri tetikler → sayfa açıkken de iş alınır.
- `share/page.tsx`: devir mantığı `applyHandoffRef` içinde; sayfa açılışında (hesaplar yüklenince) VE yeni iş geldiğinde çalışır. `handleShare` erken çıkışları `bail()` ile panele hata bildirir.
- `FlowAiPanel.tsx`: "Paylaş"a basınca sayfa hazır değilse Paylaşım Merkezi'ne gider ve (en çok ~10 sn) hazır olunca paylaşımı kendisi başlatır; kullanıcı vazgeçerse döngü durur.
- Sunucu/DB değişmez.

## Adımlar
1. K1 başlangıç (flowweb `main`, temiz; başlangıç `278868c`). `git am --3way <ledger yolu>/docs/patches/37-flowweb-paylasim-devri.patch`.
2. Kontroller (AYNEN; hepsi OK):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git show --stat --oneline HEAD
git status -sb
```
`--stat` 4 dosya: README.md, FlowAiPanel.tsx, flowAiShareHandoff.ts, share/page.tsx.
3. K4 push doğrulaması; GitHub'da CI "completed successfully" gör. Rapor sonu: `KONTROL 37 — flowweb <commit>`.

## Kullanıcı testi (Vercel yayınlandıktan sonra; SAYFAYI YENİLE Ctrl+F5)
A) Panel başka sayfadayken: Flow AI'ya ataşla video ekle → "bu videoyu instagram'da paylaş, metin: …" de → panel Paylaşım Merkezi'ne gitmeli, video medya alanında ve metin kutusunda görünmeli → panelde kartta "Onayla/Paylaş" → paylaşılmalı.
B) Paylaşım Merkezi zaten açıkken aynı işlem: video yine yüklenmeli.
C) Hâlâ olmazsa: F12 → Console'daki kırmızı satırlar + Network'te `zernio-client` yanıtı (ekran görüntüsü).
