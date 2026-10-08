/** WhatsApp randevu hatırlatma: saf (test edilebilir) yardımcılar. */

export interface ReminderMessageInput {
  orgName?: string | null;
  customerName?: string | null;
  startsAt: Date | string;
  timezone: string;
  doctor?: string | null;
  service?: string | null;
}

/** normalize_phone çıktısı (yalnız rakam) → WhatsApp sohbet kimliği; geçersizse null. Türkiye yerel biçimleri (5XXXXXXXXX, 05XXXXXXXXX) 90 ile tamamlanır. */
export function chatIdFromDigits(raw: unknown): string | null {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (/^05\d{9}$/.test(d)) d = '9' + d;        // 05XXXXXXXXX -> 905XXXXXXXXX
  else if (/^5\d{9}$/.test(d)) d = '90' + d;   // 5XXXXXXXXX  -> 905XXXXXXXXX
  if (!/^\d{10,15}$/.test(d)) return null;
  if (d.startsWith('90') && d.length !== 12) return null; // Türkiye numarası tam 12 hane olmalı
  return `${d}@c.us`;
}

function firstName(name: string | null | undefined): string {
  const first = String(name ?? '').trim().split(/\s+/)[0] ?? '';
  if (!first) return '';
  return first.charAt(0).toLocaleUpperCase('tr-TR') + first.slice(1).toLocaleLowerCase('tr-TR');
}

export function buildReminderText(i: ReminderMessageInput): string {
  const when = new Date(i.startsAt);
  const day = new Intl.DateTimeFormat('tr-TR', { timeZone: i.timezone, weekday: 'long', day: 'numeric', month: 'long' }).format(when);
  const time = new Intl.DateTimeFormat('tr-TR', { timeZone: i.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(when);
  const name = firstName(i.customerName);
  const org = String(i.orgName ?? '').trim();
  const lines: string[] = [];
  lines.push(name ? `Merhaba ${name},` : 'Merhaba,');
  lines.push(`${org ? org + ' olarak ' : ''}${day} saat ${time} randevunuzu hatırlatmak isteriz.`);
  if (i.doctor) lines.push(`Doktor: ${i.doctor}`);
  if (i.service) lines.push(`İşlem: ${i.service}`);
  lines.push('Randevunuzla ilgili bir değişiklik için bu mesaja yazabilirsiniz. Sizi bekliyoruz!');
  return lines.join('\n');
}

/** Günlüklerde telefonu açık yazmamak için. */
export function maskChatId(chatId: string): string {
  const d = chatId.replace(/@.*/, '');
  return d.length <= 4 ? '****' : `${'*'.repeat(d.length - 4)}${d.slice(-4)}`;
}
