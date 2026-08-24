import { Terminal, MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ActivityPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 h-full flex flex-col">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Yapay Zeka ve Sistem Logları</h1>
          <p className="text-sm text-text-muted">Tüm AI yanıtlarını ve API hareketlerini canlı izleyin.</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-lg">
          <button className="px-3 py-1.5 rounded-md text-sm font-medium bg-surface text-white shadow-sm">Tümü</button>
          <button className="px-3 py-1.5 rounded-md text-sm font-medium text-text-muted hover:text-white">Sadece Hatalar</button>
        </div>
      </header>

      <div className="flex-1 bg-[#0E1117] border border-border rounded-2xl overflow-hidden flex flex-col font-mono text-sm shadow-inner">
        <div className="p-3 border-b border-border bg-[#161B22] flex items-center gap-2 text-text-muted shrink-0">
          <Terminal className="h-4 w-4" />
          <span>live-system-monitor.log</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-text-muted shrink-0 mt-0.5">[19:42:01]</span>
            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            <div>
              <span className="text-blue-400 font-semibold">[WAHA-WEBHOOK]</span> <span className="text-white">Yeni mesaj alındı (Org: 1234-abcd)</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-text-muted shrink-0 mt-0.5">[19:42:03]</span>
            <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="text-purple-400 font-semibold">[AI-GENERATION]</span> <span className="text-white">Yapay Zeka yanıt üretti. Token: 142</span>
              <div className="mt-1 p-2 bg-white/5 rounded border border-white/10 text-text-muted text-xs">
                &quot;Merhaba, randevunuzu 14:00 olarak güncelledim...&quot;
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-text-muted shrink-0 mt-0.5">[19:45:12]</span>
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <span className="text-warning font-semibold">[ZERNIO-SYNC]</span> <span className="text-white">Rate limit aşıldı. Tekrar deneniyor... (Org: 5678-efgh)</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-text-muted pt-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span>Canlı akış dinleniyor...</span>
          </div>
        </div>
      </div>
    </div>
  )
}