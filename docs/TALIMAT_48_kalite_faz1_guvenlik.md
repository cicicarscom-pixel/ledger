# TALİMAT 48 — KALİTE FAZ 1: Güvenlik (flowweb + ledger[SQL])

Hazırlayan: Claude, 09.10.2026. Program: `docs/KALITE_PROGRAMI.md`; bulgular: `docs/KOD_TARAMA_2026-10-09.md`. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK (README satırları yamaların İÇİNDE; ortamda betik bırakma); `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. İki **HAZIR YAMA** (K2). **Deploy YOK.** **EAS BAŞLATMA.** Raporda `git remote -v` içindeki erişim anahtarını `ghp_***` MASKELE.

## SIRA
### 0) KULLANICI (ajan yapmaz): önce şunlar
a) Vercel → flowweb → Environment Variables: **`ZERNIO_API_KEY` var mı?** Yoksa ekle (değer şu an `NEXT_PUBLIC_ZERNIO_API_KEY`'deydi). Yamadan SONRA `NEXT_PUBLIC_ZERNIO_API_KEY` silinir ve Zernio anahtarı yenilenir. (Yama bu yedeği kaldırır; `ZERNIO_API_KEY` yoksa Zernio bağlantı işlemleri çalışmaz.)
b) Supabase SQL Editor: `supabase/migrations/20261009000003_revoke_public_execute_trigger_and_sensitive_functions.sql` içeriğini ÇALIŞTIR (Ctrl+A ile tümünü seç, Run). Claude canlıda doğrular ve "SQL TAMAM" der.
c) Supabase → Authentication → "Prevent use of leaked passwords" AÇ.
**Ajan: Claude "SQL TAMAM ve Vercel hazır" demeden 2'ye geçme.**

### 1) ledger (yalnız migration dosyası; veritabanına DOKUNMA)
`git am --3way <yol>/docs/patches/48-ledger-fonksiyon-yetkileri-migration.patch`. Kontroller: `bash scripts/ci/check-bom.sh`; `git show --stat --oneline HEAD` (2 dosya: README.md, migration); `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 48L — ledger <commit>`.

### 2) flowweb
`git am --3way <yol>/docs/patches/48-flowweb-zernio-anahtar.patch`. Kontroller (AYNEN; hepsi OK): `bash scripts/ci/check-bom.sh`; `bash scripts/ci/check-names.sh src`; `node scripts/ci/check-root-map.mjs`; `git grep -n "NEXT_PUBLIC_ZERNIO" -- src` (BOŞ olmalı); `git show --stat --oneline HEAD` (2 dosya: README.md, src/actions/zernio.ts); `git status -sb`. K4 push + CI yeşil. Rapor sonu: `KONTROL 48A — flowweb <commit>`.

## Kullanıcı testi (Vercel sonrası)
Sosyal Medya → hesap bağla (Zernio bağlantı adresi üretimi) çalışmalı; yeni kullanıcı kaydı ve onboarding çalışmalı (tetikleyiciler); Anasayfa/Randevu normal.
