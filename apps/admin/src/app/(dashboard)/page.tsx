import { createClient } from '@/utils/supabase/server';

export default async function AdminDashboard() {
  const supabase = createClient();

  // Fetch real metrics from Supabase
  const [
    { count: esnafCount }, 
    { count: musavirCount }, 
    { count: orgCount },
    { count: zernioCount }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'taxpayer'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'accountant'),
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('zernio_profiles').select('*', { count: 'exact', head: true }).schema('integration')
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
          Sistem Özeti
        </h1>
        <div className="flex items-center gap-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
          </span>
          <span className="text-sm font-medium text-success">Sistem Aktif (Canlı Veri)</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Toplam Esnaf (Flow)', val: esnafCount || 0, change: '+Aktif' },
          { title: 'Toplam Müşavir', val: musavirCount || 0, change: '+Aktif' },
          { title: 'Bağlı İşletme', val: orgCount || 0, change: 'Sistemde' },
          { title: 'Bağlı Zernio Hesabı', val: zernioCount || 0, change: 'Sosyal Medya' }
        ].map((stat, i) => (
          <div key={i} className="p-6 rounded-2xl bg-card border border-border shadow-sm hover:border-primary/50 transition-colors relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h3 className="text-sm font-medium text-text-muted mb-2">{stat.title}</h3>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-white">{stat.val}</p>
              <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-md">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}