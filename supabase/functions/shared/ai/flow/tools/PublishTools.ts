import type { AIContext } from '../../types.ts';
import type { ITool, ToolResult } from '../../tools/types.ts';

/**
 * FA5 — Onaylı yayınlama. publish_post bir EXTERNAL_ACTION'dır: model çağırınca YAYINLAMAZ; sunucu bekleyen işlem
 * kaydı açar (FlowToolExecutor) ve kullanıcı onay verene kadar bekler. Onaydan sonra approveAction bu aracı çalıştırır.
 * Yayınlanan içerik her zaman onaylanan taslaktır: taslağın SHA-256 özeti onay argümanlarına gömülüdür, değişirse reddedilir.
 * Günlük yayın sınırı YOK (ürün kararı); her yayın tek tek kullanıcı onayı gerektirir.
 */

/** Yalnız metinle yayınlanabilen platformlar → karakter sınırı. Medya gerektirenler (instagram, youtube, tiktok…) burada YOK. */
export const TEXT_ONLY_LIMITS: Record<string, number> = {
  facebook: 63206, linkedin: 3000, twitter: 280, threads: 500, bluesky: 300,
};
const PLATFORM_ALIASES: Record<string, string> = { x: 'twitter', 'x.com': 'twitter' };
const MEDIA_PLATFORMS = new Set(['instagram', 'youtube', 'tiktok', 'pinterest', 'snapchat']);
const MIN_LEAD_MS = 5 * 60 * 1000;
const MAX_LEAD_MS = 365 * 24 * 60 * 60 * 1000;
const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/;

export const normalizePlatform = (p: unknown): string => {
  const s = String(p ?? '').toLowerCase().trim();
  return PLATFORM_ALIASES[s] ?? s;
};

export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function tzOffsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - utcMs;
}

/** Kullanıcının yerel zamanını ("YYYY-MM-DD HH:mm", IANA saat dilimi) UTC ISO'ya çevirir; geçersiz/olmayan yerel saat (DST boşluğu) → null. */
export function localToUtcIso(local: string, tz: string): string | null {
  const m = LOCAL_RE.exec(local.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  try {
    const guess = Date.UTC(y, mo - 1, d, h, mi);
    let utc = guess - tzOffsetMs(guess, tz);
    utc = guess - tzOffsetMs(utc, tz);
    // Gidiş-dönüş: aynı yerel saate dönmüyorsa (DST boşluğu) geçersiz.
    const back = new Date(utc + tzOffsetMs(utc, tz));
    if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d || back.getUTCHours() !== h || back.getUTCMinutes() !== mi) return null;
    return new Date(utc).toISOString();
  } catch {
    return null;
  }
}

function formatLocal(isoUtc: string, tz: string): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(isoUtc));
}

/** zernio-client create-post'u servis rolüyle ve kiracı = organizations.id olarak çağırır; hesap hedefleme orada sunucuda yapılır. */
export type ZernioPublishCaller = (orgId: string, payload: Record<string, unknown>) => Promise<any>;

