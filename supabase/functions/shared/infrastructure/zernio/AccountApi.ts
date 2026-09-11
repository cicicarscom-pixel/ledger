import { ConnectUrlPayload, ZernioApiContext, ZernioResponse, AnalyticsPayload } from "./types.ts";
import { withRetry, ZernioError } from "./ZernioError.ts";

export class AccountApi {
  constructor(private context: ZernioApiContext) {}

  async getConnectUrl(payload: ConnectUrlPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.connect.getConnectUrl({
      path: { platform: payload.platform },
      query: {
        profileId: payload.profileId,
        ...(payload.redirectUrl ? { redirect_url: payload.redirectUrl } : {})
      }
    }));
  }

  async listAccounts(profileId: string): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.accounts.listAccounts({ query: { profileId } }));
  }

  /**
   * Bağlı bir sosyal medya hesabını Zernio'dan tamamen siler/bağlantısını keser.
   * Zernio'nun resmi API dokümantasyonu: DELETE /v1/accounts/{accountId}
   * ("Disconnects and removes a connected social account"). Önceki implementasyon
   * üç farklı SDK metod adını tahmin ederek deniyor, hataları sessizce yutuyordu ve
   * yanlış bir domain'e (api.zernio.com yerine zernio.com/api olmalı) REST fallback
   * yapıyordu — bu yüzden Zernio tarafında bağlantı kopmadan yerel kayıt sessizce
   * siliniyordu. Diğer doğrulanmış metodlarla (deletePost, unpublishPost) aynı
   * {path:{...}} çağrı kalıbına geçirildi.
   *
   * ⚠️ Aynı uyarı: çağrı şeklini (path parametresinin adı `accountId` mi başka bir
   * şey mi) deploy öncesi SDK'dan teyit edin.
   */
  async disconnectAccount(accountId: string): Promise<ZernioResponse> {
    return withRetry(() => (this.context.sdk.accounts.deleteAccount as any)({ path: { accountId } }));
  }

  async getFollowerStats(payload: AnalyticsPayload): Promise<ZernioResponse> {
    return withRetry(() => this.context.sdk.accounts.getFollowerStats(payload));
  }
}
