import { SocialIntegrationErrorCode } from "./types.ts";

export class ZernioError extends Error {
  public code: SocialIntegrationErrorCode;
  public status: number;
  public details?: any;

  // Mask raw error messages for security
  constructor(rawMessage: string, status: number = 500, code: SocialIntegrationErrorCode = 'ZERNIO_API_ERROR', details?: any) {
    const safeMessage = ZernioError.getSafeMessage(code, rawMessage);
    super(safeMessage);
    this.name = 'ZernioError';
    this.status = status;
    this.code = code;
    this.details = details;
    
    // Log the raw error internally for debugging
    console.error(`[Raw Zernio Error Internal] Code: ${code}, Message: ${rawMessage}`, details);
  }

  static getSafeMessage(code: SocialIntegrationErrorCode, fallback: string): string {
    switch (code) {
      case "PROFILE_PROVISION_FAILED": return "İşletme profili oluşturulurken bir hata oluştu.";
      case "PROFILE_LIMIT_REACHED": return "Maksimum profil sınırına ulaşıldı.";
      case "ACCOUNT_CONNECTION_FAILED": return "Sosyal medya hesabı bağlanamadı.";
      case "ACCOUNT_NOT_FOUND": return "Sosyal medya hesabı bulunamadı.";
      case "ACCOUNT_ACCESS_DENIED": return "Bu hesap üzerinde işlem yapma yetkiniz yok.";
      case "ACCOUNT_RECONNECT_REQUIRED": return "Hesabın yetkisi düşmüş, yeniden bağlamanız gerekiyor.";
      case "ANALYTICS_NOT_AVAILABLE": return "Bu platform için analitik verisi şu an mevcut değil.";
      case "ZERNIO_UNAVAILABLE": return "Sosyal medya altyapı servisi şu an geçici olarak kullanılamıyor.";
      default: return "Sosyal medya entegrasyon servisinde bir hata oluştu.";
    }
  }
}

/**
 * Standardized wrapper for Zernio API calls with Retry mechanism for Rate Limits (429).
 */
export async function withRetry<T>(operation: () => Promise<T>, retries: number = 2, delayMs: number = 1000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('rate limit');
    if (isRateLimit && retries > 0) {
      console.warn(`[Zernio Rate Limit] Retrying in ${delayMs}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return withRetry(operation, retries - 1, delayMs * 2);
    }
    
    // Wrap unknown errors into ZernioError
    if (error instanceof ZernioError) throw error;
    
    throw new ZernioError(error.message || 'Unknown Zernio Error', error.status || 500, 'ZERNIO_EXECUTION_FAILED', error);
  }
}
