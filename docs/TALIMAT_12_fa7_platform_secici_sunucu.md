# TALİMAT 12 — Video paylaşımında hesap seçici (ledger, sunucu)

Hazırlayan: Claude, 07.10.2026. Ön koşul: Talimat 11 (`b908578`) canlıda. Ortak kurallar: `TALIMAT_00`.
**Önce** `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`. Talimat 13 (web) bunun deploy'una bağlıdır.

## Amaç
Kullanıcı platform söylemediyse Flow AI "hangi platformlar?" diye yazıyla sormakla kalmaz; panelde **Bağlantılı Hesaplar** gibi tıklanabilir seçenekler çıkar. Sunucu yalnız seçenekleri hazırlar, istemci çizer.

## Yapılacaklar (editörde, betik yok)

### 1) `supabase/functions/shared/ai/flow/tools/PublishTools.ts`
`getConnectedPlatforms` yanına yeni dışa aktarım ekle (mevcut işlevi DEĞİŞTİRME):
```ts
export async function getConnectedAccounts(admin: any, orgId: string): Promise<Array<{ platform: string; handle: string }>> {
  const { data, error } = await admin.schema('integration').from('social_accounts')
    .select('platform, username, is_active, needs_reconnection').eq('organization_id', orgId);
  if (error) { console.error('[connectedAccounts] hesap okuma hatası:', error.message); return []; }
  const seen = new Set<string>();
  const out: Array<{ platform: string; handle: string }> = [];
  for (const a of (data ?? []).filter((x: any) => x.is_active && !x.needs_reconnection)) {
    const platform = normalizePlatform(a.platform);
    if (seen.has(platform)) continue;
    seen.add(platform);
    out.push({ platform, handle: typeof a.username === 'string' ? a.username.slice(0, 60) : '' });
  }
  return out;
}
```

### 2) `supabase/functions/shared/ai/flow/tools/VideoShareTools.ts`
- Şema `properties.platforms` açıklaması aynı kalsın.
- `execute` içinde, `getConnectedPlatforms` çağrısından sonra, **platform argümanı yoksa** (`!Array.isArray(args.platforms) || args.platforms.length === 0`) şu akış çalışsın ve `return` etsin. (Mevcut "bağlı hepsini kullan" varsayılanı kalkar.)
```ts
const accounts = await getConnectedAccounts(this.admin, context.organizationId);
// kuralları oku (mevcut rulesMap kodunu yeniden kullan; ayrı yardımcı işleve alabilirsin)
const options = accounts.map((a) => {
  const format = pickFormat(a.platform, facts);
  const rule = rulesMap.get(`${a.platform}-${format}`);
  if (!rule) return { platform: a.platform, handle: a.handle, eligible: false, reason: "Bu platform için biçim kuralı tanımlı değil" };
  const check = checkEligibility(rule, facts);
  return check.ok
    ? { platform: a.platform, handle: a.handle, eligible: true }
    : { platform: a.platform, handle: a.handle, eligible: false, reason: check.reason };
});
if (!options.some((o) => o.eligible)) return { status: "NOTHING_ELIGIBLE", data: { skipped: options.filter((o) => !o.eligible).map((o) => ({ platform: o.platform, reason: o.reason })) } };
return {
  status: "PLATFORMS_REQUIRED",
  data: { options, clientAction: { type: "pick_platforms", options } },
  message: "Panelde hesap seçenekleri gösterildi. Kullanıcıya kısaca 'Aşağıdan paylaşmak istediğin hesapları seç' de ve gönderi metnini henüz vermediyse metni de iste. 'Hazırladım' DEME. Seçim 'Seçilen hesaplar: ...' mesajıyla gelince prepare_video_share'i platforms (ve metin varsa caption) ile çağır."
};
```
(`rulesMap` bu noktada dolu olmalı: kural okuma bloğunu bu akıştan ÖNCE çalışacak şekilde yukarı al; `targetPlatforms.length > 0` koşulunu kaldır, kurallar her zaman okunur.)
- `NO_ACCOUNTS` dönüşü aynen kalsın. Platform argümanı VARSA mevcut akış (uygunluk, metin, zaman) aynen devam eder.

### 3) `FlowPromptBuilder.ts` — 14. kural
"Kullanıcı platform söylemediyse bağlı hepsini kullan." cümlesini şununla DEĞİŞTİR (başka satıra dokunma):
`Kullanıcı platform söylemediyse prepare_video_share'i platforms OLMADAN çağır; PLATFORMS_REQUIRED dönerse panelde hesap seçenekleri çıkar, sen kısaca "Aşağıdan hesapları seç" de ve metni sor, "hazırladım" DEME. Kullanıcı "Seçilen hesaplar: x, y" yazarsa o hesaplarla tekrar çağır. Kullanıcı platformları kendisi saydıysa doğrudan platforms ile çağır.`

### 4) Testler (`VideoShareTools.test.ts`)
Mock'ta `social_accounts` satırına `username: "ornek"` ekle.
- Platformsuz çağrı, dikey 30 sn video → `status === "PLATFORMS_REQUIRED"`, `data.options[0]` = `{platform:"instagram", handle:"ornek", eligible:true}`, `data.clientAction.type === "pick_platforms"`.
- Platformsuz, yatay video (tek hesap Instagram) → `NOTHING_ELIGIBLE`.
- Mevcut testler `platforms: ["instagram"]` vererek (gerekirse güncelle) önceki sonuçları korusun; "caption required" testleri platform vererek `CAPTION_REQUIRED` dönmeli.

## Kontroller (AYNEN, hepsi OK)
Talimat 11'deki komutların aynısı (4 deno test dosyası + 3 CI betiği + root-map). Push; GitHub'da **"completed successfully"** gör. Deploy YOK, ONAY'dan sonra. Raporda dokunduğun HER dosyayı say; talimat dışı dosyaya dokunma.
Rapor sonu: `KONTROL 12 — ledger <commit>`.
