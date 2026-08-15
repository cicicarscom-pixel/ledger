'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { MetricCard, AppCard } from '../ui/Cards';
import { SectionHeader, PageTitle } from '../ui/Typography';
import { StatusBadge } from '../ui/Badges';
import { ActivityCard } from '../ui/Cards';

export default function DashboardPage({ documents = [], rssFeeds = [] }: { documents?: any[], rssFeeds?: any[] }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('realtime-dashboard-docs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_documents' }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const yeniCount = documents.filter(d => d.ledger_official_status === 'taslak').length;
  const bitenCount = documents.filter(d => d.ledger_official_status === 'onaylandi' || d.ledger_official_status === 'muhasebelesti' || d.ledger_official_status === 'basarili').length;
  const isleniyorCount = documents.filter(d => d.ledger_official_status === 'isleniyor').length;
  const hataCount = documents.filter(d => d.ledger_official_status === 'hata' || d.ledger_official_status === 'reddedildi').length;

  const hazirCount = yeniCount;
  const onaylananCount = bitenCount;
  
  const recentDocs = documents.slice(0, 5);

  const formatCurrency = (amount: number, currency: string) => {
    if (amount === undefined || amount === null) return '0,00 ₺';
    try {
      return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(amount);
    } catch (e) {
      return `${amount} ${currency || 'TRY'}`;
    }
  };
  return (
    <div className="flex flex-col gap-6">

      {/* Grid Container: 12 Columns */}
      <div className="grid grid-cols-12 gap-1">
        
        {/* ROW 1: 3 KPI Cards */}
        <div className="col-span-12 grid grid-cols-3 gap-1">
          <MetricCard 
            title="HAZIR EVRAK" 
            value={String(hazirCount)} 
            icon={<span className="material-symbols-outlined text-[18px]">description</span>}
            trend={{ direction: 'up', value: '3', label: 'bugün' }}
          />
          <MetricCard 
            title="KONTROL BEKLEYEN" 
            value={String(yeniCount)} 
            icon={<span className="material-symbols-outlined text-[18px]">error</span>}
            trend={{ direction: 'down', value: '1', label: 'bugün' }}
          />
          <MetricCard 
            title="BUGÜN ONAYLANAN" 
            value={String(onaylananCount)} 
            icon={<span className="material-symbols-outlined text-[18px]">check_circle</span>}
            trend={{ direction: 'up', value: '5', label: 'bugün' }}
          />
        </div>

        {/* 32px spacing enforced by gap-8 below for content section rhythm */}
      </div>

      <div className="grid grid-cols-12 gap-1 pt-2">
        {/* ROW 2 */}
        {/* Upcoming Deadlines (3 cols) */}
        <AppCard className="col-span-3 p-6">
          <SectionHeader className="mb-4">Önemli Tarihler</SectionHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 p-3 bg-surface rounded-card border border-border/50">
              <div className="flex flex-col items-center justify-center w-10 h-10 rounded bg-primary/10 text-primary">
                <span className="text-xs font-bold">24</span>
                <span className="text-[10px] uppercase font-semibold">Tem</span>
              </div>
              <div className="flex flex-col">
                <span className="text-body font-semibold text-text">KDV Beyannamesi</span>
                <span className="text-muted text-text-muted">Son gün</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-surface rounded-card border border-border/50">
              <div className="flex flex-col items-center justify-center w-10 h-10 rounded bg-surface border border-border text-text-muted">
                <span className="text-xs font-bold">26</span>
                <span className="text-[10px] uppercase font-semibold">Tem</span>
              </div>
              <div className="flex flex-col">
                <span className="text-body font-semibold text-text">Muhtasar</span>
                <span className="text-muted text-text-muted">Ödeme günü</span>
              </div>
            </div>
          </div>
        </AppCard>

        {/* Operations Feed (4 cols) */}
        <AppCard className="col-span-4 p-6">
          <SectionHeader className="mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">stream</span>
            Operasyon Akışı
          </SectionHeader>
          <div className="flex flex-col gap-2">
            {recentDocs.length === 0 ? (
              <div className="text-text-muted text-center p-4 bg-surface rounded-card border border-border/50 text-body">
                Henüz operasyon hareketi yok.
              </div>
            ) : recentDocs.map((doc, idx) => (
              <div key={doc.id || idx} className="flex items-start gap-3 p-3 bg-surface rounded-card border border-border/50">
                <span className={`material-symbols-outlined mt-0.5 text-[18px] ${
                  doc.ledger_official_status === 'onaylandi' || doc.ledger_official_status === 'muhasebelesti' ? 'text-success' :
                  doc.ledger_official_status === 'hata' ? 'text-warning' : 'text-primary'
                }`}>
                  {doc.ledger_official_status === 'onaylandi' || doc.ledger_official_status === 'muhasebelesti' ? 'check_circle' :
                   doc.ledger_official_status === 'hata' ? 'warning' : 'bolt'}
                </span>
                <div className="flex flex-col">
                  <span className="text-body font-medium text-text">
                    {doc.title || 'İsimsiz Evrak'} {
                      doc.ledger_official_status === 'onaylandi' ? 'onaylandı.' :
                      doc.ledger_official_status === 'muhasebelesti' ? 'muhasebeleşti.' :
                      doc.ledger_official_status === 'taslak' ? 'kontrol bekliyor.' :
                      doc.ledger_official_status === 'isleniyor' ? 'yapay zeka tarafından işleniyor.' :
                      doc.ledger_official_status === 'hata' ? 'işlenirken hata oluştu.' : 'sisteme aktarıldı.'
                    }
                  </span>
                  <span className="text-muted text-text-muted">
                    {new Date(doc.created_at).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </AppCard>

        {/* AI Haber Bülteni / Mevzuat (5 cols) */}
        <AppCard className="col-span-5 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <SectionHeader>Mevzuat ve Duyurular</SectionHeader>
            <a className="text-primary hover:underline transition-colors text-label font-medium" href="#">Tümünü Gör</a>
          </div>
          
          <div className="flex flex-col gap-3 overflow-y-auto pr-2 max-h-[300px]">
            {rssFeeds.length === 0 ? (
              <div className="text-text-muted text-center p-4 bg-surface rounded-card border border-border/50 text-body">
                Şu an yeni duyuru bulunmuyor.
              </div>
            ) : (
              rssFeeds.map((feed, index) => (
                <a key={index} href={feed.link} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-1 p-3 bg-surface rounded-card border border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
                  <span className={`text-muted font-semibold ${feed.label === 'Mevzuat Birimi' ? 'text-primary' : 'text-warning'}`}>{feed.label}</span>
                  <span className="text-body font-medium text-text line-clamp-2">{feed.title}</span>
                  {feed.contentSnippet && (
                    <span className="text-muted text-text-muted line-clamp-1">{feed.contentSnippet}</span>
                  )}
                </a>
              ))
            )}
          </div>
        </AppCard>

        {/* ROW 3 */}
        {/* Workflow Summary (7 cols) */}
        <AppCard className="col-span-7 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <SectionHeader>İş Akışı</SectionHeader>
            <a className="text-primary hover:underline transition-colors text-label font-medium" href="#">Detay</a>
          </div>
          <div className="flex-1 flex flex-col justify-center relative">
            <div className="absolute top-1/2 left-32 right-32 h-[1px] bg-border -translate-y-1/2 z-0"></div>
            <div className="flex justify-between items-center relative z-10 px-4">
              
              <div className="flex items-center gap-1 bg-surface px-4 py-2 rounded-card border border-border">
                <div className="w-[32px] h-[32px] rounded-full bg-border flex items-center justify-center">
                  <span className="material-symbols-outlined text-text-muted text-[16px]">inventory_2</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted text-text-muted uppercase font-semibold">Yeni</span>
                  <span className="text-card-title font-bold text-text">{yeniCount}</span>
                </div>
              </div>

              <span className="material-symbols-outlined text-border text-[20px]">arrow_forward</span>

              <div className="flex items-center gap-1 bg-surface px-4 py-2 rounded-card border border-border">
                <div className="w-[32px] h-[32px] rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[16px]">bolt</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted text-text-muted uppercase font-semibold">AI İşliyor</span>
                  <span className="text-card-title font-bold text-text">{isleniyorCount}</span>
                </div>
              </div>

              <span className="material-symbols-outlined text-border text-[20px]">arrow_forward</span>

              <div className="flex items-center gap-1 bg-surface px-4 py-2 rounded-card border border-border">
                <div className="w-[32px] h-[32px] rounded-full bg-warning/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-warning text-[16px]">engineering</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted text-text-muted uppercase font-semibold">Kontrol</span>
                  <span className="text-card-title font-bold text-text">{hataCount}</span>
                </div>
              </div>

              <span className="material-symbols-outlined text-border text-[20px]">arrow_forward</span>

              <div className="flex items-center gap-1 bg-surface px-4 py-2 rounded-card border border-border">
                <div className="w-[32px] h-[32px] rounded-full bg-success/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-success text-[16px]">check_circle</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted text-text-muted uppercase font-semibold">Biten</span>
                  <span className="text-card-title font-bold text-text">{bitenCount}</span>
                </div>
              </div>

            </div>
          </div>
        </AppCard>

        {/* Workload Chart (5 cols) */}
        <AppCard className="col-span-5 p-6 flex flex-col min-h-[220px] max-h-[260px]">
          <div className="flex justify-between items-center mb-4">
            <SectionHeader>İş Yükü Trendi</SectionHeader>
            <select className="bg-surface border border-border rounded-input px-2 py-1 text-muted font-semibold text-text-muted focus:outline-none focus:border-primary appearance-none cursor-pointer">
              <option>BU HAFTA</option>
              <option>GEÇEN HAFTA</option>
            </select>
          </div>
          <div className="flex-1 relative mt-2">
            <div className="absolute inset-0 flex flex-col justify-between z-0 pointer-events-none opacity-5">
              <div className="h-[1px] bg-white"></div>
              <div className="h-[1px] bg-white"></div>
              <div className="h-[1px] bg-white"></div>
            </div>
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-muted font-medium text-text-muted/50 z-10 pointer-events-none">
              <span>200</span>
              <span>100</span>
              <span>0</span>
            </div>
            <svg className="absolute inset-0 w-full h-[calc(100%-24px)] z-10 pl-6 pr-2 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="chartGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.05"></stop>
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0"></stop>
                </linearGradient>
              </defs>
              <path d="M5,100 L5,70 L20,50 L35,80 L50,40 L65,60 L80,20 L95,45 L95,100 Z" fill="url(#chartGradient)"></path>
              <path d="M5,70 L20,50 L35,80 L50,40 L65,60 L80,20 L95,45" fill="none" stroke="var(--color-primary)" strokeWidth="2"></path>
              <circle cx="5" cy="70" fill="var(--color-surface)" r="2" stroke="var(--color-primary)" strokeWidth="2"></circle>
              <circle cx="20" cy="50" fill="var(--color-surface)" r="2" stroke="var(--color-primary)" strokeWidth="2"></circle>
              <circle cx="35" cy="80" fill="var(--color-surface)" r="2" stroke="var(--color-primary)" strokeWidth="2"></circle>
              <circle cx="50" cy="40" fill="var(--color-surface)" r="2" stroke="var(--color-primary)" strokeWidth="2"></circle>
              <circle cx="65" cy="60" fill="var(--color-surface)" r="2" stroke="var(--color-primary)" strokeWidth="2"></circle>
              <circle cx="80" cy="20" fill="var(--color-surface)" r="2" stroke="var(--color-primary)" strokeWidth="2"></circle>
              <circle cx="95" cy="45" fill="var(--color-surface)" r="2" stroke="var(--color-primary)" strokeWidth="2"></circle>
            </svg>
            <div className="absolute bottom-0 left-24 right-8 flex justify-between text-muted font-medium text-text-muted/50 z-10 uppercase tracking-tighter">
              <span>Pzt</span>
              <span>Sal</span>
              <span>Çar</span>
              <span>Per</span>
              <span>Cum</span>
              <span>Cmt</span>
              <span>Paz</span>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  );
}
