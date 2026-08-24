import { Terminal, MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export default async function ActivityPage() {
  const supabase = createClient();

  const { data: logs, error } = await supabase
    .from('ai_communication_logs')
    .select('id, platform, sender_id, user_message, ai_response, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Logları çekerken hata:', error);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 h-full flex flex-col">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Yapay Zeka ve Sistem Logları</h1>
          <p className="text-sm text-text-muted">Tüm AI yanıtlarını ve API hareketlerini canlı izleyin.</p>
        </div>
      </header>

      <div className="flex-1 bg-[#0E1117] border border-border rounded-2xl overflow-hidden flex flex-col font-mono text-sm shadow-inner">
        <div className="p-3 border-b border-border bg-[#161B22] flex items-center gap-2 text-text-muted shrink-0">
          <Terminal className="h-4 w-4" />
          <span>live-system-monitor.log</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {logs?.map((log: any) => (
            <div key={log.id} className="border-b border-white/5 pb-4 last:border-0">
              <div className="flex items-start gap-3">
                <span className="text-text-muted shrink-0 mt-0.5">
                  [{new Date(log.created_at).toLocaleTimeString('tr-TR')}]
                </span>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-emerald-400 font-semibold">[{log.platform?.toUpperCase()}]</span> 
                    <span className="text-white">Gelen Mesaj ({log.sender_id})</span>
                  </div>
                  <div className="text-text-muted text-xs mb-2 pl-2 border-l-2 border-white/10">
                    "{log.user_message}"
                  </div>

                  {log.ai_response && (
                    <>
                      <div className="flex items-center gap-2 mb-1 mt-2">
                        <span className="text-purple-400 font-semibold">[AI-REPLY]</span> 
                        <span className="text-white">Yapay Zeka Yanıtı</span>
                      </div>
                      <div className="p-2 bg-white/5 rounded border border-white/10 text-text-muted text-xs">
                        "{log.ai_response}"
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {(!logs || logs.length === 0) && (
            <div className="text-text-muted italic">Sistemde henüz bir log bulunmuyor.</div>
          )}
        </div>
      </div>
    </div>
  )
}