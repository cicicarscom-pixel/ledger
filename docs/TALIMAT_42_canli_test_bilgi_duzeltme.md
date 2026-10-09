# TALİMAT 42 — Canlı Test bilgi notu web'de görünmüyor: doğru panele taşı (flowweb)

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK (README satırı yamanın İÇİNDE; ortamda betik bırakma); `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Veritabanına/Edge Function'a DOKUNMA; deploy YOK. Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## Neden
Talimat 41A (`656e218`) notu `src/components/ai-asistan/LiveTestPanel.tsx`'e eklemişti; bu bileşen hiçbir yerde KULLANILMIYOR (ölü kod). Sayfada görünen Canlı Test paneli `src/app/(dashboard)/ai-asistan/page.tsx` içinde ve `aiAsistanPage.liveTest.*` anahtarlarını kullanıyor. (Claude'un hatası: hedef bileşen doğrulanmadı.) Mobil (41B) doğru ekrana eklendi; yalnız yeni APK gerekir.

## Yama (6 dosya)
- `ai-asistan/page.tsx`: mavi bilgi şeridi sağ paneldeki Canlı Test başlığının altına eklenir.
- `messages/{tr,en,de}.json`: anahtar `aiAsistanComponents.liveTestPanel.notice` → `aiAsistanPage.liveTest.notice` (metin aynı).
- `LiveTestPanel.tsx`: ölü bileşendeki kopya geri alınır.
- `README.md`: 1 satır.

## Adımlar
1. K1 (flowweb `main`, temiz; başlangıç `656e218`). `git am --3way <ledger yolu>/docs/patches/42-flowweb-canli-test-bilgi-duzeltme.patch`.
2. Kontroller (AYNEN; hepsi OK):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git grep -n "liveTest.notice\|liveTestPanel.notice" -- src messages
git show --stat --oneline HEAD
git status -sb
```
`git grep`: yalnız `page.tsx`'te `aiAsistanPage.liveTest.notice` ve 3 json'da `"notice"` satırı (liveTest bloğunda). `--stat` 6 dosya.
3. K4 push + CI yeşil. Rapor sonu: `KONTROL 42 — flowweb <commit>`.

## Kullanıcı testi
Web (Ctrl+F5): AI Asistan → sağdaki Canlı Test başlığının altında mavi not görünmeli (TR/EN/DE'de dil değişmeli). Mobil: yeni APK'da Bot Yönetimi → Canlı Test kartı.
