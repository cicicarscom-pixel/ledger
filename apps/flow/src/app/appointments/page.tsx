import Link from "next/link";
import { getAppointments } from "@/actions/appointments";

export default async function Appointments() {
  const appointments = await getAppointments() || [];

  const morningSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
  const noonSlots = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
  const eveningSlots = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];

  // Check if a time slot has any appointment that covers it
  // Simplification for the UI: just checking exact start time matches.
  const isBooked = (time: string) => {
    return appointments.some((a: any) => a.time_start?.includes(time));
  };

  const getSlotClass = (time: string) => {
    return isBooked(time) 
      ? 'heatmap-slot slot-booked h-12 w-16 rounded-md flex items-center justify-center text-xs font-data-mono text-red-400/50 cursor-not-allowed'
      : 'heatmap-slot slot-available h-12 w-16 rounded-md flex items-center justify-center text-xs font-data-mono text-tertiary/80 cursor-pointer';
  };

  const activeAppointments = appointments.filter((a: any) => a.status !== 'cancelled' && a.status !== 'completed');

  return (
    <div className="text-on-background font-body-md tech-grid min-h-screen overflow-x-hidden selection:bg-primary/30 selection:text-primary">
      {/* SideNavBar */}
      <nav className="fixed left-0 h-screen w-[280px] bg-surface/40 backdrop-blur-xl border-r border-white/5 flex flex-col py-md px-sm z-40 hidden md:flex">
        {/* Brand Header */}
        <div className="mb-xl px-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary-container p-[1px]">
            <div className="w-full h-full bg-surface-container-lowest rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "\"FILL\" 1" }}>terminal</span>
            </div>
          </div>
          <div>
            <h1 className="font-display-lg text-[32px] font-semibold text-primary tracking-tighter uppercase leading-none">NEO-FINTECH</h1>
            <p className="font-data-mono text-[14px] font-medium text-on-surface-variant text-[10px]">Operational Center</p>
          </div>
        </div>
        
        {/* Navigation Links */}
        <div className="flex flex-col gap-2 flex-grow">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant font-medium hover:text-primary hover:bg-white/5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "\"FILL\" 0" }}>dashboard</span>
            Dashboard
          </Link>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-transparent text-primary font-medium hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-l-2 border-primary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "\"FILL\" 1" }}>calendar_month</span>
            Randevu Yönetimi
          </a>
          <Link href="/accounting" className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant font-medium hover:text-primary hover:bg-white/5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "\"FILL\" 0" }}>account_balance_wallet</span>
            AI Muhasebe
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="md:ml-[280px] p-margin-mobile md:p-margin-desktop flex flex-col h-screen overflow-y-auto custom-scrollbar relative z-10">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-lg">
          <div>
            <h2 className="font-display-lg text-[40px] text-on-surface font-bold leading-tight">Takvim & Kapasite</h2>
            <p className="font-data-mono text-[14px] text-on-surface-variant uppercase tracking-widest mt-1">Gelişmiş Isı Haritası</p>
          </div>
          <div className="flex gap-4">
            <button className="h-10 px-4 rounded-lg bg-surface-container-high border border-white/10 text-on-surface font-label-sm text-[12px] font-bold flex items-center gap-2 hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Filtrele
            </button>
            <button className="h-10 px-6 rounded-lg bg-primary text-black font-label-sm text-[12px] font-bold hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_15px_rgba(0,162,255,0.4)] transition-all">
              + Yeni Randevu
            </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-md flex-grow">
          
          {/* Main Heatmap Area (Span 2) */}
          <div className="xl:col-span-2 flex flex-col gap-md">
            
            {/* Horizontal Calendar Strip */}
            <div className="glass-panel rounded-xl p-2 flex gap-2 overflow-x-auto custom-scrollbar border-l-[3px] border-l-primary">
              <div className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                <span className="font-data-mono text-[10px] text-on-surface-variant">PZT</span>
                <span className="font-display-lg text-[20px] text-on-surface font-bold">12</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] bg-primary/20 border border-primary/50 text-primary cursor-pointer shadow-[0_0_10px_rgba(0,162,255,0.2)]">
                <span className="font-data-mono text-[10px]">SAL</span>
                <span className="font-display-lg text-[20px] font-bold">13</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                <span className="font-data-mono text-[10px] text-on-surface-variant">ÇAR</span>
                <span className="font-display-lg text-[20px] text-on-surface font-bold">14</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                <span className="font-data-mono text-[10px] text-on-surface-variant">PER</span>
                <span className="font-display-lg text-[20px] text-on-surface font-bold">15</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                <span className="font-data-mono text-[10px] text-on-surface-variant">CUM</span>
                <span className="font-display-lg text-[20px] text-on-surface font-bold">16</span>
              </div>
            </div>

            {/* Heatmap Matrix */}
            <div className="glass-panel rounded-xl flex-grow flex flex-col relative overflow-hidden">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="font-data-mono text-[14px] font-medium text-on-surface uppercase tracking-wider">Kapasite Matrisi</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-tertiary/50 border border-tertiary"></div>
                    <span className="font-data-mono text-[10px] text-on-surface-variant">Müsait</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500/50 border border-red-500"></div>
                    <span className="font-data-mono text-[10px] text-on-surface-variant">Dolu</span>
                  </div>
                </div>
              </div>

              {/* Rows */}
              <div className="flex flex-col p-4 gap-6 overflow-x-auto custom-scrollbar">
                
                {/* Row 1: Sabah */}
                <div className="flex">
                  <div className="w-20 shrink-0 flex items-center border-r border-white/10 pr-4">
                    <span className="font-data-mono text-[14px] font-medium text-on-surface-variant uppercase">Sabah</span>
                  </div>
                  <div className="flex flex-grow ml-4 gap-2 min-w-max">
                    {morningSlots.map(time => (
                      <div key={time} className={getSlotClass(time)}>{time}</div>
                    ))}
                  </div>
                </div>

                {/* Row 2: Öğle */}
                <div className="flex">
                  <div className="w-20 shrink-0 flex items-center border-r border-white/10 pr-4">
                    <span className="font-data-mono text-[14px] font-medium text-on-surface-variant uppercase">Öğle</span>
                  </div>
                  <div className="flex flex-grow ml-4 gap-2 min-w-max">
                    {noonSlots.map(time => (
                      <div key={time} className={getSlotClass(time)}>{time}</div>
                    ))}
                  </div>
                </div>

                {/* Row 3: Akşam */}
                <div className="flex">
                  <div className="w-20 shrink-0 flex items-center border-r border-white/10 pr-4">
                    <span className="font-data-mono text-[14px] font-medium text-on-surface-variant uppercase">Akşam</span>
                  </div>
                  <div className="flex flex-grow ml-4 gap-2 min-w-max">
                    {eveningSlots.map(time => (
                      <div key={time} className={getSlotClass(time)}>{time}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* List Sidebar Area (Span 1) */}
          <div className="xl:col-span-1">
            <div className="glass-panel rounded-xl flex flex-col h-full border-t border-secondary/30 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="font-data-mono text-[14px] font-medium text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">list_alt</span>
                  Yaklaşan Randevular
                </h3>
                <span className="bg-secondary/20 text-secondary font-label-sm text-[12px] font-bold px-2 py-0.5 rounded">{activeAppointments.length} Aktif</span>
              </div>
              
              <div className="p-2 flex flex-col gap-2 overflow-y-auto h-[400px] xl:h-auto custom-scrollbar">
                
                {activeAppointments.map((app: any, idx: number) => {
                  const isOngoing = app.status === 'ongoing' || idx === 0; // First item visually ongoing for demo
                  
                  return (
                  <div key={app.id || idx} className={`p-3 rounded-lg border transition-colors group ${isOngoing ? 'bg-primary/5 border-primary/30 relative overflow-hidden' : 'bg-surface/50 border-white/5 hover:border-white/10'}`}>
                    {isOngoing && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                    
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <div className="flex gap-3 items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isOngoing ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/5 border-white/10 text-on-surface'}`}>
                          {isOngoing ? <span className="material-symbols-outlined text-[16px]">person</span> : <span className="font-data-mono text-xs text-on-surface">{app.customer_name?.substring(0,2).toUpperCase() || 'AA'}</span>}
                        </div>
                        <div>
                          <p className="font-headline-lg-mobile text-[16px] text-on-surface leading-tight">{app.customer_name || 'İsimsiz Müşteri'}</p>
                          <p className={`font-data-mono text-[11px] ${isOngoing ? 'text-primary' : 'text-on-surface-variant'}`}>{isOngoing ? 'Devam Ediyor' : app.service_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-data-mono text-[14px] font-medium text-primary font-bold">{app.time_start}</p>
                        <p className="font-data-mono text-[10px] text-on-surface-variant uppercase">Randevu</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5 pl-2">
                      <span className="text-xs font-body-md text-[16px] text-on-surface-variant bg-white/5 px-2 py-1 rounded">{app.service_id || 'Hizmet'}</span>
                      <button className="text-primary hover:text-primary-container text-xs font-data-mono opacity-0 group-hover:opacity-100 transition-opacity">Yönet</button>
                    </div>
                  </div>
                  )
                })}

                {activeAppointments.length === 0 && (
                  <div className="text-center p-4 text-on-surface-variant font-body-md text-sm">
                    Bekleyen randevu bulunmuyor.
                  </div>
                )}
                
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
