# TALİMAT 31 — WhatsApp randevu hatırlatma: Edge Function (ledger)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. Bu iş **HAZIR YAMA**dır (K2): içeriği DEĞİŞTİRME. Veritabanına DOKUNMA.

## Ne yapılıyor
Randevudan ~24 saat önce, YALNIZ onaylı (Approved) randevulara, işletme açmışsa, WhatsApp'tan hatırlatma. Kararlar kullanıcıdan: 1 gün önce / yalnız onaylı / işletme başına aç-kapat (varsayılan KAPALI) / yalnız bilgilendirme (müşteri cevabını mevcut WhatsApp asistanı karşılar).

- **Veritabanı Claude tarafından YAPILDI ve CANLIDA** (migration `supabase/migrations/20261008000003_whatsapp_appointment_reminders.sql`; çalıştırma): `organizations.whatsapp_reminders_enabled/reminder_hours_before`, `appointment_reminders` tablosu, `claim_due_reminders`, `mark_reminder_result`, `get/set_reminder_settings`. Uçtan uca denendi: aynı randevu iki kez talep edilmiyor, gönderildi işaretlenince bir daha gelmiyor.
- Hangi randevuya mesaj gideceğine VERİTABANI karar verir (açık işletme, Approved, penceredeki, 09:00-20:59 işletme saati, aynı randevuya bir kez, hata olursa 15 dk sonra en fazla 3 deneme). Fonksiyon yalnız gönderir ve sonucu kaydeder.
- Yeni: `appointment-reminders` Edge Function, `shared/reminders/reminderMessage.ts` (+ test). Mevcut `WahaClient` kullanılır.

## Adımlar
1. K1 başlangıç: `main`'de, temiz. `git fetch origin` + `git merge origin/claude/new-session-hrbrhq` (migration ve yama buradan gelir; migration'ı ÇALIŞTIRMA).
2. Yamayı uygula: `git am --3way docs/patches/31-whatsapp-randevu-hatirlatma.patch` (içeriği değiştirme). Uygulanmazsa DUR ve çıktıyı bildir.
3. README (editörde, ayrı commit, başlık satırına DOKUNMADAN madde ekle): `08.10.2026 — WhatsApp randevu hatırlatma: onaylı randevulara 24 saat önce otomatik mesaj (işletme başına açılır/kapanır, varsayılan kapalı).`
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
Beklenen: reminderMessage 5 test geçer; `HEAD~1` (yama) yalnız 3 dosya: `appointment-reminders/index.ts`, `shared/reminders/reminderMessage.ts`, `shared/reminders/reminderMessage.test.ts`. `check-names` kırmızıysa kodu DEĞİŞTİRME; çıktıyı AYNEN bildir.
5. Push (K4 çıktıları AYNEN) ve GitHub "completed successfully". Rapor sonu: `KONTROL 31 — ledger <commit>`. **DEPLOY YOK** — Claude ONAY'ından sonra, TEK fonksiyon: `npx supabase@latest functions deploy appointment-reminders --project-ref qybzidylewzsnmlofjul --use-api` (çıktı AYNEN).
6. Zamanlayıcıyı (pg_cron) ve ilk deneme gönderimini Claude yapar; sen yapma.
