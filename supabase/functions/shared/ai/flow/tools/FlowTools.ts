import type { AIContext } from '../../types.ts';
import type { ITool, ToolResult } from '../../tools/types.ts';
import { FLOW_HIGHLIGHT_TARGETS, FLOW_SCREENS } from '../flowUiCatalog.ts';
import { HELP_TOPICS, findHelpTopic } from '../helpTopics.ts';

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
      out.push({
        date: day,
        calendars: [...perCalendar.entries()].map(([name, c]) => ({ name, ...c })),
        appointments: (appts ?? []).map((a: any) => ({ time: String(a.date).slice(11, 16), customer: a.customer_name ?? null, status: a.status })),
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
 * includeHighlight: mobilde vurgu abonesi (FA2-2) olmadan highlight aracı kullanıcıya hiçbir şey göstermez ama model
 * "vurguladım" diyebilir. Bu yüzden FA2-2 yayınlanana kadar varsayılan KAPALI.
 */
export function createFlowTools(admin: any, opts: { includeHighlight?: boolean } = {}): ITool[] {
  const tools: ITool[] = [
    new GetAppointmentsOverviewTool(admin),
    new GetConnectedSocialAccountsTool(admin),
    new OpenScreenTool(),
    new GetHelpTopicTool(),
  ];
  if (opts.includeHighlight) tools.push(new HighlightTool());
  return tools;
}
