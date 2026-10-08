import type { AIContext } from '../../types.ts';
import type { ITool, ToolResult } from '../../tools/types.ts';

/**
 * Flow AI veri okuma araçları (müşteriler, finans, ödeme takvimi). Hepsi READ.
 * İşletme YALNIZ context.organizationId'den gelir (model argümanıyla seçilemez). Veri, ekranların kullandığı
 * fonksiyonların işletme-parametreli kardeşlerinden okunur (_get_*_org; yalnız service_role çağırabilir).
 * Para birimi veritabanında kuruştur; modele HAZIR biçimli metin verilir, model kendisi hesap/yuvarlama yapmaz.
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function todayYmd(now: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
function monthRange(ymd: string): { from: string; to: string } {
  const [y, m] = ymd.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}` };
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

/** Kuruş → "1.739,99 ₺" (kuruş varsa 2 hane, yoksa hiç; yuvarlama yok). */
export function formatTry(minor: number): string {
  const n = Number(minor) || 0;
  const hasKurus = Math.abs(n) % 100 !== 0;
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: hasKurus ? 2 : 0, maximumFractionDigits: 2 }).format(n / 100) + ' ₺';
}

function formatWhen(iso: string | null | undefined, tz: string): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('tr-TR', { timeZone: tz, day: 'numeric', month: 'long', weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch (_e) {
    return null;
  }
}

function norm(s: unknown): string {
  return String(s ?? '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').trim();
}

function pickRange(args: Record<string, unknown>, def: { from: string; to: string }, maxDays: number): { from: string; to: string } | { error: string } {
  const from = typeof args.from === 'string' && YMD.test(args.from) ? args.from : def.from;
  const to = typeof args.to === 'string' && YMD.test(args.to) ? args.to : def.to;
  if (from > to) return { error: 'Başlangıç tarihi bitişten sonra olamaz.' };
  if (daysBetween(from, to) > maxDays) return { error: `En fazla ${maxDays} günlük aralık sorulabilir.` };
  return { from, to };
}

export class GetCustomersTool implements ITool {
  readonly name = 'get_customers';
  readonly description = 'İşletmenin müşterilerini listeler/arar: ad, telefon, notlar, toplam/yaklaşan/geçmiş/iptal randevu sayısı, sıradaki randevu (tarih, doktor) ve son ziyaret. "Ahmet kim", "müşterim kaç kişi", "yaklaşan randevusu olan müşteriler" gibi sorular için kullan.';
  readonly riskLevel = 'READ' as const;
  readonly schema = {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Ad veya telefon parçası (isteğe bağlı). Verilmezse en yakın randevusu olanlar önce gelir.' },
      limit: { type: 'integer', description: 'En fazla kaç müşteri (1-25). Varsayılan 10.' },
    },
  };
  constructor(private readonly admin: any) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const limit = Math.min(25, Math.max(1, Math.floor(Number(args.limit) || 10)));
    const { data, error } = await this.admin.rpc('_get_customers_org', { p_org: context.organizationId });
    if (error) {
      console.error('[get_customers] hata:', error.message);
      return { status: 'ERROR', message: 'Müşteriler şu an alınamadı.' };
    }
    let rows = (data ?? []) as any[];
    const q = typeof args.search === 'string' ? norm(args.search) : '';
    if (q) {
      const digits = q.replace(/\D/g, '');
      rows = rows.filter((r) => norm(r.name).includes(q) || (digits.length >= 3 && String(r.phone_display ?? '').replace(/\D/g, '').includes(digits)));
    }
    const tz = context.timezone;
    return {
      status: 'SUCCESS',
      data: {
        totalMatching: rows.length,
        shown: Math.min(rows.length, limit),
        customers: rows.slice(0, limit).map((r) => ({
          name: r.name ?? null,
          phone: r.phone_display ?? null,
          notes: r.notes ?? null,
          appointments: { total: r.total, upcoming: r.upcoming, past: r.past, cancelled: r.cancelled },
          next: r.next_starts_at ? { when: formatWhen(r.next_starts_at, tz), doctor: r.next_doctor ?? null, request: r.next_request ?? null } : null,
          lastVisit: formatWhen(r.last_visit_at, tz),
          lastRequest: r.last_request ?? null,
        })),
      },
    };
  }
}

export class GetCustomerHistoryTool implements ITool {
  readonly name = 'get_customer_history';
  readonly description = 'Bir müşterinin tüm randevu geçmişini (tarih, doktor, talep, durum) getirir. Müşteriyi adıyla ver. "Ahmet ne zaman geldi", "Cengiz\'in randevuları" gibi sorular için kullan.';
  readonly riskLevel = 'READ' as const;
  readonly schema = {
    type: 'object',
    properties: { customer_name: { type: 'string', description: 'Müşterinin adı (veya adının bir parçası).' } },
    required: ['customer_name'],
  };
  constructor(private readonly admin: any) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const q = norm(args.customer_name);
    if (q.length < 2) return { status: 'INVALID_ARGS', message: 'Müşteri adını söyler misiniz?' };
    const { data, error } = await this.admin.rpc('_get_customers_org', { p_org: context.organizationId });
    if (error) {
      console.error('[get_customer_history] müşteri hatası:', error.message);
      return { status: 'ERROR', message: 'Müşteri bilgisi şu an alınamadı.' };
    }
    const matches = ((data ?? []) as any[]).filter((r) => norm(r.name).includes(q));
    if (matches.length === 0) return { status: 'NOT_FOUND', message: 'Bu isimde müşteri bulunamadı.' };
    if (matches.length > 1) {
      return { status: 'AMBIGUOUS', message: 'Birden fazla müşteri eşleşti; hangisi olduğunu sor.', data: { candidates: matches.slice(0, 8).map((r) => ({ name: r.name, phone: r.phone_display })) } };
    }
    const c = matches[0];
    if (!UUID.test(String(c.id))) return { status: 'ERROR', message: 'Müşteri kaydı okunamadı.' };
    const { data: appts, error: aErr } = await this.admin.rpc('_get_customer_appointments_org', { p_org: context.organizationId, p_customer_id: c.id });
    if (aErr) {
      console.error('[get_customer_history] randevu hatası:', aErr.message);
      return { status: 'ERROR', message: 'Randevu geçmişi şu an alınamadı.' };
    }
    const list = (appts ?? []) as any[];
    const tz = context.timezone;
    return {
      status: 'SUCCESS',
      data: {
        customer: { name: c.name, phone: c.phone_display, notes: c.notes ?? null },
        totalAppointments: list.length,
        shown: Math.min(list.length, 20),
        appointments: list.slice(0, 20).map((a) => ({ when: formatWhen(a.starts_at, tz), doctor: a.doctor ?? null, request: a.request ?? null, status: a.status, source: a.source ?? null })),
      },
    };
  }
}

