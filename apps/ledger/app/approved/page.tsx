import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import ApprovedPage from '@/components/ledger/approved/ApprovedPage';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div className="p-8 text-center"><h2 className="text-xl font-bold">Lütfen Giriş Yapın</h2></div>;
  }

  // Get firm ID
  const { data: firmMember } = await supabase
    .from('accounting_firm_members')
    .select('accounting_firm_id')
    .eq('user_id', user.id)
    .single();

  if (!firmMember) return <div className="p-8">Müşavir yetkiniz bulunmuyor.</div>;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <div className="p-8 text-red-500">Sunucu yapılandırması eksik.</div>;
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get linked taxpayer orgs (using taxpayer_organization_id not taxpayer_id)
  const { data: links } = await supabaseAdmin
    .from('accountant_taxpayer_links')
    .select('taxpayer_organization_id')
    .eq('accounting_firm_id', firmMember.accounting_firm_id)
    .eq('status', 'active'); // yalnız aktif bağlantı (Faz E)

  const orgIds = links?.map(l => l.taxpayer_organization_id) || [];

  let documents: any[] = [];
  if (orgIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('finance_documents')
      .select(`
        *,
        organizations:organization_id (name)
      `)
      .in('organization_id', orgIds)
      .eq('ledger_official_status', 'onaylandi')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching approved documents:', error);
    } else {
      documents = data || [];
    }
  }

  return <ApprovedPage documents={documents} />;
}
