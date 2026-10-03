import type { PersonaRenderConfig } from '../persona/PersonaTypes.ts';

/**
 * Gönderi metni (caption) üretimi — TEK SERVİS (FA3-2). Mobil AI Üretim, web Paylaş ve Flow AI `generate_caption`
 * aracı bunu kullanır; aynı istek aynı kuralları ve aynı ölçümü görür. Kimlik çağıran tarafından JWT'den çözülür.
 */

export interface PlatformRule { maxChars: number; style: string }

export const PLATFORM_RULES: Record<string, PlatformRule> = {
  instagram: { maxChars: 2200, style: 'Görsel odaklı; ilk satır dikkat çekici; sonda 3-8 ilgili hashtag; uygun emoji.' },
  facebook: { maxChars: 1000, style: 'Samimi ve konuşma tonunda; kısa paragraflar; en fazla 3 hashtag.' },
  twitter: { maxChars: 280, style: 'Çok kısa ve vurucu; en fazla 2 hashtag.' },
  x: { maxChars: 280, style: 'Çok kısa ve vurucu; en fazla 2 hashtag.' },
  linkedin: { maxChars: 3000, style: 'Profesyonel ve bilgilendirici; az emoji; sonda 3-5 hashtag.' },
  tiktok: { maxChars: 2200, style: 'Kısa, enerjik, merak uyandıran; 3-5 hashtag.' },
  youtube: { maxChars: 5000, style: 'Kısa bir başlık cümlesi ve açıklama; anahtar kelimeler.' },
  threads: { maxChars: 500, style: 'Kısa ve sohbet havasında.' },
  bluesky: { maxChars: 300, style: 'Kısa ve doğal; abartısız.' },
  telegram: { maxChars: 4096, style: 'Açık ve düzenli; gerekirse kısa maddeler.' },
  pinterest: { maxChars: 500, style: 'Anahtar kelime odaklı, ilham verici.' },
};
const DEFAULT_MAX = 2000;
export const MAX_BRIEF_CHARS = 1000;
export const DEFAULT_DAILY_CAPTION_LIMIT = 50;

export interface CaptionRequest {
  orgId: string;
  userId: string;
  brief: string;
  platforms?: string[];
  /** Görsel veya kısa video (base64). Video ise ses ve görüntüden içerik çıkarılır. */
  media?: { data: string; mimeType: string };
}
export type CaptionResult =
  | { status: 'SUCCESS'; text: string; maxChars: number }
  | { status: 'INVALID_BRIEF' | 'DAILY_LIMIT' | 'ERROR'; limit?: number };

export interface CaptionDeps {
  gemini: { generateResponse(system: string, messages: any[], tools?: any[]): Promise<any> };
  admin: any;
  resolvePersona: (orgId: string) => Promise<PersonaRenderConfig | null>;
  dailyLimit?: number;
  now?: () => Date;
  startOfDayIso: (now: Date, tz: string) => string;
  timezone?: string;
}

export function strictestRule(platforms: string[] | undefined): { maxChars: number; notes: string[] } {
  const rules = (platforms ?? []).map((p) => ({ p: p.toLowerCase(), r: PLATFORM_RULES[p.toLowerCase()] })).filter((x) => x.r);
  if (rules.length === 0) return { maxChars: DEFAULT_MAX, notes: [] };
  const maxChars = Math.min(...rules.map((x) => x.r.maxChars));
  const notes = rules.map((x) => `${x.p}: ${x.r.style} (en fazla ${x.r.maxChars} karakter)`);
  if (rules.length > 1) notes.push(`Birden çok platform seçili: en kısıtlayıcı sınıra (${maxChars} karakter) uy ve herkese uyan tek bir metin yaz.`);
  return { maxChars, notes };
}

