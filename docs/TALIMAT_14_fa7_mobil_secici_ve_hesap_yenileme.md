# TALİMAT 14 — Mobil: hesap seçici kartı + "hesap bağlayın" hatası düzeltmesi (flow) + web küçük düzeltme (flowweb)

Hazırlayan: Claude, 07.10.2026. Ön koşul: Talimat 12 `flow-ai-agent` deploy edilmiş, Talimat 13 canlıda. Ortak kurallar: `TALIMAT_00` (flow ve flowweb komutları). Betik YASAK; `--amend`/force-push YASAK; talimat dışı dosyaya dokunma; "CI yeşil" demeden önce GitHub çalışma sayfasında "completed successfully" gör.
Her iki depoda önce `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`.

## Neden (cihaz testi + canlı günlük incelemesi)
1) Telefonda "Lütfen önce Sosyal Medya panelinden hesap bağlayın" çıktı, oysa 3 hesap bağlı (veritabanında aktif). Supabase günlüğünde telefonun o dakikalarda `social_accounts` / `organization_members` sorgusu **hiç atmadığı** görüldü: `AiUretimScreen.js` hesapları yalnız ekranın İLK AÇILIŞINDA (mount) çekiyor; uygulama yeni açılınca oturum henüz hazır değilken `if (!userId) return;` ile çıkıyor ve bir daha denemiyor → `zernioAccounts` sonsuza dek boş.
2) Paylaşım hata verince panel eki (video) siliyor; kullanıcı "video ekle" demek zorunda kalıyor.
3) Mobilde hesap seçici kartı yok (web'de var).
4) `shareError(t('flowAi.share.failed', { message: '' }))` "Paylaşılamadı: " diye boş bitiyor.

## A) flow — `src/modules/sosyal_medya/presentation/screens/AiUretimScreen.js`
1. Mount'taki `fetchAccounts` mantığını bileşen içinde adlandırılmış bir işleve çıkar: `const loadAccounts = React.useCallback(async () => {...; return accounts;}, []);` (mevcut kodun aynısı; `accounts` dizisini DÖNDÜRSÜN, `setZernioAccounts` ve `setSelectedPlatforms` yine içeride kalsın; `userId` yoksa `return []`).
   - Mount `useEffect`'i `loadAccounts()` çağırsın.
   - Ekrana her odaklanışta da çalışsın: `React.useEffect(() => { const unsub = navigation?.addListener?.('focus', () => { loadAccounts(); }); return unsub; }, [navigation, loadAccounts]);`
2. `handleShare` içinde `if (zernioAccounts.length === 0) {...}` bloğunu şöyle değiştir: önce `let accountsNow = zernioAccounts; if (accountsNow.length === 0) accountsNow = await loadAccounts();` Hâlâ boşsa mevcut uyarı + `shareError(...)` aynen kalsın. Sonraki `publishPost(zernioAccounts, ...)` çağrısı `publishPost(accountsNow, ...)` olsun.
   - NOT: `loadAccounts` `selectedPlatforms`'u hepsi seçili yapıyor; handoff'tan (`draftPlatforms`) gelen seçim varsa BOZMAMAK için `loadAccounts` içinde `setSelectedPlatforms` yalnız `Object.keys(prev).length === 0` ise çalışsın (`setSelectedPlatforms(prev => Object.keys(prev).length ? prev : initialSelected)`).
3. `publishPost`'tan `false` dönüşünde (`ok === false`) `shareError(t('flowAi.share.failedShort'))` kullan (aşağıdaki yeni anahtar).

## B) flow — `src/modules/flow_ai/FlowAiHost.js`
1. Durum: `const [platformPick, setPlatformPick] = useState(null); const [pickSel, setPickSel] = useState({});`
2. `send` içindeki `actions.forEach` döngüsüne (share_video dalının yanına) ekle:
```js
if (a?.type === 'pick_platforms') {
  const opts = (Array.isArray(a.options) ? a.options : []).slice(0, 10).filter((o) => o && typeof o.platform === 'string' && typeof o.eligible === 'boolean');
  if (opts.length > 0) {
    setPlatformPick(opts.map((o) => ({ platform: o.platform, handle: typeof o.handle === 'string' ? o.handle : '', eligible: o.eligible, reason: typeof o.reason === 'string' ? o.reason : undefined })));
    setPickSel(Object.fromEntries(opts.filter((o) => o.eligible).map((o) => [o.platform, true])));
  }
}
```
   `send` başında (`override` işlenmeden önce) `setPlatformPick(null);` çağır.
3. Kart (mevcut `shareJobPending` kartının yanında, aynı stil dili): başlık `t('flowAi.share.pickTitle')`; her seçenek bir `TouchableOpacity` satırı: platform adı (ilk harf büyük) + `@handle`; seçiliyse sağda `✓`; `eligible === false` ise soluk, `disabled`, altında `reason` (turuncu küçük yazı). İki düğme: `t('flowAi.share.pickContinue')` (hiçbiri seçili değilse `disabled`) → `const names = Object.keys(pickSel).filter((k) => pickSel[k]); setPlatformPick(null); send(\`${t('flowAi.share.pickedPrefix')}: ${names.join(', ')}\`);` ve `t('flowAi.share.cancel')` → `setPlatformPick(null)`.
4. `share-result` işleyicisinde: `payload.ok` **false** ise `setAttachmentMeta(null)` ve `flowAiShareHandoff.clear()` ÇAĞIRMA; yalnız `setShareJobPending(null); setShareConfirmState('IDLE');` (ek ve video bellekte kalsın, kullanıcı tekrar deneyebilsin). `ok` true ise mevcut temizlik aynen.

## C) flow — çeviriler `src/core/i18n/locales/{tr,en,de}.json` (`flowAi.share` altına, üç dile birlikte)
- tr: `pickTitle` "Hangi hesaplarda paylaşalım?", `pickContinue` "Devam", `pickedPrefix` "Seçilen hesaplar", `failedShort` "Paylaşım tamamlanamadı"
- en: "Which accounts should we post to?", "Continue", "Selected accounts", "Sharing could not be completed"
- de: "Auf welchen Konten sollen wir posten?", "Weiter", "Ausgewählte Konten", "Teilen konnte nicht abgeschlossen werden"
README `Son Güncellemeler`'e 07.10.2026 tarihli kısa madde.

## D) flowweb — `src/components/flow-ai/FlowAiPanel.tsx` (küçük)
`onShareResult` içinde `detail.ok` **false** ise `setAttachmentMeta(null)`, `flowAiShareHandoff.clear()` ve dosya girdisi temizliğini ÇAĞIRMA; yalnız `setShareJobPending(null); setShareConfirmState('IDLE');` ve hata mesajını bas. `ok` true ise mevcut temizlik aynen. Başka dosyaya dokunma; README'ye tek satır.

## Kontroller (AYNEN; hepsi OK)
flow: `bash scripts/ci/check-bom.sh`, `bash scripts/ci/check-names.sh src App.js`, `node scripts/ci/check-assets.mjs src App.js`, `node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de`, `node scripts/ci/check-root-map.mjs`.
flowweb: `bash scripts/ci/check-bom.sh`, `bash scripts/ci/check-names.sh src`, `node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de`, `node scripts/ci/check-root-map.mjs`.
İki depo ayrı commit, ayrı push, ayrı "completed successfully". Rapor sonu: `KONTROL 14 — flow <commit> / flowweb <commit>`. Mobil değişiklikler cihaza yeni EAS derlemesiyle gider (Claude kullanıcıya söyler).
