import type { AIContext } from '../../types.ts';
import type { ITool, ToolResult } from '../../tools/types.ts';

/**
 * FA4 — Flow AI salt-okunur sosyal medya analitiği. Hepsi READ.
 * Kiracı kaynağı YALNIZ context.organizationId; veri public.get_social_analytics_for_ai RPC'sinden
 * (service_role) ya da zernio-client'tan (kiracı kapsamlı, org:<id> önbellekli) gelir.
 * Veri yoksa model uydurmaz: { hasData:false } döner.
 */

const MAX_JSON_CHARS = 6000;

function clampDays(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(90, Math.max(1, n)) : 30;
}

function platformArg(v: unknown): string | undefined {
  const s = String(v ?? '').trim().toLowerCase();
  return /^[a-z]{2,20}$/.test(s) ? s : undefined;
}

function trimData(data: unknown): unknown {
  const s = JSON.stringify(data ?? null);
  if (s.length <= MAX_JSON_CHARS) return data;
  return { truncated: true, preview: s.slice(0, MAX_JSON_CHARS) };
}


const DAY_NAMES_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/** Zernio best-times yanıtı → en yüksek 5 dilim (gün adı, saat, ortalama etkileşim, örnek sayısı). */
export function compactBestTimes(d: any) {
  const slots: any[] = Array.isArray(d?.slots) ? d.slots : Array.isArray(d) ? d : [];
  return slots
    .filter((s) => Number.isFinite(Number(s?.day_of_week)) && Number.isFinite(Number(s?.hour)))
    .sort((a, b) => Number(b.avg_engagement ?? 0) - Number(a.avg_engagement ?? 0))
    .slice(0, 5)
    .map((s) => ({
      day: DAY_NAMES_TR[Number(s.day_of_week)] ?? String(s.day_of_week),
      hour: `${String(Number(s.hour)).padStart(2, '0')}:00`,
      avgEngagement: Math.round(Number(s.avg_engagement ?? 0) * 10) / 10,
      postCount: Number(s.post_count ?? 0),
    }));
}

/** Zernio gönderi analitiği → toplamlar + görüntülenmeye göre ilk 8 gönderi (kısa metin). */
export function compactPostPerformance(d: any) {
  const posts: any[] = Array.isArray(d?.posts) ? d.posts : Array.isArray(d) ? d : [];
  const rows = posts.map((p) => {
    const a = p?.analytics ?? {};
    return {
      platform: String(p?.platform ?? ''),
      text: String(p?.content ?? '').replace(/\s+/g, ' ').slice(0, 60),
      views: Number(a.views ?? 0), likes: Number(a.likes ?? 0), comments: Number(a.comments ?? 0),
      shares: Number(a.shares ?? 0), engagementRate: Number(a.engagementRate ?? 0),
    };
  });
  const sum = (k: 'views' | 'likes' | 'comments' | 'shares') => rows.reduce((s, r) => s + r[k], 0);
  return {
    postCount: rows.length,
    totals: { views: sum('views'), likes: sum('likes'), comments: sum('comments'), shares: sum('shares') },
    topByViews: [...rows].sort((a, b) => b.views - a.views).slice(0, 8),
  };
}

interface AccountRow {
  platform: string; username?: string | null;
  followers_now: number | null; followers_start: number | null;
  impressions: number; reach: number; engagements: number;
  days_with_data: number; last_metric_date: string | null;
}

export function summarizeAccounts(rows: AccountRow[]) {
  return rows.map((a) => {
    const hasData = (a.days_with_data ?? 0) > 0;
    const change = hasData && a.followers_now != null && a.followers_start != null ? a.followers_now - a.followers_start : null;
    return {
      platform: a.platform, username: a.username ?? null, hasData,
      followers: hasData ? a.followers_now : null,
      followerChange: change,
      impressions: hasData ? a.impressions : null, reach: hasData ? a.reach : null, engagements: hasData ? a.engagements : null,
      daysWithData: a.days_with_data ?? 0, lastMetricDate: a.last_metric_date ?? null,
    };
  });
}

