import { CreatePostPayload, ZernioApiContext, ZernioResponse } from "./types.ts";
import { withRetry } from "./ZernioError.ts";

export class PostApi {
  constructor(private context: ZernioApiContext) {}

  async listPosts(profileId: string): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.posts.listPosts({ query: { profileId } }));
  }

  async createPost(payload: CreatePostPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.posts.createPost({ body: payload }));
  }

  async deletePost(postId: string, deleteFromPlatforms: boolean = false): Promise<ZernioResponse> {
    // We cast to any to pass the query parameter since it might not be typed in this SDK version
    return withRetry(() => (this.context.sdk.posts.deletePost as any)({ 
      path: { postId }, 
      query: { deleteFromPlatforms } 
    }));
  }

  /**
   * Yayınlanmış bir postu TEK bir platformdan kaldırır. Zernio'nun resmi API
   * dokümantasyonuna göre DELETE /v1/posts/{postId} yalnızca taslak/zamanlanmış
   * postlarda çalışır — yayınlanmış postları koşulsuz reddeder ("Published
   * posts cannot be deleted; use the Unpublish endpoint instead"). Bu metod
   * POST /v1/posts/{postId}/unpublish uç noktasını çağırır. Instagram, TikTok
   * ve Snapchat'te desteklenmiyor. Post hedeflenen tüm platformlardan
   * kaldırıldığında Zernio tarafında durumu 'cancelled' olur (post silinmez,
   * sadece yayından kalkar).
   *
   * ⚠️ DİKKAT: `unpublishPost` metod adı @zernio/node SDK'sının bu sürümünde
   * doğrulanmadı (diğer metodlarla aynı isimlendirme kalıbından tahmin
   * edildi). Deploy etmeden önce TypeScript otokompletiyle veya SDK
   * kaynağından gerçek metod adını teyit edin — farklıysa burada güncelleyin.
   */
  async unpublishPost(postId: string, platform: string): Promise<ZernioResponse> {
    return withRetry(() => (this.context.sdk.posts.unpublishPost as any)({
      path: { postId },
      body: { platform }
    }));
  }
}
