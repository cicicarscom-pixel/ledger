/** WhatsApp randevu hatırlatma: saf (test edilebilir) yardımcılar. Metin şablonu işletmeye aittir; unvan (Sayın/Mr/Mrs/Herr/Frau) koda GÖMÜLMEZ. */

export type ReminderLocale = 'tr' | 'en' | 'de' | 'fr' | 'es';

export interface ReminderVars {
  customerName?: string | null;
  orgName?: string | null;
  startsAt: Date | string;
  timezone: string;
  locale?: string | null;
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

/** Günlüklerde telefonu açık yazmamak için. */
export function maskChatId(chatId: string): string {
  const d = chatId.replace(/@.*/, '');
  return d.length <= 4 ? '****' : `${'*'.repeat(d.length - 4)}${d.slice(-4)}`;
}

/** Dil → Intl yerel etiketi. İngilizce: Amerika saat dilimlerinde 12 saatlik (en-US), diğerlerinde en-GB. */
export function localeTag(locale: string | null | undefined, timezone: string): string {
  switch (locale) {
    case 'tr': return 'tr-TR';
    case 'de': return 'de-DE';
    case 'fr': return 'fr-FR';
    case 'es': return 'es-ES';
    default: return String(timezone ?? '').startsWith('America/') ? 'en-US' : 'en-GB';
  }
}

/** Değer şablona girerken süslü parantezler ve kontrol karakterleri temizlenir (şablon enjeksiyonu olmaz) ve kısaltılır. */
function clean(value: unknown, max: number): string {
  return String(value ?? '').replace(/[{}]/g, '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function firstName(name: string, tag: string): string {
  const first = name.split(' ')[0] ?? '';
  if (!first) return '';
  return first.charAt(0).toLocaleUpperCase(tag) + first.slice(1).toLocaleLowerCase(tag);
}

/**
 * Şablonu doldurur. Yer tutucular: {name} {first_name} {business} {date} {time} {doctor} {service}.
 * - {doctor} ya da {service} boşsa, o yer tutucuyu içeren SATIR mesajdan çıkarılır.
 * - Diğer boş yer tutucular boş yazılır; "Merhaba ," gibi artıklar toparlanır ("Merhaba,").
 * - Bilinmeyen {x} olduğu gibi kalır (kayıt sırasında veritabanı zaten reddeder).
 */
export function renderReminderTemplate(template: string, v: ReminderVars): string {
  const tag = localeTag(v.locale, v.timezone);
  const when = new Date(v.startsAt);
  const name = clean(v.customerName, 60);
  const values: Record<string, string> = {
    name,
    first_name: firstName(name, tag),
    business: clean(v.orgName, 80),
    date: new Intl.DateTimeFormat(tag, { timeZone: v.timezone, weekday: 'long', day: 'numeric', month: 'long' }).format(when),
    time: new Intl.DateTimeFormat(tag, { timeZone: v.timezone, hour: '2-digit', minute: '2-digit', hour12: tag === 'en-US' }).format(when),
    doctor: clean(v.doctor, 80),
    service: clean(v.service, 80),
  };
  const optional = new Set(['doctor', 'service']);
  const lines: string[] = [];
  for (const line of String(template ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const names = [...line.matchAll(/\{([A-Za-z_]+)\}/g)].map((m) => m[1]);
    if (names.some((n) => optional.has(n) && !values[n])) continue; // opsiyonel alan boş: satırı at
    let out = line.replace(/\{([A-Za-z_]+)\}/g, (m, n: string) => (n in values ? values[n] : m));
    out = out.replace(/[ \t]+([,.!?:;])/g, '$1').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/g, '');
    lines.push(out);
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 1000);
}
