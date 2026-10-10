/**
 * Zernio hesap analitiği → flow.social_account_metrics alanları.
 * Alan adları @zernio/node SDK tiplerinden alınmıştır (InstagramAccountInsightsResponse.metrics[ad].total,
 * FollowerStatsResponse.accounts[].currentFollowers). Ölçülemeyen metrik 0 değil null kalır.
 */

export interface MappedMetrics {
  followers: number | null;
  impressions: number | null;
  reach: number | null;
  engagements: number | null;
  posts_count: number | null;
}

const num = (v: unknown): number | null => {
  const n = Number(v);
  return v === undefined || v === null || !Number.isFinite(n) ? null : Math.round(n);
};

const total = (res: any, metric: string): number | null => num(res?.metrics?.[metric]?.total);

/** Platforma göre hesap içgörüsü yanıtından (res = SDK `data`) toplamlar. */
export function mapInsights(platform: string, res: any): Pick<MappedMetrics, 'impressions' | 'reach' | 'engagements'> {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return { impressions: total(res, 'views'), reach: total(res, 'reach'), engagements: total(res, 'total_interactions') };
    case 'facebook':
      return { impressions: total(res, 'page_media_view'), reach: null, engagements: total(res, 'page_post_engagements') };
    case 'youtube':
      return { impressions: total(res, 'views'), reach: null, engagements: null };
    default:
      return { impressions: null, reach: null, engagements: null };
  }
}

/** getFollowerStats yanıtından (res = SDK `data`) ilgili hesabın takipçi ve içerik sayısı. */
export function mapFollowerStats(res: any, zernioAccountId: string): Pick<MappedMetrics, 'followers' | 'posts_count'> {
  const acc = (res?.accounts ?? []).find((a: any) => a?._id === zernioAccountId || a?.id === zernioAccountId) ?? (res?.accounts ?? [])[0];
  if (!acc) return { followers: null, posts_count: null };
  const s = acc.accountStats ?? {};
  return { followers: num(acc.currentFollowers), posts_count: num(s.videoCount ?? s.mediaCount) };
}

/**
 * Kuruluşun yerel gününü (YYYY-MM-DD) verir. tz = organizations.timezone (IANA). Eksik/geçersizse UTC
 * (platform uluslararası: sabit bir ülke saatine varsayılmaz). toISOString().split('T') kayması yok.
 */