export class GetFinanceSummaryTool implements ITool {
  readonly name = 'get_finance_summary';
  readonly description = 'Belirli bir dönem için gelir, gider, net sonuç, alacak, borç ve vadesi geçmiş ödeme özeti verir (tutarlar hazır biçimli). Tarih verilmezse içinde bulunulan ay. "Bu ay ne kadar kazandım", "kaç lira borcum var" gibi sorular için kullan.';
  readonly riskLevel = 'READ' as const;
  readonly schema = {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'Başlangıç günü (YYYY-MM-DD). Verilmezse bu ayın ilk günü.' },
      to: { type: 'string', description: 'Bitiş günü (YYYY-MM-DD). Verilmezse bu ayın son günü.' },
    },
  };
  constructor(private readonly admin: any) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const range = pickRange(args, monthRange(todayYmd(context.now, context.timezone)), 366);
    if ('error' in range) return { status: 'INVALID_ARGS', message: range.error };
    const { data, error } = await this.admin.rpc('_get_finance_summary_org', { p_org: context.organizationId, p_from: range.from, p_to: range.to });
    if (error || !data || data.status !== 'SUCCESS') {
      console.error('[get_finance_summary] hata:', error?.message ?? data?.status);
      return { status: 'ERROR', message: 'Finans özeti şu an alınamadı.' };
    }
    const income = Number(data.income) || 0;
    const expense = Number(data.expense) || 0;
    return {
      status: 'SUCCESS',
      data: {
        period: range,
        income: formatTry(income),
        expense: formatTry(expense),
        net: formatTry(income - expense),
        receivable: formatTry(Number(data.receivable) || 0),
        payable: formatTry(Number(data.payable) || 0),
        overdue: { count: Number(data.overdue_count) || 0, amount: formatTry(Number(data.overdue_amount) || 0) },
        note: 'Gelir/gider yalnız ödenmiş kayıtlardır; alacak/borç ve vadesi geçenler dönemden bağımsız tüm bekleyen kayıtlardır.',
      },
    };
  }
}

export class GetPaymentCalendarTool implements ITool {
  readonly name = 'get_payment_calendar';
  readonly description = 'Belirli bir aralıktaki gelir/gider ödeme kayıtlarını (başlık, tutar, vade, ödendi/bekliyor, gecikmiş mi) listeler. Aralık verilmezse bugünden 30 gün sonrasına kadar. "Bu hafta ne ödeyeceğim", "geciken ödemem var mı" sorularında kullan.';
  readonly riskLevel = 'READ' as const;
  readonly schema = {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'Başlangıç günü (YYYY-MM-DD). Verilmezse bugün.' },
      to: { type: 'string', description: 'Bitiş günü (YYYY-MM-DD). Verilmezse bugünden 30 gün sonrası.' },
      only_unpaid: { type: 'boolean', description: 'true ise yalnız ödenmemiş (bekleyen/kısmi) kayıtlar.' },
    },
  };
  constructor(private readonly admin: any) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const today = todayYmd(context.now, context.timezone);
    const range = pickRange(args, { from: today, to: addDays(today, 30) }, 92);
    if ('error' in range) return { status: 'INVALID_ARGS', message: range.error };
    const { data, error } = await this.admin.rpc('_get_payment_calendar_org', { p_org: context.organizationId, p_from: range.from, p_to: range.to });
    if (error) {
      console.error('[get_payment_calendar] hata:', error.message);
      return { status: 'ERROR', message: 'Ödeme takvimi şu an alınamadı.' };
    }
    let rows = (data ?? []) as any[];
    if (args.only_unpaid === true) rows = rows.filter((r) => r.payment_status === 'pending' || r.payment_status === 'partial');
    const sumBy = (type: string) => rows.filter((r) => r.type === type).reduce((s, r) => s + (Number(r.amount_minor) || 0), 0);
    return {
      status: 'SUCCESS',
      data: {
        period: range,
        count: rows.length,
        shown: Math.min(rows.length, 40),
        totalIncome: formatTry(sumBy('income')),
        totalExpense: formatTry(sumBy('expense')),
        entries: rows.slice(0, 40).map((r) => ({
          kind: r.type === 'income' ? 'gelir' : 'gider',
          title: r.title ?? null,
          amount: formatTry(Number(r.amount_minor) || 0),
          day: r.day,
          paymentStatus: r.payment_status,
          overdue: !!r.is_overdue,
          category: r.category ?? null,
        })),
      },
    };
  }
}

export function createDataTools(admin: any): ITool[] {
  return [new GetCustomersTool(admin), new GetCustomerHistoryTool(admin), new GetFinanceSummaryTool(admin), new GetPaymentCalendarTool(admin)];
}