async function loadOverview(admin: any, orgId: string, days: number) {
  const { data, error } = await admin.rpc('get_social_analytics_for_ai', { p_org: orgId, p_days: days });
  if (error) {
    console.error('[social_analytics] rpc hata:', error.message);
    return null;
  }
  return data as { days: number; accounts: AccountRow[]; posts: { total: number; by_status: Record<string, number>; by_platform: Record<string, number> } };
}

export class GetSocialOverviewTool implements ITool {
  readonly name = 'get_social_overview';
  readonly description = 'Sosyal medya genel özeti: bağlı hesapların takipçi/gösterim/erişim/etkileşim toplamları ve dönemdeki gönderi sayıları. Yalnız okur.';
  readonly riskLevel = 'READ' as const;
  readonly schema = { type: 'object', properties: { days: { type: 'number', description: 'Geriye dönük gün sayısı (1-90, varsayılan 30).' } } };
  constructor(private readonly admin: any) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const days = clampDays(args.days);
    const o = await loadOverview(this.admin, context.organizationId, days);
    if (!o) return { status: 'ERROR', message: 'Sosyal medya özeti şu an alınamadı.' };
    const accounts = summarizeAccounts(o.accounts ?? []);
    const hasData = accounts.some((a) => a.hasData);
    return {
      status: 'SUCCESS',
      data: {
        days, hasData, accounts, posts: o.posts,
        note: accounts.length === 0 ? 'Bağlı sosyal medya hesabı yok.' : hasData ? undefined : 'Hesaplar BAĞLI; günlük ölçümler her 4 saatte bir toplanıyor ve henüz ilk ölçüm gelmedi. "Hesap bağlı değil" DEME; kısa süre sonra tekrar sormasını öner. Sayı uydurma.',
      },
    };
  }
}

export class GetAccountGrowthTool implements ITool {
  readonly name = 'get_account_growth';
  readonly description = 'Hesap büyümesi: dönem başı/sonu takipçi ve değişim. İsteğe bağlı platform filtresi.';
  readonly riskLevel = 'READ' as const;
  readonly schema = {
    type: 'object',
    properties: {
      days: { type: 'number', description: 'Geriye dönük gün (1-90, varsayılan 30).' },
      platform: { type: 'string', description: 'instagram, facebook, youtube, tiktok vb. (isteğe bağlı).' },
    },
  };
  constructor(private readonly admin: any) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const days = clampDays(args.days);
    const platform = platformArg(args.platform);
    const o = await loadOverview(this.admin, context.organizationId, days);
    if (!o) return { status: 'ERROR', message: 'Büyüme verisi şu an alınamadı.' };
    let accounts = summarizeAccounts(o.accounts ?? []);
    if (platform) accounts = accounts.filter((a) => a.platform.toLowerCase() === platform);
    const growth = accounts.map((a) => ({ platform: a.platform, username: a.username, hasData: a.hasData, followers: a.followers, followerChange: a.followerChange, daysWithData: a.daysWithData }));
    const anyData = growth.some((g) => g.hasData);
    return { status: 'SUCCESS', data: { days, hasData: anyData, accounts: growth, note: !anyData && growth.length > 0 ? 'Hesaplar BAĞLI; günlük ölçümler her 4 saatte bir toplanıyor ve henüz yeterli gün birikmedi. "Hesap bağlı değil" DEME; sayı uydurma.' : undefined } };
  }
}

/** zernio-client'a servis rolüyle, kiracı = organizations.id olarak sorar; kapsam sunucuda yeniden kurulur. */
export type ZernioAnalyticsCaller = (action: string, orgId: string, query: Record<string, unknown>) => Promise<any>;

