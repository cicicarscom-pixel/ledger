# TALİMAT 26 — Flow AI sohbeti yukarı kaydırılamıyor (flow)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00` (flow komutları). Betik YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; yalnız `FlowAiHost.js` + README; "CI yeşil" demeden önce GitHub'da "completed successfully" gör; **rapor yalnız gerçekten yapılanı anlatır** (25'te eksik iş "yapıldı" denmişti). EAS derlemesi başlatma.
**Önce** `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`; flow `main`'de başla (`## main...origin/main` temiz).

## Sorun (cihaz, 08.10.2026 08:00)
Kullanıcı sohbeti yukarı kaydırınca liste hemen en sona atlıyor; eski mesajlar okunamıyor. Sebep: `FlatList`'te `onContentSizeChange={() => listRef.current?.scrollToEnd(...)}` içerik her değiştiğinde (yeni mesaj, `[ses]` iz satırları, yazı değişimi) KOŞULSUZ en sona kaydırıyor. Sesli sohbette iz satırları sürekli eklendiği için kaydırmak imkânsız.

## Yapılacak — `FlowAiHost.js` (+ README)
1. Yeni ref: `const atBottomRef = useRef(true);`
2. `FlatList`'e ekle:
   - `scrollEventThrottle={100}`
   - `onScroll={(e) => { const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent; atBottomRef.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80; }}`
3. `onContentSizeChange`'i şöyle değiştir: `() => { if (atBottomRef.current) listRef.current?.scrollToEnd?.({ animated: true }); }`
4. Kullanıcı kendi mesajını gönderdiğinde veya sesle söylediğinde en sona insin: `push` içinde `role === 'user'` ise `atBottomRef.current = true;` (`push` içindeki mevcut `setMessages` satırına dokunma, yalnız bu satırı ekle).
5. `VOICE_DEBUG` DOKUNMA (true kalsın). Başka mantığa dokunma.
6. README "Son Güncellemeler": `08.10.2026 — Flow AI sohbeti: yukarı kaydırınca en sona atlama düzeltildi (yalnız en alttayken otomatik kayar).`

## Kontroller (AYNEN; hepsi OK)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git grep -n "atBottomRef" src/modules/flow_ai/FlowAiHost.js
git show --stat --oneline HEAD
git status -sb
```
`atBottomRef` en az 5 yerde (tanım, onScroll, onContentSizeChange, push) geçmeli; `--stat` yalnız 2 dosya (FlowAiHost.js, README.md) göstermeli. Rapor sonu: `KONTROL 26 — flow <commit>`.
