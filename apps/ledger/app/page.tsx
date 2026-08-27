import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { LandingHeader } from '@/components/LandingHeader';
import { LandingFooter } from '@/components/LandingFooter';

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

      <LandingHeader />

      <main>
        {/* BEGIN: HeroSection */}
        <section className="pt-16 pb-20 relative overflow-hidden">
          {/* Background Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#8C3FE8]/20 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="container mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center">
            <div className="w-full lg:w-1/2 text-left mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 mb-6">
                <span className="text-xs font-bold text-[#00F0FF] uppercase tracking-wider">MALİ MÜŞAVİRLER İÇİN TAMAMEN ÜCRETSİZ AI PLATFORMU</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                Mali Müşavirler İçin İşler <br/>
                <span className="gradient-text">Artık Sıfır Maliyetli</span>
              </h1>
              <p className="text-base text-[#A3B1C6] mb-8 max-w-lg">
                Mükellefleriniz ile ilişkinizi düzenleyen ve takip eden platformunuz <strong>artık tamamen ücretsiz</strong>. Mükelleflerinizin tek tıkla fatura yükleyebildiği, faturaları anında işleyip muhasebe programınıza çıktı veren, 7/24 AI destekli eşsiz bir asistan.
              </p>
              <div className="flex flex-wrap gap-6 mb-10 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00F0FF] text-[18px]">verified</span>
                  Limitsiz Mükellef
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8C3FE8] text-[18px]">bolt</span>
                  Sınırsız AI OCR
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00F0FF] text-[18px]">money_off</span>
                  Ömür Boyu 0₺
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link className="bg-[#8C3FE8] hover:bg-purple-600 text-white px-8 py-3 rounded-lg font-medium transition-colors text-center shadow-[0_0_20px_rgba(140,63,232,0.4)]" href="/register">Hemen Ücretsiz Başla</Link>
                <Link className="border border-white/20 hover:bg-white/5 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-center" href="#demo">
                  <span className="material-symbols-outlined text-[18px]">play_circle</span>
                  Demo İzle
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
                  <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">search</span> Bu ayki ödemelerim</span>
                  <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">search</span> Geçen yıla ait faturalarım</span>
                  <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">search</span> Toplam borcum ne kadar?</span>
                  <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">search</span> Bu yılki gelir-gider raporum</span>
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
                    <p className="text-xs text-gray-500">Tarih Aralığı: Son 30 Gün</p>
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

      <LandingFooter />
    </div>
  );
}
