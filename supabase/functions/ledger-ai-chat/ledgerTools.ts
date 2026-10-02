import { AccountantScope, getAdminClient } from "./scope.ts"

// Okuma araçları — YALNIZ müşavirin aktif mükellefleri (02.10.2026).
// Önceden: organizations tablosunun tamamı (platformdaki bütün işletmeler), var olmayan 'invoices' tablosu
// ve işletmelerin sosyal medya gelen kutusu (müşteri mesajları) filtresiz okunuyordu.

export async function getTaxpayersSummary(scope: AccountantScope): Promise<string> {
  if (scope.taxpayers.length === 0) return "Şu an aktif bağlantılı mükellefiniz bulunmuyor.";
  let result = `Aktif bağlantılı ${scope.taxpayers.length} mükellefiniz var:\n`;
  scope.taxpayers.forEach((t, i) => { result += `${i + 1}. ${t.name}\n`; });
  return result;
}

export async function getLatestInvoices(scope: AccountantScope): Promise<string> {
  if (scope.taxpayers.length === 0) return "Aktif bağlantılı mükellefiniz olmadığı için gösterilecek fatura yok.";
  try {
    const { data, error } = await getAdminClient()
      .from('finance_documents')
      .select('title, counterparty_name, amount_minor, currency_code, created_at, ledger_official_status, organization_id')
      .in('organization_id', scope.taxpayers.map((t) => t.id))
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) return `Faturalar alınamadı: ${error.message}`;
    if (!data || data.length === 0) return "Mükelleflerinizden henüz gelen fatura yok.";
    const nameOf = (id: string) => scope.taxpayers.find((t) => t.id === id)?.name ?? 'Mükellef';
    let result = "Son 10 evrak:\n";
    data.forEach((d: any, i: number) => {
      const date = new Date(d.created_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });
      const amount = typeof d.amount_minor === 'number'
        ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: d.currency_code || 'TRY' }).format(d.amount_minor / 100)
        : 'Belirtilmemiş';
      result += `${i + 1}. [${date}] ${nameOf(d.organization_id)} — ${d.counterparty_name || d.title || 'Belge'} — ${amount} (Durum: ${d.ledger_official_status})\n`;
    });
    return result;
  } catch (error: any) {
    return `Hata: ${error.message}`;
  }
}
