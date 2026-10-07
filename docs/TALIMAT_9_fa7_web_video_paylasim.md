# TALİMAT 9 — FA7 (basit sürüm): web — panelden video ekle, Paylaşım Merkezi'ni Flow AI doldursun (flowweb)

Önce `TALIMAT_00_sira_ve_ortak_kurallar.md` kurallarını oku. **Ön koşul: `TALIMAT_8` ONAY'landı ve `flow-ai-agent` deploy edildi.** Çalışma klasörü `C:\flowweb`. **Yeni paket, yeni tablo, yeni Edge Function YOK.** Yalnız bu belgede adı geçen dosyalara dokun.

## Davranış
1. Flow AI panelinde "video ekle" düğmesi: kullanıcı bir video seçer; panelde küçük bir "ek" etiketi görünür (dosya adı, süre, **×** ile kaldır). Video **sunucuya gönderilmez**; yalnız bilgileri gider.
2. Kullanıcı "tüm hesaplarda paylaş / yarın 14:00'te" yazar. İstek gövdesine `attachment` eklenir (aşağıda). Sunucu `share_video` eylemi döner.
3. Panel `share_video` eylemini alınca **Paylaşım Merkezi sayfasını** (`/sosyal-medya/share`) açar; sayfa videoyu "kullanıcı seçmiş gibi" yükler, metni, hesapları ve zamanı doldurur.
4. Panelde bir **onay kartı** çıkar: hangi hesaplar, atlananlar (sebebiyle), saat ve **"Onayla ve paylaş"** / **"Vazgeç"**. Onayda sayfadaki **mevcut `handleShare`** çalışır (kırpma, süre kuralları, yükleme, `zernio-client create-post` aynen). Sonuç panele mesaj olarak döner.
5. Kullanıcı onaylamadan **hiçbir paylaşım yapılmaz.**

## Dosyalar
**Yeni:** `src/lib/flowAiShareHandoff.ts`. **Değişen:** `src/components/flow-ai/FlowAiPanel.tsx`, `src/app/(dashboard)/sosyal-medya/share/page.tsx`, `messages/tr.json`, `messages/en.json`, `messages/de.json`, `README.md`.

### 1. `src/lib/flowAiShareHandoff.ts` (modül düzeyinde tek örnek; React'ten bağımsız)
```ts
export interface ShareJob { caption: string; platforms: string[]; skipped: { platform: string; reason: string }[]; scheduledLocal: string | null; timezone: string }
// attach(file), clear(), getFile(), setJob(job), takeJob(), registerPage({ ready: boolean, share: () => Promise<void> }), unregisterPage(), confirm(): Promise<'NOT_READY'|'STARTED'>, subscribe(listener)
```
Tek video tutar (`File`); `takeJob()` işi **bir kez** verir (sayfa yeniden açılınca tekrar doldurmasın). `confirm()` yalnız sayfa `registerPage` ile `ready:true` bildirdiyse `share()`'i çağırır; değilse `'NOT_READY'`.

### 2. `FlowAiPanel.tsx`
- Giriş çubuğunun yanına gizli `<input type="file" accept="video/mp4,video/quicktime,video/webm">` + düğme (simge: mevcut simge kümesinden). Seçimde: `video` öğesiyle `durationSec`, `videoWidth`, `videoHeight`'ı oku (`loadedmetadata`; okunamazsa ek reddedilir, mesaj gösterilir), `file.size` al; `attach(file)`.
- `call(...)` içinde (yalnız `action: "chat"` ve ek varsa) gövdeye `attachment: { kind: "video", mimeType: file.type, durationSec, width, height, sizeBytes: file.size, fileName: file.name }` ekle (`TALIMAT_8`teki doğrulamayla uyumlu: dosya adı ≤ 120 karakter).
- `dispatch(action)` içine `share_video` ekle: alanları **doğrula** (`caption` string ≤ 5000; `platforms` ve `skipped[].platform` string dizileri ≤ 10; `scheduledLocal` `null` ya da `YYYY-MM-DD HH:mm`; `timezone` string) — geçersizse sessizce yok say. Geçerliyse `setJob(...)`, **ek yoksa yok say**, `router.push(SCREEN_ROUTES.ai_uretim)` (zaten o sayfadaysan yeniden yönlendirme gerekmez; abone olma ile sayfa işi alır).
- **Onay kartı** (panel gövdesinde, sohbetin altında, mevcut `pending` kartlarının stiline uygun): başlık, uygun platform listesi, atlananlar ("Instagram: Video 120 sn; bu biçim en fazla 90 sn kabul eder."), saat ("Hemen" ya da yerel saat), iki düğme. **"Onayla ve paylaş"**: `confirm()` → `'NOT_READY'` ise "Sayfa hazırlanıyor, birkaç saniye bekleyin" mesajı ve düğme kısa süre pasif; `'STARTED'` ise düğme "Paylaşılıyor…" olur ve çift tıklama engellenir. **"Vazgeç"**: işi temizle, ek kalsın.
- Sayfadan gelen sonuç olayını dinle (`window` üzerinde `flowai:share-result`, `detail: { ok: boolean; message?: string }`): başarıda asistan mesajı "Paylaşıldı" (zamanlandıysa "Planlandı"), hata durumunda hata mesajı; sonra kartı ve eki temizle.
- Panel kapatılsa/açılsa ek ve iş **korunur** (modül düzeyi tutucu). Çıkış/oturum değişince `clear()`.

