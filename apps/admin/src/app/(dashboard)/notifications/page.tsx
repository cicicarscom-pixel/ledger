import { createClient } from '@/utils/supabase/server'
import { NotificationForm } from './NotificationForm'
import { BellRing, Radio } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const supabase = createClient()
  
  // Fetch a list of profiles for the "Single User" dropdown
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, display_name, user_type')
    .order('created_at', { ascending: false })
    .limit(100)

  // Fetch recent broadcasts
  const { data: broadcasts } = await supabase
    .from('broadcast_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <BellRing className="text-primary h-6 w-6" />
          Bildirim & Yayın Merkezi
        </h1>
        <p className="text-text-muted text-sm">
          Sistemdeki kullanıcılara anlık bildirim ve duyuru gönderin (Broadcast veya Tekil).
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-6 border-b border-border pb-4">Yeni Bildirim Oluştur</h2>
            <NotificationForm profiles={profiles || []} />
          </div>
        </div>

        <div>
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl h-full">
            <h2 className="text-lg font-semibold text-white mb-6 border-b border-border pb-4 flex items-center gap-2">
              <Radio className="text-primary h-5 w-5" />
              Son Yayınlar (Broadcast)
            </h2>
            
            <div className="space-y-4">
              {broadcasts && broadcasts.length > 0 ? (
                broadcasts.map(b => (
                  <div key={b.id} className="p-4 rounded-xl bg-surface border border-border">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-md uppercase">
                        {b.target}
                      </span>
                      <span className="text-xs text-text-muted">
                        {new Date(b.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">{b.title}</h3>
                    <p className="text-xs text-text-muted line-clamp-2">{b.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-text-muted text-sm">
                  Henüz hiçbir yayın (broadcast) yapılmadı.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
