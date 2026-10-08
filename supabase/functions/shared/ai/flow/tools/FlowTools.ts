import type { AIContext } from '../../types.ts';
import type { ITool, ToolResult } from '../../tools/types.ts';
import { FLOW_GUIDES, FLOW_HIGHLIGHT_TARGETS, FLOW_SCREENS } from '../flowUiCatalog.ts';
import { HELP_TOPICS, findHelpTopic } from '../helpTopics.ts';
import type { CaptionService } from '../CaptionService.ts';
import { PublishPostTool, type ZernioPublishCaller } from './PublishTools.ts';
import { PrepareVideoShareTool } from './VideoShareTools.ts';
import { createSocialAnalyticsTools, type ZernioAnalyticsCaller } from './SocialAnalyticsTools.ts';

/**
 * Flow AI ilk araçları (FA1-3). Hepsi READ/PREPARE: dış dünyaya etkileri yoktur.
 * Kimlik kaynağı YALNIZ context.organizationId (JWT'den sunucuda çözülür); model argümanıyla işletme seçilemez.
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function todayInTimezone(now: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export class GetAppointmentsOverviewTool implements ITool {
  readonly name = 'get_appointments_overview';
  readonly description = 'İşletmenin belirli günler için randevu doluluğunu ve yaklaşan randevularını özetler (takvim/doktor bazında dolu, boş, rezerve saat sayıları).';
  readonly riskLevel = 'READ' as const;
  readonly schema = {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Başlangıç günü (YYYY-MM-DD). Verilmezse bugün.' },
      days: { type: 'integer', description: 'Kaç gün (1-7). Varsayılan 1.' },
    },
  };
  constructor(private readonly admin: any) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const start = typeof args.date === 'string' && YMD.test(args.date) ? args.date : todayInTimezone(context.now, context.timezone);
    const days = Math.min(7, Math.max(1, Math.floor(Number(args.days) || 1)));
    const out: unknown[] = [];
    for (let i = 0; i < days; i++) {
      const day = addDaysYmd(start, i);
      const { data: grid, error } = await this.admin.rpc('_slot_grid_org', { p_org: context.organizationId, p_date: day, p_calendar_id: null, p_service_ids: null });
      if (error) {
        console.error('[get_appointments_overview] grid hatası:', error.message);
        return { status: 'ERROR', message: 'Randevu doluluğu şu an alınamadı.' };
      }
      const perCalendar = new Map<string, { free: number; booked: number; blocked: number }>();
      for (const r of (grid ?? []) as { calendar_name: string; status: string }[]) {
        const c = perCalendar.get(r.calendar_name) ?? { free: 0, booked: 0, blocked: 0 };
        if (r.status === 'free') c.free++;
        else if (r.status === 'booked') c.booked++;
        else if (r.status === 'blocked') c.blocked++;
        perCalendar.set(r.calendar_name, c);
      }
      const { data: appts, error: aErr } = await this.admin.from('appointments')
        .select('date, customer_name, status')
        .eq('org_id', context.organizationId)
        .in('status', ['Pending', 'Approved'])
        .gte('date', `${day}T00:00:00`).lte('date', `${day}T23:59:59`)
        .order('date', { ascending: true }).limit(30);
      if (aErr) {
        console.error('[get_appointments_overview] randevu hatası:', aErr.message);
        return { status: 'ERROR', message: 'Randevular şu an alınamadı.' };
      }
            const calIds = [...new Set((appts ?? []).map((a: any) => a.calendar_id).filter(Boolean))];
      const svcIds = [...new Set((appts ?? []).map((a: any) => a.service_id).filter(Boolean))];
      const calNames = new Map<string, string>();
      const svcNames = new Map<string, string>();
      if (calIds.length) {
        const { data: cs } = await this.admin.from('calendars').select('id, name').eq('org_id', context.organizationId).in('id', calIds);
        for (const c of (cs ?? []) as any[]) calNames.set(String(c.id), c.name);
      }
      if (svcIds.length) {
        const { data: ss } = await this.admin.from('business_services').select('id, name').eq('org_id', context.organizationId).in('id', svcIds);
        for (const s of (ss ?? []) as any[]) svcNames.set(String(s.id), s.name);
      }
      out.push({
        date: day,
        calendars: [...perCalendar.entries()].map(([name, c]) => ({ name, ...c })),
        appointments: (appts ?? []).map((a: any) => ({ time: String(a.date).slice(11, 16), customer: a.customer_name ?? null, calendar: calNames.get(String(a.calendar_id)) ?? null, service: svcNames.get(String(a.service_id)) ?? null, status: a.status })),
      });
    }
    return { status: 'SUCCESS', data: { days: out } };
  }
}

export class GetConnectedSocialAccountsTool implements ITool {
  readonly name = 'get_connected_social_accounts';
  readonly description = 'İşletmeye bağlı sosyal medya hesaplarını (platform, kullanıcı adı, durum) listeler.';
  readonly riskLevel = 'READ' as const;
  readonly schema = { type: 'object', properties: {} };
  constructor(private readonly admin: any) {}

  async execute(context: AIContext, _args: Record<string, unknown>): Promise<ToolResult> {
    // Yalnız gösterim alanları; Zernio kimlikleri/jetonları modele ASLA verilmez.
    const { data, error } = await this.admin.schema('integration').from('social_accounts')
      .select('platform, username, display_name, is_active, needs_reconnection, enabled, connected_at')
      .eq('organization_id', context.organizationId)
      .order('connected_at', { ascending: false }).limit(50);
    if (error) {
      console.error('[get_connected_social_accounts] hata:', error.message);
      return { status: 'ERROR', message: 'Bağlı hesaplar şu an alınamadı.' };
    }
    const accounts = (data ?? []).map((a: any) => ({
      platform: a.platform, username: a.username, name: a.display_name,
      connected: !!a.is_active && !a.needs_reconnection, needsReconnection: !!a.needs_reconnection, enabled: a.enabled !== false,
    }));
    return { status: 'SUCCESS', data: { accounts, count: accounts.length } };
  }
}

export class OpenScreenTool implements ITool {
  readonly name = 'open_screen';
  readonly description = 'Uygulamada bir ekranı açar. Kullanıcı "şuraya git/aç" dediğinde kullan.';
  readonly riskLevel = 'PREPARE' as const;
  readonly schema = {
    type: 'object',
    properties: { screen: { type: 'string', enum: Object.keys(FLOW_SCREENS), description: 'Açılacak ekran anahtarı.' } },
    required: ['screen'],
  };
  async execute(_context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const key = String(args.screen ?? '');
    const s = FLOW_SCREENS[key];
    if (!s) return { status: 'INVALID_SCREEN', message: `Geçerli ekranlar: ${Object.keys(FLOW_SCREENS).join(', ')}` };
    return { status: 'SUCCESS', data: { clientAction: { type: 'navigate', screen: key, route: s.route }, label: s.label } };
  }
}

export class HighlightTool implements ITool {
  readonly name = 'highlight';
  readonly description = 'Açık ekrandaki bir öğeyi (ör. paylaş düğmesi) vurgular. Kullanıcıya adım adım yol gösterirken kullan.';
  readonly riskLevel = 'PREPARE' as const;
  readonly schema = {
    type: 'object',
    properties: {
      screen: { type: 'string', enum: Object.keys(FLOW_HIGHLIGHT_TARGETS), description: 'Ekran anahtarı.' },
      target: { type: 'string', description: 'Vurgulanacak öğe kimliği (ör. share_button).' },
    },
    required: ['screen', 'target'],
  };
  async execute(_context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const screen = String(args.screen ?? '');
    const target = String(args.target ?? '');
    const allowed = FLOW_HIGHLIGHT_TARGETS[screen];
    if (!allowed || !allowed.includes(target)) {
      return { status: 'INVALID_TARGET', message: `Vurgulanabilir öğeler: ${JSON.stringify(FLOW_HIGHLIGHT_TARGETS)}` };
    }
    return { status: 'SUCCESS', data: { clientAction: { type: 'highlight', screen, targetId: target } } };
  }
}

export class StartGuideTool implements ITool {
  readonly name = 'start_guide';
  readonly description = 'Kullanıcı bir işi "birlikte yapalım" dediğinde adım adım rehber modunu başlatır: doğru ekranı açar ve sırayla öğeleri vurgular. Kullanıcı "anlat" derse bunu çağırma, get_help_topic adımlarını anlat.';
  readonly riskLevel = 'PREPARE' as const;
  readonly schema = {
    type: 'object',
    properties: { guide: { type: 'string', enum: Object.keys(FLOW_GUIDES), description: 'Başlatılacak rehber anahtarı.' } },
    required: ['guide'],
  };
  async execute(_context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const key = String(args.guide ?? '');
    const g = Object.prototype.hasOwnProperty.call(FLOW_GUIDES, key) ? FLOW_GUIDES[key] : null;
    if (!g) return { status: 'INVALID_GUIDE', message: `Geçerli rehberler: ${Object.keys(FLOW_GUIDES).join(', ')}` };
    return { status: 'SUCCESS', data: { clientAction: { type: 'start_guide', guide: key }, title: g.title } };
  }
}

const PLATFORM_RE = /^[a-z0-9_]{2,20}$/;
const MAX_ACTIVE_DRAFTS = 20;

/**
 * Gönderi taslağı hazırlar (PREPARE). Yayınlamaz: taslak veritabanına yazılır, mobil AI Üretim ekranı draftId ile açıp
 * alanları doldurur; Paylaş düğmesine kullanıcı kendisi basar. Kullanıcı kimliği context.customerId'dir (Flow AI'da konuşan kişi).
 */
