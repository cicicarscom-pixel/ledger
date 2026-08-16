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
}
