import { Search, Link as LinkIcon, Unlink, ExternalLink } from 'lucide-react';

export default function OrganizationsPage() {
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
              <th className="px-6 py-4 font-medium">Bağlı Müşavir</th>
              <th className="px-6 py-4 font-medium">Zernio Bağlantısı</th>
              <th className="px-6 py-4 font-medium">Kayıt Tarihi</th>
              <th className="px-6 py-4 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[1,2,3].map((i) => (
              <tr key={i} className="hover:bg-surface/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">Örnek İşletme {i}</span>
                    <span className="text-xs text-text-muted">VKN: 1234567890</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-3 w-3 text-primary" />
                    <span className="text-text-muted">Uzman SMMM Ofisi</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Aktif (2 Hesap)
                  </span>
                </td>
                <td className="px-6 py-4 text-text-muted">
                  24 Ağu 2026
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-surface rounded-lg text-text-muted hover:text-white transition-colors" title="Detay Görüntüle">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button className="p-2 hover:bg-warning/10 rounded-lg text-text-muted hover:text-warning transition-colors" title="Zernio Bağını Kopar">
                      <Unlink className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}