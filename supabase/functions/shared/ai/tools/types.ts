import type { AIContext } from '../types.ts';

export interface ToolResult {
  status: string;
  message?: string;
  data?: unknown;
}

export interface ITool {
  readonly name: string;
  readonly description: string;
  readonly schema: Record<string, unknown>;
  /** Flow AI için zorunlu; belirtilmeyen araç EXTERNAL_ACTION sayılır (güvenli varsayılan). */
  readonly riskLevel?: ToolRiskLevel;

  execute(
    context: AIContext,
    args: Record<string, unknown>,
  ): Promise<ToolResult>;

  /**
   * Yalnız EXTERNAL_ACTION araçları için (isteğe bağlı): onay kaydı OLUŞTURULMADAN önce çağrılır.
   * Girdiyi doğrular, sunucuda çözülmüş (değişmez) argümanları ve kullanıcıya gösterilecek özeti döner;
   * hash bu çözülmüş argümanlar üzerinden alınır. ok:false ise onay kaydı açılmaz, result modele döner.
   */
  prepareApproval?(
    context: AIContext,
    args: Record<string, unknown>,
  ): Promise<{ ok: true; args: Record<string, unknown>; preview: unknown } | { ok: false; result: ToolResult }>;
}

/**
 * READ: yalnız okur. PREPARE: taslak/hazırlık üretir, dış dünyaya etkisi yok.
 * EXTERNAL_ACTION: dış dünyaya etki eder (yayınlama, mesaj gönderme) → sunucuda bekleyen işlem + kullanıcı onayı şart.
 */
export type ToolRiskLevel =
  | 'READ'
  | 'PREPARE'
  | 'EXTERNAL_ACTION';