export function buildCaptionPrompt(persona: PersonaRenderConfig | null, rule: { maxChars: number; notes: string[] }): string {
  const lines = [
    'Sen deneyimli bir sosyal medya metin yazarısın. SADECE gönderi metnini (caption) yaz; açıklama, başlık etiketi, tırnak veya "İşte metin" gibi giriş cümlesi ekleme.',
    'KESİNLİKLE yeni bir görsel üretme. Görsel veya video verildiyse onu (video ise konuşulanları ve görüntüyü) analiz edip metni ONA göre yaz; kullanıcının talimatı varsa onu da uygula.',
    'İÇERİK TÜRÜNÜ önce anla: ürün/hizmet tanıtımı olabilir, ama haber, siyasi ya da toplumsal içerik, etkinlik, eğitim, kişisel paylaşım veya duyuru da olabilir. Metni içeriğin türüne göre yaz.',
    'İçerik bir ürün/hizmet DEĞİLSE satış dili kullanma: "kaçırmayın", "indirim", "hemen sipariş ver", reklam sloganı ve satış çağrısı ekleme.',
    'Siyasi veya hassas içerikte ağırbaşlı ve net ol: videoda/görselde söylenenleri ve kullanıcının verdiği görüşü olduğu gibi yansıt, kendi görüşünü katma. Doğrulanamayan olgu, rakam veya alıntı uydurma; kişi, parti veya gruplara hakaret, nefret ya da iftira içeren ifade yazma.',
    'Görsel/video yoksa ya da içerik anlaşılamıyorsa YALNIZ kullanıcının yazdıklarına dayan; bilmediğin ayrıntıyı uydurma.',
    'Kullanıcı hangi dilde yazdıysa o dilde yaz. Uydurma bilgi, fiyat veya iddia ekleme.',
  ];
  if (persona) {
    const s = persona.speakingStyle;
    lines.push('Aşağıdaki marka sesi yalnız ÜSLUP içindir; içerik ürün değilse satış amacı katma.');
    if (persona.personaId !== 'standart' && persona.identityPrompt) lines.push(`Marka sesi (${persona.name}): ${persona.identityPrompt}`);
    lines.push(`Ton: resmiyet ${s.formal}/100, sıcaklık ${s.warm}/100, mizah ${s.humorous}/100; emoji düzeyi: ${persona.emojiLevel}.`);
    if (persona.tone) lines.push(`İstenen ton: ${persona.tone}.`);
    const bans = [...(persona.forbiddenBehaviors ?? []), ...(persona.boundaries ?? [])];
    if (bans.length) lines.push(`Asla yapma: ${bans.join('; ')}.`);
    if (persona.customInstruction) lines.push(`İşletme notu: ${persona.customInstruction}`);
  }
  if (rule.notes.length) lines.push('Platform kuralları:', ...rule.notes.map((n) => `- ${n}`));
  lines.push(`Metin ${rule.maxChars} karakteri GEÇMESİN.`);
  return lines.join('\n');
}

export function fitToLimit(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  const cut = t.slice(0, maxChars);
  const lastBreak = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf('. '), cut.lastIndexOf(' '));
  return (lastBreak > maxChars * 0.6 ? cut.slice(0, lastBreak) : cut).trimEnd();
}

export class CaptionService {
  constructor(private readonly deps: CaptionDeps) {}

  async generate(req: CaptionRequest): Promise<CaptionResult> {
    const brief = (req.brief ?? '').trim();
    if (!brief || brief.length > MAX_BRIEF_CHARS) return { status: 'INVALID_BRIEF' };

    const limit = this.deps.dailyLimit ?? DEFAULT_DAILY_CAPTION_LIMIT;
    const now = (this.deps.now ?? (() => new Date()))();
    const since = this.deps.startOfDayIso(now, this.deps.timezone ?? 'Europe/Istanbul');
    const { count, error: cErr } = await this.deps.admin.from('ai_usage_events').select('id', { count: 'exact', head: true })
      .eq('org_id', req.orgId).eq('source', 'flow_caption').gte('created_at', since);
    if (cErr) { console.error('[CaptionService] sayım hatası:', cErr.message); return { status: 'ERROR' }; }
    if ((count ?? 0) >= limit) return { status: 'DAILY_LIMIT', limit };

    const persona = await this.deps.resolvePersona(req.orgId).catch(() => null);
    const rule = strictestRule(req.platforms);
    const parts: any[] = [{ text: brief }];
    if (req.media) parts.push({ inlineData: { mimeType: req.media.mimeType, data: req.media.data } });

    let turn;
    try {
      turn = await this.deps.gemini.generateResponse(buildCaptionPrompt(persona, rule), [{ role: 'user', parts }], []);
    } catch (e) {
      console.error('[CaptionService] Gemini hatası:', (e as Error)?.message);
      return { status: 'ERROR' };
    }
    if (turn?.type !== 'text' || !turn.text?.trim()) return { status: 'ERROR' };

    const text = fitToLimit(turn.text, rule.maxChars);
    const { error: uErr } = await this.deps.admin.from('ai_usage_events').insert({
      org_id: req.orgId, user_id: req.userId, source: 'flow_caption', event_type: 'caption', model: 'gemini-2.5-flash',
    });
    if (uErr) console.error('[CaptionService] kullanım kaydı yazılamadı:', uErr.message); // metin yine de döner
    return { status: 'SUCCESS', text, maxChars: rule.maxChars };
  }
}
