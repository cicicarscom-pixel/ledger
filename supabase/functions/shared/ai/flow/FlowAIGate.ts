import type { AIContext, ToolCall } from '../types.ts';
import type { ITool, ToolResult, ToolRiskLevel } from '../tools/types.ts';
import type { ToolExecutorLike } from '../BaseOrchestrator.ts';
import type { ToolRegistry } from '../tools/ToolRegistry.ts';

/**
 * FLOW AI ONAY KAPISI (FA1-2). Kural: dış dünyaya etki eden (EXTERNAL_ACTION) hiçbir araç, sunucuda bir
 * "bekleyen işlem" kaydı ve kullanıcının bu kayda verdiği onay olmadan ÇALIŞMAZ. Riski belirtilmeyen araç da
 * EXTERNAL_ACTION sayılır (fail-closed). Model (Gemini) bu kapıyı atlayamaz: araç çağrısı yalnız burada çalıştırılır.
 */

export function effectiveRisk(tool: ITool): ToolRiskLevel {
  return tool.riskLevel ?? 'EXTERNAL_ACTION';
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, canonicalize(v)]),
    );
  }
  return value;
}

/** Araç adı + argümanların anahtar sırasından bağımsız SHA-256 özeti. */
export async function hashPayload(toolName: string, args: Record<string, unknown>): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(canonicalize({ tool: toolName, args })));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface PendingActionRow {
  id: string;
  org_id: string;
  user_id: string;
  conversation_id: string | null;
  tool_name: string;
  risk_level: ToolRiskLevel;
  args: Record<string, unknown>;
  preview: unknown;
  payload_hash: string;
  status: string;
  expires_at: string;
}

export interface NewPendingAction {
  org_id: string;
  user_id: string;
  conversation_id: string | null;
  tool_name: string;
  risk_level: ToolRiskLevel;
  args: Record<string, unknown>;
  preview: unknown;
  payload_hash: string;
}

export interface PendingActionStore {
  insert(row: NewPendingAction): Promise<PendingActionRow>;
  /** pending → approved geçişini ATOMİK yapar (aynı kayıt iki kez onaylanamaz). Süresi dolmuş/başkasının/pending olmayan → null. */
  claim(id: string, orgId: string, userId: string): Promise<PendingActionRow | null>;
  finish(id: string, status: 'executed' | 'failed', result: unknown): Promise<void>;
  reject(id: string, orgId: string, userId: string): Promise<boolean>;
}

/**
 * Orkestratörün kullandığı araç yürütücüsü (istek başına bir örnek). READ/PREPARE doğrudan çalışır;
 * EXTERNAL_ACTION çalıştırılmaz, bekleyen işlem olarak kaydedilir ve PENDING_APPROVAL döner.
 */
export class FlowToolExecutor implements ToolExecutorLike {
  constructor(
    private readonly registry: Pick<ToolRegistry, 'getTool'>,
    private readonly store: PendingActionStore,
    private readonly who: { orgId: string; userId: string; conversationId: string | null },
  ) {}

  async executeCall(context: AIContext, call: ToolCall): Promise<ToolResult> {
    const tool = this.registry.getTool(call.name);
    if (!tool) return { status: 'NOT_FOUND', message: `Tool '${call.name}' is not recognized.` };
    const args = call.args ?? {};
    const risk = effectiveRisk(tool);
    try {
      if (risk === 'EXTERNAL_ACTION') {
        const row = await this.store.insert({
          org_id: this.who.orgId,
          user_id: this.who.userId,
          conversation_id: this.who.conversationId,
          tool_name: tool.name,
          risk_level: risk,
          args,
          preview: { tool: tool.name, description: tool.description, args },
          payload_hash: await hashPayload(tool.name, args),
        });
        return {
          status: 'PENDING_APPROVAL',
          message: 'Bu işlem kullanıcı onayı olmadan yapılamaz. Kullanıcıya ne yapılacağını özetle ve onay iste; işlem yapıldı DEME.',
          data: { actionId: row.id, payloadHash: row.payload_hash, expiresAt: row.expires_at },
        };
      }
      return await tool.execute(context, args);
    } catch (error) {
      console.error(`[FlowToolExecutor] ${call.name} hata:`, error);
      return { status: 'ERROR', message: 'Internal execution error.' };
    }
  }
}

export type ApprovalOutcome =
  | { status: 'EXECUTED'; result: ToolResult }
  | { status: 'FAILED'; result: ToolResult }
  | { status: 'NOT_APPROVABLE' }      // yok / başkasının / süresi dolmuş / zaten karara bağlanmış
  | { status: 'PAYLOAD_CHANGED' }     // kullanıcının gördüğü içerik ile kayıtlı içerik uyuşmuyor
  | { status: 'TOOL_UNAVAILABLE' };

/** Kullanıcı onayı: bekleyen işlemi talep eder (claim), içeriği doğrular, YALNIZ sonra çalıştırır. */
export async function approveAction(
  deps: { registry: Pick<ToolRegistry, 'getTool'>; store: PendingActionStore },
  who: { orgId: string; userId: string; context: AIContext },
  actionId: string,
  seenPayloadHash: string,
): Promise<ApprovalOutcome> {
  const row = await deps.store.claim(actionId, who.orgId, who.userId);
  if (!row) return { status: 'NOT_APPROVABLE' };

  const recomputed = await hashPayload(row.tool_name, row.args);
  if (recomputed !== row.payload_hash || seenPayloadHash !== row.payload_hash) {
    await deps.store.finish(row.id, 'failed', { reason: 'PAYLOAD_CHANGED' });
    return { status: 'PAYLOAD_CHANGED' };
  }

  const tool = deps.registry.getTool(row.tool_name);
  if (!tool) {
    await deps.store.finish(row.id, 'failed', { reason: 'TOOL_UNAVAILABLE' });
    return { status: 'TOOL_UNAVAILABLE' };
  }

  try {
    const result = await tool.execute(who.context, row.args);
    const ok = result.status === 'SUCCESS';
    await deps.store.finish(row.id, ok ? 'executed' : 'failed', result);
    return ok ? { status: 'EXECUTED', result } : { status: 'FAILED', result };
  } catch (error) {
    console.error(`[approveAction] ${row.tool_name} hata:`, error);
    const result = { status: 'ERROR', message: 'Internal execution error.' };
    await deps.store.finish(row.id, 'failed', result);
    return { status: 'FAILED', result };
  }
}

/** Kullanıcının o günkü (işletme saat diliminde) başlangıcı → UTC ISO. Günlük sınır sayımı için. */
export function startOfLocalDayIso(now: Date, timezone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  const localAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offsetMs = localAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  const startLocalAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, 0, 0, 0);
  return new Date(startLocalAsUtc - offsetMs).toISOString();
}

export const DEFAULT_DAILY_MESSAGE_LIMIT = 100;
