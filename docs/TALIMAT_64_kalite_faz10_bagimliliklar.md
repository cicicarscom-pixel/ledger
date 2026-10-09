# TALİMAT 64 — Kalite Faz 10: bağımlılık güvenlik güncellemeleri (flowweb + flow, hazır yamalar)

İki depo, iki yama; **sırayla**, her biri ayrı rapor + ayrı CI yeşili. Bu yamalar `package.json`/`package-lock.json` değiştirir (talimat açıkça izin verir; başka bağımlılık ekleme/silme/elle güncelleme YASAK).

| Depo | Başlangıç | Yama |
|---|---|---|
| flowweb | `origin/main` = `f2bd818` | `docs/patches/64-flowweb-bagimliliklar.patch` |
| flow | `origin/main` = `d092ac7` | `docs/patches/65-flow-bagimliliklar.patch` |

## flowweb yaması
- `npm audit fix`: 17 → 11 açık (yüksek 13 → 8). `next` 15.5.27, `sharp`, `postcss`, `nanoid`, `js-yaml`… güvenlik sürümleri; `next-intl` 3 → 4.14.9 (gerçek tarayıcıda tr/en/de doğrulandı).
- **Hata düzeltmesi:** ICU mesajlarında `'{ad}'` parametreyi değiştirmeden `{ad}` gösteriyordu (Randevu takvim silme onayı, Gelen Kutusu yanıt uyarısı); `''{ad}''` yapıldı. CI'ya yeni adım: `node scripts/ci/check-icu.mjs messages tr en de`.
- `AiDataResetPanel.tsx`: `next-intl` 4'ün sıkı tipine uyum (`res.error ?? ''`).

## flow yaması
- `npm audit fix`: 44 → 32 açık, **kritik 1 → 0**. Expo SDK 57 yama sürümleri vb.
- **`tailwindcss` 3.3.2'ye sabitlenir** (NativeWind 2, Tailwind 3.4 ile paketlemede çöküyor — doğrulandı). Bu sabitlemeyi KALDIRMA/DEĞİŞTİRME.
- Doğrulama: `npx expo export --platform android` başarılı.
- **Native modül sürümleri değiştiği için yeni EAS derlemesi gerekir** (kullanıcı isterse alınır).

## Her depo için
1. K1 başlangıç komutları (başlangıç commit'i tabloyla aynı olmalı; değilse DUR).
2. `git am --3way <yama>` (içerik değiştirilmez; `package.json`/`package-lock.json` dahil başka dosyaya dokunulmaz).
3. `npm ci --ignore-scripts --no-audit --no-fund` (kilit dosyasından temiz kurulum), sonra kontroller — **hepsi rapora AYNEN** (Git Bash):
   - flowweb: `check-bom.sh`, `check-names.sh src`, i18n-parity, **`check-icu.mjs messages tr en de`**, `check-root-map.mjs`, `npx tsc --noEmit -p .`, `eslint-ratchet.mjs … src` → çıta `0 hata, 24 uyarı`.
   - flow: `check-bom.sh`, `check-names.sh src App.js`, `check-assets.mjs src App.js`, i18n-parity, `check-root-map.mjs`, `npx tsc --noEmit -p .`, `eslint-ratchet.mjs … src App.js` → çıta `101 hata, 122 uyarı`; ayrıca **`npx expo export --platform android --output-dir ../flow-export-test`** (çıktı klasörü depo DIŞINDA; sonunda silinir) → `Exported:` satırı görünmeli.
   - İkisinde de ayrıca `npm audit` özet satırı (toplam sayı) rapora yazılır (flowweb 11, flow 32 beklenir).
4. K4 push + GitHub Actions yeşil (flowweb'de Vercel de). **Derleme/EAS yapma.**

## Elle test (kullanıcı)
- Web: giriş, Anasayfa, Randevu (takvim silme onayında `'Takvim Adı' silinecek` metni), Gelen Kutusu; dil Türkçe/İngilizce/Almanca değiştirilince metinler.
- Mobil (yeni APK gelince): açılış, giriş/kayıt, Randevular, Sosyal Medya, ses sohbeti, bildirimler.