export class PreparePostDraftTool implements ITool {
  readonly name = 'prepare_post_draft';
  readonly description = 'Kullanıcı için gönderi (post) metni taslağı hazırlar ve AI Üretim ekranında açılmasını sağlar. Yayınlamaz; paylaşımı kullanıcı kendisi yapar.';
  readonly riskLevel = 'PREPARE' as const;
  readonly schema = {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Gönderi metni (1-5000 karakter).' },
      platforms: { type: 'array', items: { type: 'string' }, description: 'İstenen platformlar (ör. instagram, facebook). Opsiyonel.' },
    },
    required: ['text'],
  };
  constructor(private readonly admin: any) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const text = typeof args.text === 'string' ? args.text.trim() : '';
    if (!text || text.length > 5000) return { status: 'INVALID_TEXT', message: 'Metin 1-5000 karakter olmalı.' };
    const raw = Array.isArray(args.platforms) ? args.platforms : [];
    const platforms = [...new Set(raw.map((p) => String(p).toLowerCase().trim()).filter((p) => PLATFORM_RE.test(p)))].slice(0, 10);

    const { count, error: cErr } = await this.admin.from('flow_ai_post_drafts').select('id', { count: 'exact', head: true })
      .eq('org_id', context.organizationId).eq('user_id', context.customerId).eq('status', 'draft').gt('expires_at', new Date().toISOString());
    if (cErr) {
      console.error('[prepare_post_draft] sayım hatası:', cErr.message);
      return { status: 'ERROR', message: 'Taslak şu an hazırlanamadı.' };
    }
    if ((count ?? 0) >= MAX_ACTIVE_DRAFTS) return { status: 'TOO_MANY_DRAFTS', message: 'Çok fazla açık taslak var; eskilerini kullan veya sil.' };

    const { data, error } = await this.admin.from('flow_ai_post_drafts')
      .insert({ org_id: context.organizationId, user_id: context.customerId, caption: text, platforms })
      .select('id').single();
    if (error || !data) {
      console.error('[prepare_post_draft] yazma hatası:', error?.message);
      return { status: 'ERROR', message: 'Taslak şu an hazırlanamadı.' };
    }
    return { status: 'SUCCESS', data: { draftId: data.id, platforms, clientAction: { type: 'open_post_draft', draftId: data.id } } };
  }
}

