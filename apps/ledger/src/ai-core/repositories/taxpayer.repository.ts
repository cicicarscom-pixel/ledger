import { createClient } from '@supabase/supabase-js';

export interface TaxpayerEntity {
  id: string;
  name: string;
  slug: string;
  taxNumber?: string;
}

export class TaxpayerRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key',
      {
        db: {
          schema: 'public'
        }
      }
    );
  }

  public async getTaxpayersByFirmId(firmId: string): Promise<TaxpayerEntity[]> {
    const { data, error } = await this.supabase
      .from('accountant_taxpayer_links')
      .select('taxpayer_organization_id, organizations(id, name, slug)')
      .eq('accounting_firm_id', firmId)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching taxpayers:', error);
      return [];
    }

    return (data || [])
      .map((link: any) => link.organizations)
      .filter(Boolean)
      .map((org: any) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
      }));
  }
}

export const taxpayerRepository = new TaxpayerRepository();
