/**
 * Admin paneli — WAHA oturumlarını işletmelerle eşleştirme. Oturum adı = işletme sahibinin auth.users.id'sidir
 * (web waha.ts / mobil WahaService / waha-webhook ile aynı sözleşme; değiştirilirse canlı WhatsApp bağlantıları kopar).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isValidSessionName = (s: unknown): s is string => typeof s === 'string' && UUID_RE.test(s);

export interface WahaSessionRaw {
  name?: string;
  status?: string;
  me?: { id?: string; pushName?: string } | null;
  engine?: { engine?: string } | string | null;
}

export interface OwnerProfile { id: string; business_name?: string | null; email?: string | null; account_status?: string | null }
export interface OwnerOrg { id: string; owner_id: string; name?: string | null }

export interface AdminWahaRow {
  session: string;
  status: string;
  phone: string | null;       // yalnız rakamlar (905551234567)
  phoneDisplay: string | null; // +90 555 123 45 67 benzeri
  pushName: string | null;
  ownerUserId: string | null;
  businessName: string | null;
  orgId: string | null;
  email: string | null;
  accountStatus: string | null;
  orphan: boolean;            // oturumun sahibi bulunamadı (silinmiş kullanıcı olabilir)
}

/** "905515318458@c.us" → "905515318458". "...@lid" gibi telefon olmayan kimlikler → null. */
export function phoneFromWahaId(id: unknown): string | null {
  const m = /^(\d{7,15})@c\.us$/.exec(String(id ?? ''));
  return m ? m[1] : null;
}

export function formatPhone(digits: string | null): string | null {
  if (!digits) return null;
  // Türkiye (90 + 10 hane) özel biçim; diğerleri +ülke… gruplu
  if (/^90\d{10}$/.test(digits)) return `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  return `+${digits}`;
}

export function joinSessions(sessions: WahaSessionRaw[], profiles: OwnerProfile[], orgs: OwnerOrg[]): AdminWahaRow[] {
  const pById = new Map(profiles.map((p) => [p.id, p]));
  const oByOwner = new Map(orgs.map((o) => [o.owner_id, o]));
  return (sessions ?? [])
    .filter((s) => typeof s?.name === 'string')
    .map((s) => {
      const name = s.name as string;
      const p = pById.get(name) ?? null;
      const o = oByOwner.get(name) ?? null;
      const phone = phoneFromWahaId(s.me?.id);
      return {
        session: name,
        status: String(s.status ?? 'UNKNOWN'),
        phone,
        phoneDisplay: formatPhone(phone),
        pushName: s.me?.pushName ?? null,
        ownerUserId: p ? p.id : null,
        businessName: p?.business_name ?? o?.name ?? null,
        orgId: o?.id ?? null,
        email: p?.email ?? null,
        accountStatus: p?.account_status ?? null,
        orphan: !p && !o,
      };
    })
    // Bağlı olanlar önce, sonra durum/ad
    .sort((a, b) => Number(b.status === 'WORKING') - Number(a.status === 'WORKING') || a.session.localeCompare(b.session));
}
