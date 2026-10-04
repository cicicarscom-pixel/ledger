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

/** İşletme gününü (Europe/Istanbul) YYYY-MM-DD verir; toISOString kayması yok. */
export function ymdInTimezone(now: Date, tz = 'Europe/Istanbul'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
