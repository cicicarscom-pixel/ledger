'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

export async function getPendingDocumentsAction(firmId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Yetkisiz');

    // Verify firm membership
    const { data: firmMember } = await supabase
      .from('accounting_firm_members')
      .select('id')
      .eq('accounting_firm_id', firmId)
      .eq('user_id', user.id)
      .single();
    
    if (!firmMember) throw new Error('Müşavir yetkisi yok');

    // Get linked taxpayer orgs
    const { data: links } = await adminSupabase
      .from('accountant_taxpayer_links')
      .select('taxpayer_organization_id')
      .eq('accounting_firm_id', firmId)
      .eq('status', 'active'); // yalnız aktif bağlantı (Faz E)
      
    const orgIds = links?.map(l => l.taxpayer_organization_id) || [];

    if (orgIds.length === 0) {
      return { success: true, data: [] };
    }

    const { data, error } = await adminSupabase
      .from('finance_documents')
      .select(`
        id,
        type,
        created_at,
        title,
        amount_minor,
        currency_code,
        ledger_official_status,
        flow_payment_status,
        organization_id,
        organizations (name)
      `)
      .in('organization_id', orgIds)
      // Anasayfa sayaçları (Onaylanan / AI İşliyor / Biten) ve 7 günlük grafik için yalnız 'taslak' yetmez:
      // tüm taslaklar + son 30 günün bütün belgeleri. (Önceden yalnız taslak geliyordu; diğer sayaçlar hep 0'dı.)
      .or(`ledger_official_status.eq.taslak,created_at.gte.${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('getPendingDocumentsAction error:', error);
    return { success: false, error: error.message };
  }
}

export async function getDocumentDetailsAction(documentId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const adminSupabase = createAdminClient();
    
    // We can assume user is already authenticated by the layout, but let's be safe
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Yetkisiz');

    // Get document metadata using admin client to bypass organizations RLS
    const { data: document, error: docError } = await adminSupabase
      .from('finance_documents')
      .select(`
        *,
        organization_id,
        organizations (name)
      `)
      .eq('id', documentId)
      .single();

    if (docError || !document) throw new Error('Belge bulunamadı.');

    // Security check: verify this user's firm actually manages this organization
    const { data: hasAccess } = await adminSupabase
      .from('accountant_taxpayer_links')
      .select('id')
      .eq('taxpayer_organization_id', document.organization_id)
      .eq('status', 'active') // yalnız aktif bağlantı (Faz E)
      .in('accounting_firm_id', (
        await supabase.from('accounting_firm_members').select('accounting_firm_id').eq('user_id', user.id)
      ).data?.map(m => m.accounting_firm_id) || [])
      .single();

    if (!hasAccess) throw new Error('Bu belgeye erişim yetkiniz yok.');

    // Get Accounting Draft
    const { data: draft } = await adminSupabase
      .from('accounting_drafts')
      .select('*')
      .eq('document_id', documentId)
      .single();

    // Get Document Lines
    const { data: lines } = await adminSupabase
      .from('accounting_document_lines')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    let finalImageUrl = document.image_url || null;
    if (finalImageUrl && finalImageUrl.includes('/storage/v1/object/public/')) {
      // Extract bucket and path: .../public/bucket_name/file_path.jpg
      const parts = finalImageUrl.split('/storage/v1/object/public/')[1].split('/');
      const bucketName = parts[0];
      const filePath = parts.slice(1).join('/');
      
      // Known private buckets
      if (['finance_receipts', 'invoices', 'documents'].includes(bucketName)) {
        const { data: signedData } = await adminSupabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 60 * 60); // 1 hour validity
        
        if (signedData?.signedUrl) {
          finalImageUrl = signedData.signedUrl;
        }
      }
    }

    return {
      success: true,
      document,
      draft,
      lines: lines || [],
      imageUrl: finalImageUrl
    };
  } catch (error: any) {
    console.error('getDocumentDetailsAction error:', error);
    return { success: false, error: error.message };
  }
}

export async function getDashboardDocumentsAction(firmId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Yetkisiz');

    // Verify firm membership
    const { data: firmMember } = await supabase
      .from('accounting_firm_members')
      .select('id')
      .eq('accounting_firm_id', firmId)
      .eq('user_id', user.id)
      .single();
    
    if (!firmMember) throw new Error('Müşavir yetkisi yok');

    // Get linked taxpayer orgs
    const { data: links } = await adminSupabase
      .from('accountant_taxpayer_links')
      .select('taxpayer_organization_id')
      .eq('accounting_firm_id', firmId)
      .eq('status', 'active'); // yalnız aktif bağlantı (Faz E)
      
    const orgIds = links?.map(l => l.taxpayer_organization_id) || [];

    if (orgIds.length === 0) {
      return { success: true, data: [] };
    }

    const { data, error } = await adminSupabase
      .from('finance_documents')
      .select(`
        id,
        type,
        created_at,
        title,
        amount_minor,
        currency_code,
        ledger_official_status,
        flow_payment_status,
        organization_id,
        counterparty_name,
        organizations (name)
      `)
      .in('organization_id', orgIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('getDashboardDocumentsAction error:', error);
    return { success: false, error: error.message };
  }
}