/**
 * Gönderi metni üretir (PREPARE; yayınlamaz). AI Üretim ve web Paylaş ile AYNI CaptionService'i kullanır:
 * persona tonu, platform kuralları, günlük sınır ve kullanım ölçümü orada. Sonra prepare_post_draft ile taslağa dönüştürülür.
 */
export class GenerateCaptionTool implements ITool {
  readonly name = 'generate_caption';
  readonly description = 'Verilen konu/talimata göre bir gönderi metni (caption) yazar; platforma ve işletmenin marka sesine uyar. Yayınlamaz. Metni kullanıcıya göster; taslak istenirse prepare_post_draft ile kaydet.';
  readonly riskLevel = 'PREPARE' as const;
  readonly schema = {
    type: 'object',
    properties: {
      brief: { type: 'string', description: 'Gönderinin konusu / kullanıcının talimatı (en fazla 1000 karakter).' },
      platforms: { type: 'array', items: { type: 'string' }, description: 'Hedef platformlar (ör. instagram). Opsiyonel.' },
    },
    required: ['brief'],
  };
  constructor(private readonly captions: Pick<CaptionService, 'generate'>) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const platforms = Array.isArray(args.platforms) ? args.platforms.filter((p) => typeof p === 'string').map((p) => String(p)).slice(0, 10) : undefined;
    const r = await this.captions.generate({
      orgId: context.organizationId, userId: context.customerId,
      brief: typeof args.brief === 'string' ? args.brief : '', platforms,
    });
    if (r.status === 'SUCCESS') return { status: 'SUCCESS', data: { text: r.text, maxChars: r.maxChars } };
    if (r.status === 'DAILY_LIMIT') return { status: 'DAILY_LIMIT', message: 'Bugünlük metin üretim sınırına ulaşıldı.' };
    if (r.status === 'INVALID_BRIEF') return { status: 'INVALID_BRIEF', message: 'Konu 1-1000 karakter olmalı.' };
    return { status: 'ERROR', message: 'Metin şu an üretilemedi.' };
  }
}

