/**
 * FA6 — Proaktif öneri kartları. KENDİLİĞİNDEN HİÇBİR ŞEY YAPMAZ: yalnız gösterilecek kartları hesaplar.
 * LLM yok: kartlar kuruluşun verisinden belirleyici (deterministik) kurallarla üretilir, bu yüzden uydurma yoktur.
 * Kartlar yapısaldır ({kind, params}); metinleri istemci kendi dilinde (TR/EN/DE) yazar. Eylem düğmesi
 * (CTA) yalnız kullanıcı dokununca çalışır: bir sohbet mesajı gönderir ya da bir ekran açar.
 */

export type SuggestionKind = 'connect_account' | 'free_slots' | 'best_time' | 'growth';

export interface SuggestionCard {
  id: string;
  kind: SuggestionKind;
  params: Record<string, string | number>;
  cta: { type: 'prompt' | 'navigate'; screen?: string };
}

export interface SuggestionInput {
  /** Önümüzdeki günler için doluluk (get_appointments_overview çıktısındaki days). */
  days: { date: string; calendars: { free: number; booked: number; blocked: number }[] }[];
  /** Bağlı (aktif) sosyal hesap sayısı. */
  connectedAccounts: number;
  /** Sıkıştırılmış en iyi saat dilimleri (compactBestTimes çıktısı), en iyisi önce. */
  bestTimes: { dayIndex: number; hour: string; avgEngagement: number; postCount: number }[];
  /** Hesap büyümesi (summarizeAccounts çıktısı). */
  growth: { platform: string; hasData: boolean; followerChange: number | null }[];
  growthDays: number;
}

export const MIN_FREE_SLOTS = 4;
export const MIN_BEST_TIME_POSTS = 2;
export const MAX_CARDS = 3;

const sumFree = (d: SuggestionInput['days'][number]) => d.calendars.reduce((s, c) => s + c.free, 0);
const sumAll = (d: SuggestionInput['days'][number]) => d.calendars.reduce((s, c) => s + c.free + c.booked + c.blocked, 0);

export function buildSuggestions(input: SuggestionInput): SuggestionCard[] {
  const cards: SuggestionCard[] = [];

  if (input.connectedAccounts === 0) {
    cards.push({ id: 'connect_account', kind: 'connect_account', params: {}, cta: { type: 'navigate', screen: 'sosyal_medya' } });
  }

  // En boş gün (randevu takvimi tanımlıysa): boş saat çoksa kampanya önerisi.
  const slotDays = input.days.filter((d) => sumAll(d) > 0);
  if (slotDays.length > 0) {
    const best = slotDays.reduce((a, b) => (sumFree(b) > sumFree(a) ? b : a));
    if (sumFree(best) >= MIN_FREE_SLOTS) {
      cards.push({ id: `free_slots:${best.date}`, kind: 'free_slots', params: { date: best.date, free: sumFree(best), total: sumAll(best) }, cta: { type: 'prompt' } });
    }
  }

  // En iyi paylaşım zamanı: örnek yeterliyse.
  const top = input.bestTimes[0];
  if (top && top.postCount >= MIN_BEST_TIME_POSTS && input.connectedAccounts > 0) {
    cards.push({ id: `best_time:${top.dayIndex}:${top.hour}`, kind: 'best_time', params: { dayIndex: top.dayIndex, hour: top.hour, postCount: top.postCount }, cta: { type: 'prompt' } });
  }

  // Büyüme: ölçüm olan ve değişimi sıfırdan farklı en büyük mutlak değişim.
  const moved = input.growth.filter((g) => g.hasData && g.followerChange !== null && g.followerChange !== 0);
  if (moved.length > 0) {
    const g = moved.reduce((a, b) => (Math.abs(b.followerChange!) > Math.abs(a.followerChange!) ? b : a));
    cards.push({ id: `growth:${g.platform}`, kind: 'growth', params: { platform: g.platform, change: g.followerChange!, days: input.growthDays }, cta: { type: 'prompt' } });
  }

  return cards.slice(0, MAX_CARDS);
}