export function ymdInTimezone(now: Date, tz?: string | null): string {
  const fmt = (zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  try {
    return fmt(tz && tz.trim() ? tz : 'UTC');
  } catch {
    return fmt('UTC');
  }
}

// ---------------------------------------------------------------------------
// Gelen kutusu analitiği → web "Analiz > Gelen Kutusu Analizi" sekmesinin beklediği şekil.
// Kaynak yanıtlar @zernio/node `sdk.inboxanalytics.*` tiplerindendir (getInboxVolume, getInboxTopAccounts,
// getInboxSourceBreakdown, getInboxHeatmap, getInboxResponseTime). Boş/eksik yanıt boş dizi/0 verir.
// ---------------------------------------------------------------------------

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Giden mesajın kaynağı (metadata.source) → grafik etiketi ve rengi. */
const SOURCE_META: Record<string, { name: string; fill: string }> = {
  platform: { name: 'Native app', fill: '#6B7280' },
  api: { name: 'API', fill: '#22B573' },
  human: { name: 'Human', fill: '#3B82F6' },
  workflow: { name: 'Workflow', fill: '#8B5CF6' },
  sequence: { name: 'Sequence', fill: '#F59E0B' },
  broadcast: { name: 'Broadcast', fill: '#F97316' },
  comment_automation: { name: 'Comment automation', fill: '#F472B6' },
  contact: { name: 'Contact', fill: '#14B8A6' },
};

const n0 = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export interface InboxVolumeView {
  summary: { received: number; sent: number; read: number; failed: number; uniqueConversations: number };
  timeseries: Array<{ date: string; received: number; sent: number; read: number; failed: number }>;
  byPlatform: Array<{ platform: string; received: number; sent: number; read: number; failed: number }>;
  byAccount: Array<{ platform: string; name: string; received: number; sent: number; conversations: number; medianResponseSeconds: number | null }>;
  outboundBySource: Array<{ name: string; value: number; fill: string }>;
  heatmap: Array<{ hour: number; day: string; dow: number; value: number }>;
}

/** vol/top/sources/heat = ilgili SDK yanıtının `data` kısmı (hata aldıysa undefined). */
export function mapInboxVolume(vol: any, top: any, sources: any, heat: any): InboxVolumeView {
  const s = vol?.summary ?? {};
  return {
    summary: { received: n0(s.received), sent: n0(s.sent), read: n0(s.read), failed: n0(s.failed), uniqueConversations: n0(s.uniqueConversations) },
    timeseries: (vol?.timeseries ?? []).map((r: any) => ({
      date: String(r?.date ?? ''), received: n0(r?.received), sent: n0(r?.sent), read: n0(r?.read), failed: n0(r?.failed),
    })),
    byPlatform: (vol?.byPlatform ?? []).map((r: any) => ({
      platform: String(r?.platform ?? ''), received: n0(r?.received), sent: n0(r?.sent), read: n0(r?.read), failed: n0(r?.failed),
    })),
    byAccount: (top?.accounts ?? []).map((a: any) => ({
      platform: String(a?.platform ?? ''),
      name: String(a?.displayName || a?.username || a?.platform || ''),
      received: n0(a?.received),
      sent: n0(a?.sent),
      conversations: n0(a?.conversations),
      // repliedCount=0 → "yanıt yok": 0 sn gibi görünmesin (arayüz null'ı "-" gösterir)
      medianResponseSeconds: n0(a?.repliedCount) > 0 ? Math.round(n0(a?.medianResponseSeconds)) : null,
    })),
    outboundBySource: (sources?.sources ?? [])
      .filter((r: any) => n0(r?.sent) > 0)
      .map((r: any) => {
        const key = String(r?.source ?? '');
        const meta = SOURCE_META[key] ?? { name: key || 'Other', fill: '#9CA3AF' };
        return { name: meta.name, value: n0(r?.sent), fill: meta.fill };
      }),
    // dow: 1 = Pazartesi … 7 = Pazar. Değer = alınan + gönderilen.
    heatmap: (heat?.buckets ?? [])
      .map((b: any) => ({ hour: n0(b?.hour), dow: n0(b?.dow), day: DAY_SHORT[n0(b?.dow) - 1] ?? '', value: n0(b?.received) + n0(b?.sent) }))
      .filter((b: any) => b.day !== '' && b.value > 0),
  };
}

const RESPONSE_FILLS = ['#22B573', '#10B981', '#F59E0B', '#F59E0B', '#F97316', '#F43F5E', '#9CA3AF'];

export interface InboxPerformanceView {
  medianResponseSeconds: number;
  p90ResponseSeconds: number;
  repliedCount: number;
  percentUnder5m: number;
  percentUnder15m: number;
  percentUnder1h: number;
  distribution: Array<{ name: string; value: number; fill: string }>;
}

/** res = getInboxResponseTime yanıtının `data` kısmı. Yüzdeler histogramın üst sınırlarından hesaplanır. */
export function mapInboxPerformance(res: any): InboxPerformanceView {
  const sum = res?.summary ?? {};
  const hist: any[] = res?.histogram ?? [];
  const total = hist.reduce((a, h) => a + n0(h?.count), 0);
  const under = (limitSeconds: number) => {
    if (total === 0) return 0;
    const c = hist.reduce((a, h) => (h?.upperSeconds != null && n0(h.upperSeconds) <= limitSeconds ? a + n0(h?.count) : a), 0);
    return Math.round((c / total) * 100);
  };
  return {
    medianResponseSeconds: Math.round(n0(sum.medianSeconds)),
    p90ResponseSeconds: Math.round(n0(sum.p90Seconds)),
    repliedCount: n0(sum.sampleSize),
    percentUnder5m: under(300),
    percentUnder15m: under(900),
    percentUnder1h: under(3600),
    distribution: hist.map((h, i) => ({ name: String(h?.bucket ?? ''), value: n0(h?.count), fill: RESPONSE_FILLS[i] ?? '#9CA3AF' })),
  };
}