export class GetHelpTopicTool implements ITool {
  readonly name = 'get_help_topic';
  readonly description = 'Uygulamanın nasıl kullanılacağına dair doğrulanmış yardım adımlarını getirir. Bilmediğin kullanım sorularında uydurma, bunu çağır.';
  readonly riskLevel = 'READ' as const;
  readonly schema = {
    type: 'object',
    properties: { topic: { type: 'string', description: 'Konu anahtarı ya da kullanıcının sorusu/anahtar kelimeler.' } },
    required: ['topic'],
  };
  async execute(_context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const found = findHelpTopic(String(args.topic ?? ''));
    if (!found) {
      return { status: 'NOT_FOUND', message: 'Bu konuda doğrulanmış yardım içeriği yok; uydurma, bilmediğini söyle.', data: { availableTopics: Object.entries(HELP_TOPICS).map(([k, t]) => ({ key: k, title: t.title })) } };
    }
    return { status: 'SUCCESS', data: { key: found.key, title: found.topic.title, screen: found.topic.screen, steps: found.topic.steps } };
  }
}

/**
 * includeHighlight: mobilde vurgu (FlowHighlight, FA2-2) yayında olduğu için flow-ai-agent açar; testler ve eski
 * istemciler için varsayılan KAPALI kalır.
 */
export function createFlowTools(admin: any, opts: { includeGuide?: boolean; includeHighlight?: boolean; includeDrafts?: boolean; captionService?: Pick<CaptionService, 'generate'>; zernioAnalytics?: ZernioAnalyticsCaller; zernioPublish?: ZernioPublishCaller } = {}): ITool[] {
  const tools: ITool[] = [
    new GetAppointmentsOverviewTool(admin),
    new GetConnectedSocialAccountsTool(admin),
    new OpenScreenTool(),
    new GetHelpTopicTool(),
  ];
  // Rehber modu (ekranda adım adım vurgu) yalnız mobilde vardır; web istemcisi includeGuide:false verir.
  if (opts.includeGuide !== false) tools.push(new StartGuideTool());
  if (opts.includeHighlight) tools.push(new HighlightTool());
  // includeDrafts: mobil AI Üretim ekranı draftId ile açmayı (FA3-3) destekleyene kadar KAPALI.
  if (opts.includeDrafts) tools.push(new PreparePostDraftTool(admin));
  if (opts.captionService) {
    tools.push(new GenerateCaptionTool(opts.captionService));
    tools.push(new PrepareVideoShareTool(admin, opts.captionService));
  }
  // FA4: sosyal analitik (salt-okunur). zernioAnalytics verilmezse yalnız DB tabanlı iki araç.
  if (opts.zernioAnalytics) tools.push(...createSocialAnalyticsTools(admin, opts.zernioAnalytics));
  // FA5: onaylı yayınlama (EXTERNAL_ACTION; yalnız FlowAIGate onay kapısından çalışır).
  if (opts.zernioPublish) tools.push(new PublishPostTool(admin, opts.zernioPublish));
  return tools;
}
