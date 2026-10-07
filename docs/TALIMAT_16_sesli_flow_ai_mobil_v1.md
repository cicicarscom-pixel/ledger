# TALİMAT 16 — Flow AI sesli kullanım V1 (mobil, flow): mikrofon + sesli yanıt + sesli onay

Hazırlayan: Claude, 07.10.2026. Ortak kurallar: `TALIMAT_00` (flow komutları). Betik YASAK; `--amend`/force-push YASAK; yalnız aşağıdaki dosyalara dokun; "CI yeşil" demeden önce GitHub'da "completed successfully" gör. **Sunucu (ledger) DEĞİŞMEZ**; ses yalnız konuşma↔yazı dönüşümüdür, aynı `flow-ai-agent` ve aynı araçlar kullanılır.
**Önce** `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`.

## Amaç
Kullanıcı Flow AI'a istediği an yazarak ya da konuşarak komut verir ("bugün kimlerin randevusu var", "bu videoyu paylaş"). Akışlar AYNI kalır (Paylaşım Merkezi ekranı dahil); ses yalnız komut verme ve yanıt dinleme yoludur.

## 0) Bağımlılık kontrolü (DUR kuralı)
`npx expo install expo-speech expo-speech-recognition` çalıştır (kullanıcı onayladı; bu iki paket talimatla eklenir). Expo SDK 57 ile uyumlu sürümü `expo install` seçer. **Kurulum hata verirse ya da `expo-speech-recognition` SDK 57 ile uyumsuz çıkarsa DUR, çıktıyı AYNEN raporla, başka paket deneme.** `package.json` ve kilit dosyası dışında bu adımda dosya değişmez.

## 1) `app.json` (yalnız şu eklemeler)
- `plugins` içine `expo-speech-recognition` yapılandırması ekle: `microphonePermission` ve `speechRecognitionPermission` metinleri Türkçe ("Flow AI'a sesli komut verebilmeniz için mikrofon kullanılır."). Android'de `RECORD_AUDIO` izni eklenti tarafından gelir; elle başka izin ekleme.
- Paketin belgesindeki Android `queries`/servis gereksinimi varsa yalnız onu ekle. Başka alana dokunma.

