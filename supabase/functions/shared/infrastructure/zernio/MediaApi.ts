import { ZernioApiContext, ZernioResponse } from "./types.ts";
import { withRetry } from "./ZernioError.ts";

export class MediaApi {
  constructor(private context: ZernioApiContext) {}

  /**
   * @deprecated Bu metod Zernio'nun "messages" (DM/sohbet eki) namespace'ine ait,
   * post medyası için tasarlanmamış ve düşük bir boyut sınırı var (413 Payload Too Large).
   * Gönderi (post) medyası için uploadViaPresignedUrl() kullanın.
   */
  async uploadMediaDirect(mimeType: string, bytes: Uint8Array): Promise<ZernioResponse> {
    return withRetry(() => {
      const blob = new Blob([bytes], { type: mimeType });
      return this.context.sdk.messages.uploadMediaDirect({
        body: {
          file: blob as any,
          contentType: mimeType
        }
      });
    });
  }

  /**
   * Zernio'nun resmi post-medyası yükleme akışı: POST /v1/media/presign ile
   * { uploadUrl, publicUrl } alınır, dosya doğrudan uploadUrl'e PUT edilir.
   * Dosya başına 5GB'a kadar destekler.
   */
  async getPresignedUploadUrl(filename: string, contentType: string, size: number): Promise<{ uploadUrl: string; publicUrl: string; key: string; expiresIn: number }> {
    const res: any = await withRetry(() => this.context.sdk.media.getMediaPresignedUrl({
      body: { filename, contentType, size }
    }));
    const data = res?.data || res;
    if (!data?.uploadUrl || !data?.publicUrl) {
      throw new Error("Zernio presign yanıtında uploadUrl/publicUrl bulunamadı: " + JSON.stringify(res));
    }
    return data;
  }

  /**
   * Presign + PUT akışını tek adımda yapar, kalıcı publicUrl döner.
   */
  async uploadViaPresignedUrl(filename: string, contentType: string, bytes: Uint8Array): Promise<string> {
    const { uploadUrl, publicUrl } = await this.getPresignedUploadUrl(filename, contentType, bytes.length);

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: bytes
    });

    if (!putRes.ok) {
      throw new Error(`Zernio presigned URL'e yükleme başarısız: ${putRes.status} ${putRes.statusText}`);
    }

    return publicUrl;
  }
}
