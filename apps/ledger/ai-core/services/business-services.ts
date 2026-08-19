// Semantic Business Layer Abstraction
export class TaxpayerFinanceService {
  async getTaxpayerBalance(firmId: string, taxpayerId: string): Promise<number> {
    // In production, this computes sum of transactions for this taxpayer
    // e.g., SELECT sum(amount) FROM transactions WHERE ...
    return 12450.50; // Mock real calculation
  }

  async countTaxpayers(firmId: string): Promise<number> {
    // e.g., SELECT count(*) FROM accountant_taxpayer_links WHERE ...
    return 23;
  }
}

export class TaxpayerInvoiceService {
  async getInvoices(firmId: string, taxpayerId: string, period?: {from: string, to: string}): Promise<any[]> {
    // Fetch from 'finance_documents' or 'invoices'
    return [
      { id: 'inv-1', date: '2026-11-05', amount: 5000, type: 'sales' },
      { id: 'inv-2', date: '2026-11-12', amount: 7450.50, type: 'sales' }
    ];
  }
}

export const financeService = new TaxpayerFinanceService();
export const invoiceService = new TaxpayerInvoiceService();
