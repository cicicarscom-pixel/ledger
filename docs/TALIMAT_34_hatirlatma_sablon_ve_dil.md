# TALİMAT 34 — Hatırlatma metni işletmenin olsun + dil seçimi (ledger, Edge Function)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Veritabanına DOKUNMA.

## Ne yapılıyor (kullanıcı isteği)
Hatırlatma metnini işletme sahibi kendisi yazabilsin; uygulama uluslararası olacağı için "Sayın / Mr / Mrs / Herr / Frau" gibi unvanlar kodda sabit olmasın.
- **Veritabanı Claude tarafından YAPILDI ve CANLIDA** (migration `supabase/migrations/20261008000005_reminder_template_locale.sql`; ÇALIŞTIRMA): `organizations.reminder_template/reminder_locale`, dil başına varsayılan metinler (tr/en/de/fr/es), `claim_due_reminders_v2` (etkin metin ve dil de döner), `set_reminder_template`, genişletilmiş `get_reminder_settings`.
- Edge Function artık metni `claim_due_reminders_v2`'den gelen şablondan üretir. Unvan kodda YOK (cinsiyet tahmin edilmez; işletme isterse şablonuna "Sayın {name}" ya da "Dear Mr./Mrs. {name}" yazar). Doktor/işlem boşsa o satır çıkar; tarih/saat dile göre biçimlenir.
- Eski `claim_due_reminders` veritabanında bırakıldı (kullanılmaz; canlıda DROP komutları takıldığı için).

## Adımlar
1. K1 başlangıç: `main`'de, temiz. `git fetch origin` + `git merge origin/claude/new-session-hrbrhq` (migration ve yama buradan gelir; migration'ı ÇALIŞTIRMA).
2. `git am --3way docs/patches/34-hatirlatma-sablon-ve-dil.patch` (içeriği değiştirme).
3. README (editörde, ayrı commit; başlık satırına DOKUNMADAN madde ekle): `08.10.2026 — WhatsApp hatırlatma: metni işletme yazar ({name}, {business}, {date}, {time}, {doctor}, {service}); mesaj dili seçilir (tr/en/de/fr/es); unvanlar koda gömülü değildir.`
4. Kontroller (AYNEN; hepsi OK):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh apps/ledger apps/admin
EXTRA_TSC_FLAGS="--allowImportingTsExtensions" bash scripts/ci/check-names.sh supabase/functions
node scripts/ci/check-root-map.mjs
deno test --no-check --allow-all supabase/functions/shared/reminders/reminderMessage.test.ts
git show --stat --oneline HEAD~1
git show --stat --oneline HEAD
git status -sb
```
Beklenen: reminderMessage **8 test** geçer; `HEAD~1` (yama) yalnız 3 dosya: `appointment-reminders/index.ts`, `shared/reminders/reminderMessage.ts`, `shared/reminders/reminderMessage.test.ts`. `check-names` kırmızıysa kodu DEĞİŞTİRME; çıktıyı AYNEN bildir.
5. Push (K4 çıktıları AYNEN), GitHub "completed successfully". Rapor sonu: `KONTROL 34 — ledger <commit>`. **DEPLOY YOK** — Claude ONAY'ından sonra TEK fonksiyon: `npx supabase@latest functions deploy appointment-reminders --project-ref qybzidylewzsnmlofjul --use-api` (çıktı AYNEN).