export function createZernioAnalyticsCaller(supabaseUrl: string, serviceKey: string, fetchImpl: typeof fetch = fetch): ZernioAnalyticsCaller {
  return async (action, orgId, query) => {
    const res = await fetchImpl(`${supabaseUrl}/functions/v1/zernio-client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ action, payload: { profileId: orgId, query } }),
    });
    const body = await res.json().catch(() => null);
    if (!body?.success) throw new Error(body?.error ?? `zernio-client ${res.status}`);
    return body.data;
  };
}

function isEmptyResult(d: unknown): boolean {
  if (d == null) return true;
  if (Array.isArray(d)) return d.length === 0;
  if (typeof d === 'object') return Object.keys(d as object).length === 0;
  return false;
}

export class GetBestPostingTimesTool implements ITool {
  readonly name = 'get_best_posting_times';
  readonly description = 'Paylaşım için en iyi gün/saat önerisi (Zernio verisine göre). Veri yoksa söyler.';
  readonly riskLevel = 'READ' as const;
  readonly schema = { type: 'object', properties: { platform: { type: 'string', description: 'İsteğe bağlı platform filtresi.' } } };
  constructor(private readonly call: ZernioAnalyticsCaller) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const platform = platformArg(args.platform);
    try {
      const d = await this.call('get-best-times', context.organizationId, platform ? { platform } : {});
      if (isEmptyResult(d)) return { status: 'SUCCESS', data: { hasData: false, note: 'En iyi saat için yeterli veri yok; saat uydurma.' } };
      const best = compactBestTimes(d);
      if (best.length === 0) return { status: 'SUCCESS', data: { hasData: false, note: 'En iyi saat için yeterli veri yok; saat uydurma.' } };
      return { status: 'SUCCESS', data: { hasData: true, bestTimes: best, note: 'postCount küçükse (1-3) bunu belirt: örnek az, kesin kural değil.' } };
    } catch (e: any) {
      console.error('[get_best_posting_times] hata:', e?.message);
      return { status: 'ERROR', message: 'En iyi paylaşım saatleri şu an alınamadı.' };
    }
  }
}

export class GetContentPerformanceTool implements ITool {
  readonly name = 'get_content_performance';
  readonly description = 'Gönderi performansı (görüntülenme, beğeni, yorum vb.) — Zernio verisine göre. Veri yoksa söyler.';
  readonly riskLevel = 'READ' as const;
  readonly schema = {
    type: 'object',
    properties: {
      days: { type: 'number', description: 'Geriye dönük gün (1-90, varsayılan 30).' },
      platform: { type: 'string', description: 'İsteğe bağlı platform filtresi.' },
    },
  };
  constructor(private readonly call: ZernioAnalyticsCaller) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const platform = platformArg(args.platform);
    const days = clampDays(args.days);
    const to = new Date();
    const from = new Date(to.getTime() - days * 86400000);
    const ymd = (d: Date) => d.toISOString().slice(0, 10); // Zernio sorgu aralığı (UTC) — gün gösterimi değil
    const query: Record<string, unknown> = { fromDate: ymd(from), toDate: ymd(to) };
    if (platform) query.platform = platform;
    try {
      const d = await this.call('get-post-analytics', context.organizationId, query);
      if (isEmptyResult(d)) return { status: 'SUCCESS', data: { hasData: false, days, note: 'Gönderi performans verisi henüz yok; sayı uydurma.' } };
      const perf = compactPostPerformance(d);
      if (perf.postCount === 0) return { status: 'SUCCESS', data: { hasData: false, days, note: 'Gönderi performans verisi henüz yok; sayı uydurma.' } };
      return { status: 'SUCCESS', data: { hasData: true, days, ...perf, note: 'Platformların henüz ölçmediği değerler 0 görünebilir; 0 = ölçülmedi olabilir, "etkileşim düşük" diye yorumlama.' } };
    } catch (e: any) {
      console.error('[get_content_performance] hata:', e?.message);
      return { status: 'ERROR', message: 'Gönderi performansı şu an alınamadı.' };
    }
  }
}

export function createSocialAnalyticsTools(admin: any, call: ZernioAnalyticsCaller): ITool[] {
  return [new GetSocialOverviewTool(admin), new GetAccountGrowthTool(admin), new GetBestPostingTimesTool(call), new GetContentPerformanceTool(call)];
}
