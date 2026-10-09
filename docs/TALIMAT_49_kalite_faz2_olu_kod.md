# TALİMAT 49 — KALİTE FAZ 2: Ölü kod temizliği (flowweb + flow)

Hazırlayan: Claude, 09.10.2026. Program: `docs/KALITE_PROGRAMI.md`. **Önce Talimat 48 (Faz 1) ONAYLI olmalı.** Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK (README satırları yamaların İÇİNDE; ortamda betik bırakma); `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. İki **HAZIR YAMA** (K2); silmeler yamada `git rm` olarak hazır. Veritabanı/Edge Function YOK. Deploy YOK. **EAS BAŞLATMA.** Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## Ne siliniyor (hepsi taramada "hiçbir yerden çağrılmıyor" doğrulandı)
- flowweb: `src/actions/accounting.ts`, `src/actions/insights.ts` (çağrılmayan sunucu işlemleri; tablo izinleriyle zaten çalışmıyordu), `docs/archive/test_appts.ts` (derlenemeyen; tam `tsc`'yi kırıyordu).
- flow: `CommunicationLogsTable.js` (tüm konuşma kayıtlarını silen eski "Raporları Temizle"; Anasayfa'daki yeni güvenli düğme onun yerini aldı), `useCommunicationLogs.ts`, `CustomerMapper.ts`, `useAppointments.ts` içindeki kullanılmayan `toDateString`.

## Adımlar
### A) flowweb (başlangıç: Faz 1 sonrası `main`)
`git am --3way <yol>/docs/patches/49-flowweb-olu-kod.patch`. Kontroller (AYNEN; hepsi OK): `bash scripts/ci/check-bom.sh`; `bash scripts/ci/check-names.sh src`; `node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de`; `node scripts/ci/check-root-map.mjs`; `git grep -n "actions/accounting\|actions/insights" -- src` (BOŞ); `git show --stat --oneline HEAD` (4 dosya, 3 silme); `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 49A — flowweb <commit>`.

### B) flow
`git am --3way <yol>/docs/patches/49-flow-olu-kod.patch`. Kontroller (AYNEN; hepsi OK): `bash scripts/ci/check-bom.sh`; `bash scripts/ci/check-names.sh src App.js`; `node scripts/ci/check-assets.mjs src App.js`; `node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de`; `node scripts/ci/check-root-map.mjs`; `git grep -n "CommunicationLogs\|CustomerMapper" -- src` (BOŞ); `git show --stat --oneline HEAD` (5 dosya, 3 silme); `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 49B — flow <commit>`. EAS'ı kullanıcı alır.

## Beklenen davranış değişikliği
YOK (silinenler hiçbir ekrandan erişilmiyordu).
