# TALİMAT 38 — Web sesli sohbet: "Düşünüyor" iken söylenenler sohbete gitmiyor (flowweb)

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Veritabanına/Edge Function'a DOKUNMA. Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` olarak MASKELE.

## Kullanıcı bildirimi (09.10.2026, test sonrası tek sorun)
Yazı kutusunda "Düşünüyor…" yazarken söylenenler sohbet ekranına gitmiyor.

## Kök neden
Tanıma, cümle bitince kapanıyor ve yanıt okunup bitene kadar yeniden açılmıyordu; yanıt beklerken (düşünüyor) mikrofon kapalıydı, söylenen cümle kayboluyordu.

## Ne değişiyor (`useWebVoice.ts`, `FlowAiPanel.tsx`, README)
- Yanıt beklerken mikrofon dinlemeye devam eder; söylenen cümle HEMEN sohbette kullanıcı mesajı olarak görünür, yanıt gelince otomatik gönderilir (sıraya girer; birden çok cümle birleşir).
- Sırada cümle varsa önceki yanıt okunmadan sıradaki gönderilir (konuşma birikmez).
- Yanıt okunurken mikrofon KAPALI (hoparlör yankısı tekrar tanınmasın); okuma bitince açılır.
- Yanıt beklerken sessizlik "3 sessiz tur" sayılmaz; sohbet kendiliğinden kapanmaz. Çıkışta sıra temizlenir.
- Dinleme turlarına nesil sayacı: eski turun geç olayları yok sayılır (çift dinleme olmaz).
- Sunucu/DB değişmez.

## Adımlar
1. K1 başlangıç (flowweb `main`, temiz; başlangıç `b0f5e61`). `git am --3way <ledger yolu>/docs/patches/38-flowweb-sesli-bekleme-dinleme.patch`.
2. Kontroller (AYNEN; hepsi OK):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git show --stat --oneline HEAD
git status -sb
```
`--stat` 3 dosya: README.md, FlowAiPanel.tsx, useWebVoice.ts.
3. K4 push doğrulaması; GitHub'da CI "completed successfully" gör. Rapor sonu: `KONTROL 38 — flowweb <commit>`.

## Kullanıcı testi (Vercel sonrası, Ctrl+F5, Chrome/Edge)
1. Sesli sohbeti aç, bir şey sor. "Düşünüyor…" iken ikinci bir cümle söyle → hemen sohbette görünmeli; ilk yanıt gelince ikincisi otomatik gönderilmeli.
2. Yanıt okunurken mikrofon kapalı olmalı; okuma bitince "Dinliyorum…" dönmeli, kendi sesini yazmamalı.
3. "bitir" ile kapanmalı.
