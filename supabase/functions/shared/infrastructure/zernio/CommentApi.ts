import { ZernioApiContext, ZernioResponse } from "./types.ts";
import { withRetry, ZernioError } from "./ZernioError.ts";

export class CommentApi {
  constructor(private context: ZernioApiContext) {}

  async listInboxComments(profileId: string): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.comments.listInboxComments({ query: { profileId } }));
  }

  async getInboxPostComments(postId: string, accountId: string): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.comments.getInboxPostComments({ 
        path: { postId },
        query: { accountId }
    }));
  }

  async likeComment(accountId: string, postId: string, commentId: string): Promise<void> {
    return withRetry(async () => {
      const likeUrl = `https://api.zernio.com/v1/inbox/comments/${postId}/${commentId}/like`;
      const response = await fetch(likeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.context.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId })
      });
      
      if (!response.ok) {
        throw new ZernioError(await response.text(), response.status, 'LIKE_COMMENT_FAILED');
      }
    });
  }

  async replyToComment(accountId: string, postId: string, commentId: string, message: string): Promise<ZernioResponse> {
    // Attempt auto-like first
    if (commentId) {
      try {
        await this.likeComment(accountId, postId, commentId);
      } catch (e) {
        console.warn("[Zernio] Failed to auto-like comment before replying:", e);
      }
    }

    return withRetry(async () => {
      const url = `https://api.zernio.com/v1/inbox/comments/${postId}`;
      const fetchRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.context.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId,
          commentId,
          message
        })
      });
      
      if (!fetchRes.ok) {
        throw new ZernioError(await fetchRes.text(), fetchRes.status, 'REPLY_COMMENT_FAILED');
      }
      
      return await fetchRes.json();
    });
  }

  async sendPrivateReply(accountId: string, postId: string, commentId: string, message: string): Promise<ZernioResponse> {
    return withRetry(async () => {
      const url = `https://api.zernio.com/v1/inbox/comments/${postId}/${commentId}/private-reply`;
      const fetchRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.context.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId,
          message
        })
      });
      
      if (!fetchRes.ok) {
        throw new ZernioError(await fetchRes.text(), fetchRes.status, 'PRIVATE_REPLY_FAILED');
      }
      
      return await fetchRes.json();
    });
  }
}
