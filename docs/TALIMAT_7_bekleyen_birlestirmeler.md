# TALİMAT 7 — `main`'e girmemiş iki düzeltmeyi birleştir (flowweb + flow)

Önce `TALIMAT_00_sira_ve_ortak_kurallar.md` kurallarını oku. **Veritabanına ve fonksiyonlara dokunma; deploy yok.** Her depoda K1 çıktısı ayrı.

## Durum (Claude doğruladı, 07.10.2026)
`claude/new-session-hrbrhq` dalındaki şu commit'ler `main`'de YOK:
- **flowweb:** `ed4ab69` (hesap silme sonrası yalnız yerel oturumu kapat: `signOut({ scope: "local" })`) ve `132fa37` (**Gizlilik Politikası ve Hesap Silme sayfalarına `info@workigom.com`**, `messages/tr|en|de.json`). Sonuç: gizlilik sayfasında e-posta şu an görünmüyor.
- **flow:** `7580fa8` (aynı yerel çıkış düzeltmesi, `DeleteAccountSection.js`).

## Yapılacak (her depo için)
1. `git fetch origin` ; `main`'de ol (`## main...origin/main` temiz olmalı, değilse DUR).
2. `git merge origin/claude/new-session-hrbrhq` (**merge**; rebase / reset / amend / force push YASAK).
3. **flowweb'de çakışma BEKLENİYOR** (`README.md`, `messages/tr.json`, `messages/en.json`, `messages/de.json`, muhtemelen `src/actions/waha.ts`, `AccountDeletePanel.tsx`). Çözüm kuralı: **iki tarafın değişikliğini de koru** (dalın değişikliği + main'deki yeni satırlar). `README.md`'de iki "Son Güncellemeler" maddesi de kalsın. JSON dosyaları geçerli JSON kalsın (`node -e "JSON.parse(require('fs').readFileSync('messages/tr.json','utf8'))"` her dil için çalıştır, çıktıyı rapora yaz). **Çakışmayı betikle/regex ile çözme; editörde elle.** Anlamadığın bir çakışmada DUR ve bildir.
4. Birleştirme sonrası şunlar **doğrulanmalı** (komut çıktıları AYNEN rapora):
   - flowweb: `grep -c "info@workigom.com" messages/tr.json messages/en.json messages/de.json` → her biri en az 2; `grep -n "signOut" src/components/settings/AccountDeletePanel.tsx` → `scope: "local"` görünmeli.
   - flow: `grep -n "signOut" src/shared/ui/DeleteAccountSection.js` → `scope: 'local'` görünmeli.
5. Ortak kontroller (flowweb ve flow bölümleri, `TALIMAT_00`) + flowweb'de `npm run build` (çıktının TAMAMI).
6. Push → GitHub Actions "completed successfully" → `KONTROL 7 — flowweb <commit>` ve `KONTROL 7 — flow <commit>`.

## Kabul (Claude kontrol eder)
`origin/main` hem `ed4ab69`/`132fa37` (flowweb) hem `7580fa8` (flow) içeriğini taşıyor; çeviri dosyaları geçerli; CI yeşil.
