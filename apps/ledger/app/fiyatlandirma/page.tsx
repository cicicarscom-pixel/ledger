import React from 'react';
import { LandingHeader } from '@/components/LandingHeader';
import { LandingFooter } from '@/components/LandingFooter';
import Link from 'next/link';

export default function FiyatlandirmaPage() {
  return (
    <div className="bg-[#0B0F19] text-white font-sans antialiased selection:bg-[#8C3FE8] selection:text-white min-h-screen flex flex-col">
      <style dangerouslySetInnerHTML={{__html: `
        .glass-panel-landing {
          background: rgba(30, 37, 58, 0.4);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .glow-text {
          text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
        }
      `}} />
      <LandingHeader />
      <main className="flex-grow pt-24 pb-20 container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mt-12 mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#00F0FF]/20 blur-[100px] rounded-full pointer-events-none -z-10"></div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 mb-8">
            <span className="text-sm font-bold text-[#00F0FF] uppercase tracking-wider">DEV DEĞİŞİKLİK: ARTIK %100 ÜCRETSİZ</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Mali Müşavirler İçin<br/><span className="text-[#00F0FF] glow-text">Sıfır Maliyet</span></h1>
          <p className="text-xl text-[#A3B1C6] max-w-2xl mx-auto">
            Türkiye'nin ilk ve tek <strong>tamamen ücretsiz</strong> yapay zeka destekli mali müşavir asistanı. Sürpriz ücret yok, mükellef sınırı yok.
          </p>
        </div>

        <div className="glass-panel-landing p-1 relative rounded-3xl max-w-4xl mx-auto border border-[#00F0FF]/30 overflow-hidden shadow-[0_0_40px_rgba(0,240,255,0.15)]">
          <div className="bg-[#0B0F19] rounded-3xl p-10 md:p-14 text-center">
            <div className="text-7xl font-bold text-white mb-4">0₺<span className="text-xl text-[#A3B1C6] font-normal tracking-wide"> / Ömür Boyu</span></div>
            <p className="text-[#A3B1C6] text-lg mb-10 max-w-xl mx-auto">
              Workigom Ledger'ın tüm yapay zeka (AI OCR, Asistan) özelliklerine kalıcı olarak ücretsiz erişin.
            </p>

            <div className="grid md:grid-cols-3 gap-6 text-left mb-12">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#00F0FF]/10 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-infinity text-[#00F0FF]"></i>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Sınırsız Mükellef</h4>
                  <p className="text-sm text-[#A3B1C6]">İstediğiniz kadar mükellef ekleyin ve yönetin.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#00F0FF]/10 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-file-invoice text-[#00F0FF]"></i>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Limitsiz AI Tarama</h4>
                  <p className="text-sm text-[#A3B1C6]">Tüm faturalar ve fişler için limitsiz OCR kullanımı.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#00F0FF]/10 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-robot text-[#00F0FF]"></i>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Akıllı Asistan</h4>
                  <p className="text-sm text-[#A3B1C6]">7/24 mükellef taleplerini cevaplayan AI destek.</p>
                </div>
              </div>
            </div>

            <Link href="/register" className="inline-block px-10 py-4 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#8C3FE8] text-white font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              Hemen Ücretsiz Hesabını Oluştur
            </Link>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}