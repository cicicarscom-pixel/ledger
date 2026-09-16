import { AnalyticsPayload, ZernioApiContext, ZernioResponse } from "./types.ts";
import { withRetry } from "./ZernioError.ts";

export class AnalyticsApi {
  constructor(private context: ZernioApiContext) {}

  async getYouTubeChannelInsights(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getYouTubeChannelInsights(payload));
  }

  async getYouTubeDemographics(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getYouTubeDemographics(payload));
  }

  async getTikTokAccountInsights(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getTikTokAccountInsights(payload));
  }

  async getYouTubeDailyViews(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getYouTubeDailyViews(payload));
  }

  async getLinkedInOrgAggregateAnalytics(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getLinkedInOrgAggregateAnalytics(payload));
  }

  async getLinkedInPostAnalytics(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getLinkedInPostAnalytics(payload));
  }

  async getLinkedInAggregateAnalytics(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getLinkedInAggregateAnalytics(payload));
  }

  async getInstagramAccountInsights(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getInstagramAccountInsights(payload));
  }

  async getInstagramDemographics(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getInstagramDemographics(payload));
  }

  async getInstagramFollowerHistory(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getInstagramFollowerHistory(payload));
  }

  async getGoogleBusinessSearchKeywords(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getGoogleBusinessSearchKeywords(payload));
  }

  async getGoogleBusinessPerformance(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getGoogleBusinessPerformance(payload));
  }

  async getFacebookPageInsights(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getFacebookPageInsights(payload));
  }

  async getDailyMetrics(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getDailyMetrics(payload));
  }

  async getContentDecay(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getContentDecay(payload));
  }

  async getPostTimeline(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getPostTimeline(payload));
  }

  async getPostingFrequency(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getPostingFrequency(payload));
  }

  async getBestTimeToPost(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getBestTimeToPost(payload));
  }

  async getAnalytics(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.analytics.getAnalytics(payload));
  }

  /**
   * Zernio üzerinden değil, doğrudan platformda (native olarak) paylaşılmış bir
   * gönderiyi Zernio'ya senkronize edip içeriğini getirir. Zernio API dokümantasyonu:
   * POST /v1/posts/sync-external (https://docs.zernio.com/analytics/sync-external-posts,
   * doküman sitesinde "Analytics" kategorisinde listeleniyor). `listPosts()` bu tür
   * postları ASLA döndürmez çünkü varsayılan olarak sadece source=zernio postlarını
   * listeler. Metod adı ve namespace'i 16.09.2026'da @zernio/node paketinin gerçek
   * index.d.ts dosyasından doğrulandı: `analytics.syncExternalPosts` (çoğul "s" ile,
   * `posts` değil `analytics` altında) — ilk denemede yanlışlıkla PostApi.ts'e
   * `syncExternalPost` (tekil) olarak eklenmişti, "is not a function" hatası verdi.
   */
  async syncExternalPosts(accountId: string, postId: string): Promise<ZernioResponse> {
    return withRetry(() => (this.context.sdk.analytics.syncExternalPosts as any)({
      body: { accountId, postId }
    }));
  }
}
