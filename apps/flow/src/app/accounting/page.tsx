import Link from "next/link";

export default function Accounting() {
  const monthName = new Date().toLocaleString('tr-TR', { month: 'long' });
  const inc = 142500;
  const exp = 48200;
  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  return (
    <div
      className="min-h-screen flex font-body-md overflow-x-hidden w-full relative"
      style={{
        backgroundColor: "#000000",
        backgroundImage:
          "radial-gradient(circle at top right, rgba(0,162,255,0.1) 0%, transparent 40%), radial-gradient(circle at bottom left, rgba(182,0,248,0.1) 0%, transparent 40%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Side Navigation */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[280px] bg-black/90 backdrop-blur-md border-r border-white/5 py-lg px-md gap-md z-40">
        <div className="flex items-center gap-sm mb-lg">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <span className="material-symbols-outlined text-primary">
              terminal
            </span>
          </div>
          <div>
            <h1 className="font-headline-lg text-primary-fixed-dim text-[20px] leading-tight">
              AI-ESNAF
            </h1>
            <p className="font-label-sm text-on-surface-variant text-[10px]">
              Command Center
            </p>
          </div>
        </div>

        <button className="w-full bg-gradient-to-r from-primary-container to-tertiary-container hover:from-primary hover:to-tertiary text-on-primary-container font-label-sm py-sm rounded-lg flex items-center justify-center gap-xs transition-all duration-300 scale-102 shadow-[0_0_15px_rgba(0,162,255,0.2)] mb-md">
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Analysis
        </button>

        <div className="flex-1 flex flex-col gap-xs">
          <Link
            href="/"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors py-sm px-sm rounded-md scale-102 hover:shadow-primary/20"
          >
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </Link>
          <a
            href="#"
            className="relative flex items-center gap-sm text-primary-fixed-dim before:absolute before:left-0 before:h-8 before:w-1 before:bg-primary before:shadow-[0_0_15px_rgba(0,162,255,0.8)] bg-gradient-to-r from-primary/20 to-transparent py-sm px-sm rounded-md scale-102 hover:shadow-primary/20"
          >
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              account_balance_wallet
            </span>
            AI Accounting
          </a>
          <a
            href="#"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors py-sm px-sm rounded-md scale-102 hover:shadow-primary/20"
          >
            <span className="material-symbols-outlined">smart_toy</span>
            Bot Management
          </a>
          <a
            href="#"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors py-sm px-sm rounded-md scale-102 hover:shadow-primary/20"
          >
            <span className="material-symbols-outlined">share</span>
            Social Media
          </a>
          <a
            href="#"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors py-sm px-sm rounded-md scale-102 hover:shadow-primary/20"
          >
            <span className="material-symbols-outlined">calendar_today</span>
            Appointments
          </a>
          <a
            href="#"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors py-sm px-sm rounded-md scale-102 hover:shadow-primary/20 mt-auto"
          >
            <span className="material-symbols-outlined">settings</span>
            Settings
          </a>
        </div>

        <div className="border-t border-white/5 pt-sm mt-sm flex flex-col gap-xs">
          <a
            href="#"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors py-xs px-sm rounded-md"
          >
            <span className="material-symbols-outlined text-[18px]">help</span>
            Help
          </a>
          <a
            href="#"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors py-xs px-sm rounded-md"
          >
            <span className="material-symbols-outlined text-[18px]">
              contact_support
            </span>
            Support
          </a>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[280px] flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 px-margin-desktop flex items-center justify-between glass-panel sticky top-0 z-30 border-b border-white/10 bg-surface/80 backdrop-blur-xl">
          <div className="flex items-center gap-sm md:hidden">
            <button className="text-on-surface">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
          <div className="flex items-center gap-sm">
            <span
              className="material-symbols-outlined text-primary text-[28px]"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              account_balance_wallet
            </span>
            <div className="font-display-lg text-primary text-xl font-bold tracking-wide">
              Flow AI Muhasebe
            </div>
          </div>
          <div className="flex items-center gap-sm">
            <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-colors relative">
              <span className="material-symbols-outlined text-on-surface-variant">
                notifications
              </span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full animate-pulse"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary p-[2px]">
              <div className="w-full h-full bg-surface rounded-full flex items-center justify-center border border-white/20">
                <span className="font-data-mono text-[12px] font-bold text-on-surface">
                  ES
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-margin-mobile md:p-margin-desktop flex flex-col gap-lg max-w-5xl mx-auto w-full mt-lg">
          {/* Header Section */}
          <section className="relative glass-panel rounded-2xl p-lg overflow-hidden border border-white/10">
            {/* Abstract Wave Background */}
            <div
              className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBovIMIsOMjXtGSBgitr6aMODGgRPm4-uMm1FWuh2sAI1THgTx_EYvgvUIlJ4PegsDDozcR3wH7qDpl_BLZzDlNd3mXhlT56CKHo21RFtgAA3njhvHCD4QnUSYZX8Yn6W8Ul_bodUN_zmsbWTD49-eKUIRqVaKniDZgN5nE9mWbpG_1QfLshefxRZP-Xx5wsyVWkANsmVIrqqygZd66genjnnn1r5ebus5OiuWH6t4Qrv5uEX5TA0g9YuDzxH86llVLAPTFHWcFazE")',
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
            <div className="relative z-10">
              <h1 className="font-display-lg text-primary neon-text-primary text-[48px] font-bold">
                Finansal Özet
              </h1>
              <p className="font-body-md text-on-surface-variant mt-xs">
                Bu Ayki Performans ({monthName})
              </p>
            </div>
          </section>

          {/* Data Cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {/* Income Card */}
            <div className="glass-panel rounded-xl p-md flex flex-col gap-sm relative overflow-hidden group hover:glass-panel-active transition-all duration-300">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
              <span className="font-label-sm text-on-surface-variant tracking-widest uppercase">
                BU AY GELİR
              </span>
              <div className="flex items-baseline gap-xs">
                <span className="font-display-lg text-on-surface text-[48px] font-bold">
                  {formatCurrency(inc).split(",")[0]}
                </span>
                <span className="font-headline-lg text-on-surface-variant text-[32px]">
                  ,{formatCurrency(inc).split(",")[1]} ₺
                </span>
              </div>
            </div>

            {/* Expense Card */}
            <div className="glass-panel rounded-xl p-md flex flex-col gap-sm relative overflow-hidden group transition-all duration-300 border border-secondary/30 hover:border-secondary hover:shadow-[0_0_15px_rgba(235,178,255,0.2)]">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/20 transition-all"></div>
              <span className="font-label-sm text-on-surface-variant tracking-widest uppercase">
                BU AY GİDER
              </span>
              <div className="flex items-baseline gap-xs">
                <span className="font-display-lg text-on-surface text-[48px] font-bold">
                  {formatCurrency(exp).split(",")[0]}
                </span>
                <span className="font-headline-lg text-on-surface-variant text-[32px]">
                  ,{formatCurrency(exp).split(",")[1]} ₺
                </span>
              </div>
              {/* Settings FAB on card */}
              <button className="absolute right-4 bottom-4 w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-colors z-10">
                <span className="material-symbols-outlined text-on-surface-variant">
                  settings
                </span>
              </button>
            </div>
          </section>

          {/* Quick Action Bar */}
          <section className="grid grid-cols-2 gap-md">
            <button className="glass-panel rounded-lg py-sm px-md flex items-center justify-center gap-sm hover:border-tertiary-fixed hover:bg-tertiary-fixed/10 transition-all duration-300 group">
              <span className="material-symbols-outlined text-tertiary-fixed group-hover:scale-110 transition-transform">
                add_circle
              </span>
              <span className="font-label-sm text-tertiary-fixed tracking-wider uppercase text-[12px] font-bold">
                GELİR GİR
              </span>
            </button>
            <button className="glass-panel rounded-lg py-sm px-md flex items-center justify-center gap-sm hover:border-secondary-fixed hover:bg-secondary-fixed/10 transition-all duration-300 group">
              <span className="material-symbols-outlined text-secondary-fixed group-hover:scale-110 transition-transform">
                do_not_disturb_on
              </span>
              <span className="font-label-sm text-secondary-fixed tracking-wider uppercase text-[12px] font-bold">
                GİDER GİR
              </span>
            </button>
          </section>

          {/* Management Shortcuts */}
          <section className="flex flex-col gap-sm">
            <button className="w-full bg-[#003659]/60 border border-primary/30 hover:border-primary hover:bg-[#003659]/80 backdrop-blur-md rounded-lg py-md px-md flex items-center justify-center gap-sm transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
              <span className="material-symbols-outlined text-tertiary-fixed">
                bug_report
              </span>
              <span className="font-label-sm text-tertiary-fixed tracking-wider uppercase text-[12px] font-bold">
                [DEV] TEST BİLDİRİMİ GÖNDER
              </span>
            </button>
            <button className="w-full glass-panel hover:bg-white/10 rounded-lg py-md px-md flex items-center justify-center gap-sm transition-all duration-300">
              <span className="material-symbols-outlined text-primary-fixed-dim">
                history
              </span>
              <span className="font-label-sm text-primary-fixed-dim tracking-wider uppercase text-[12px] font-bold">
                İŞLETMEM (GEÇMİŞ DÖNEMLER)
              </span>
            </button>
            <button className="w-full glass-panel hover:bg-white/10 rounded-lg py-md px-md flex items-center justify-center gap-sm transition-all duration-300">
              <span className="material-symbols-outlined text-tertiary">
                calendar_month
              </span>
              <span className="font-label-sm text-tertiary tracking-wider uppercase text-[12px] font-bold">
                ÖDEME TAKVİMİ
              </span>
            </button>
            <button className="w-full glass-panel hover:bg-white/10 rounded-lg py-md px-md flex items-center justify-center gap-sm transition-all duration-300">
              <span className="material-symbols-outlined text-tertiary-fixed-dim">
                auto_awesome
              </span>
              <span className="font-label-sm text-tertiary-fixed-dim tracking-wider uppercase text-[12px] font-bold">
                AI ASİSTAN
              </span>
            </button>
          </section>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full glass-panel border-t border-white/10 z-50 px-margin-mobile pb-6 pt-2">
        <div className="flex justify-between items-center relative">
          <a
            href="#"
            className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary p-2"
          >
            <span className="material-symbols-outlined">memory</span>
            <span className="text-[10px] font-label-sm">Ai Asistan</span>
          </a>
          <a
            href="#"
            className="flex flex-col items-center gap-1 text-primary p-2"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              account_balance_wallet
            </span>
            <span className="text-[10px] font-label-sm">Ai Muhasebe</span>
          </a>
          {/* Center Home FAB */}
          <div className="relative -top-8 flex flex-col items-center">
            <Link
              href="/"
              className="w-14 h-14 rounded-full bg-black border-2 border-secondary flex items-center justify-center shadow-[0_0_15px_rgba(235,178,255,0.4)] z-10"
            >
              <span
                className="material-symbols-outlined text-on-surface"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                home
              </span>
            </Link>
            <span className="text-[10px] font-label-sm text-primary mt-1">
              Anasayfa
            </span>
          </div>
          <a
            href="#"
            className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary p-2"
          >
            <span className="material-symbols-outlined">share</span>
            <span className="text-[10px] font-label-sm">Sosyal Medya</span>
          </a>
          <a
            href="#"
            className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary p-2"
          >
            <span className="material-symbols-outlined">bar_chart</span>
            <span className="text-[10px] font-label-sm">Analiz</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
