'use client';

export function MetricsChart({ metrics, serverName }: { metrics: any[], serverName?: string }) {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-card border border-border p-6 rounded-2xl h-64 flex items-center justify-center text-text-muted text-sm">
        Henüz ölçüm yok. waha-health 5 dakikada bir ölçüm yazar.
      </div>
    );
  }

  // Downsample to ~200 points max
  const targetPoints = 200;
  const step = Math.ceil(metrics.length / targetPoints);
  const data = metrics.filter((_, i) => i % step === 0);

  // Layout params
  const width = 600;
  const height = 150;
  const paddingX = 40;
  const paddingY = 20;

  // Chart 1: Sessions
  const maxSessions = Math.max(1, ...data.map(d => Math.max(d.sessions_assigned || 0, d.sessions_working || 0)));
  const getX = (i: number) => paddingX + (i / Math.max(1, data.length - 1)) * (width - paddingX * 2);
  const getY = (val: number, max: number) => height - paddingY - (val / max) * (height - paddingY * 2);

  const assignedPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.sessions_assigned || 0, maxSessions)}`).join(' ');
  const workingPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.sessions_working || 0, maxSessions)}`).join(' ');

  // Chart 2: Latency
  const maxLatency = Math.max(10, ...data.map(d => d.api_latency_ms || 0));
  const latencyPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.api_latency_ms || 0, maxLatency)}`).join(' ');

  return (
    <div className="bg-card border border-border p-6 rounded-2xl mb-6">
      <h3 className="font-semibold mb-4 text-sm">{serverName ? `${serverName} Ölçümleri` : 'Genel Ölçümler'}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex gap-4 text-xs mb-2">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary"></span> Atanan</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-success"></span> Çalışan</span>
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-background/50 rounded border border-border">
            <path d={assignedPath} fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinejoin="round" />
            <path d={workingPath} fill="none" stroke="currentColor" className="text-success" strokeWidth="2" strokeLinejoin="round" />
            
            {/* Axis labels (min/max) */}
            <text x="5" y={paddingY + 5} className="text-[10px] fill-text-muted">{maxSessions}</text>
            <text x="5" y={height - paddingY} className="text-[10px] fill-text-muted">0</text>
            
            {/* Single point fallback */}
            {data.length === 1 && (
              <>
                <circle cx={getX(0)} cy={getY(data[0].sessions_assigned || 0, maxSessions)} r="3" className="fill-primary" />
                <circle cx={getX(0)} cy={getY(data[0].sessions_working || 0, maxSessions)} r="3" className="fill-success" />
              </>
            )}
          </svg>
        </div>

        <div>
          <div className="flex gap-4 text-xs mb-2 items-center">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 text-warning bg-warning"></span> Gecikme (ms)</span>
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-background/50 rounded border border-border">
            <path d={latencyPath} fill="none" stroke="currentColor" className="text-warning" strokeWidth="2" strokeLinejoin="round" />
            
            {data.map((d, i) => !d.api_ok && (
              <circle key={i} cx={getX(i)} cy={getY(d.api_latency_ms || 0, maxLatency)} r="3" className="fill-danger" />
            ))}

            {/* Axis labels (min/max) */}
            <text x="5" y={paddingY + 5} className="text-[10px] fill-text-muted">{maxLatency}</text>
            <text x="5" y={height - paddingY} className="text-[10px] fill-text-muted">0</text>
            
            {/* Single point fallback */}
            {data.length === 1 && (
              <circle cx={getX(0)} cy={getY(data[0].api_latency_ms || 0, maxLatency)} r="3" className="fill-warning" />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
