import { createClient } from '@/utils/supabase/server'
import { MessageCircle } from 'lucide-react'
import DisconnectButton from './DisconnectButton'

export const dynamic = 'force-dynamic'

type Row = {
  session: string
  status: string
  phoneDisplay: string | null
  pushName: string | null
  businessName: string | null
  email: string | null
  accountStatus: string | null
  orphan: boolean
  server_name: string | null
  server_id: string | null
  missing_in_waha?: boolean
  mismatch?: boolean
}

const STATUS_STYLE: Record<string, string> = {
  WORKING: 'bg-success/10 text-success border-success/20',
  STOPPED: 'bg-white/5 text-text-muted border-white/10',
  SCAN_QR_CODE: 'bg-warning/10 text-warning border-warning/20',
  STARTING: 'bg-warning/10 text-warning border-warning/20',
  FAILED: 'bg-danger/10 text-danger border-danger/20',
  MISSING: 'bg-danger/10 text-danger border-danger/20',
}

export default async function WhatsappPage() {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('admin-waha', { body: { action: 'list' } })
  const rows: Row[] = data?.rows ?? []
  // "non-2xx" yerine fonksiyonun döndüğü gerçek hata mesajını göster
  let errorMessage: string | null = data?.error ?? null
  if (error) {
    try { errorMessage = (await (error as any).context?.json?.())?.error ?? error.message } catch { errorMessage = error.message }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
          <strong className="block mb-1">WhatsApp oturumları alınamadı</strong>
          {errorMessage}
        </div>
      )}

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-success" />
          <h1 className="text-2xl font-bold text-white">WhatsApp Bağlantıları</h1>
        </div>
        <span className="text-sm text-text-muted">{rows.length} oturum</span>
      </header>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface/50 text-text-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">İşletme</th>
                <th className="px-6 py-4 font-medium">Bağlı Numara</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium">Hesap</th>
                <th className="px-6 py-4 font-medium">Sunucu</th>
                <th className="px-6 py-4 font-medium">E-posta</th>
                <th className="px-6 py-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.session} className="hover:bg-surface/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{r.businessName || (r.orphan ? 'Sahibi bulunamadı' : 'İsimsiz işletme')}</div>
                    <div className="text-xs text-text-muted font-mono">{r.session}</div>
                    {r.orphan && <div className="text-[10px] text-warning bg-warning/10 px-1 py-0.5 mt-1 inline-block rounded">WAHA'da var, atanmamış</div>}
                    {r.missing_in_waha && <div className="text-[10px] text-danger bg-danger/10 px-1 py-0.5 mt-1 inline-block rounded">Atanmış, WAHA'da yok</div>}
                    {r.mismatch && <div className="text-[10px] text-warning bg-warning/10 px-1 py-0.5 mt-1 inline-block rounded">Farklı sunucuda atanmış</div>}
                  </td>
                  <td className="px-6 py-4">
                    {r.phoneDisplay ? (
                      <div>
                        <div className="text-white">{r.phoneDisplay}</div>
                        {r.pushName && <div className="text-xs text-text-muted">{r.pushName}</div>}
                      </div>
                    ) : (
                      <span className="text-text-muted/50 italic">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${STATUS_STYLE[r.status] ?? STATUS_STYLE.STOPPED}`}>{r.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    {r.orphan ? (
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium border bg-warning/10 text-warning border-warning/20">Sahipsiz</span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${r.accountStatus === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                        {r.accountStatus === 'active' ? 'Aktif' : r.accountStatus === 'suspended' ? 'Askıda' : r.accountStatus === 'banned' ? 'Banlı' : r.accountStatus || '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white">{r.server_name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-text-muted">{r.email || '-'}</td>
                  <td className="px-6 py-4">
                    <DisconnectButton session={r.session} label={r.businessName || r.session} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !errorMessage && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-text-muted">Oturum yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
