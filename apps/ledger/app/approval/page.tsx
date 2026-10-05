import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getPendingDocumentsAction } from '../../modules/ledger-ai/application/read-documents.action';
import ApprovalPage from '@/components/ledger/approval/ApprovalPage';

import { redirect } from 'next/navigation';

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div className="p-8 text-center"><h2 className="text-xl font-bold">Lütfen Giriş Yapın</h2><p>Bu sayfayı görüntülemek için giriş yapmanız gerekmektedir.</p></div>;
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

  if (!firmMember) return <div className="p-8">Müşavir yetkiniz bulunmuyor.</div>;

  const result = await getPendingDocumentsAction(firmMember.accounting_firm_id);
  const queue = result.data || [];


  return <ApprovalPage queue={queue} />;
}