export function createZernioPublishCaller(supabaseUrl: string, serviceKey: string, fetchImpl: typeof fetch = fetch): ZernioPublishCaller {
  return async (orgId, payload) => {
    const res = await fetchImpl(`${supabaseUrl}/functions/v1/zernio-client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ action: 'create-post', payload: { ...payload, profileId: orgId } }),
    });
    const body = await res.json().catch(() => null);
    if (!body?.success) throw new Error(String(body?.error ?? `zernio-client ${res.status}`).slice(0, 300));
    return body.data;
  };
}

interface DraftRow { id: string; caption: string; platforms: string[]; status: string; expires_at: string }

export class PublishPostTool implements ITool {
  readonly name = 'publish_post';
  readonly description = 'Bir gönderi metnini sosyal medyada yayınlar veya zamanlar. Metni doğrudan ver (text) ya da mevcut bir taslağı (draftId) kullan; AYRICA prepare_post_draft çağırmana gerek YOK. Kullanıcı onayı olmadan YAYINLAMAZ: sohbette onay kartı çıkar. Yalnız metinle yayınlanabilen platformlar (facebook, linkedin, twitter/x, threads, bluesky); Instagram/YouTube/TikTok medya gerektirir.';
  readonly riskLevel = 'EXTERNAL_ACTION' as const;
  readonly schema = {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Yayınlanacak gönderi metni (1-5000 karakter). draftId yoksa zorunlu.' },
      draftId: { type: 'string', description: 'İsteğe bağlı: daha önce hazırlanmış taslağın kimliği (text yerine).' },
      platforms: { type: 'array', items: { type: 'string' }, description: 'Yayın platformları. Boşsa taslaktaki platformlar kullanılır.' },
      scheduledLocal: { type: 'string', description: 'Zamanlamak için kullanıcının YEREL saati: "YYYY-MM-DD HH:mm". Verilmezse hemen yayınlanır.' },
    },
  };

  constructor(private readonly admin: any, private readonly zernio: ZernioPublishCaller) {}

  private async loadDraft(context: AIContext, draftId: string): Promise<DraftRow | null> {
    const { data, error } = await this.admin.from('flow_ai_post_drafts')
      .select('id, caption, platforms, status, expires_at')
      .eq('id', draftId).eq('org_id', context.organizationId).eq('user_id', context.customerId).maybeSingle();
    if (error) { console.error('[publish_post] taslak okuma hatası:', error.message); return null; }
    return (data as DraftRow) ?? null;
  }

  /** Aynı metinle açık bir taslak varsa onu kullanır (çoğaltmaz); yoksa oluşturur. Üst sınır: prepare_post_draft ile aynı (20 açık taslak). */
  private async findOrCreateDraft(context: AIContext, text: string, platforms: string[]): Promise<DraftRow | null> {
    const nowIso = new Date().toISOString();
    const { data: existing, error: eErr } = await this.admin.from('flow_ai_post_drafts')
      .select('id, caption, platforms, status, expires_at')
      .eq('org_id', context.organizationId).eq('user_id', context.customerId).eq('status', 'draft').eq('caption', text).gt('expires_at', nowIso).limit(1);
    if (eErr) { console.error('[publish_post] taslak arama hatası:', eErr.message); return null; }
    if (existing && existing.length > 0) return existing[0] as DraftRow;

    const { count } = await this.admin.from('flow_ai_post_drafts').select('id', { count: 'exact', head: true })
      .eq('org_id', context.organizationId).eq('user_id', context.customerId).eq('status', 'draft').gt('expires_at', nowIso);
    if ((count ?? 0) >= 20) return null;
    const { data, error } = await this.admin.from('flow_ai_post_drafts')
      .insert({ org_id: context.organizationId, user_id: context.customerId, caption: text, platforms })
      .select('id, caption, platforms, status, expires_at').single();
    if (error || !data) { console.error('[publish_post] taslak yazma hatası:', error?.message); return null; }
    return data as DraftRow;
  }

  private async connectedPlatforms(orgId: string): Promise<Set<string>> {
    const { data, error } = await this.admin.schema('integration').from('social_accounts')
      .select('platform, is_active, needs_reconnection').eq('organization_id', orgId);
    if (error) { console.error('[publish_post] hesap okuma hatası:', error.message); return new Set(); }
    return new Set((data ?? []).filter((a: any) => a.is_active && !a.needs_reconnection).map((a: any) => normalizePlatform(a.platform)));
  }

  /** Onay kaydından ÖNCE: doğrular, çözülmüş argümanları ve kullanıcıya gösterilecek özeti üretir. */
  async prepareApproval(context: AIContext, args: Record<string, unknown>) {
    const fail = (status: string, message: string) => ({ ok: false as const, result: { status, message } });
    const requestedRaw = Array.isArray(args.platforms) ? args.platforms.map(normalizePlatform).filter(Boolean) : [];
    let draft: DraftRow | null = null;
    const givenId = typeof args.draftId === 'string' ? args.draftId : '';
    if (givenId) {
      if (!/^[0-9a-f-]{36}$/i.test(givenId)) return fail('INVALID_DRAFT', 'Geçersiz taslak kimliği; metni text olarak ver.');
      draft = await this.loadDraft(context, givenId);
    } else {
      // Metin doğrudan verildi: taslağı burada oluştur (prepare_post_draft çağırmaya ve ekran açmaya gerek yok).
      const text = typeof args.text === 'string' ? args.text.trim() : '';
      if (!text || text.length > 5000) return fail('INVALID_TEXT', 'Yayınlanacak metin (text) 1-5000 karakter olmalı.');
      draft = await this.findOrCreateDraft(context, text, [...new Set(requestedRaw)].slice(0, 10));
      if (!draft) return fail('ERROR', 'Taslak şu an hazırlanamadı.');
    }
    if (!draft) return fail('DRAFT_NOT_FOUND', 'Taslak bulunamadı.');
    const draftId = draft.id;
    if (draft.status !== 'draft') return fail('DRAFT_ALREADY_USED', 'Bu taslak zaten kullanılmış veya iptal edilmiş.');
    if (new Date(draft.expires_at).getTime() <= Date.now()) return fail('DRAFT_EXPIRED', 'Taslağın süresi dolmuş; yeniden hazırla.');

    const requested = Array.isArray(args.platforms) && args.platforms.length > 0 ? args.platforms : draft.platforms;
    const platforms = [...new Set(requested.map(normalizePlatform).filter(Boolean))];
    if (platforms.length === 0) return fail('NEEDS_PLATFORM', 'Hangi platformda yayınlanacağını kullanıcıya sor.');

    const media = platforms.filter((p) => MEDIA_PLATFORMS.has(p));
    if (media.length > 0) return fail('MEDIA_REQUIRED', `${media.join(', ')} medya (görsel/video) gerektirir; Flow AI yalnız metinle yayınlar. Taslağı AI Üretim ekranında açıp medya ekleyerek kullanıcının Paylaş'a basmasını öner.`);
    const unsupported = platforms.filter((p) => !(p in TEXT_ONLY_LIMITS));
    if (unsupported.length > 0) return fail('PLATFORM_NOT_SUPPORTED', `Flow AI şu platformlarda yayın yapamaz: ${unsupported.join(', ')}. Desteklenen: ${Object.keys(TEXT_ONLY_LIMITS).join(', ')}.`);

    const tooLong = platforms.filter((p) => draft.caption.length > TEXT_ONLY_LIMITS[p]);
    if (tooLong.length > 0) return fail('TEXT_TOO_LONG', `Metin ${tooLong.map((p) => `${p} (${TEXT_ONLY_LIMITS[p]})`).join(', ')} karakter sınırını aşıyor; kısalt.`);

    const connected = await this.connectedPlatforms(context.organizationId);
    const notConnected = platforms.filter((p) => !connected.has(p));
    if (notConnected.length > 0) return fail('ACCOUNT_NOT_CONNECTED', `${notConnected.join(', ')} hesabı bağlı değil ya da yeniden bağlanmalı. Kullanıcıyı Sosyal Medya ekranına yönlendir.`);

    let scheduledFor: string | null = null;
    if (args.scheduledLocal !== undefined && args.scheduledLocal !== null && args.scheduledLocal !== '') {
      scheduledFor = localToUtcIso(String(args.scheduledLocal), context.timezone);
      if (!scheduledFor) return fail('INVALID_SCHEDULE', 'Zaman geçersiz; "YYYY-MM-DD HH:mm" biçiminde, kullanıcının yerel saatiyle ver.');
      const lead = new Date(scheduledFor).getTime() - Date.now();
      if (lead < MIN_LEAD_MS) return fail('SCHEDULE_IN_PAST', 'Zamanlama en az 5 dakika sonrası olmalı.');
      if (lead > MAX_LEAD_MS) return fail('SCHEDULE_TOO_FAR', 'Zamanlama en fazla 1 yıl sonrası olabilir.');
    }

    const captionSha = await sha256Hex(draft.caption);
    const when = scheduledFor ? `${formatLocal(scheduledFor, context.timezone)} (${context.timezone}) tarihinde zamanlanacak` : 'hemen yayınlanacak';
    const excerpt = draft.caption.length > 140 ? `${draft.caption.slice(0, 140)}…` : draft.caption;
    return {
      ok: true as const,
      args: { draftId, platforms, scheduledFor, captionSha },
      preview: {
        tool: this.name,
        description: `${platforms.join(', ')} — ${when}: “${excerpt}”`,
        text: draft.caption, platforms, scheduledFor, timezone: context.timezone, mode: scheduledFor ? 'schedule' : 'now',
      },
    };
  }

  /** Onaydan SONRA (approveAction): taslağı yeniden doğrular, atomik olarak 'used' yapar, yayınlar; hata olursa geri açar. */
  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const draftId = String(args.draftId ?? '');
    const platforms = (Array.isArray(args.platforms) ? args.platforms : []).map(normalizePlatform);
    const scheduledFor = typeof args.scheduledFor === 'string' && args.scheduledFor ? args.scheduledFor : null;
    if (!draftId || platforms.length === 0 || typeof args.captionSha !== 'string') return { status: 'INVALID_ARGS', message: 'Onaylanan işlem eksik.' };

    const draft = await this.loadDraft(context, draftId);
    if (!draft) return { status: 'DRAFT_NOT_FOUND', message: 'Taslak bulunamadı.' };
    if ((await sha256Hex(draft.caption)) !== args.captionSha) return { status: 'DRAFT_CHANGED', message: 'Taslak onaydan sonra değişti; yayınlanmadı.' };
    if (scheduledFor && new Date(scheduledFor).getTime() <= Date.now()) return { status: 'SCHEDULE_IN_PAST', message: 'Zamanlama geçmişte kaldı; yeniden onaylamak gerekir.' };

    // Aynı taslak iki kez yayınlanamaz: draft → used geçişi atomik.
    const { data: claimed, error: cErr } = await this.admin.from('flow_ai_post_drafts')
      .update({ status: 'used', updated_at: new Date().toISOString() })
      .eq('id', draftId).eq('org_id', context.organizationId).eq('user_id', context.customerId).eq('status', 'draft')
      .gt('expires_at', new Date().toISOString()).select('id').maybeSingle();
    if (cErr || !claimed) return { status: 'DRAFT_ALREADY_USED', message: 'Taslak zaten kullanılmış veya süresi dolmuş.' };

    try {
      await this.zernio(context.organizationId, {
        content: draft.caption,
        platforms,
        ...(scheduledFor ? { scheduledFor, timezone: context.timezone } : { publishNow: true }),
      });
    } catch (e: any) {
      console.error('[publish_post] yayın hatası:', e?.message);
      await this.admin.from('flow_ai_post_drafts').update({ status: 'draft', updated_at: new Date().toISOString() }).eq('id', draftId);
      return { status: 'PUBLISH_FAILED', message: 'Yayın başarısız oldu; taslak korundu, tekrar deneyebilirsin.' };
    }
    return { status: 'SUCCESS', data: { published: !scheduledFor, scheduled: !!scheduledFor, scheduledFor, platforms } };
  }
}
