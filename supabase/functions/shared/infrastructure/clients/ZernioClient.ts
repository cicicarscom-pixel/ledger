import Zernio from "npm:@zernio/node";
import { ZernioApiContext } from "../zernio/types.ts";
import { ZernioError } from "../zernio/ZernioError.ts";
import { ProfileApi } from "../zernio/ProfileApi.ts";
import { AccountApi } from "../zernio/AccountApi.ts";
import { PostApi } from "../zernio/PostApi.ts";
import { MediaApi } from "../zernio/MediaApi.ts";
import { InboxApi } from "../zernio/InboxApi.ts";
import { CommentApi } from "../zernio/CommentApi.ts";
import { AnalyticsApi } from "../zernio/AnalyticsApi.ts";

/**
 * ZernioClient Facade
 * 
 * Provides a unified entry point to all Zernio Sub-APIs.
 * This class instantiates the underlying Zernio SDK and injects it into domain-specific APIs.
 */
export class ZernioClient {
  public profiles: ProfileApi;
  public accounts: AccountApi;
  public posts: PostApi;
  public media: MediaApi;
  public inbox: InboxApi;
  public comments: CommentApi;
  public analytics: AnalyticsApi;

  constructor() {
    const apiKey = Deno.env.get('ZERNIO_API_KEY');
    if (!apiKey) {
      throw new ZernioError("ZERNIO_API_KEY environment variable is missing", 500, "MISSING_API_KEY");
    }

    const sdk = new Zernio({ apiKey });
    const context: ZernioApiContext = { apiKey, sdk };

    // Initialize Sub-APIs
    this.profiles = new ProfileApi(context);
    this.accounts = new AccountApi(context);
    this.posts = new PostApi(context);
    this.media = new MediaApi(context);
    this.inbox = new InboxApi(context);
    this.comments = new CommentApi(context);
    this.analytics = new AnalyticsApi(context);
  }
}
