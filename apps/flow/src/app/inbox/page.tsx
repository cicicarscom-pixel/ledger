import Image from "next/image";
import Link from "next/link";
import { getMessages, replyToMessage } from "@/actions/social";

export default async function InboxPage() {
  const messages = await getMessages() || [];

  return (
    <div className="antialiased min-h-screen flex text-[var(--color-on-surface)]">
      {/* Main Content Area */}
      <main className="ml-0 flex-1 flex h-screen">
        
        {/* Inbox List Column */}
        <section className="w-full md:w-[380px] border-r border-white/5 bg-[var(--color-surface)]/40 flex flex-col h-full shrink-0">
          {/* Header */}
          <div className="p-md border-b border-white/5 backdrop-blur-xl sticky top-0 z-10 bg-[var(--color-surface)]/60">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display-lg text-headline-lg-mobile text-[var(--color-on-surface)] flex items-center gap-2">
                <Link href="/social-media" className="md:hidden text-[var(--color-on-surface-variant)]">
                  <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                Inbox
              </h2>
              <div className="flex gap-2">
                <button className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 text-[var(--color-on-surface-variant)]">
                  <span className="material-symbols-outlined text-[18px]">filter_list</span>
                </button>
                <button className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 text-[var(--color-on-surface-variant)]">
                  <span className="material-symbols-outlined text-[18px]">search</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 p-1 bg-black/20 rounded-lg">
              <button className="flex-1 py-1.5 rounded-md bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] font-label-sm text-label-sm font-bold shadow-sm">All</button>
              <button className="flex-1 py-1.5 rounded-md text-[var(--color-on-surface-variant)] hover:bg-white/5 font-label-sm text-label-sm transition-colors relative">
                Unread
                <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"></span>
              </button>
              <button className="flex-1 py-1.5 rounded-md text-[var(--color-on-surface-variant)] hover:bg-white/5 font-label-sm text-label-sm transition-colors">Zernio</button>
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {messages.length === 0 ? (
              <div className="p-4 text-center text-on-surface-variant text-sm mt-10 font-data-mono">
                Gelen kutusu boş.
              </div>
            ) : (
              messages.map((msg: any, idx: number) => (
                <div key={idx} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group relative">
                  {msg.status === 'unread' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)]"></div>}
                  <div className="flex gap-3">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center border border-white/10 text-on-surface">
                        {msg.sender_name?.substring(0,2).toUpperCase() || 'AA'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-black rounded-full flex items-center justify-center border border-[var(--color-surface)]">
                        <span className="font-bold text-[8px] text-white">IG</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-body-md text-[15px] font-semibold text-[var(--color-on-surface)] truncate">{msg.sender_name || 'Bilinmiyor'}</h3>
                        <span className="font-data-mono text-[10px] text-[var(--color-primary)] shrink-0 ml-2">
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="font-body-md text-[13px] text-[var(--color-on-surface)] line-clamp-1 opacity-90">{msg.content}</p>
                      {msg.status === 'replied' && (
                        <div className="flex items-center gap-1 mt-1 text-[var(--color-secondary)]">
                          <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                          <span className="font-data-mono text-[10px]">AI Yanıtladı</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Conversation Column */}
        <section className="flex-1 bg-[var(--color-surface-container-lowest)]/50 flex flex-col hidden md:flex relative border-r border-white/5">
          {/* Abstract background */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
            <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-[var(--color-primary)]/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-[var(--color-secondary)]/20 rounded-full blur-[100px]"></div>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center flex-col opacity-30">
             <span className="material-symbols-outlined text-6xl mb-4">forum</span>
             <p className="font-data-mono">Sohbet seçin</p>
          </div>
        </section>
      </main>
    </div>
  );
}
