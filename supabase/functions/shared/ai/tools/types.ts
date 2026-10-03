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
}

/**
 * READ: yalnız okur. PREPARE: taslak/hazırlık üretir, dış dünyaya etkisi yok.
 * EXTERNAL_ACTION: dış dünyaya etki eder (yayınlama, mesaj gönderme) → sunucuda bekleyen işlem + kullanıcı onayı şart.
 */
export type ToolRiskLevel =
  | 'READ'
  | 'PREPARE'
  | 'EXTERNAL_ACTION';
