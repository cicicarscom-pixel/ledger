# TALİMAT 44 — Randevu sayfasından "🧹 Hafızayı Sil" düğmesini ve `clearChatMemory` işlemini kaldır (flowweb)

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK (README satırı yamanın İÇİNDE; ortamda betik bırakma); `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Veritabanına/Edge Function'a DOKUNMA; deploy YOK. Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## Karar (kullanıcı, 09.10.2026): "kaldır"
`ai-asistan/randevu/RandevuClient.tsx` üst çubuğundaki kırmızı "🧹 Hafızayı Sil" düğmesi `clearChatMemory` ile işletmenin TÜM `ai_communication_logs` kayıtlarını (gerçek konuşma geçmişi) geri alınamaz biçimde siliyordu. Düğme ve onu çağıran sunucu işlemi kaldırılır (başka kullanan yok; Talimat 43 ile Canlı Test'teki kopya zaten gitti).

## Yama (3 dosya)
- `ai-asistan/randevu/RandevuClient.tsx`: düğmenin 21 satırı silinir (ay seçici ve "yeni randevu" düğmesi kalır).
- `src/actions/clearChatMemory.ts`: dosya silinir (`git rm`; yama içinde).
- `README.md`: 1 satır.

## Adımlar
1. K1 (flowweb `main`, temiz; başlangıç `a243b2f`). `git am --3way <ledger yolu>/docs/patches/44-flowweb-randevu-hafiza-dugmesi-kaldir.patch`.
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
`git grep` BOŞ olmalı. `--stat` 3 dosya (1 silme).
3. K4 push + CI yeşil. Rapor sonu: `KONTROL 44 — flowweb <commit>`.

## Kullanıcı testi (Vercel sonrası, Ctrl+F5)
AI Asistan → Ai Randevu Yönetimi: üst çubukta yalnız ay seçici ve yeşil "yeni randevu" düğmesi kalmalı; kırmızı süpürgeli düğme olmamalı. Sayfa normal çalışmalı.
