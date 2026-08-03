import Link from "next/link";

export default function Dashboard() {
  return (
    <>
      {/* SideNavBar */}
      <aside className="hidden md:flex flex-col bg-surface-container-lowest/80 backdrop-blur-md fixed left-0 top-0 h-screen w-[280px] border-r border-white/5 py-lg px-md gap-md z-40">
        <div className="flex items-center gap-sm mb-lg">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0">
            <img alt="Flow AI Terminal" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsSAp1so33UMczB0tlqeiUaiqbaFrMDkEKmDAkJvAX4S9pcqDN3xBuiX7TLzUzH3hdVAzMweK7DsPR0k5zk7xQ1H7UWacy1hVroPObcaHrtwRuza5AIaLheW4T3GOJJrl4baciXJwkvCRrO07k1APMj99ZiQeL3AzlwIVPLMYwl6wmMaMQNVyfXhe1u_smL2UlNMMaP71kq25lMTHQ8r9frQuK84KAqbihYz1kuoNGNIFLs7fegTcBNzH92s_RstdapE1ARYW7prc" />
          </div>
          <div className="flex flex-col">
            <span className="font-headline-lg text-primary-fixed-dim text-[24px] font-semibold md:text-[32px] tracking-tighter italic">AI-ESNAF</span>
            <span className="font-data-mono text-data-mono text-on-surface-variant uppercase text-[10px]">Command Center</span>
          </div>
        </div>
        <button className="bg-gradient-to-r from-[#00a2ff] to-[#4edea3] text-[#001d34] font-label-sm text-label-sm uppercase py-sm px-md rounded-lg mb-md hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(0,162,255,0.3)] transition-all duration-300 flex items-center justify-center gap-xs">
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
          New Analysis
        </button>
        <nav className="flex-1 flex flex-col gap-xs overflow-y-auto pr-sm">
          <Link className="relative flex items-center gap-sm text-primary-fixed-dim bg-gradient-to-r from-primary/10 to-transparent py-sm px-sm rounded-r-lg group" href="/">
            <div className="absolute left-[-24px] h-8 w-1 bg-primary shadow-[0_0_15px_rgba(0,162,255,0.8)] rounded-r-full"></div>
            <span className="material-symbols-outlined group-hover:text-primary transition-colors">dashboard</span>
            <span className="font-data-mono text-data-mono uppercase">Dashboard</span>
          </Link>
          <Link className="sidebar-item-hover flex items-center gap-sm text-on-surface-variant hover:text-on-surface py-sm px-sm rounded-lg group transition-colors" href="/accounting">
            <span className="material-symbols-outlined group-hover:text-primary-fixed-dim transition-colors">account_balance_wallet</span>
            <span className="font-data-mono text-data-mono uppercase">AI Accounting</span>
          </Link>
          <Link className="sidebar-item-hover flex items-center gap-sm text-on-surface-variant hover:text-on-surface py-sm px-sm rounded-lg group transition-colors" href="/bot-management">
            <span className="material-symbols-outlined group-hover:text-tertiary-fixed-dim transition-colors">smart_toy</span>
            <span className="font-data-mono text-data-mono uppercase">Bot Management</span>
          </Link>
          <Link className="sidebar-item-hover flex items-center gap-sm text-on-surface-variant hover:text-on-surface py-sm px-sm rounded-lg group transition-colors" href="/social-media">
            <span className="material-symbols-outlined group-hover:text-secondary-fixed-dim transition-colors">share</span>
            <span className="font-data-mono text-data-mono uppercase">Social Media</span>
          </Link>
          <Link className="sidebar-item-hover flex items-center gap-sm text-on-surface-variant hover:text-on-surface py-sm px-sm rounded-lg group transition-colors" href="/appointments">
            <span className="material-symbols-outlined group-hover:text-primary-fixed-dim transition-colors">calendar_today</span>
            <span className="font-data-mono text-data-mono uppercase">Appointments</span>
          </Link>
          <Link className="sidebar-item-hover flex items-center gap-sm text-on-surface-variant hover:text-on-surface py-sm px-sm rounded-lg group transition-colors" href="#">
            <span className="material-symbols-outlined group-hover:text-primary-fixed-dim transition-colors">settings</span>
            <span className="font-data-mono text-data-mono uppercase">Settings</span>
          </Link>
        </nav>
        <div className="mt-auto pt-md border-t border-white/5 flex flex-col gap-xs">
          <Link className="sidebar-item-hover flex items-center gap-sm text-on-surface-variant hover:text-on-surface py-sm px-sm rounded-lg group transition-colors" href="#">
            <span className="material-symbols-outlined group-hover:text-primary-fixed-dim transition-colors">help</span>
            <span className="font-data-mono text-data-mono uppercase">Help</span>
          </Link>
          <a className="sidebar-item-hover flex items-center gap-sm text-on-surface-variant hover:text-on-surface py-sm px-sm rounded-lg group transition-colors" href="#">
            <span className="material-symbols-outlined group-hover:text-primary-fixed-dim transition-colors">contact_support</span>
            <span className="font-data-mono text-data-mono uppercase">Support</span>
          </a>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:ml-[280px] h-screen overflow-hidden">
        {/* TopNavBar */}
        <header className="bg-surface/40 backdrop-blur-[20px] shadow-sm flex justify-between items-center w-full px-margin-desktop h-16 docked full-width top-0 sticky z-50 border-b border-white/5">
          <div className="flex items-center gap-md">
            {/* Mobile Menu Toggle (Visible only on mobile) */}
            <button className="md:hidden text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="md:hidden font-headline-lg-mobile text-[24px] font-semibold text-primary tracking-tighter italic">FLOW</div>
            {/* Search Bar */}
            <div className="hidden md:flex items-center bg-surface-container/50 border border-white/10 rounded-full px-sm py-xs focus-within:border-primary-fixed-dim focus-within:shadow-[0_0_10px_rgba(153,203,255,0.2)] transition-all w-64">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px] mr-xs">search</span>
              <input className="bg-transparent border-none text-data-mono font-data-mono text-on-surface focus:ring-0 w-full placeholder:text-on-surface-variant/50 text-sm outline-none" placeholder="Search insights..." type="text" />
            </div>
          </div>
          <div className="flex items-center gap-md">
            <button className="text-on-surface-variant hover:text-primary transition-all duration-300 relative group">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full shadow-[0_0_5px_#ebb2ff]"></span>
            </button>
            <button className="text-on-surface-variant hover:text-error transition-all duration-300">
              <span className="material-symbols-outlined">logout</span>
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
              <img alt="User Profile Avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8mjwcET0fw2jjuiL4WwhA_OVsuungFpHlVZtBTQp6YF46Rf9tE1Gty6isKLnOGeWfyjjI2-HploqdjUtth4gSMxT3fh-CmKh9NEtvuhWaHQcJboB6D7FGXKS1gD9K_2K6yHtNGxElkj5RypPd68Zq0fkDfrHLNoJYTdDeHNy9PdMw1K2x1boUckRNxRLkVFh7oYLfd7Mn6DMUGO_LfZY037-JVwFH7FG5cg1nD6cD0Dpx6H1bbEw4Pv9DODJeYepxL_oDdcNGZmc" />
            </div>
          </div>
        </header>
        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop space-y-xl">
          {/* Page Header */}
          <div className="flex justify-between items-end">
            <div>
              <h1 className="font-display-lg text-[48px] font-bold text-on-surface tracking-tight">AI-Esnaf Dashboard Command Center</h1>
              <p className="font-data-mono text-data-mono text-on-surface-variant mt-2 uppercase tracking-wider">System Operational | Data Flow Nominal</p>
            </div>
            <div className="hidden md:flex gap-sm">
              <button className="glass-panel text-on-surface px-md py-sm rounded-lg font-label-sm text-[12px] font-bold uppercase hover:bg-white/5 transition-colors border-outline-variant">
                Export Report
              </button>
            </div>
          </div>
          {/* Metrics Bento Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {/* Metric 1: Revenue */}
            <div className="glass-panel rounded-xl p-md flex flex-col justify-between relative overflow-hidden neon-glow-primary group">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start mb-lg">
                <span className="font-data-mono text-[14px] font-medium text-on-surface-variant uppercase">Total AI Revenue</span>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[18px]">account_balance_wallet</span>
                </div>
              </div>
              <div>
                <div className="font-display-lg text-[40px] leading-[48px] font-bold text-primary-fixed-dim tracking-tight">₺142,500</div>
                <div className="flex items-center gap-xs mt-xs text-tertiary-fixed-dim">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  <span className="font-data-mono text-[12px]">+12.4% vs last week</span>
                </div>
              </div>
            </div>
            {/* Metric 2: Social Reach */}
            <div className="glass-panel rounded-xl p-md flex flex-col justify-between relative overflow-hidden hover:shadow-[0_0_15px_rgba(235,178,255,0.3)] hover:border-secondary transition-all duration-300 group">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-secondary to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start mb-lg">
                <span className="font-data-mono text-[14px] font-medium text-on-surface-variant uppercase">Social Media Reach</span>
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary text-[18px]">campaign</span>
                </div>
              </div>
              <div>
                <div className="font-display-lg text-[40px] leading-[48px] font-bold text-secondary-fixed-dim tracking-tight">84.2K</div>
                <div className="flex items-center gap-xs mt-xs text-tertiary-fixed-dim">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  <span className="font-data-mono text-[12px]">+5.1% vs last week</span>
                </div>
              </div>
            </div>
            {/* Metric 3: Bot Activity */}
            <div className="glass-panel rounded-xl p-md flex flex-col justify-between relative overflow-hidden hover:shadow-[0_0_15px_rgba(78,222,163,0.3)] hover:border-tertiary transition-all duration-300 group">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-tertiary to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start mb-lg">
                <span className="font-data-mono text-[14px] font-medium text-on-surface-variant uppercase">Bot Activity (Interactions)</span>
                <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">smart_toy</span>
                </div>
              </div>
              <div>
                <div className="font-display-lg text-[40px] leading-[48px] font-bold text-tertiary-fixed-dim tracking-tight">1,204</div>
                <div className="flex items-center gap-xs mt-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">trending_flat</span>
                  <span className="font-data-mono text-[12px]">Steady volume</span>
                </div>
              </div>
            </div>
          </section>
          {/* Lower Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
            {/* Quick Actions (Spans 1 col) */}
            <section className="glass-panel rounded-xl p-md flex flex-col gap-md">
              <div className="border-b border-white/5 pb-sm">
                <h2 className="font-headline-lg text-[24px] md:text-[32px] font-semibold text-on-surface">Quick Actions</h2>
              </div>
              <div className="flex flex-col gap-sm">
                <button className="flex items-center gap-md p-sm rounded-lg border border-white/5 hover:border-primary/50 bg-white/[0.02] hover:bg-white/5 transition-all group">
                  <div className="w-10 h-10 rounded bg-surface border border-white/10 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                    <span className="material-symbols-outlined text-primary">receipt_long</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-body-md text-on-surface font-semibold">Upload Receipt</span>
                    <span className="font-data-mono text-[10px] text-on-surface-variant uppercase">Auto-categorize via AI</span>
                  </div>
                  <span className="material-symbols-outlined ml-auto text-on-surface-variant group-hover:text-primary transition-colors">chevron_right</span>
                </button>
                <button className="flex items-center gap-md p-sm rounded-lg border border-white/5 hover:border-tertiary/50 bg-white/[0.02] hover:bg-white/5 transition-all group">
                  <div className="w-10 h-10 rounded bg-surface border border-white/10 flex items-center justify-center group-hover:border-tertiary/50 transition-colors">
                    <span className="material-symbols-outlined text-tertiary">memory</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-body-md text-on-surface font-semibold">Check Bot Status</span>
                    <span className="font-data-mono text-[10px] text-on-surface-variant uppercase">Review active instances</span>
                  </div>
                  <span className="material-symbols-outlined ml-auto text-on-surface-variant group-hover:text-tertiary transition-colors">chevron_right</span>
                </button>
                <button className="flex items-center gap-md p-sm rounded-lg border border-white/5 hover:border-secondary/50 bg-white/[0.02] hover:bg-white/5 transition-all group">
                  <div className="w-10 h-10 rounded bg-surface border border-white/10 flex items-center justify-center group-hover:border-secondary/50 transition-colors">
                    <span className="material-symbols-outlined text-secondary">sync</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-body-md text-on-surface font-semibold">Sync Social Accounts</span>
                    <span className="font-data-mono text-[10px] text-on-surface-variant uppercase">Update data streams</span>
                  </div>
                  <span className="material-symbols-outlined ml-auto text-on-surface-variant group-hover:text-secondary transition-colors">chevron_right</span>
                </button>
              </div>
            </section>
            {/* Recent Activity Feed (Spans 2 cols) */}
            <section className="glass-panel rounded-xl p-md lg:col-span-2 flex flex-col">
              <div className="border-b border-white/5 pb-sm flex justify-between items-center mb-md">
                <h2 className="font-headline-lg text-[24px] md:text-[32px] font-semibold text-on-surface">Live Data Stream</h2>
                <span className="font-data-mono text-[12px] text-primary flex items-center gap-xs">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  REAL-TIME
                </span>
              </div>
              <div className="flex-1 overflow-y-auto pr-sm space-y-sm">
                <div className="flex gap-md p-sm hover:bg-white/[0.02] rounded-lg transition-colors border-l-2 border-primary/50">
                  <div className="mt-1">
                    <span className="material-symbols-outlined text-primary text-[20px]">receipt</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-body-md text-[16px] text-on-surface">Invoice #INV-2401 processed automatically.</p>
                      <span className="font-data-mono text-[10px] text-on-surface-variant">JUST NOW</span>
                    </div>
                    <p className="font-data-mono text-[12px] text-on-surface-variant mt-1">Categorized under "Software Subscriptions" (Confidence: 98%)</p>
                  </div>
                </div>
                <div className="flex gap-md p-sm hover:bg-white/[0.02] rounded-lg transition-colors border-l-2 border-tertiary/50">
                  <div className="mt-1">
                    <span className="material-symbols-outlined text-tertiary text-[20px]">forum</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-body-md text-[16px] text-on-surface">Customer Inquiry handled by Support Bot.</p>
                      <span className="font-data-mono text-[10px] text-on-surface-variant">2M AGO</span>
                    </div>
                    <p className="font-data-mono text-[12px] text-on-surface-variant mt-1">Resolved pricing question via Instagram DM. Sentiment: Positive.</p>
                  </div>
                </div>
                <div className="flex gap-md p-sm hover:bg-white/[0.02] rounded-lg transition-colors border-l-2 border-secondary/50">
                  <div className="mt-1">
                    <span className="material-symbols-outlined text-secondary text-[20px]">thumb_up</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-body-md text-[16px] text-on-surface">New Campaign reached 10k impressions.</p>
                      <span className="font-data-mono text-[10px] text-on-surface-variant">15M AGO</span>
                    </div>
                    <p className="font-data-mono text-[12px] text-on-surface-variant mt-1">Automated ad spend adjusted for optimal ROI on Twitter.</p>
                  </div>
                </div>
                <div className="flex gap-md p-sm hover:bg-white/[0.02] rounded-lg transition-colors border-l-2 border-error/50">
                  <div className="mt-1">
                    <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-body-md text-[16px] text-on-surface">Failed to sync bank feed (Ziraat Bankası).</p>
                      <span className="font-data-mono text-[10px] text-on-surface-variant">1H AGO</span>
                    </div>
                    <p className="font-data-mono text-[12px] text-error mt-1">API timeout. Retrying automatically in 15 mins...</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <div className="h-lg w-full"></div>
        </div>
      </main>
    </>
  );
}

