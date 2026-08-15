'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

export type ClientConnectionStatus =
  | 'connected'
  | 'invited'
  | 'activation_pending'
  | 'waiting_reply'
  | 'inactive'
  | 'invite_failed';

export interface Client {
  id: string;
  companyName: string;
  initials: string;
  taxNumber: string;
  taxOffice: string;
  contactName: string;
  phone: string;
  email: string;
  connectionStatus: ClientConnectionStatus;
  lastContact: string;
  lastLogin?: string;
  assignedAccountant: string;
  country: string;
  language: string;
  address?: any;
  nextFollowUp?: string;
  recentAIAction?: string;
}

export async function getClientsAction(): Promise<{ advisorCode: string | null; clients: Client[] }> {
  try {
    const cookieStore = await cookies();
    const supabaseUserClient = createClient(cookieStore);
    const adminSupabase = createAdminClient();

    // 1. Get current logged-in user
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    
    if (authError) {
      return { advisorCode: `Hata: Oturum hatası (${authError.message})`, clients: [] };
    }
    if (!user) {
      return { advisorCode: 'Hata: Giriş yapılmamış (Lütfen tekrar giriş yapın)', clients: [] };
    }

    const accountantId = user.id;

    // 2. Fetch connection_code from accounting_firm_members -> accounting_firms
    let { data: firmMemberData } = await adminSupabase
      .from('accounting_firm_members')
      .select(`
        accounting_firm_id,
        accounting_firms (
          id,
          connection_code,
          firm_name
        )
      `)
      .eq('user_id', accountantId)
      .limit(1)
      .maybeSingle();

    let firmDataRaw = firmMemberData?.accounting_firms;
    let firmData = Array.isArray(firmDataRaw) ? firmDataRaw[0] : firmDataRaw;
    let advisorCode = firmData?.connection_code || null;
    
    // Auto-create for seamless UX if missing
    if (!firmData) {
      const connectionCode = `WG-${Math.floor(10000 + Math.random() * 90000)}`;
      const { data: newFirm, error: insertError } = await adminSupabase
        .from('accounting_firms')
        .insert({
          firm_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Yeni Firma',
          connection_code: connectionCode
        })
        .select('id, connection_code, firm_name')
        .maybeSingle();
        
      if (insertError) {
        advisorCode = `Hata (Insert Firm): ${insertError.message}`;
        console.error('Auto-generate firm error:', insertError);
      } else if (newFirm) {
        // Also insert membership
        await adminSupabase.from('accounting_firm_members').insert({
            accounting_firm_id: newFirm.id,
            user_id: accountantId,
            role: 'admin'
        });
        firmData = newFirm;
        advisorCode = newFirm.connection_code;
      }
    } else if (!advisorCode) {
      // Firm exists but connection_code is missing
      const connectionCode = `WG-${Math.floor(10000 + Math.random() * 90000)}`;
      const { data: updatedFirm, error: updateError } = await adminSupabase
        .from('accounting_firms')
        .update({ connection_code: connectionCode })
        .eq('id', firmData.id)
        .select('id, connection_code, firm_name')
        .maybeSingle();
        
      if (updateError) {
        advisorCode = `Hata (Update): ${updateError.message}`;
        console.error('Update firm error:', updateError);
      } else if (updatedFirm) {
        firmData = updatedFirm;
        advisorCode = updatedFirm.connection_code;
      }
    }

    const firmId = firmData?.id;
    
    let clientsList: Client[] = [];

    // If we have a firm, fetch the connected clients
    if (firmId) {
      console.log('Fetching clients for firmId:', firmId);

      // 3a. Fetch Invitations
      const { data: invitations, error: invError } = await adminSupabase
        .from('ledger_invitations')
        .select('*')
        .eq('accounting_firm_id', firmId);

      if (invError) {
        console.error('Error fetching invitations:', invError);
      }

      if (invitations) {
        const invitedClients = invitations.map((inv: any) => ({
          id: inv.id,
          companyName: inv.company_name || 'İsimsiz Firma',
          initials: (inv.company_name || 'İ F').substring(0, 2).toUpperCase(),
          taxNumber: '-', 
          taxOffice: '-',
          contactName: '-',
          phone: inv.phone_e164 || '',
          email: '-',
          connectionStatus: (inv.status === 'pending' || inv.status === 'sent') ? 'invited' : 
                             inv.status === 'accepted' ? 'connected' : 'waiting_reply',
          lastContact: inv.sent_at ? new Date(inv.sent_at).toLocaleDateString('tr-TR') : 'Henüz gönderilmedi',
          assignedAccountant: 'Siz',
          country: 'Türkiye',
          language: 'Türkçe',
          address: null,
        } as Client));
        
        const pendingInvites = invitedClients.filter((c: Client) => c.connectionStatus !== 'connected');
        clientsList = [...clientsList, ...pendingInvites];
      }

      // 3b. Fetch Connected Clients (from accountant_taxpayer_links -> organizations)
      const { data: sharedLinks, error: linkError } = await adminSupabase
        .from('accountant_taxpayer_links')
        .select(`
          id,
          status,
          created_at,
          taxpayer_organization_id,
          organizations (
            name
          )
        `)
        .eq('accounting_firm_id', firmId);
        
      console.log('Shared links result:', { sharedLinks, linkError });

      if (linkError) {
        console.error('Error fetching links:', linkError);
      }

      if (sharedLinks && sharedLinks.length > 0) {
        // Fetch organization details
        for (const link of sharedLinks) {
          // We get the first owner/admin of the organization to display as contact
          const { data: orgMember } = await adminSupabase
            .from('organization_members')
            .select('user_id')
            .eq('organization_id', link.taxpayer_organization_id)
            .limit(1)
            .maybeSingle();

          let contactName = 'Yetkili';
          let phone = '-';
          let email = '-';
          let address = null;

          if (orgMember) {
             const { data: profile } = await adminSupabase
              .from('profiles')
              .select('full_name, address')
              .eq('id', orgMember.user_id)
              .maybeSingle();
              
             if (profile?.full_name) {
               contactName = profile.full_name;
             }
             if (profile?.address) {
               address = profile.address;
             }
          }

          const orgData = Array.isArray(link.organizations) ? link.organizations[0] : link.organizations;
          const orgName = orgData?.name || `Bağlı İşletme (${link.taxpayer_organization_id.substring(0,4)})`;

          let taxNumber = '-';
          let taxOffice = '-';

          const { data: legalProfile } = await adminSupabase
            .from('organization_legal_profiles')
            .select('tax_identifier, tax_office')
            .eq('organization_id', link.taxpayer_organization_id)
            .maybeSingle();
          
          if (legalProfile) {
            taxNumber = legalProfile.tax_identifier || '-';
            if (taxNumber && taxNumber !== '-') {
               taxNumber = taxNumber.substring(0, 3) + '******' + taxNumber.substring(taxNumber.length - 1);
            }
            taxOffice = legalProfile.tax_office || '-';
          }

          const { data: contacts } = await adminSupabase
            .from('organization_contacts')
            .select('type, value')
            .eq('organization_id', link.taxpayer_organization_id)
            .eq('is_primary', true);

          if (contacts) {
            const p = contacts.find((c:any) => c.type === 'phone');
            const e = contacts.find((c:any) => c.type === 'email');
            if (p) phone = p.value;
            if (e) email = e.value;
          }

          clientsList.push({
            id: link.id,
            companyName: orgName,
            initials: orgName.substring(0, 2).toUpperCase(),
            taxNumber: taxNumber,
            taxOffice: taxOffice,
            contactName: contactName,
            phone: phone,
            email: email,
            connectionStatus: link.status === 'pending_confirmation' ? 'activation_pending' : (link.status === 'active' ? 'connected' : 'inactive'),
            lastContact: link.created_at ? new Date(link.created_at).toLocaleDateString('tr-TR') : '-',
            assignedAccountant: 'Siz',
            country: 'Türkiye',
            language: 'Türkçe',
            address: address,
          } as Client);
        }
      }
    }

    return { advisorCode, clients: clientsList };

  } catch (error: any) {
    console.error('getClientsAction Error:', error);
    return { advisorCode: `Sistem Hatası: ${error?.message || 'Bilinmeyen Hata'}`, clients: [] };
  }
}
