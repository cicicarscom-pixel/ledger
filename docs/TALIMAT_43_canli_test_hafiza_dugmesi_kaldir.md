# TALİMAT 43 — Canlı Test panelinden "🧹 Hafızayı Sil" düğmesini kaldır (flowweb)

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK (README satırı yamanın İÇİNDE; ortamda betik bırakma); `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Veritabanına/Edge Function'a DOKUNMA; deploy YOK. Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## Karar (kullanıcı, 09.10.2026): "test düğmesini kaldıralım"
Canlı Test panelindeki 🧹 düğmesi "AI Hafızası silinsin mi?" diye soruyor ama `clearChatMemory` ile işletmenin TÜM `ai_communication_logs` kayıtlarını (gerçek WhatsApp/sosyal medya konuşma geçmişi) siliyordu; test paneli bu tabloyu hiç kullanmaz. Düğme kaldırılır; "↻ Ekranı Temizle" kalır.

## Yama (2 dosya)
- `src/app/(dashboard)/ai-asistan/page.tsx`: 🧹 düğmesinin 20 satırı silinir.
- `README.md`: 1 satır.
**Kapsam dışı (DOKUNMA, raporda sadece an):** `ai-asistan/randevu/RandevuClient.tsx` içindeki ayrı kırmızı "🧹 Hafızayı Sil" düğmesi ve `src/actions/clearChatMemory.ts` (o düğme hâlâ kullanıyor; silme).

## Adımlar
1. K1 (flowweb `main`, temiz; başlangıç `8bd76cf`). `git am --3way <ledger yolu>/docs/patches/43-flowweb-canli-test-hafiza-dugmesi-kaldir.patch`.
2. Kontroller (AYNEN; hepsi OK):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git grep -n "clearChatMemory" -- src
git show --stat --oneline HEAD
git status -sb
```
`git grep`: yalnız `RandevuClient.tsx` (2 satır) ve `src/actions/clearChatMemory.ts` kalmalı; `ai-asistan/page.tsx`'te OLMAMALI. `--stat` 2 dosya.
3. K4 push + CI yeşil. Rapor sonu: `KONTROL 43 — flowweb <commit>`.

## Kullanıcı testi (Vercel sonrası, Ctrl+F5)
AI Asistan → Canlı Test başlığının sağında yalnız "↻" kalmalı, süpürge simgesi olmamalı.
