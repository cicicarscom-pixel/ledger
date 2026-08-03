import Link from "next/link";
import { getBotSettings, updateBotSettings } from '@/actions/bots';

export default async function BotManagement() {
  const settings = await getBotSettings() || {
    auto_reply_enabled: false,
    custom_instruction: ''
  };

  return (
    <div className="text-on-background min-h-screen flex overflow-hidden w-full relative">
      {/* SideNavBar */}
      <nav className="hidden md:flex bg-surface-container-lowest/80 backdrop-blur-md fixed left-0 top-0 h-screen w-[280px] border-r border-white/5 flex-col py-lg px-md gap-md z-40">
        <div className="mb-lg px-base">
          <h1 className="font-headline-lg text-primary-fixed-dim text-[32px] font-semibold tracking-tight">
            AI-ESNAF
          </h1>
          <p className="font-data-mono text-on-surface-variant text-[12px] font-bold mt-xs">
            Command Center
          </p>
        </div>

        <div className="flex-1 flex flex-col gap-sm">
          <Link
            href="/"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface font-body-md text-[16px] hover:bg-white/5 transition-colors p-sm rounded-lg"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 0' }}
            >
              dashboard
            </span>
            Dashboard
          </Link>
          <Link
            href="/accounting"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface font-body-md text-[16px] hover:bg-white/5 transition-colors p-sm rounded-lg"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 0' }}
            >
              account_balance_wallet
            </span>
            AI Accounting
          </Link>
          <a
            href="#"
            className="relative flex items-center gap-sm text-primary-fixed-dim before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-8 before:w-1 before:bg-primary before:shadow-[0_0_15px_rgba(0,162,255,0.8)] bg-gradient-to-r from-primary/10 to-transparent font-body-md text-[16px] p-sm rounded-lg scale-[1.02] hover:shadow-[0_0_20px_rgba(153,203,255,0.2)] transition-all"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              smart_toy
            </span>
            Bot Management
          </a>
          <a
            href="#"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface font-body-md text-[16px] hover:bg-white/5 transition-colors p-sm rounded-lg"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 0' }}
            >
              share
            </span>
            Social Media
          </a>
          <a
            href="#"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface font-body-md text-[16px] hover:bg-white/5 transition-colors p-sm rounded-lg"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 0' }}
            >
              calendar_today
            </span>
            Appointments
          </a>
          <a
            href="#"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface font-body-md text-[16px] hover:bg-white/5 transition-colors p-sm rounded-lg"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 0' }}
            >
              settings
            </span>
            Settings
          </a>
        </div>

        <button className="mt-auto w-full py-sm rounded-lg bg-gradient-to-r from-primary-container to-tertiary-container text-on-primary-container font-data-mono text-[12px] font-bold uppercase tracking-wider hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,162,255,0.4)] transition-all duration-300">
          New Analysis
        </button>

        <div className="mt-md pt-md border-t border-white/5 flex flex-col gap-sm">
          <a
            href="#"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface font-body-md text-[16px] hover:bg-white/5 transition-colors p-xs rounded-lg"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 0' }}
            >
              help
            </span>
            Help
          </a>
          <a
            href="#"
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface font-body-md text-[16px] hover:bg-white/5 transition-colors p-xs rounded-lg"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 0' }}
            >
              contact_support
            </span>
            Support
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 md:ml-[280px] flex flex-col h-screen overflow-hidden">
        {/* TopNavBar Header */}
        <header className="bg-surface/40 backdrop-blur-[20px] docked full-width top-0 sticky z-30 border-b border-white/5 shadow-sm flex justify-between items-center w-full px-margin-desktop h-16 md:px-margin-desktop px-margin-mobile">
          <div className="flex items-center gap-md">
            <h2 className="font-headline-lg text-[24px] md:text-[32px] font-semibold text-primary tracking-tighter">
              Bot Management
            </h2>
          </div>
          <div className="flex items-center gap-md">
            <button className="text-on-surface-variant hover:text-primary transition-all duration-300">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="h-8 w-px bg-white/10"></div>
            <img
              alt="User Profile Avatar"
              className="w-8 h-8 rounded-full border border-white/20 object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZh7G0V7M3_PaeQrHBtfS4c7mc_ilNh1FjuouJNI6LNZddTowz2Wr4RtdndcoeleSB13zihNyn_fJkuYX8DAA194mEQ6sxXhu_d6wG4tCL4A6yLhF444hpladILQff1c83vG-RpH1xGt237Lu7wlNLzZlVQqlhmEaaIoz-IZk4q29rVWghXkvltywke1NIOminjlHldzExday2Tbw1Ec8jNKy1ZTXlmEcWQrHzxP9Qa5gyd0EAjXm63JEUrvv91q4ZmbZIRMIkB9w"
            />
            <button className="text-on-surface-variant hover:text-error transition-all duration-300">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        <div className="p-margin-mobile md:p-margin-desktop flex flex-col gap-lg max-w-7xl mx-auto w-full mt-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
            {/* Left Column: Ayarlar */}
            <form
              action={updateBotSettings}
              className="lg:col-span-7 flex flex-col gap-md"
            >
              {/* Temel Ayarlar */}
              <div className="glass-panel rounded-xl p-md flex flex-col gap-md border-t-2 border-t-primary relative">
                {/* Asistan Durumu Toggle */}
                <div className="flex items-center justify-between p-sm bg-white/5 rounded-lg border border-white/10">
                  <div>
                    <h3 className="font-body-md text-[16px] text-on-surface font-semibold">
                      Aktif Durum
                    </h3>
                    <p className="font-body-md text-[13px] text-on-surface-variant mt-1">
                      Asistan gelen mesajlara otomatik yanıt versin.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="auto_reply_enabled"
                      className="sr-only peer"
                      defaultChecked={settings.auto_reply_enabled}
                    />
                    <div className="w-14 h-7 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-on-surface after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                  </label>
                </div>

                {/* Prompt Textarea */}
                <div className="flex flex-col mt-sm">
                  <div className="flex items-center gap-sm mb-sm">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      description
                    </span>
                    <h3 className="font-body-md text-[16px] text-on-surface font-semibold">
                      Asistan Talimatı
                    </h3>
                  </div>
                  <p className="font-body-md text-[14px] text-on-surface-variant mb-md">
                    Yapay zekanın nasıl davranacağını ve hangi kurallara
                    uyacağını belirleyin.
                  </p>
                  <textarea
                    name="custom_instruction"
                    className="w-full flex-1 bg-white/[0.03] border-0 border-b border-white/10 text-on-surface font-body-md text-[15px] focus:ring-0 focus:border-primary focus:bg-white/[0.05] transition-all rounded-t-lg p-sm resize-none custom-scrollbar outline-none"
                    placeholder="Sen bir berber dükkanı asistanısın..."
                    defaultValue={settings.custom_instruction}
                    rows={5}
                  />
                  <div className="flex justify-between items-center mt-sm">
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-full border border-primary/30 text-primary font-data-mono text-[11px] whitespace-nowrap hover:bg-primary/10 transition-colors"
                      >
                        Berber Şablonu
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-full border border-white/10 text-on-surface-variant font-data-mono text-[11px] whitespace-nowrap hover:bg-white/5 transition-colors"
                      >
                        Taksi Şablonu
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-full border border-white/10 text-on-surface-variant font-data-mono text-[11px] whitespace-nowrap hover:bg-white/5 transition-colors"
                      >
                        Kuaför Şablonu
                      </button>
                    </div>
                    <button
                      type="submit"
                      className="bg-primary text-black font-semibold rounded px-4 py-2 hover:bg-primary/80 transition-colors"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              </div>

              {/* Connected Platforms */}
              <div className="glass-panel rounded-xl p-md flex flex-col gap-md">
                <div className="flex items-center gap-sm mb-xs">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">
                    hub
                  </span>
                  <h3 className="font-body-md text-[16px] text-on-surface font-semibold">
                    Bağlı Platformlar
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-sm">
                  <button className="flex items-center gap-3 p-3 rounded-lg border border-primary/50 bg-primary/10 hover:bg-primary/20 transition-colors">
                    <img
                      alt="Instagram"
                      className="w-6 h-6 rounded"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcWIqatYFVLUofBtNWBHlD_MwEsS9aree8nFlknXUkYtW2zQID4Dp6jhYNc9iSpy6zLfmmDIZXp_Uylc-3QEfN41aeYFCPRkhFr3qHxY2_cskWWCQIJQM8e73M2Aaq4dV4ykjGfaY1wQP1nDaDND4kWhCBtXcl-4qheIlYKFUyXl1QXQkRTpRQbq_bihHpFdteGk7Hx_-w8_-9PncXkqNwEqqsgRYjX30jAukQnlw1lswuYUs8ja2XN7A7Aa3pRBzd-v50mj-szVc"
                    />
                    <span className="font-body-md text-[14px]">
                      Instagram DM
                    </span>
                  </button>
                  <button className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                    <img
                      alt="WhatsApp"
                      className="w-6 h-6 rounded"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuS9s9aR-QM2SOTccNji2VscnXZlYhgTtBMiSNyzUBlkTDqVlg2xNEQycyBDZLgZmPCOhBeo-qkrivVKV0_xHGTsu9or08GQPWwED1Ke6SdEy90W_JcttyFse5IUZgq4njeu-YPxN4ZL8pS6RaKzEJPNVZviGvPL58NNIqWokT9hP4l4h5ZM8dZ1lJw52tQ6LxuLE2brU1EX_PNFOAP0sDo5SnXPcLTrHIHqUyHeWVqiMvQbip6JEI0IXnWmrcacAPgfNZ3FlXcv4"
                    />
                    <span className="font-body-md text-[14px]">
                      WhatsApp QR (WAHA)
                    </span>
                  </button>
                </div>
              </div>

              {/* Gelişmiş Ayarlar (Locked) */}
              <div className="relative glass-panel rounded-xl p-md overflow-hidden min-h-[160px]">
                {/* Lock Overlay */}
                <div className="absolute inset-0 locked-overlay flex flex-col items-center justify-center border border-white/5 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center mb-sm shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                    <span className="material-symbols-outlined text-on-surface-variant text-[24px]">
                      lock
                    </span>
                  </div>
                  <h4 className="font-body-md text-[15px] font-semibold text-on-surface mb-xs">
                    Pro Sürüm Gerekli
                  </h4>
                  <p className="font-data-mono text-[11px] font-medium text-on-surface-variant uppercase tracking-wider text-center px-lg">
                    AI Kişiliği ve Özel Prompt erişimi için yükseltin.
                  </p>
                </div>
              </div>
            </form>

            {/* Right Column: Simülatör */}
            <div className="lg:col-span-5 flex flex-col h-[600px] lg:h-auto border-t-2 border-t-secondary-container rounded-xl overflow-hidden glass-panel">
              {/* Simülatör Header */}
              <div className="p-sm border-b border-white/10 bg-surface/50 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-secondary-container/50 shadow-[0_0_10px_rgba(188,19,254,0.2)]">
                    <span className="material-symbols-outlined text-secondary-container">
                      smart_toy
                    </span>
                  </div>
                  <div>
                    <h3 className="font-body-md text-[15px] text-on-surface font-semibold">
                      Canlı Test Simülatörü
                    </h3>
                    <p className="font-data-mono text-[11px] font-medium text-tertiary-fixed-dim uppercase tracking-wider">
                      Çevrimiçi
                    </p>
                  </div>
                </div>
                <button className="text-on-surface-variant hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">
                    refresh
                  </span>
                </button>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-md flex flex-col gap-md bg-[#0e0e10]/80">
                {/* Date divider */}
                <div className="flex justify-center my-xs">
                  <span className="px-sm py-xs rounded-full bg-white/5 text-on-surface-variant font-data-mono text-[10px] tracking-wider uppercase border border-white/5">
                    Bugün
                  </span>
                </div>

                {/* User Message */}
                <div className="flex justify-end w-full">
                  <div className="max-w-[80%] bg-surface-container-high border border-white/5 rounded-2xl rounded-tr-sm p-sm text-on-surface font-body-md text-[14px] shadow-sm">
                    Merhaba, yarın öğleden sonra saç kesimi için boş yeriniz var
                    mı?
                    <div className="text-right mt-1">
                      <span className="font-data-mono text-[10px] text-on-surface-variant">
                        14:22
                      </span>
                      <span
                        className="material-symbols-outlined text-[14px] text-primary align-middle ml-1"
                        style={{ fontVariationSettings: '"FILL" 1' }}
                      >
                        done_all
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bot Message */}
                <div className="flex justify-start w-full">
                  <div className="max-w-[85%] bg-[#2a103c]/40 bot-message-glow rounded-2xl rounded-tl-sm p-sm text-on-surface font-body-md text-[14px]">
                    Merhaba abi, hoş geldin! Yarın öğleden sonra 14:30 ve 16:00
                    saatlerimiz saç kesimi için müsait. Hangisi sana daha uygun
                    olur?
                    <div className="text-right mt-1">
                      <span className="font-data-mono text-[10px] text-on-secondary-container/60">
                        14:22
                      </span>
                    </div>
                  </div>
                </div>

                {/* User Message */}
                <div className="flex justify-end w-full">
                  <div className="max-w-[80%] bg-surface-container-high border border-white/5 rounded-2xl rounded-tr-sm p-sm text-on-surface font-body-md text-[14px] shadow-sm">
                    16:00 olsun lütfen. Fiyat nedir şu an?
                    <div className="text-right mt-1">
                      <span className="font-data-mono text-[10px] text-on-surface-variant">
                        14:24
                      </span>
                      <span
                        className="material-symbols-outlined text-[14px] text-primary align-middle ml-1"
                        style={{ fontVariationSettings: '"FILL" 1' }}
                      >
                        done_all
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bot Typing Indicator */}
                <div className="flex justify-start w-full">
                  <div className="bg-[#2a103c]/40 border border-secondary-container/30 rounded-2xl rounded-tl-sm p-sm py-2 flex items-center gap-1 w-16">
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Input Area */}
              <div className="p-sm border-t border-white/10 bg-surface/50 backdrop-blur-md">
                <div className="flex items-end gap-sm bg-surface-container-low border border-white/10 rounded-xl p-xs pl-sm focus-within:border-secondary-container/50 focus-within:shadow-[0_0_10px_rgba(188,19,254,0.1)] transition-all">
                  <button className="text-on-surface-variant hover:text-white p-1 mb-1">
                    <span className="material-symbols-outlined text-[20px]">
                      add_circle
                    </span>
                  </button>
                  <textarea
                    className="flex-1 bg-transparent border-0 text-on-surface font-body-md text-[14px] focus:ring-0 resize-none py-2 max-h-24 custom-scrollbar placeholder-on-surface-variant/50 outline-none"
                    placeholder="Simülatörde test et..."
                    rows={1}
                  ></textarea>
                  <button className="w-8 h-8 rounded-full bg-secondary-container/20 text-secondary-container hover:bg-secondary-container hover:text-white flex items-center justify-center mb-1 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">
                      send
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
