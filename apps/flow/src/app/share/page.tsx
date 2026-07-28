import Image from "next/image";
import Link from "next/link";
import { createPost } from "@/actions/social";
import { redirect } from "next/navigation";

export default function SharePage() {
  async function handleCreatePost(formData: FormData) {
    'use server';
    formData.set('platforms', JSON.stringify(['instagram', 'facebook', 'twitter']));
    await createPost(formData);
    redirect('/posts');
  }

  return (
    <div className="bg-[var(--color-surface)] font-body-md text-[var(--color-on-surface)] antialiased grid-bg h-screen flex overflow-hidden">
      {/* SideNavBar */}
      <nav className="fixed left-0 top-0 h-full w-[280px] bg-[var(--color-surface-container-lowest)]/80 backdrop-blur-md border-r border-white/5 flex flex-col py-lg z-40 hidden md:flex">
        <div className="px-md mb-xl flex items-center gap-sm">
          <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl">auto_awesome</span>
          <div>
            <h1 className="font-headline-lg text-[var(--color-primary)] text-2xl font-bold tracking-tight">Creator Hub</h1>
            <p className="font-data-mono text-data-mono text-[var(--color-on-surface-variant)] text-[10px]">AI-Powered Scale</p>
          </div>
        </div>
        <div className="flex-1 px-sm space-y-2">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-white/5 transition-all duration-300 cursor-pointer">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-body-md text-body-md">Dashboard</span>
          </Link>
          <a className="flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-white/5 transition-all duration-300 cursor-pointer" href="#">
            <span className="material-symbols-outlined">auto_awesome</span>
            <span className="font-body-md text-body-md">Content Lab</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 border-[var(--color-primary)] bg-gradient-to-r from-[var(--color-primary)]/10 to-transparent text-[var(--color-primary)] font-bold cursor-pointer" href="#">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>edit_square</span>
            <span className="font-body-md text-body-md">AI Paylaşım</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-white/5 transition-all duration-300 cursor-pointer" href="#">
            <span className="material-symbols-outlined">layers</span>
            <span className="font-body-md text-body-md">Platforms</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-white/5 transition-all duration-300 cursor-pointer" href="#">
            <span className="material-symbols-outlined">psychology</span>
            <span className="font-body-md text-body-md">AI Model</span>
          </a>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 ml-0 md:ml-[280px] h-screen overflow-y-auto custom-scrollbar relative flex flex-col items-center">
        <header className="w-full h-16 border-b border-white/5 bg-[var(--color-surface)]/80 backdrop-blur-xl flex items-center justify-between px-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
             <span className="font-headline-lg-mobile text-[18px] font-semibold text-white">Yeni Gönderi Oluştur</span>
             <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary-container)]/30 text-[var(--color-on-primary-container)] font-data-mono text-[10px] uppercase font-bold tracking-widest border border-[var(--color-primary)]/20">FLOW AI Aktif</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-[var(--color-on-surface-variant)] hover:text-white transition-colors">
              <span className="material-symbols-outlined">help</span>
            </button>
            <button className="text-[var(--color-on-surface-variant)] hover:text-white transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden bg-[var(--color-surface-container)]">
              <img alt="User" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD17V070fTgOolmD-H37TwFM4x_rLlFWV3CmxUK010l_vUoIk6AFTnld2XGR_JlTNgU0qGMyHWEHWv5htjxlqUUATLZ0EkT_ncDRdMc9gk-Wn-xV83DJPGPkkvVvpT57PDjJMKSlJqNlqODcbzhNTlPLSH_Gab0dbiG0scNnmHCeQTg89JmH7ZHZoiS5s2exlWPjN_9QfWY7-NgtbJb8rPtyWd-EMkNlfSc3FsFMsRyIQoLf8Jc7z634qguU4id8c57JbAGtx4j-_Q"/>
            </div>
          </div>
        </header>

        <form action={handleCreatePost} className="w-full max-w-4xl p-md md:p-lg lg:p-xl space-y-xl flex-1 flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
            {/* Left Column: Composer */}
            <div className="lg:col-span-7 space-y-md">
              {/* Media Section */}
              <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-headline-lg-mobile text-[18px] font-semibold flex items-center gap-2">Medya <span className="text-[var(--color-error)]">*</span></h3>
                  <div className="absolute top-4 right-4 p-2 bg-[var(--color-surface-container)] rounded-full border border-white/10 text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] transition-colors">
                    <span className="material-symbols-outlined text-[20px]">settings</span>
                  </div>
                </div>
                <div className="w-full h-64 border-2 border-dashed border-[var(--color-primary)]/30 rounded-xl bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 transition-colors flex flex-col items-center justify-center cursor-pointer group-hover:border-[var(--color-primary)]/50">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-tertiary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl">add_photo_alternate</span>
                  </div>
                  <p className="font-body-md text-sm text-[var(--color-on-surface)] font-semibold">Tıkla veya sürükle bırak</p>
                  <p className="font-data-mono text-[10px] text-[var(--color-on-surface-variant)] mt-1">JPG, PNG, MP4 (Max 10MB)</p>
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button" className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-[var(--color-on-surface)] font-body-md text-sm">
                    <span className="material-symbols-outlined text-[var(--color-secondary)]">auto_awesome</span>
                    AI Görsel Üret
                  </button>
                  <button type="button" className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-[var(--color-on-surface)] font-body-md text-sm">
                    <span className="material-symbols-outlined text-[var(--color-tertiary)]">photo_library</span>
                    Kütüphaneden Seç
                  </button>
                </div>
              </div>

              {/* Text Content */}
              <div className="glass-panel rounded-2xl flex flex-col overflow-hidden group">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                  <h3 className="font-headline-lg-mobile text-[18px] font-semibold">Metin</h3>
                  <div className="flex gap-2">
                    <button type="button" className="w-8 h-8 rounded bg-[var(--color-surface-container)] flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[18px]">format_bold</span>
                    </button>
                    <button type="button" className="w-8 h-8 rounded bg-[var(--color-surface-container)] flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[18px]">format_italic</span>
                    </button>
                    <button type="button" className="w-8 h-8 rounded bg-[var(--color-surface-container)] flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[18px]">tag</span>
                    </button>
                    <button type="button" className="w-8 h-8 rounded bg-[var(--color-surface-container)] flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[18px]">sentiment_satisfied</span>
                    </button>
                  </div>
                </div>
                <div className="p-4 relative">
                  <textarea 
                    name="content"
                    className="w-full h-40 bg-transparent border-none text-[var(--color-on-surface)] font-body-md text-[15px] focus:outline-none focus:ring-0 resize-none leading-relaxed placeholder:text-[var(--color-on-surface-variant)]/40" 
                    placeholder="Bir şeyler yaz..."
                  ></textarea>
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button type="button" className="px-3 py-1.5 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] font-data-mono text-[10px] hover:text-white transition-colors">0 / 2200</button>
                  </div>
                </div>
                <div className="p-3 border-t border-white/5 bg-[var(--color-surface-container-lowest)]/50">
                  <div className="relative">
                    <input 
                      className="w-full bg-black/40 border border-white/10 rounded-lg pl-3 pr-12 py-2.5 text-sm font-body-md text-[var(--color-on-surface)] focus:border-[var(--color-secondary)] focus:outline-none transition-colors" 
                      placeholder="AI ile metin üret..." 
                      type="text"
                    />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-[var(--color-secondary-container)] to-[var(--color-secondary)] flex items-center justify-center text-white hover:scale-105 transition-transform shadow-[0_0_10px_rgba(182,0,248,0.3)]">
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Settings & Publishing */}
            <div className="lg:col-span-5 space-y-md flex flex-col h-full">
              
              {/* Publishing */}
              <div className="mt-auto pt-md space-y-md">
                <button type="submit" className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary-container)] text-white font-headline-lg-mobile text-lg flex items-center justify-center gap-2 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(182,0,248,0.4)] transition-all active:scale-[0.98]">
                  <span className="material-symbols-outlined text-[24px]">send</span>
                  Seçili Platformlarda Paylaş
                </button>
              </div>
            </div>
          </div>
          <div className="h-32"></div> {/* spacer */}
        </form>
      </main>
    </div>
  );
}
