# TALİMAT 23 — Eller serbest sesli sohbet (TEK DOSYA: sunucu + mobil)

Hazırlayan: Claude, 08.10.2026. **Bu dosya Talimat 21 ve 22'nin birleşimidir (22'nin "EK KORUMALAR" bölümü dahil). YALNIZ BU DOSYAYI uygula; `TALIMAT_21` ve `TALIMAT_22` dosyalarını ayrıca uygulama.**
Ortak kurallar: `TALIMAT_00`. Betik, `--amend`, `rebase`, force-push YASAK. Dosyalar yalnız editörde düzenlenir; geçici/kopya dosya commit'lenmez. Yalnız talimatta adı geçen dosyalara dokun. "CI yeşil" demeden önce GitHub çalışma sayfasında "completed successfully" gör. **EAS derlemesi başlatma** (kullanıcı yapar). Veritabanına dokunma.

## Sıra ve rapor
1. **BÖLÜM A (ledger, sunucu)** → ayrı commit, push, CI. Deploy YAPMA, ONAY bekle.
2. **BÖLÜM B (flow, mobil)** → ayrı commit, push, CI. (A'nın deploy'unu BEKLEMEDEN yapılabilir; istemci sunucudan bağımsız çalışır.)
3. Tek rapor, iki başlık: `KONTROL 23A — ledger <commit>` ve `KONTROL 23B — flow <commit>`; her biri için K1 çıktısı (HEAD satırı dahil), kontrol çıktıları AYNEN, K4 push çıktısı AYNEN ve GitHub'da gördüğün "completed successfully".
4. Claude ONAY verince yalnız şunu deploy et: `npx supabase@latest functions deploy flow-ai-agent --project-ref qybzidylewzsnmlofjul --use-api` (çıktı AYNEN rapora).

