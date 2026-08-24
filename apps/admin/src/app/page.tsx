export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-surface text-text p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
            Workigom Super Admin
          </h1>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-card border border-border rounded-xl text-sm text-text-muted">
              Admin yetkisiyle girildi
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {['Toplam Esnaf', 'Toplam Müşavir', 'Bağlı Zernio Hesapları', 'Bugünkü AI İşlemleri'].map((title, i) => (
            <div key={i} className="p-6 rounded-2xl bg-card border border-border shadow-sm">
              <h3 className="text-sm font-medium text-text-muted mb-2">{title}</h3>
              <p className="text-3xl font-bold text-white">--</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}