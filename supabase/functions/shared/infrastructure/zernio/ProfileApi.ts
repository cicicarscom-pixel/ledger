import { ZernioApiContext, ZernioResponse } from "./types.ts";
import { withRetry } from "./ZernioError.ts";

export class ProfileApi {
  constructor(private context: ZernioApiContext) {}

  async listProfiles(): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.profiles.listProfiles());
  }

  async createProfile(name: string, idempotencyKey?: string): Promise<ZernioResponse> {
    const config: any = { body: { name } };
    if (idempotencyKey) {
       config.headers = { "Idempotency-Key": idempotencyKey };
    }
    return withRetry(() => this.context.sdk.profiles.createProfile(config));
  }

  // Admin/maintenance use: renames a profile's display name in Zernio's own dashboard.
  // Does not touch any of our own DB records (we only ever key off zernio_profile_id).
  async updateProfile(profileId: string, name: string): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.profiles.updateProfile({
      path: { profileId },
      body: { name },
    }));
  }
}
