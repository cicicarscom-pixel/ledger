import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getDocumentDetailsAction, getPendingDocumentsAction } from '../../../modules/ledger-ai/application/read-documents.action';
import ApprovalPage from '@/components/ledger/approval/ApprovalPage';

export default async function Page({ params }: { params: { id: string } }) {
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

  // Fetch queue and active document in parallel
  const [queueResult, detailResult] = await Promise.all([
    getPendingDocumentsAction(firmMember.accounting_firm_id),
    getDocumentDetailsAction(params.id)
  ]);

  if (!detailResult.success) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-surface text-text">
        <h1 className="text-2xl font-bold text-warning mb-4">Hata: Belge bulunamadı.</h1>
        <a href="/approval" className="text-primary hover:underline">Geri Dön</a>
      </div>
    );
  }

  const queue = queueResult.data || [];
  const result = detailResult;

  return (
    <ApprovalPage 
      queue={queue}
      activeDocument={result.document}
      draft={result.draft}
      imageUrl={result.imageUrl || null}
    />
  );
}
