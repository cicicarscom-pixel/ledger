import { Search, ExternalLink, Unlink } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export default async function OrganizationsPage() {
  const supabase = createClient();

  const { data: orgs, error } = await supabase
    .from('organizations')
    .select(
      id, 
      name, 
      created_at,
      taxpayer_user_id,
      profiles:taxpayer_user_id (full_name)
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Organizasyonları çekerken hata:', error);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Organizasyonlar (İşletmeler)</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="İşletme adı ara..." 
            className="pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-64 text-white"
          />
        </div>
      </header>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface/50 text-text-muted border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">İşletme Adı</th>
              <th className="px-6 py-4 font-medium">Sahibi (Esnaf)</th>
              <th className="px-6 py-4 font-medium">Kayıt Tarihi</th>
              <th className="px-6 py-4 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orgs?.map((org: any) => (
              <tr key={org.id} className="hover:bg-surface/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{org.name || 'İsimsiz Organizasyon'}</span>
                    <span className="text-xs text-text-muted font-mono mt-1">ID: {org.id.split('-')[0]}...</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-text-muted">
                  {org.profiles?.full_name || 'Bilinmiyor'}
                </td>
                <td className="px-6 py-4 text-text-muted">
                  {new Date(org.created_at).toLocaleDateString('tr-TR')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-surface rounded-lg text-text-muted hover:text-white transition-colors" title="Detay Görüntüle">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button className="p-2 hover:bg-danger/10 rounded-lg text-text-muted hover:text-danger transition-colors" title="Organizasyonu Sil">
                      <Unlink className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(!orgs || orgs.length === 0) && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-text-muted">
                  Sistemde kayıtlı organizasyon bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}