Her iki depoda başlamadan önce: `git fetch origin` + `git merge origin/claude/new-session-hrbrhq` (ledger dalındaki talimat dosyalarını okumak için ledger'da; flow'da birleştirme gerekmez, `main`'de başla ve `## main...origin/main` temiz olsun).

---

# BÖLÜM A — SUNUCU (ledger)

## Amaç
Kullanıcı eller serbest (hands-free) sesli sohbet yapacak: yanıtlar sesle OKUNACAK. İstemci isteğe `voice: true` ekler; asistan kısa, okunabilir, soruyla biten cümleler üretir. Mobil istemci Talimat 22'de.

## Yapılacaklar
1. `supabase/functions/shared/ai/types.ts` — `AIContext`'e `voiceMode?: boolean;` ekle.
2. `supabase/functions/flow-ai-agent/index.ts` — `buildContext` çağrısından hemen sonra: `if (body.voice === true) context.voiceMode = true;`
3. `supabase/functions/shared/ai/flow/FlowPromptBuilder.ts` — `build()` sonunda, `context.voiceMode` doğruysa mevcut metne şu ek bölümü ekle (web ek bölümünün mantığıyla, ayrı sabit `VOICE_ADDENDUM`):
```
SESLİ SOHBET MODU: Kullanıcı seninle SESLİ konuşuyor; yanıtın telefon tarafından yüksek sesle okunacak. Kurallar:
V1. En çok iki kısa cümle yaz. Markdown, madde işareti, tablo, emoji, URL ve parantez KULLANMA.
V2. Saat ve tarihi konuşma diliyle yaz ("yarın akşam altıda", "on dokuz Ekim, saat on").
V3. Kullanıcıdan bir seçim ya da bilgi gerekiyorsa seçenekleri TEK cümlede say ve cümleyi soruyla bitir ("Hangi hesaplarda paylaşalım: Facebook, YouTube ya da Instagram?").
V4. Onay gerektiren bir işi (paylaşım, planlama) önce kısaca özetle, sonra "Onaylıyor musun?" diye sor. İşi yaptım DEME; onay gelene kadar yapılmış sayılmaz.
V5. "Aşağıdaki karta bak", "ekrandaki düğmeye bas" gibi ekrana yönlendiren cümleler KURMA; kullanıcı ekrana bakmıyor olabilir.
V6. Araç sonucu yoksa ya da hata varsa bunu tek cümleyle söyle ve ne yapabileceğini öner.
```
4. Test (`FlowPromptBuilder` için mevcut test dosyası varsa ona, yoksa yeni `FlowPromptBuilder.voice.test.ts`): `voiceMode: true` iken prompt "SESLİ SOHBET MODU" içerir; `voiceMode` yokken içermez.

## Kontroller (AYNEN; hepsi OK)
```
deno test --allow-all supabase/functions/shared/ai/flow
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh apps/ledger apps/admin
EXTRA_TSC_FLAGS="--allowImportingTsExtensions" bash scripts/ci/check-names.sh supabase/functions
node scripts/ci/check-root-map.mjs
```
Push; GitHub'da "completed successfully" gör. Rapor sonu: `KONTROL 21 — ledger <commit>`. Deploy: ONAY'dan sonra `npx supabase@latest functions deploy flow-ai-agent --project-ref qybzidylewzsnmlofjul --use-api`.

---

# BÖLÜM B — MOBİL (flow)

## Sorun (kullanıcı testi)
Şu an mikrofon yalnız **klavye dikte** gibi çalışıyor: her seferinde mikrofona basılıyor, söylenen gönderiliyor, asistan yazıyla soruyor. İstenen: mikrofona **bir kez** basılır, TÜM diyalog sesle sürer (eller serbest): kullanıcı konuşur → otomatik gider → asistan yanıtı **sesle okur** → okuma bitince mikrofon **kendiliğinden açılır** → kullanıcı konuşur… Bitirme: "Bitir" düğmesi ya da "kapat/bitir/dur" demek ya da iki kez üst üste sessizlik.

## Tasarım (durum makinesi)
`voiceChat` (bool) açıkken durumlar: `listening` → (final metin) → `thinking` → (yanıt) → `speaking` → (okuma bitti) → `listening`. **Asla aynı anda dinleme ve okuma yok** (yankı). Mod kapanınca hepsi durur.

## Yapılacaklar

### 1) `src/modules/flow_ai/useFlowVoice.js`
- `speak(text, onDone)`: ikinci argüman. `expo-speech` `onDone`, `onStopped` ve `onError` üçü de `onDone`'ı **bir kez** çağırsın (korumalı). Metin temizlendikten sonra boşsa `onDone` hemen çağrılsın.
- `start({ onPartial, onFinal, onError, onSilence })`: `no-speech` hatasında `onError` yerine `onSilence()` çağır (şu an sessizce geçiliyor). `aborted` yine sessiz.
- Geri kalan mantık aynı.

### 2) `src/modules/flow_ai/FlowAiService.js`
`chat(message, conversationId, attachment, opts)` dördüncü parametre: `opts?.voice === true` ise gövdeye `voice: true` ekle.

### 3) `src/modules/flow_ai/FlowAiHost.js`
1. Durum: `const [voiceChat, setVoiceChat] = useState(false); const [voicePhase, setVoicePhase] = useState('idle');` (+ `voiceChatRef`, `silenceCount` ref'leri; durum değişince ref'i de güncelle).
2. **Mikrofon düğmesi artık sohbet modunu açıp kapatır:** kapalıyken basınca `enterVoiceChat()` (sohbeti aç, `silenceCount=0`, `startListening()`); açıkken basınca `exitVoiceChat()`.
3. `startListening()`: `voiceChatRef.current` doğruysa ve okuma sürmüyorsa, **400 ms bekle**, sonra `voicePhase='listening'`; `voice.start({ onPartial: setInput, onFinal: handleVoiceFinal, onError: handleVoiceError, onSilence: handleSilence })`.
4. `handleVoiceFinal(text)` sırası: (a) **bitirme sözleri** (tam eşleşme): `kapat, bitir, sohbeti bitir, sesli sohbeti kapat, dur, çıkış, kapat sohbeti` → `speakThen(t('flowAi.voice.chat.closedByUser'), exitVoiceChat)`; (b) mevcut **sesli onay** kuralı (evet/hayır tam eşleşme; tek bekleyen iş / paylaşım kartı) — onay işlendikten sonra sohbet moduna dönüp (yanıt/sonuç okunduktan sonra) tekrar dinle; (c) aksi halde `silenceCount=0; setInput(''); send(text, { voice: true })`.
5. `send(text, { voice })`: `voice` doğruysa `FlowAiService.chat(..., { voice: true })`; `voicePhase='thinking'`. Yanıt gelince: yanıt metnini sohbete bas (mevcut) ve `voiceChat` açıksa `speakThen(res.reply, startListening)` (hoparlör ayarına BAKMA; sohbet modunda her yanıt okunur). Yanıt hata verirse `speakThen(t('flowAi.error'), startListening)`.
6. **Eylemler:** (a) `share_video` işi geldiğinde sohbet modunda, istemci kendisi okunur özet kursun: `speakThen(t('flowAi.voice.chat.shareSummary', { platforms: job.platforms.join(', '), when: job.scheduledLocal || t('flowAi.voice.chat.now'), caption: job.caption }), startListening)` — model yanıtının yerine/yanında çift okuma olmasın: modelin yanıt metni bu turda OKUNMASIN, yalnız özet okunsun. (b) Paylaşım sonucu (`share-result`) mevcut mantıkla sohbete yazılır VE sohbet modunda `speakThen(msg, startListening)`. (c) `pick_platforms` kartı geldiyse modelin sesli yanıtı (sunucu "Hangi hesaplarda…" diye sorar) okunur ve dinlenir; kullanıcının söylediği ("Facebook ve YouTube") normal mesaj olarak gider.
7. `handleSilence()`: `silenceCount += 1`; 1 ise `startListening()` (bir kez daha dinle), 2 ise `speakThen(t('flowAi.voice.chat.closing'), exitVoiceChat)`.
8. `handleVoiceError(err)`: mevcut hata mesajı eşlemesini (`permission`, `service-not-allowed` vb.) kullan, mesajı sohbete yaz ve `exitVoiceChat()`.
9. `exitVoiceChat()`: `setVoiceChat(false)`, `voicePhase='idle'`, `voice.stop()`, `voice.stopSpeaking()`, `setInput('')`.
10. Güvenlik/temizlik: panel kapanınca (`open === false`), uygulama arka plana gidince (`AppState` `background`/`inactive`) ve bileşen sökülünce `exitVoiceChat()`. Kullanıcı yazarak mesaj gönderirse (klavye) sohbet modu kapanır.
11. **Arayüz:** `voiceChat` açıkken giriş satırının yerine ses çubuğu göster: solda durum yazısı (`listening` → `t('flowAi.voice.chat.listening')`, `thinking` → `...thinking`, `speaking` → `...speaking`), dinlerken yazıya dökülen ara metin, sağda kırmızı **"Bitir"** düğmesi (`t('flowAi.voice.chat.end')`). Durumu yumuşak titreşen (opacity animasyonu) mikrofon simgesi göstersin; yeni animasyon kütüphanesi ekleme.
12. `speakThen(text, next)`: `voicePhase='speaking'`; `voice.speak(text, () => { if (voiceChatRef.current) next(); })`.

### 4) Çeviriler `flowAi.voice.chat.*` (tr/en/de birlikte)
- tr: `listening` "Dinliyorum…", `thinking` "Düşünüyorum…", `speaking` "Konuşuyorum…", `end` "Bitir", `closing` "Sesli sohbeti kapatıyorum.", `closedByUser` "Tamam, sesli sohbeti kapattım.", `now` "hemen", `shareSummary` "{{platforms}} hesaplarında paylaşacağım. Zaman: {{when}}. Metin: {{caption}}. Onaylıyor musun?"
- en: "Listening…", "Thinking…", "Speaking…", "Stop", "Closing voice chat.", "Okay, voice chat closed.", "now", "I will post to {{platforms}}. When: {{when}}. Text: {{caption}}. Do you confirm?"
- de: "Ich höre zu…", "Ich denke nach…", "Ich spreche…", "Beenden", "Ich beende den Sprachchat.", "Okay, Sprachchat beendet.", "sofort", "Ich poste auf {{platforms}}. Zeit: {{when}}. Text: {{caption}}. Bestätigen Sie?"
README "Son Güncellemeler"e 08.10.2026 tarihli madde.

## EK KORUMALAR (08.10.2026, gözden geçirme sonrası eklendi — ZORUNLU)

**K-A) `voiceSessionId` — her sesli sohbet bir oturum.** `const voiceSessionRef = useRef(0);` `enterVoiceChat()` içinde `voiceSessionRef.current += 1` ve yerel `const sid = voiceSessionRef.current`. Oturuma bağlı HER geri çağrı (STT `onPartial/onFinal/onSilence/onError`, TTS `onDone`, 400 ms `setTimeout`, `send` yanıtı) başında `sid` yakalasın ve `if (sid !== voiceSessionRef.current || !voiceChatRef.current) return;` ile **eski oturumdan gelen geç olayları yok saysın** (ör. kullanıcı "bitir" dedikten sonra gelen geç TTS bitişi mikrofonu yeniden açmasın; yeni oturum eskinin yanıtını okumasın). `exitVoiceChat()` önce `voiceSessionRef.current += 1` yapsın.

