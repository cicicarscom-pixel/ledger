import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function LedgerLandingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    redirect('/clients');
  }

  return (
    <div className="bg-[#0B0F19] text-white font-sans antialiased selection:bg-[#8C3FE8] selection:text-white min-h-screen">
      <style dangerouslySetInnerHTML={{__html: `
        .gradient-text {
          background: linear-gradient(90deg, #8C3FE8 0%, #00F0FF 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .gradient-bg {
          background: linear-gradient(180deg, rgba(140, 63, 232, 0.1) 0%, rgba(11, 15, 25, 0) 100%);
        }

        .glass-panel-landing {
          background: rgba(30, 37, 58, 0.4);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}} />

      {/* BEGIN: MainHeader */}
      <header className="w-full z-50 glass-panel-landing border-b-0 border-white/10 py-4">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/ledger/ledgerlogo1.png" alt="Workigom Ledger Logo" className="h-8 w-auto object-contain" />
            <span className="text-xl font-bold tracking-tight">Workigom <span className="text-blue-400">Ledger</span></span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-300">
            <Link className="hover:text-white transition-colors" href="#">Özellikler</Link>
            <Link className="hover:text-white transition-colors" href="#">Avantajlar</Link>
            <Link className="hover:text-white transition-colors" href="#">Entegrasyonlar</Link>
            <Link className="hover:text-white transition-colors" href="#">Fiyatlandırma</Link>
            <Link className="hover:text-white transition-colors flex items-center gap-1" href="#">Kaynaklar <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg></Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link className="text-sm font-medium hover:text-white transition-colors" href="/login">Giriş Yap</Link>
            <Link className="bg-[#8C3FE8] hover:bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors" href="/register">Ücretsiz Dene</Link>
          </div>
        </div>
      </header>
      {/* END: MainHeader */}

      <main>
        {/* BEGIN: HeroSection */}
        <section className="pt-16 pb-20 relative overflow-hidden">
          {/* Background Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#8C3FE8]/20 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="container mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center">
            <div className="w-full lg:w-1/2 text-left mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 mb-6">
                <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">MALİMÜŞAVİRLER İÇİN AI DESTEKLİ MÜKELLEF YÖNETİM PLATFORMU</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                Malimüşavirler İçin İşler <br/>
                <span className="gradient-text">Daha Akıllı Daha Kolay</span>
              </h1>
              <p className="text-base text-[#A3B1C6] mb-8 max-w-lg">
                Mükellefleriniz ile ilişkinizi düzenleyen ve takip eden bir platformunuz var. Mükelleflerinizin tek tıkla fatura yükleyebildiği, o faturaları anında istediğiniz formatta işleyip muhasebe programınıza uygun çıktı veren. Tüm mükelleflerinizi 7/24 takip edip tüm soru ve sorunlarını çözen akıllı asistan destekli eşsiz bir platform.
              </p>
              <div className="flex flex-wrap gap-6 mb-10 text-sm text-gray-300">
                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[#00F0FF] text-sm">schedule</span> 7/24 Destek</span>
                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[#00F0FF] text-sm">lock</span> Güvenli Altyapı</span>
                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[#00F0FF] text-sm">bolt</span> Tek Tıkla İşlem</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link className="bg-[#8C3FE8] hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm" href="/register">
                  14 Gün Ücretsiz Dene
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
                <Link className="border border-white/20 hover:bg-white/5 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm" href="#">
                  <span className="material-symbols-outlined text-sm">play_circle</span>
                  Canlı Demo İzle
                </Link>
              </div>
            </div>
            <div className="w-full lg:w-1/2 relative flex justify-center items-center">
              <video src="/ledger/video1.mp4" autoPlay loop muted playsInline className="w-full h-auto object-cover rounded-xl shadow-2xl border border-white/10" />
            </div>
          </div>
        </section>
        {/* END: HeroSection */}

        {/* BEGIN: FeaturesSection */}
        <section className="py-12 bg-[#0B0F19]">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="glass-panel-landing p-5 rounded-xl relative">
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#8C3FE8] rounded-full flex items-center justify-center text-xs font-bold shadow-lg">1</div>
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[#00F0FF]">upload_file</span>
                </div>
                <h3 className="font-semibold text-sm mb-2 text-white">Faturayı Yükle</h3>
                <p className="text-xs text-[#A3B1C6] leading-relaxed">Mükellefleriniz faturalarının resmini tek tıkla çekip yada sisteme yükleyebilir. 7/24 her zaman, her yerden.</p>
              </div>
              {/* Step 2 */}
              <div className="glass-panel-landing p-5 rounded-xl relative">
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#2B41B7] rounded-full flex items-center justify-center text-xs font-bold shadow-lg">2</div>
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[#00F0FF]">settings</span>
                </div>
                <h3 className="font-semibold text-sm mb-2 text-white">Otomatik İşle</h3>
                <p className="text-xs text-[#A3B1C6] leading-relaxed">Yüklenen faturalar, panelinizden kullandığınız muhasebe programınıza uygun formatta işlenir.</p>
              </div>
              {/* Step 3 */}
              <div className="glass-panel-landing p-5 rounded-xl relative">
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#8C3FE8] rounded-full flex items-center justify-center text-xs font-bold shadow-lg">3</div>
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[#00F0FF]">description</span>
                </div>
                <h3 className="font-semibold text-sm mb-2 text-white">İstediğiniz Format</h3>
                <p className="text-xs text-[#A3B1C6] leading-relaxed">Faturalarınızı muhasebe programınıza göre çıktısını alabilirsiniz. XML, Excel, CSV veya PDF.</p>
              </div>
              {/* Step 4 */}
              <div className="glass-panel-landing p-5 rounded-xl relative">
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#2B41B7] rounded-full flex items-center justify-center text-xs font-bold shadow-lg">4</div>
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[#00F0FF]">smart_toy</span>
                </div>
                <h3 className="font-semibold text-sm mb-2 text-white">7/24 AI Asistan</h3>
                <p className="text-xs text-[#A3B1C6] leading-relaxed">AI asistanınız mükellefleriniz ile ilgilenir, sorularını yanıtlar, not alır, mesajlarını size anında iletir.</p>
              </div>
              {/* Step 5 */}
              <div className="glass-panel-landing p-5 rounded-xl relative">
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#8C3FE8] rounded-full flex items-center justify-center text-xs font-bold shadow-lg">5</div>
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[#00F0FF]">task</span>
                </div>
                <h3 className="font-semibold text-sm mb-2 text-white">Görev Verin, Takip Etsin</h3>
                <p className="text-xs text-[#A3B1C6] leading-relaxed">AI asistanınıza görevler verin. Kontrol etsin, bilgilendirsin ve size rapor versin. Siz işinize odaklanın.</p>
              </div>
              {/* Step 6 */}
              <div className="glass-panel-landing p-5 rounded-xl relative">
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#2B41B7] rounded-full flex items-center justify-center text-xs font-bold shadow-lg">6</div>
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[#00F0FF]">chat</span>
                </div>
                <h3 className="font-semibold text-sm mb-2 text-white">Bilgiye Anında Ulaşın</h3>
                <p className="text-xs text-[#A3B1C6] leading-relaxed">Mükellefleriniz tüm fatura ve hesap geçmişini AI asistanından saniyeler içerisinde öğrenir.</p>
              </div>
            </div>
          </div>
        </section>
        {/* END: FeaturesSection */}

        {/* BEGIN: AIAssistantSection */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="glass-panel-landing rounded-2xl p-8 flex flex-col lg:flex-row gap-12 items-center">
              <div className="w-full lg:w-1/3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 mb-4 text-xs font-medium text-gray-300 uppercase">
                  7/24 YANINIZDA
                </div>
                <h2 className="text-3xl font-bold mb-2">AI Asistanınız</h2>
                <h3 className="text-2xl font-bold text-[#8C3FE8] mb-4">Her Zaman Görev Başında</h3>
                <p className="text-[#A3B1C6] text-sm mb-6">Workigom Ledger AI Asistanınız, mükelleflerinizle iletişimi yönetir, sorularını yanıtlar, not alır ve tüm önemli bilgileri size ulaştırır.</p>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[#00F0FF] text-base">chat_bubble_outline</span> Mükellef sorularını anında yanıtlar</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[#00F0FF] text-base">edit_note</span> Not alır ve sizi bilgilendirir</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[#00F0FF] text-base">check_circle</span> Görevlerinizi yerine getirir</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[#00F0FF] text-base">assessment</span> Otomatik raporlar oluşturur</li>
                </ul>
              </div>
              <div className="w-full lg:w-2/3 flex justify-center items-center">
                <video src="/ledger/video2.mp4" autoPlay loop muted playsInline className="w-full h-auto object-cover rounded-xl shadow-[0_0_50px_rgba(140,63,232,0.15)] border border-white/10" />
              </div>
            </div>
          </div>
        </section>
        {/* END: AIAssistantSection */}

        {/* BEGIN: DataVisualizationSection */}
        <section className="py-16 bg-[#0B0F19]">
          <div className="container mx-auto px-6">
            <div className="glass-panel-landing rounded-2xl p-8 flex flex-col lg:flex-row gap-12">
              <div className="w-full lg:w-1/3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 mb-4 text-xs font-medium text-gray-300 uppercase">
                  BİLGİYE ANINDA ULAŞIN
                </div>
                <h2 className="text-3xl font-bold mb-2">Geçmişe Dönük Tüm Bilgiler</h2>
                <h3 className="text-2xl font-bold text-[#8C3FE8] mb-4">Saniyeler İçinde Elinizde</h3>
                <p className="text-[#A3B1C6] text-sm mb-6">Mükellefleriniz diledikleri tarih aralığındaki fatura, ödeme, borç ve hesap bilgilerine AI asistanınızdan anında ulaşabilir.</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">search</span> Mart 2024'teki ödemelerim</span>
                  <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">search</span> Geçen yıla ait faturalarım</span>
                  <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">search</span> Toplam borcum ne kadar?</span>
                  <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">search</span> 2024 gelir-gider raporum</span>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                  <input className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#8C3FE8] text-white placeholder-gray-500" placeholder="İstediğinizi sorun, AI asistanınız saniyeler içinde getirsin." type="text"/>
                </div>
              </div>
              <div className="w-full lg:w-2/3">
                <div className="bg-black/40 rounded-xl p-6 border border-white/5">
                  <div className="flex items-center gap-2 mb-6 text-sm text-gray-300 border-b border-white/10 pb-4">
                    <span className="material-symbols-outlined text-[#00F0FF]">analytics</span>
                    <span className="font-medium">AI Asistan Sonuçları</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Card 1 */}
                    <div className="bg-[#0B0F19]/80 rounded-lg p-4 border border-white/5 relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-xs text-[#A3B1C6] mb-1">Faturalar</h4>
                          <p className="font-semibold text-sm">124 fatura</p>
                        </div>
                        <span className="material-symbols-outlined text-green-400 text-xl">description</span>
                      </div>
                      <div>
                        <h4 className="text-xs text-[#A3B1C6] mb-1">Toplam Tutar</h4>
                        <p className="font-bold text-lg">₺ 1.248.750</p>
                      </div>
                    </div>
                    {/* Card 2 */}
                    <div className="bg-[#0B0F19]/80 rounded-lg p-4 border border-white/5 relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-xs text-[#A3B1C6] mb-1">Ödemeler</h4>
                          <p className="font-semibold text-sm">86 ödeme</p>
                        </div>
                        <span className="material-symbols-outlined text-[#00F0FF] text-xl">person</span>
                      </div>
                      <div>
                        <h4 className="text-xs text-[#A3B1C6] mb-1">Toplam Tutar</h4>
                        <p className="font-bold text-lg">₺ 978.300</p>
                      </div>
                    </div>
                    {/* Card 3 */}
                    <div className="bg-[#0B0F19]/80 rounded-lg p-4 border border-white/5 relative overflow-hidden flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs text-[#A3B1C6] mb-1">Borcunuz</h4>
                          <p className="font-bold text-lg">₺ 24.750</p>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-between items-end">
                        <div>
                          <h4 className="text-xs text-[#A3B1C6] mb-1">Vadesi Geçen</h4>
                          <p className="font-semibold text-sm">₺ 3.200</p>
                        </div>
                        <span className="material-symbols-outlined text-gray-500 text-sm">trending_flat</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500">Tarih Aralığı: 01 Mayıs 2024 - 31 Mayıs 2024</p>
                    <button className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-xs transition-colors flex items-center gap-2">
                      Detaylı Raporu İndir
                      <span className="material-symbols-outlined text-[14px]">download</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* END: DataVisualizationSection */}

        {/* BEGIN: CTASection */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="glass-panel-landing rounded-2xl p-8 md:p-12 text-center max-w-4xl mx-auto relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-[#8C3FE8]/10 to-[#00F0FF]/10 blur-xl"></div>
              <div className="relative z-10 text-left mb-6 md:mb-0 md:w-1/2">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Muhasebenizi Geleceğe Taşıyın</h2>
                <p className="text-[#A3B1C6] text-sm">Yapay zeka destekli Workigom Ledger ile tanışın, işlerinizi kolaylaştırın, zamandan kazanın.</p>
              </div>
              <div className="relative z-10 flex flex-col items-center md:items-end md:w-1/2 gap-6">
                <div className="flex gap-6 text-xs text-gray-300">
                  <span className="flex flex-col items-center gap-1"><span className="material-symbols-outlined text-[#8C3FE8] text-2xl">card_giftcard</span> 14 Gün Ücretsiz</span>
                  <span className="flex flex-col items-center gap-1"><span className="material-symbols-outlined text-[#8C3FE8] text-2xl">rocket_launch</span> Kolay Kurulum</span>
                  <span className="flex flex-col items-center gap-1"><span className="material-symbols-outlined text-[#8C3FE8] text-2xl">support_agent</span> 7/24 Destek</span>
                </div>
                <div className="flex flex-col items-center md:items-end gap-2 w-full max-w-[200px]">
                  <Link className="w-full bg-[#8C3FE8] hover:bg-purple-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm" href="/register">
                    Hemen Başlayın
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                  <p className="text-[10px] text-[#A3B1C6]">Kredi kartı gerekmez</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* END: CTASection */}
      </main>

      {/* BEGIN: MainFooter */}
      <footer className="border-t border-white/5 pt-12 pb-6 bg-[#0B0F19]">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-[#2B41B7]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.5l7.5 15h-15L12 5.5z"></path></svg>
                <span className="text-lg font-bold">Workigom <span className="text-blue-400">Ledger</span></span>
              </div>
              <p className="text-xs text-[#A3B1C6] mb-6">AI destekli muhasebe platformu ile işinizi kolaylaştırın, geleceğe güvenle ilerleyin.</p>
              <div className="flex gap-3">
                <Link className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors" href="#">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path></svg>
                </Link>
                <Link className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors" href="#">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path></svg>
                </Link>
                <Link className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors" href="#">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg>
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">Ürün</h4>
              <ul className="space-y-2 text-xs text-[#A3B1C6]">
                <li><Link className="hover:text-white transition-colors" href="#">Özellikler</Link></li>
                <li><Link className="hover:text-white transition-colors" href="#">Fiyatlandırma</Link></li>
                <li><Link className="hover:text-white transition-colors" href="#">Entegrasyonlar</Link></li>
                <li><Link className="hover:text-white transition-colors" href="#">Güncellemeler</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">Kaynaklar</h4>
              <ul className="space-y-2 text-xs text-[#A3B1C6]">
                <li><Link className="hover:text-white transition-colors" href="#">Blog</Link></li>
                <li><Link className="hover:text-white transition-colors" href="#">Kılavuzlar</Link></li>
                <li><Link className="hover:text-white transition-colors" href="#">SSS</Link></li>
                <li><Link className="hover:text-white transition-colors" href="#">Destek</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">Şirket</h4>
              <ul className="space-y-2 text-xs text-[#A3B1C6]">
                <li><Link className="hover:text-white transition-colors" href="#">Hakkımızda</Link></li>
                <li><Link className="hover:text-white transition-colors" href="#">İletişim</Link></li>
                <li><Link className="hover:text-white transition-colors" href="#">Kariyer</Link></li>
                <li><Link className="hover:text-white transition-colors" href="#">Gizlilik Politikası</Link></li>
              </ul>
            </div>
            <div className="lg:col-span-1">
              <h4 className="font-semibold mb-4 text-sm text-white">Bültenimize Abone Olun</h4>
              <p className="text-xs text-[#A3B1C6] mb-3">Ürün güncellemeleri ve finansal ipuçları için bültenimize abone olun.</p>
              <div className="flex">
                <input className="w-full bg-white/5 border border-white/10 rounded-l-md px-3 py-2 text-xs focus:outline-none focus:border-[#8C3FE8] text-white" placeholder="E-posta adresiniz" type="email" />
                <button className="bg-[#8C3FE8] hover:bg-purple-600 px-3 py-2 rounded-r-md transition-colors flex items-center justify-center"><span className="material-symbols-outlined text-white text-[16px]">arrow_downward</span></button>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex justify-between items-center text-[10px] text-[#A3B1C6]">
            <p>© 2024 Workigom Ledger. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
      {/* END: MainFooter */}
    </div>
  );
}
