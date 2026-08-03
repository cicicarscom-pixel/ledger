import Image from "next/image";
import Link from "next/link";
import { getPosts, deletePost } from "@/actions/social";

export default async function PostsPage() {
  const posts = await getPosts() || [];

  return (
    <div className="flex min-h-screen bg-[var(--color-background)] font-body-md antialiased overflow-x-hidden selection:bg-[var(--color-primary)]/30 selection:text-[var(--color-primary)]">
      {/* Main Content Canvas */}
      <main className="flex-1 md:ml-0 min-h-screen flex flex-col">
        {/* TopNavBar (Web) */}
        <header className="hidden md:flex fixed top-0 w-full z-50 justify-between items-center px-margin-desktop h-16 bg-[var(--color-surface)]/40 backdrop-blur-xl border-b border-white/5 flat no shadows">
          <div className="flex items-center gap-md">
            <Link href="/social-media" className="text-[var(--color-on-surface-variant)] hover:text-white transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            {/* Search bar placeholder */}
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] group-focus-within:text-[var(--color-primary)] transition-colors">search</span>
              <input className="bg-white/5 border-b border-white/10 text-[var(--color-on-surface)] pl-10 pr-4 py-2 w-64 focus:outline-none focus:border-[var(--color-primary)] focus:bg-white/10 transition-all font-data-mono text-data-mono rounded-t-DEFAULT" placeholder="Search FLOW..." type="text"/>
            </div>
          </div>
          <div className="flex items-center gap-xl h-full">
            <nav className="flex h-full">
              <a className="flex flex-col justify-center px-sm h-full font-data-mono text-label-sm uppercase tracking-wider text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors duration-200" href="#">Analytics</a>
              <a className="flex flex-col justify-center px-sm h-full font-data-mono text-label-sm uppercase tracking-wider text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors duration-200" href="#">Calendar</a>
              <a className="flex flex-col justify-center px-sm h-full font-data-mono text-label-sm uppercase tracking-wider text-[var(--color-primary)] font-bold border-b-2 border-[var(--color-primary)] pb-1" href="#">Posts</a>
              <a className="flex flex-col justify-center px-sm h-full font-data-mono text-label-sm uppercase tracking-wider text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors duration-200" href="#">Assets</a>
            </nav>
            
            <div className="flex items-center gap-sm">
              <button className="h-10 px-6 bg-[var(--color-primary)] text-black font-data-mono text-label-sm uppercase font-bold rounded-lg hover:bg-[var(--color-primary-container)] hover:shadow-[0_0_15px_rgba(0,162,255,0.4)] transition-all">
                + New Post
              </button>
              <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden shrink-0 ml-2">
                <img alt="User profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD17V070fTgOolmD-H37TwFM4x_rLlFWV3CmxUK010l_vUoIk6AFTnld2XGR_JlTNgU0qGMyHWEHWv5htjxlqUUATLZ0EkT_ncDRdMc9gk-Wn-xV83DJPGPkkvVvpT57PDjJMKSlJqNlqODcbzhNTlPLSH_Gab0dbiG0scNnmHCeQTg89JmH7ZHZoiS5s2exlWPjN_9QfWY7-NgtbJb8rPtyWd-EMkNlfSc3FsFMsRyIQoLf8Jc7z634qguU4id8c57JbAGtx4j-_Q"/>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 mt-16 p-margin-mobile md:p-margin-desktop overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-md">
            
            {/* Header / Filter Row */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-sm mb-lg">
              <div>
                <h1 className="font-display-lg text-[40px] font-bold text-[var(--color-on-surface)] leading-none mb-1">Content Manager</h1>
                <p className="font-data-mono text-[var(--color-on-surface-variant)] uppercase tracking-widest text-[12px]">All Social Posts & Campaigns</p>
              </div>
              
              {/* Filters */}
              <div className="flex gap-2 p-1 bg-black/20 rounded-lg self-start md:self-auto border border-white/5">
                <button className="px-4 py-2 rounded-md bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] font-label-sm text-label-sm font-bold shadow-sm">All</button>
                <button className="px-4 py-2 rounded-md text-[var(--color-on-surface-variant)] hover:bg-white/5 font-label-sm text-label-sm transition-colors">Published</button>
                <button className="px-4 py-2 rounded-md text-[var(--color-on-surface-variant)] hover:bg-white/5 font-label-sm text-label-sm transition-colors">Scheduled</button>
                <button className="px-4 py-2 rounded-md text-[var(--color-on-surface-variant)] hover:bg-white/5 font-label-sm text-label-sm transition-colors flex items-center gap-1">
                  Drafts
                  <span className="bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] text-[10px] px-1.5 rounded-sm">3</span>
                </button>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
              
              {posts.length === 0 ? (
                <div className="col-span-full p-8 text-center text-on-surface-variant font-data-mono">
                  Hiç gönderi bulunamadı.
                </div>
              ) : (
                posts.map((post: any, idx: number) => {
                  const isPublished = post.status === 'published';
                  const isScheduled = post.status === 'scheduled';
                  const isFailed = post.status === 'failed';

                  return (
                    <div key={idx} className={`glass-panel rounded-xl overflow-hidden flex flex-col group border-t-2 ${isPublished ? 'border-t-[var(--color-primary)]' : isScheduled ? 'border-t-[var(--color-secondary-container)]' : 'border-t-[var(--color-error)]'}`}>
                      {/* Image Area */}
                      <div className="h-32 bg-[var(--color-surface-container-highest)] relative border-b border-white/5 overflow-hidden">
                        <img 
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${isFailed ? 'opacity-50 grayscale' : 'opacity-80'}`} 
                          alt="Post preview" 
                          src={post.image_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuBovIMIsOMjXtGSBgitr6aMODGgRPm4-uMm1FWuh2sAI1THgTx_EYvgvUIlJ4PegsDDozcR3wH7qDpl_BLZzDlNd3mXhlT56CKHo21RFtgAA3njhvHCD4QnUSYZX8Yn6W8Ul_bodUN_zmsbWTD49-eKUIRqVaKniDZgN5nE9mWbpG_1QfLshefxRZP-Xx5wsyVWkANsmVIrqqygZd66genjnnn1r5ebus5OiuWH6t4Qrv5uEX5TA0g9YuDzxH86llVLAPTFHWcFazE"}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)]/80 to-transparent"></div>
                        
                        {/* Status Badge */}
                        <div className="absolute top-sm right-sm flex gap-xs">
                          {isPublished && (
                            <span className="px-2 py-1 rounded-md bg-[var(--color-primary-container)]/80 backdrop-blur-sm text-[var(--color-on-primary-container)] font-label-sm text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">check_circle</span>
                              Yayında
                            </span>
                          )}
                          {isScheduled && (
                            <span className="px-2 py-1 rounded-md bg-[var(--color-secondary-container)]/80 backdrop-blur-sm text-[var(--color-on-secondary-container)] font-label-sm text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              Planlanan
                            </span>
                          )}
                          {isFailed && (
                            <span className="px-2 py-1 rounded-md bg-[var(--color-error-container)]/90 backdrop-blur-sm text-[var(--color-on-error-container)] font-label-sm text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">error</span>
                              Hatalı
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Content Area */}
                      <div className="p-md flex flex-col flex-1 gap-sm relative bg-[var(--color-surface)]">
                        <p className="font-body-md text-body-md text-[var(--color-on-surface)] line-clamp-3 leading-relaxed">{post.content}</p>
                        
                        {/* Metrics or Actions */}
                        <div className="mt-auto pt-sm border-t border-white/5 flex flex-col gap-sm">
                          <div className="flex justify-between items-center font-data-mono text-label-sm text-[var(--color-on-surface-variant)]">
                            <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span> {new Date(post.created_at || post.scheduled_for).toLocaleDateString('tr-TR')}</div>
                            <div className="flex gap-1">
                              <span className="material-symbols-outlined text-[14px]">thumb_up</span>
                            </div>
                          </div>
                          
                          {/* Buttons Based on Status */}
                          {isPublished ? (
                            <div className="flex gap-2">
                              <button className="flex-1 py-2 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-label-sm uppercase tracking-wider hover:bg-[var(--color-primary)]/20 transition-colors flex items-center justify-center gap-1 border border-[var(--color-primary)]/30">
                                <span className="material-symbols-outlined text-[16px]">bar_chart</span> Analiz
                              </button>
                              <button className="flex-1 py-2 rounded border border-white/10 text-[var(--color-on-surface)] hover:bg-white/5 font-label-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">visibility</span> İncele
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <form action={async () => {
                                'use server';
                                await deletePost(post.id);
                              }} className="flex-1">
                                <button type="submit" className="w-full py-2 rounded border border-white/10 text-[var(--color-on-surface)] hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] hover:border-[var(--color-error)]/50 font-label-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-1">
                                  <span className="material-symbols-outlined text-[16px]">delete</span> Sil
                                </button>
                              </form>
                              <button className="flex-1 py-2 rounded btn-secondary font-label-sm uppercase tracking-wider flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">send</span> Şimdi Yayınla
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
