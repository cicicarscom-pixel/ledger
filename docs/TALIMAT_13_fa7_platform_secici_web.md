# TALİMAT 13 — Web: hesap seçici kartı + yanlış "Paylaşıldı" düzeltmesi (flowweb)

Hazırlayan: Claude, 07.10.2026. Ön koşul: Talimat 12 **deploy edilmiş** (Claude ONAY'ı). Ortak kurallar: `TALIMAT_00` (flowweb komutları). Betik YASAK (geçen sefer `patch_flowai.py` CI'ı kırdı).
**Önce** `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`.

## Neden
(1) Kullanıcı hesapları tıklayarak seçsin (Paylaşım Merkezi'ndeki "Bağlantılı Hesaplar" görünümü). (2) Testte kullanıcı kart çıkmadan "Paylaşıldı" mesajı gördü: `share/page.tsx` her paylaşımda (Flow AI'dan bağımsız, elle bile) `flowai:share-result` yayınlıyor; panel bunu kendi işi sanıyor.

## Yapılacaklar (yalnız bu dosyalar: `FlowAiPanel.tsx`, `flowAiShareHandoff.ts`, `share/page.tsx`, `messages/{tr,en,de}.json`, `README.md`)

### 1) `src/lib/flowAiShareHandoff.ts` — "onaylı koşu" bayrağı
- `private confirmedRun = false;` ekle.
- `confirm()` içinde `this.page.share()` çağrısından hemen ÖNCE `this.confirmedRun = true;`.
- Yeni: `takeConfirmedRun(): boolean { const v = this.confirmedRun; this.confirmedRun = false; return v; }`
- `clear()` içinde `this.confirmedRun = false;`.

### 2) `src/app/(dashboard)/sosyal-medya/share/page.tsx`
`flowai:share-result` yayınlayan İKİ yeri (başarı ve hata) şöyle sarmala: önce `const { flowAiShareHandoff } = await import('@/lib/flowAiShareHandoff');` (zaten dinamik import kullanılıyor), sonra `if (flowAiShareHandoff.takeConfirmedRun()) { window.dispatchEvent(...) }`. Elle paylaşımda olay YAYINLANMAZ. Başka davranış değişmez.

### 3) `FlowAiPanel.tsx` — seçici kartı
- Durum: `const [platformPick, setPlatformPick] = useState<null | { platform: string; handle: string; eligible: boolean; reason?: string }[]>(null);` ve `const [pickSel, setPickSel] = useState<Record<string, boolean>>({});`
- `dispatch` içine (mevcut `share_video` dalının yanına) yeni dal:
```ts
} else if (action?.type === "pick_platforms") {
  const opts = Array.isArray(action.options) ? action.options.slice(0, 10).filter((o: any) => o && typeof o.platform === "string" && typeof o.eligible === "boolean") : [];
  if (opts.length === 0) return;
  setPlatformPick(opts.map((o: any) => ({ platform: o.platform, handle: typeof o.handle === "string" ? o.handle : "", eligible: o.eligible, reason: typeof o.reason === "string" ? o.reason : undefined })));
  setPickSel(Object.fromEntries(opts.filter((o: any) => o.eligible).map((o: any) => [o.platform, true])));
}
```
- Kart (mesaj listesinin altında, mevcut `shareJobPending` kartının yanında): başlık `t("share.pickTitle")`; her seçenek bir satır/düğme: platform adı (mevcut `cap()`), `@handle`, seçiliyse yeşil tik; `eligible === false` olanlar soluk, tıklanamaz, altında `reason`. Tıklayınca `pickSel` o platform için tersine döner.
- İki düğme: `t("share.pickContinue")` (en az bir seçili değilse devre dışı): `const names = Object.keys(pickSel).filter((k) => pickSel[k]); setPlatformPick(null); send(\`${t("share.pickedPrefix")}: ${names.join(", ")}\`);` — `send(override)` mevcut. İkincisi `t("share.cancel")`: `setPlatformPick(null)`.
- Mevcut stilleri (box, renkler) kopyala; yeni stil sistemi kurma.
- Panel yeni bir kullanıcı mesajı gönderince (`send` başında) `setPlatformPick(null)`.

### 4) Çeviriler (`flowAi.share` altına, tr/en/de BİRLİKTE, editörde)
- tr: `pickTitle` "Hangi hesaplarda paylaşalım?", `pickContinue` "Devam", `pickedPrefix` "Seçilen hesaplar"
- en: "Which accounts should we post to?", "Continue", "Selected accounts"
- de: "Auf welchen Konten sollen wir posten?", "Weiter", "Ausgewählte Konten"

### 5) README "Son Güncellemeler"ne tarihli kısa madde (`07.10.2026`).

## Kontroller (AYNEN; dört adım gerçekten OK)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
```
`git status` ile kökte yabancı dosya olmadığını göster. Push; GitHub'da **"completed successfully"** gör, görmeden "yeşil" yazma.
Rapor sonu: `KONTROL 13 — flowweb <commit>`.
