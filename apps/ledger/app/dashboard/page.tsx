import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import DashboardPage from '@/components/ledger/dashboard/DashboardPage';
import { getDashboardDocumentsAction } from '../../modules/ledger-ai/application/read-documents.action';
import { getIsmmmoRssFeedsAction } from '../../modules/ledger-ai/application/rss.action';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div className="p-8 text-center"><h2 className="text-xl font-bold">Lütfen Giriş Yapın</h2></div>;
  }

  // Get firm ID safely
  let { data: firmMember } = await supabase
    .from('accounting_firm_members')
    .select('accounting_firm_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!firmMember) {
    const { data: newFirmId } = await supabase.rpc('ensure_my_accounting_firm');
    if (newFirmId) {
      firmMember = { accounting_firm_id: newFirmId };
    }
  }

  let documents: any[] = [];
  if (firmMember) {
    const result = await getDashboardDocumentsAction(firmMember.accounting_firm_id);
    if (result.success) {
      documents = result.data || [];
    }
  }

  const rssFeedsResult = await getIsmmmoRssFeedsAction();
  const rssFeeds = rssFeedsResult.success ? rssFeedsResult.data : [];

  return <DashboardPage documents={documents} rssFeeds={rssFeeds} />;
}
