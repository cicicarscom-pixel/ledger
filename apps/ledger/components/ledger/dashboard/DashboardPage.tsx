'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { MetricCard, AppCard } from '../ui/Cards';
import { SectionHeader, PageTitle } from '../ui/Typography';
import { StatusBadge } from '../ui/Badges';
import { ActivityCard } from '../ui/Cards';

// Genel beyan takvimi (GİB): Muhtasar ve Prim Hizmet → dönemi izleyen ayın 26'sı; KDV (1 No) → 28'i.
// Son gün hafta sonuna denk gelirse ilk iş gününe kayar. Resmi tatiller ve Bakanlık süre uzatımları
// (sirküler) HESABA KATILMAZ — ekranda uyarı gösterilir.
const TR_MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const TR_DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

function istanbulToday(): { y: number; m: number; d: number } {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date()).split('-').map(Number);
  return { y, m, d };
}

function upcomingDeadlines() {
  const t = istanbulToday();
  const today = Date.UTC(t.y, t.m - 1, t.d);
  const rules = [
    { day: 26, title: 'Muhtasar ve Prim Hizmet', note: 'Beyan ve ödeme son günü' },
    { day: 28, title: 'KDV Beyannamesi', note: 'Beyan ve ödeme son günü' },
  ];
  const result = rules.map((r) => {
    let due = Date.UTC(t.y, t.m - 1, r.day);
    if (due < today) due = Date.UTC(t.y, t.m, r.day);
    const dow = new Date(due).getUTCDay();
    if (dow === 6) due += 2 * 86400000;
    if (dow === 0) due += 86400000;
    const dt = new Date(due);
    return { ...r, ts: due, dayNum: dt.getUTCDate(), month: TR_MONTHS_SHORT[dt.getUTCMonth()], isNext: false };
  });
  result.sort((a, b) => a.ts - b.ts);
  if (result.length) result[0].isNext = true;
  return result;
}

function lastSevenDays(documents: any[]) {
  const t = istanbulToday();
  const days = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(Date.UTC(t.y, t.m - 1, t.d - (6 - i)));
    const key = dt.toISOString().slice(0, 10);
    return { key, label: TR_DAYS_SHORT[dt.getUTCDay()], count: 0 };
  });
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' });
  for (const doc of documents) {
    if (!doc?.created_at) continue;
    const key = fmt.format(new Date(doc.created_at));
    const day = days.find((d) => d.key === key);
    if (day) day.count += 1;
  }
  return days;
}

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
  
  // Son gelen evrak listesi önceki gibi yalnız onay bekleyenler (sorgu artık son 30 günün tüm belgelerini getiriyor).
  const recentDocs = documents.filter(d => d.ledger_official_status === 'taslak').slice(0, 5);
  const deadlines = upcomingDeadlines();
  const weekly = lastSevenDays(documents);
  const weeklyMax = Math.max(1, ...weekly.map((d) => d.count));
  const weeklyTotal = weekly.reduce((sum, d) => sum + d.count, 0);

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
        {/* Upcoming Deadlines (3 cols) — genel beyan takviminden hesaplanır */}
        <AppCard className="col-span-3 p-6">
          <SectionHeader className="mb-4">Önemli Tarihler</SectionHeader>
          <div className="flex flex-col gap-2">
            {deadlines.map((dl) => (
              <div key={dl.title} className="flex items-center gap-3 p-3 bg-surface rounded-card border border-border/50">
                <div className={`flex flex-col items-center justify-center w-10 h-10 rounded ${dl.isNext ? 'bg-primary/10 text-primary' : 'bg-surface border border-border text-text-muted'}`}>
                  <span className="text-xs font-bold">{dl.dayNum}</span>
                  <span className="text-[10px] uppercase font-semibold">{dl.month}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-body font-semibold text-text">{dl.title}</span>
                  <span className="text-muted text-text-muted">{dl.note}</span>
                </div>
              </div>
            ))}
            <span className="text-[11px] text-text-muted/70 leading-snug">Genel takvim. Resmi tatil ve süre uzatımları için GİB duyurularını kontrol edin.</span>
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

        {/* Workload Chart (5 cols) — son 7 günde gelen evrak (gerçek veri) */}
        <AppCard className="col-span-5 p-6 flex flex-col min-h-[220px] max-h-[260px]">
          <div className="flex justify-between items-center mb-4">
            <SectionHeader>İş Yükü Trendi</SectionHeader>
            <span className="text-muted font-semibold text-text-muted">Son 7 gün · {weeklyTotal} evrak</span>
          </div>
          <div className="flex-1 flex items-end gap-2 pt-2">
            {weekly.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${d.key}: ${d.count} evrak`}>
                <span className="text-[11px] font-semibold text-text-muted">{d.count > 0 ? d.count : ''}</span>
                <div className="w-full rounded-t bg-primary/60" style={{ height: `${Math.max(4, Math.round((d.count / weeklyMax) * 100))}%`, opacity: d.count > 0 ? 1 : 0.25 }} />
                <span className="text-[10px] uppercase font-semibold text-text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        </AppCard>
      </div>
    </div>
  );
}