### 3. `share/page.tsx`
- `handleFileSelect(e)` içindeki dosya işleme mantığını **`loadMediaFile(file: File)`** adlı bir işleve çıkar; `handleFileSelect` onu çağırsın (davranış AYNEN). Bu işlev süre kontrolünde mevcut `alert`i kullanıyor; handoff'ta uygunsuz platform zaten sunucuda elendiği için tetiklenmemeli.
- Sayfa açılışında (`zernioAccounts` yüklendikten sonra, **bir kez**): `takeJob()` ve `getFile()` varsa → `loadMediaFile(file)`; `setLocalText(job.caption)`; `setSelectedPlatforms(...)`: **yalnız bağlı hesaplar** (`zernioAccounts`) içinde olan `job.platforms` true, diğerleri false; `scheduledLocal` doluysa `publishMode`'u zamanlamaya çevir, `scheduleDate` ve `timezone` durumlarını **sayfanın kendi biçimine** (`scheduleDate` başlangıç değeri 36–41. satırlardaki biçim; `timezone` etiketi) dönüştürerek doldur — biçimi okuyup uygula, rapora yaz; boşsa `publishMode='now'`.
- `handleShare`'in her render'daki son sürümünü bir `ref`'te tut; `registerPage({ ready, share: () => shareRef.current() })`: `ready`, video yüklenip metin ve en az bir platform dolduğunda `true` (`isSharing` iken `false`). Sayfa kapanırken `unregisterPage()`.
- `handleShare` içinde **mevcut alert'lere dokunma**; yalnız başarı ve hata yollarında (try'ın sonunda ve catch'te) `window.dispatchEvent(new CustomEvent('flowai:share-result', { detail: { ok, message } }))` ekle. Başarı mesajı `t("sharePage.success.published")`, hata mesajı mevcut hata metni.
- Kullanıcı sayfayı **elle** kullanırken hiçbir şey değişmemeli (handoff yoksa sayfa AYNEN eski gibi).

### 4. Çeviriler (üç dile birden; web biçimi `{x}`) — `flowAi.share.*`
`attach` ("Video ekle"), `attachedLabel`, `removeAttachment`, `cardTitle` ("Paylaşım hazır"), `cardPlatforms`, `cardSkipped`, `cardWhen`, `now` ("Hemen"), `confirm` ("Onayla ve paylaş"), `cancel` ("Vazgeç"), `notReady`, `sharing` ("Paylaşılıyor…"), `done` ("Paylaşıldı"), `scheduled` ("Planlandı"), `failed` ("Paylaşılamadı: {message}"), `unreadable` ("Video okunamadı"). `i18n-parity` kontrolü yeşil olmalı.

## Kontroller (flowweb) / rapor
`TALIMAT_00` flowweb kontrolleri + **`npm run build` (çıktının TAMAMI)**. README maddesi. Push → CI "completed successfully" → `KONTROL 9 — flowweb <commit>`. Rapora: `scheduleDate`/`timezone` dönüşümünün nasıl yapıldığı; `loadMediaFile` çıkarımında davranışın korunduğu (öncesi/sonrası farkın özeti).

## Deploy
Yok (Vercel derler).

## Kabul (Claude kontrol eder; canlıda kullanıcıyla)
1. Videoyu panelden ekleyip "tüm hesaplarda paylaş" → Paylaşım Merkezi açılır ve doldurulur; panelde onay kartı çıkar. 2. Onaylamadan hiçbir gönderi oluşmaz. 3. "Onayla ve paylaş" → mevcut akışla paylaşılır, panele sonuç mesajı döner. 4. Uygunsuz platform kartta sebebiyle "atlandı" görünür ve seçili değildir. 5. Sayfa elle kullanımda eskisi gibi çalışır. 6. "Vazgeç" hiçbir şey yapmaz.
