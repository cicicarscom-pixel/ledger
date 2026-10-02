import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0"

// Ledger AI'ın erişim kapsamı (02.10.2026): müşavirin firması + yalnız AKTİF bağlantılı mükellefleri.
// Bütün araçlar bu kapsamla çalışır; platformdaki diğer işletmeler görünmez ve onlara mesaj gönderilemez.
export interface AccountantScope {
  userId: string;
  firmId: string;
  firmName: string;
  taxpayers: { id: string; name: string }[];
}

export function getAdminClient() {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function resolveAccountantScope(userId: string): Promise<AccountantScope | null> {
  const admin = getAdminClient();
  const { data: member } = await admin
    .from('accounting_firm_members')
    .select('accounting_firm_id, accounting_firms(firm_name)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (!member?.accounting_firm_id) return null;

  const { data: links } = await admin
    .from('accountant_taxpayer_links')
    .select('taxpayer_organization_id, organizations(name)')
    .eq('accounting_firm_id', member.accounting_firm_id)
    .eq('status', 'active');

  const firm: any = Array.isArray(member.accounting_firms) ? member.accounting_firms[0] : member.accounting_firms;
  return {
    userId,
    firmId: member.accounting_firm_id,
    firmName: firm?.firm_name ?? 'Mali Müşavir',
    taxpayers: (links ?? []).map((l: any) => {
      const org = Array.isArray(l.organizations) ? l.organizations[0] : l.organizations;
      return { id: l.taxpayer_organization_id, name: org?.name ?? 'İsimsiz işletme' };
    }),
  };
}

// Türkçe karakterlerden bağımsız, büyük/küçük harf duyarsız karşılaştırma için
export function normalizeName(s: string): string {
  return (s || '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
