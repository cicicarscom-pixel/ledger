import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0"

function getAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export async function getTaxpayersSummary(): Promise<string> {
  try {
    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .limit(50);
      
    if (error) return `Mükellef listesi alınamadı: ${error.message}`;
    if (!data || data.length === 0) return "Sistemde henüz kayıtlı mükellef bulunmuyor.";
    
    let result = `Sistemde şu an ${data.length} adet kayıtlı mükellef bulunmaktadır.\n\nMükellef Listesi:\n`;
    data.forEach((org, i) => {
      result += `${i + 1}. ${org.name}\n`;
    });
    return result;
  } catch (error: any) {
    return `Hata: ${error.message}`;
  }
}

export async function getLatestInvoices(): Promise<string> {
  try {
    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('id, status, created_at, preview_data')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) return `Faturalar alınamadı: ${error.message}`;
    if (!data || data.length === 0) return "Sistemde henüz kayıtlı fatura bulunmuyor.";
    
    let result = "Son 10 Fatura:\n";
    data.forEach((inv, i) => {
      const date = new Date(inv.created_at).toLocaleDateString('tr-TR');
      const company = inv.preview_data?.kesen_firma || "Bilinmeyen Firma";
      const amount = inv.preview_data?.fatura_tutari ? `${inv.preview_data.fatura_tutari} TL` : "Belirtilmemiş";
      result += `${i + 1}. [Tarih: ${date}] ${company} - Tutar: ${amount} (Durum: ${inv.status})\n`;
    });
    return result;
  } catch (error: any) {
    return `Hata: ${error.message}`;
  }
}

export async function getRecentMessages(): Promise<string> {
  try {
    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('content, direction, created_at, profiles(business_name, full_name)')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) return `Mesajlar alınamadı: ${error.message}`;
    if (!data || data.length === 0) return "Sistemde okunacak yeni mesaj/cevap bulunmuyor.";
    
    let result = "Son 10 Mesaj / Bildirim Cevabı:\n";
    data.forEach((msg, i) => {
      const date = new Date(msg.created_at).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const sender = msg.profiles?.business_name || msg.profiles?.full_name || "Bilinmeyen Kullanıcı";
      const dir = msg.direction === 'incoming' ? 'Gelen' : 'Giden';
      result += `${i + 1}. [${date}] [${dir}] ${sender}: "${msg.content}"\n`;
    });
    return result;
  } catch (error: any) {
    return `Hata: ${error.message}`;
  }
}
