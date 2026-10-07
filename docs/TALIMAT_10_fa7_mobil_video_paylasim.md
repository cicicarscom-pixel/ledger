# TALİMAT 10 — FA7 (basit sürüm): mobil — panelden video ekle, AI Üretim ekranını Flow AI doldursun (flow)

Önce `TALIMAT_00_sira_ve_ortak_kurallar.md` kurallarını oku. **Ön koşul: `TALIMAT_8` ONAY'landı ve deploy edildi; `TALIMAT_9` (web) tamamlandı** (aynı davranış, aynı alan adları). Çalışma klasörü `C:\flow`. **Yeni paket YOK** (`expo-image-picker` zaten kurulu). Yalnız bu belgede adı geçen dosyalara dokun.

## Davranış
Web ile aynı (`TALIMAT_9` "Davranış" 1–5): panelde video ekle → "paylaş" de → `share_video` eylemi → **AI Üretim** ekranı doldurulur → panelde onay kartı → "Onayla ve paylaş" mevcut `handleShare`'i çalıştırır. Onaysız paylaşım yok. Video sunucuya gönderilmez; yalnız bilgileri gider.

## Dosyalar
**Yeni:** `src/modules/flow_ai/flowAiShareHandoff.js`. **Değişen:** `src/modules/flow_ai/FlowAiHost.js` (panel), `src/modules/flow_ai/FlowAiService.js` (istek gövdesine `attachment`), `src/modules/flow_ai/flowAiActions.js` (`share_video`), `src/modules/sosyal_medya/presentation/screens/AiUretimScreen.js`, `src/core/i18n/locales/tr.json`, `en.json`, `de.json`, `README.md`. Başka dosyaya dokunma.

### 1. `flowAiShareHandoff.js`
Web'deki `flowAiShareHandoff.ts` ile aynı arayüz (tek video: `{ uri, mimeType, durationSec, width, height, sizeBytes, fileName }`; `setJob/takeJob`, `registerScreen({ ready, share })`, `unregisterScreen`, `confirm()` → `'NOT_READY'|'STARTED'`, `subscribe`). Sonuç için mevcut `flowAiEvents.js` olay mekanizmasını kullan (yeni olay: `share-result` `{ ok, message }`); `flowAiEvents.js`'i okuyup mevcut kalıbına uy.

### 2. `FlowAiHost.js` ve `FlowAiService.js`
- Panelde "video ekle" düğmesi: `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, quality: 1 })`; seçilen varlıktan `uri`, `duration` (ms → sn), `width`, `height`, `fileSize` (yoksa `FileSystem.getInfoAsync`), `fileName`, `mimeType`. Okunamazsa mesaj ("Video okunamadı"). Ek etiketi (ad + süre + ×).
- `FlowAiService`'te sohbet isteğine, ek varsa, `attachment: { kind: 'video', mimeType, durationSec, width, height, sizeBytes, fileName }` ekle (`TALIMAT_8` doğrulamasıyla uyumlu; dosya adı ≤ 120).
- Onay kartı (web ile aynı içerik ve düğmeler; mevcut bekleyen işlem kartı stiliyle). "Onayla ve paylaş" → `confirm()`; `'NOT_READY'` → kısa bekleme mesajı; `'STARTED'` → "Paylaşılıyor…" ve çift dokunmayı engelle. "Vazgeç": işi temizle. `share-result` olayında panele mesaj ("Paylaşıldı"/"Planlandı"/hata) ve kartı/eki temizle.

### 3. `flowAiActions.js`
`dispatchClientAction`'a `share_video` ekle: alanları **doğrula** (web ile aynı kurallar); geçerliyse `setJob(...)` ve `navigationRef.navigate('AiUretim', { selectedImage: <video uri>, selectedMediaType: 'video', selectedText: caption, draftPlatforms: platforms, flowAiShare: true })`; `true` dön. Ek yoksa `false`.

### 4. `AiUretimScreen.js`
- `route.params.selectedImage` işlenirken (yaklaşık 302–316. satır) `route.params.selectedMediaType === 'video'` ise `setMediaType('video')`, `persistedMediaType = 'video'` ve **süreyi** (`setMediaDurationMs`) handoff'taki `durationSec`'ten ata. Mevcut davranış (parametre yoksa) **AYNEN**.
- `draftPlatforms` mevcut mantığı (320–326. satırlar) zaten bağlı hesaplar arasında seçim yapıyor; **kullan**, değiştirme.
- `flowAiShare` ise: `takeJob()` ile **zamanı** uygula (`scheduledLocal` doluysa `publishMode` zamanlama + `scheduleDate` + `timezone` ekranın kendi biçiminde — okuyup uygula, rapora yaz; boşsa `'now'`).
- `handleShare`'in son sürümünü `ref`'te tut; `registerScreen({ ready, share })`: `ready` = video yüklü + metin dolu + en az bir platform seçili + `!isSharing`. Ekrandan çıkarken `unregisterScreen()`.
- `handleShare` içindeki mevcut `Alert`'lere dokunma; başarı ve hata yollarına `share-result` olayı yayını ekle. Video uzunluğu uyarısı (697–718. satırlar) handoff'ta tetiklenmemeli (sunucu uygunsuz platformu eler); tetiklenirse mevcut davranış kalır.
- Handoff yokken ekran **AYNEN** eskisi gibi çalışır.

### 5. Çeviriler (üç dile; mobil biçimi `{{x}}`) — web ile aynı `flowAi.share.*` anahtarları. `i18n-parity` yeşil.

## Kontroller (flow) / rapor
`TALIMAT_00` flow kontrolleri (`check-bom`, `check-names src App.js`, `check-assets`, `i18n-parity`, `check-root-map`). README maddesi. Push → CI "completed successfully" → `KONTROL 10 — flow <commit>`. Rapora: `selectedImage`+`selectedMediaType` işlemenin diff'i; zaman biçimi dönüşümü. **Cihaz testi kullanıcıdadır** (Expo Go).

## Kabul
Web `TALIMAT_9` Kabul 1–6'nın mobil karşılığı; ayrıca handoff yokken AI Üretim ekranı değişmemiş olmalı (galeriden elle seçim ve paylaşım çalışır).