## 2) Yeni dosya `src/modules/flow_ai/useFlowVoice.js`
Özel kanca (hook). Dışa aktardığı: `{ listening, supported, start, stop, speak, stopSpeaking, speaking }`.
- `start(onFinal)`: izin yoksa `requestPermissionsAsync`; reddedilirse `onError('permission')`. Dil: `i18n.language` → `tr`→`tr-TR`, `en`→`en-US`, `de`→`de-DE`. `interimResults: true`, `continuous: false`. Ara sonuçlar `onPartial(text)` ile döner; son sonuçta (`isFinal`) `onFinal(text.trim())` çağrılır. Sessizlikte kendiliğinden durur.
- Konuşma tanıma olayları için `useSpeechRecognitionEvent` kullan (paket belgesindeki yöntem). Bileşen sökülürken `abort()`.
- `speak(text)`: `expo-speech` ile `language` yukarıdaki kodla; önce `cleanForSpeech(text)`: Markdown (`*`, `_`, `` ` ``, `#`), emoji ve URL'leri sil, 600 karakterden uzunsa ilk 600'de son cümle sınırında kes. Yeni `speak` öncekini keser.
- `stopSpeaking()` = `Speech.stop()`. Mikrofona basılınca (`start`) otomatik çağrılır (kullanıcı konuşurken asistan susar).

## 3) `src/modules/flow_ai/FlowAiHost.js`
1. `const voice = useFlowVoice();` + durumlar: `const [voiceReplies, setVoiceReplies] = useState(false);` (varsayılan KAPALI; panel başlığındaki hoparlör simgesiyle açılıp kapanır) ve `const lastWasVoice = useRef(false);`.
2. Giriş çubuğunda (+) düğmesinin yanına mikrofon düğmesi (`Ionicons name="mic"` / dinlerken `mic-circle` ve kırmızı ton). `voice.supported === false` ise düğmeyi gizle. Dinlerken giriş alanının yerine `t('flowAi.voice.listening')` yazısı + ara metin göster.
3. Mikrofona basınca: `lastWasVoice.current = true; voice.start({ onPartial: setInput, onFinal: handleVoiceFinal, onError })`.
4. `handleVoiceFinal(text)` — **önce sesli onay kuralı**, sonra normal gönderim:
```js
const norm = text.toLowerCase().replace(/[.!?,]/g, '').trim();
const YES = ['evet', 'onayla', 'onaylıyorum', 'tamam', 'olur', 'paylaş', 'yes', 'ja'];
const NO = ['hayır', 'vazgeç', 'iptal', 'istemiyorum', 'no', 'nein'];
if (shareJobPending && YES.includes(norm)) { const r = await flowAiShareHandoff.confirm(); setShareConfirmState(r); return; }
if (shareJobPending && NO.includes(norm)) { /* mevcut "Vazgeç" düğmesinin gövdesi */ return; }
if (pending.length === 1 && YES.includes(norm)) { decide(pending[0], true); return; }
if (pending.length === 1 && NO.includes(norm)) { decide(pending[0], false); return; }
setInput(''); send(text);
```
   Kurallar: yalnız **tam eşleşme** (cümle içinde "evet" geçmesi onay SAYILMAZ); birden fazla bekleyen onay varsa sesle onay YOK (kullanıcı karta dokunur); onay kaydı yoksa "evet" normal mesaj olarak gider. Bekleyen onay `busy` iken çalışmaz.
5. Yazıyla gönderimde `lastWasVoice.current = false;` (kullanıcı yazdıysa asistan sessiz kalır, ayar açık olsa bile yalnız sesle sorulan soruya sesle yanıt verilir; ayar açıksa her yanıt okunur).
6. `send` içinde asistan yanıtı geldiğinde (`push('assistant', res.reply)` sonrası): `if (voiceReplies || lastWasVoice.current) voice.speak(res.reply);` Paylaşım sonucu mesajlarında (`flowAi.share.done/scheduled/failed`) da aynı koşulla `voice.speak(...)`.
7. Panel kapanınca ya da yeni mesaj gönderilince `voice.stopSpeaking()`.

## 4) `AiUretimScreen.js` (tek küçük değişiklik)
`publishPost` başında `const viaFlowAi = !!flowShareRef.current;` al. Başarı `Alert.alert(...)` çağrısını (`"Başarılı!"` uyarısı) yalnız `!viaFlowAi` iken göster; Flow AI'dan başlayan paylaşımın sonucu panelde görünür/okunur. Hata uyarılarına dokunma.

## 5) Çeviriler `flowAi.voice.*` (tr/en/de birlikte)
- tr: `listening` "Dinliyorum…", `permissionDenied` "Mikrofon izni verilmedi. Ayarlardan izin verebilirsiniz.", `repliesOn` "Sesli yanıt açık", `repliesOff` "Sesli yanıt kapalı", `unsupported` "Bu cihazda ses tanıma kullanılamıyor."
- en: "Listening…", "Microphone permission was denied. You can allow it in settings.", "Voice replies on", "Voice replies off", "Speech recognition is not available on this device."
- de: "Ich höre zu…", "Mikrofonberechtigung wurde verweigert. Sie können sie in den Einstellungen erlauben.", "Sprachantworten an", "Sprachantworten aus", "Spracherkennung ist auf diesem Gerät nicht verfügbar."
README "Son Güncellemeler"e 07.10.2026 tarihli madde.

## Kontroller (AYNEN; hepsi OK)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
```
Push; GitHub'da "completed successfully" gör. Rapor sonu: `KONTROL 16 — flow <commit>`. Yeni paket (yerel modül) içerdiği için kullanıcı YENİ EAS derlemesi alır (eski APK'da mikrofon düğmesi çalışmaz).
