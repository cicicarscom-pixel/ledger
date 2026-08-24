import { Search, UserX, Ban, Mail } from 'lucide-react';

export default function UsersPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Kullanıcı Yönetimi</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="E-posta veya isim ara..." 
            className="pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-64 text-white"
          />
        </div>
      </header>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface/50 text-text-muted border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">Kullanıcı</th>
              <th className="px-6 py-4 font-medium">E-posta</th>
              <th className="px-6 py-4 font-medium">Rol</th>
              <th className="px-6 py-4 font-medium">Durum</th>
              <th className="px-6 py-4 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[1,2,3,4,5].map((i) => (
              <tr key={i} className="hover:bg-surface/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      U{i}
                    </div>
                    <span className="font-medium text-white">Test User {i}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-text-muted">user{i}@example.com</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Esnaf
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20">
                    Aktif
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-surface rounded-lg text-text-muted hover:text-white transition-colors" title="Şifre Sıfırla">
                      <Mail className="h-4 w-4" />
                    </button>
                    <button className="p-2 hover:bg-warning/10 rounded-lg text-text-muted hover:text-warning transition-colors" title="Askıya Al">
                      <Ban className="h-4 w-4" />
                    </button>
                    <button className="p-2 hover:bg-danger/10 rounded-lg text-text-muted hover:text-danger transition-colors" title="Kalıcı Sil">
                      <UserX className="h-4 w-4" />
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