**K-B) Açık durum makinesi.** Dört durum sabiti: `IDLE`, `LISTENING`, `PROCESSING`, `SPEAKING` (önceki `thinking` = `PROCESSING`; çeviri anahtarı `thinking` kalır). Tek işlev `transition(to)` yalnız izinli geçişleri uygulasın, diğerlerini YOK SAYSIN:
`IDLE→LISTENING`, `LISTENING→PROCESSING`, `LISTENING→LISTENING` (sessizlikte yeniden dinle), `PROCESSING→SPEAKING`, `PROCESSING→LISTENING` (okunacak metin yoksa), `SPEAKING→LISTENING`, ve her durumdan `→IDLE` (çıkış). Mikrofon YALNIZ `LISTENING`'e geçerken açılır; `SPEAKING` ve `PROCESSING` sırasında `voice.start` ÇAĞRILMAZ (yarış/yankı koşulu yok).

**K-C) İptal.** `exitVoiceChat()` (kullanıcı "Bitir" düğmesi, "kapat/bitir/dur" sözü, panel kapanması, uygulamanın arka plana/`inactive`'e geçmesi, yazıyla mesaj göndermesi, STT hatası): aktif STT'yi `abort`, TTS'i `Speech.stop`, bekleyen zamanlayıcıları temizle, `voiceSessionRef` artır, durumu `IDLE` yap. Uçuştaki `send` isteği bitse bile yanıt metni sohbete YAZILIR ama **okunmaz ve dinleme başlatmaz**. "Bitir" SPEAKING sırasında da anında çalışır (okuma yarıda kesilir).

**K-D) Sesli onay yalnız "okunmuş" işe bağlanır (yanlış paylaşım koruması).** `confirmArmedRef` (null | iş kimliği): bir onay isteyen iş (bekleyen eylem `pending[0].id` ya da paylaşım kartı) için **onay sorusu okunup bittikten sonra** `confirmArmedRef.current = o işin kimliği` olur. "Evet" (tam eşleşme) yalnız `LISTENING` durumunda VE `confirmArmedRef.current` o anki tek bekleyen işin kimliğine eşitse onay sayılır; değilse "evet" normal mesaj gider. Onay/ret ya da yeni mesaj sonrası `confirmArmedRef.current = null`. Böylece okunmamış/ekranda duran eski bir iş, rastgele bir "evet" ile yayınlanamaz. Sunucudaki onay kapısı (payload özeti + onay kaydı) zaten aynen sürer; istemci yalnız bu kapıyı çağırır.

## Bilinen sınırlar (raporda tekrar ETME, yalnız bil)
Android her dinleme başlangıcında sistem "bip" sesi çalabilir (kapatılamaz). Her tur konuşma→yazı→yanıt→okuma 3–6 sn sürer. Ekran kapalıyken/arka planda çalışmaz.

## Kontroller (AYNEN; hepsi OK)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
```
Push; GitHub'da "completed successfully" gör. Rapor sonu: `KONTROL 22 — flow <commit>`. Yeni EAS derlemesini kullanıcı alır.
