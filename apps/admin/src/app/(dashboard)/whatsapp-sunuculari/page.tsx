import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ServerActions } from './ServerActions';
import { AddServerForm } from './AddServerForm';
import { HowToAddServerGuide } from './HowToAddServerGuide';
import { AlertActions } from './AlertActions';
import { MetricsChart } from './MetricsChart';

export const dynamic = 'force-dynamic';

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dakika önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export default async function WhatsappServersPage({ searchParams }: { searchParams: { resolved?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) redirect('/login?error=unauthorized');

  const includeResolved = searchParams.resolved === '1';

  // 1.1 Fetch Data
  const [
    { data: serversData, error: serversErr },
    { data: alertsData, error: alertsErr }
  ] = await Promise.all([
    supabase.rpc('get_waha_capacity'),
    supabase.rpc('get_waha_alerts', { p_include_resolved: includeResolved })
  ]);

  if (serversErr) {
    if (serversErr.code === '42501') {
      return <div className="p-4 bg-danger/10 border border-danger text-danger rounded">Bu sayfa yalnız süper admine açıktır.</div>;
    }
    return <div className="p-4 bg-danger/10 border border-danger text-danger rounded">Veri alınamadı: {serversErr.message}</div>;
  }

  const servers = serversData || [];
  const alerts = alertsData || [];

  // 1.2 Summary calculations
  const activeServers = servers.filter((s: any) => s.is_active);
  const totalAssigned = activeServers.reduce((sum: number, s: any) => sum + (s.assigned || 0), 0);
  const totalMax = activeServers.reduce((sum: number, s: any) => sum + (s.max_sessions || 0), 0);
  const totalPercent = totalMax > 0 ? Math.round((totalAssigned / totalMax) * 100) : 0;
  
  const nextServer = servers.find((s: any) => s.is_next);
  const nextServerSpace = nextServer ? (nextServer.max_sessions - nextServer.assigned) : 0;

  const openAlertsCount = alerts.filter((a: any) => !a.resolved_at).length;

  const highestOrder = servers.length > 0 ? Math.max(...servers.map((s: any) => s.fill_order)) : 0;

  // Fetch metrics for up to first 6 active servers
  const metricsServers = activeServers.slice(0, 6);
  const metricsPromises = metricsServers.map((s: any) => 
    supabase.rpc('get_waha_metrics', { p_server: s.id, p_days: 7 }).then(res => ({ server: s, data: res.data || [] }))
  );
  const metricsResults = await Promise.all(metricsPromises);

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold mb-1">WhatsApp Sunucuları</h1>
          <p className="text-text-muted text-sm">Çoklu sunucu kapasite yönetimi ve sağlık durumu.</p>
        </div>
        <Link href="/whatsapp" className="bg-card border border-border text-sm px-4 py-2 rounded-lg hover:bg-border transition-colors">
          Bağlantı Listesine Git
        </Link>
      </div>

      {/* 1.2 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-5 rounded-2xl">
          <div className="text-text-muted text-sm mb-1">Toplam Kapasite</div>
          <div className="text-2xl font-semibold">{totalAssigned} / {totalMax}</div>
          <div className="text-xs mt-1 text-text-muted">% {totalPercent} dolu</div>
        </div>
        <div className="bg-card border border-border p-5 rounded-2xl">
          <div className="text-text-muted text-sm mb-1">Sıradaki Sunucu</div>
          {nextServer ? (
            <>
              <div className="text-2xl font-semibold">{nextServer.name}</div>
              <div className="text-xs mt-1 text-success">{nextServerSpace} boş yer</div>
            </>
          ) : (
            <div className="text-danger font-semibold mt-1">Boş yer yok — yeni sunucu ekleyin.</div>
          )}
        </div>
        <div className="bg-card border border-border p-5 rounded-2xl">
          <div className="text-text-muted text-sm mb-1">Açık Uyarılar</div>
          <div className={`text-2xl font-semibold ${openAlertsCount > 0 ? 'text-warning' : 'text-success'}`}>{openAlertsCount}</div>
        </div>
      </div>

      {/* 1.3 Server Table */}
      <div className="bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-background border-b border-border text-text-muted">
            <tr>
              <th className="p-4 font-medium">Ad / Sıra</th>
              <th className="p-4 font-medium">Atanan / Max</th>
              <th className="p-4 font-medium">Çalışan</th>
              <th className="p-4 font-medium">Gecikme</th>
              <th className="p-4 font-medium">CPU / RAM</th>
              <th className="p-4 font-medium">Durum</th>
              <th className="p-4 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {servers.map((s: any) => {
              const barColor = s.percent < s.warn_percent ? 'bg-success' : s.percent < 100 ? 'bg-warning' : 'bg-danger';
              
              let statusLabel = 'Aktif';
              let statusColor = 'bg-success text-white';
              if (!s.is_active) { statusLabel = 'Kapalı'; statusColor = 'bg-border text-text-muted'; }
              else if (s.status === 'down') { statusLabel = 'Erişilemiyor'; statusColor = 'bg-danger text-white'; }
              else if (!s.accepting_new) { statusLabel = 'Yeni kayıt almıyor'; statusColor = 'bg-warning text-black'; }
              else if (s.status === 'full') { statusLabel = 'Dolu'; statusColor = 'bg-danger text-white'; }
              else if (s.status === 'warn') { statusLabel = 'Dolmak üzere'; statusColor = 'bg-warning text-black'; }

              const timeAgoLabel = s.last_measured_at ? timeAgo(s.last_measured_at) : 'Hiç ölçülmedi';
              const isOld = s.last_measured_at ? (Date.now() - new Date(s.last_measured_at).getTime() > 15 * 60 * 1000) : false;

              return (
                <tr key={s.id} className="hover:bg-background/50">
                  <td className="p-4">
                    <div className="font-medium flex items-center gap-2">
                      {s.name}
                      {s.is_next && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">Sıradaki</span>}
                    </div>
                    <div className="text-xs text-text-muted mt-1">Sıra: {s.fill_order}</div>
                    {!s.base_url_set && <div className="text-[10px] text-text-muted mt-0.5" title="Adres eski ortam değişkeninden (WAHA_BASE_URL)">Eski adres tipi</div>}
                    {s.base_url_set && !s.is_https && <div className="text-[10px] text-danger font-medium mt-0.5">HTTP — güvensiz</div>}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{s.assigned} / {s.max_sessions}</span>
                      <span>%{s.percent}</span>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden w-32">
                      <div className={`h-full ${barColor}`} style={{ width: `${Math.min(s.percent, 100)}%` }}></div>
                    </div>
                  </td>
                  <td className="p-4">{s.sessions_working ?? '-'}</td>
                  <td className="p-4">{s.api_latency_ms ? `${s.api_latency_ms} ms` : '-'}</td>
                  <td className="p-4 text-xs">
                    {(s.cpu_percent !== null || s.mem_used_mb !== null) ? (
                      <>
                        <div>CPU: %{s.cpu_percent ?? '?'}</div>
                        <div>RAM: {s.mem_used_mb ?? '?'}MB / {s.mem_total_mb ?? '?'}MB</div>
                      </>
                    ) : (
                      <span className="text-text-muted">Ölçülmüyor</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className={`inline-block px-2 py-1 rounded text-xs ${statusColor}`}>{statusLabel}</div>
                    <div className={`text-[10px] mt-1 ${isOld ? 'text-warning' : 'text-text-muted'}`}>{timeAgoLabel}</div>
                  </td>
                  <td className="p-4">
                    <ServerActions server={s} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {metricsResults.map((mr) => (
            <MetricsChart key={mr.server.id} metrics={mr.data} serverName={mr.server.name} />
          ))}
        </div>
        
        <div className="lg:col-span-1">
          {/* Alerts */}
          <div className="bg-card border border-border p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Uyarılar</h3>
              {includeResolved ? (
                <Link href="?" className="text-xs text-primary hover:underline">Açıkları Göster</Link>
              ) : (
                <Link href="?resolved=1" className="text-xs text-primary hover:underline">Çözülmüşleri Göster</Link>
              )}
            </div>
            
            <div className="flex flex-col gap-3">
              {alerts.length === 0 ? (
                <div className="text-success text-sm">Açık uyarı yok</div>
              ) : (
                alerts.map((a: any) => {
                  let label = a.kind;
                  let color = 'text-danger border-danger/20 bg-danger/5';
                  if (a.kind === 'capacity_warn') { label = 'Kapasite uyarısı'; color = 'text-warning border-warning/20 bg-warning/5'; }
                  else if (a.kind === 'capacity_full') label = 'Sunucu doldu';
                  else if (a.kind === 'no_capacity') label = 'Yer yok';
                  else if (a.kind === 'server_down') label = 'Sunucu erişilemiyor';
                  else if (a.kind === 'webhook_auth_failed') label = 'Webhook imza hatası';

                  const isRes = !!a.resolved_at;

                  return (
                    <div key={a.id} className={`p-3 rounded border flex flex-col gap-1 ${isRes ? 'opacity-50 grayscale' : color}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs">{label}</span>
                        <span className="text-xs opacity-75 truncate">{a.server_name || 'Genel'}</span>
                        {!isRes && <AlertActions alertId={a.id} />}
                      </div>
                      <div className="text-sm">{a.message}</div>
                      <div className="text-[10px] opacity-60" title={new Date(a.created_at).toLocaleString('tr-TR')}>
                        {timeAgo(a.created_at)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 1.5 Add Server Guide & Form */}
      <HowToAddServerGuide />
      <AddServerForm highestOrder={highestOrder} />
      
    </div>
  );
}
