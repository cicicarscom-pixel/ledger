import React from 'react';
import { LandingHeader } from '@/components/LandingHeader';
import { LandingFooter } from '@/components/LandingFooter';

export default function KaynaklarPage() {
  return (
    <div className="bg-[#0B0F19] text-white font-sans antialiased selection:bg-[#8C3FE8] selection:text-white min-h-screen flex flex-col">
      <style dangerouslySetInnerHTML={{__html: `
        .glass-panel-landing {
          background: rgba(30, 37, 58, 0.4);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}} />
      <LandingHeader />
      <main className="flex-grow pt-24 pb-20 container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mt-12 mb-16">
          <div className="w-16 h-16 rounded-full bg-[#8C3FE8]/20 flex items-center justify-center mx-auto mb-6">
            <i className={`fa-solid ${'fa-book'} text-3xl text-[#8C3FE8]`}></i>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Kaynaklar</h1>
          <p className="text-lg text-[#A3B1C6]">
            Rehberler, e-dönüşüm dökümanları ve sıkça sorulan sorular merkezi.
          </p>
        </div>
        <div className="glass-panel-landing p-10 rounded-2xl max-w-4xl mx-auto border border-white/5">
          <p className="text-[#A3B1C6] leading-relaxed mb-6">
            Workigom Ledger ile müşavirlik operasyonlarınızı tek bir platformda birleştiriyoruz. 
            Mükelleflerinizle olan iletişiminizi otonom AI botlarla sağlarken, yüklenen evrakları OCR ile okuyup
            muhasebe programınıza aktarılacak formata getiriyoruz.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="p-6 bg-white/5 rounded-xl border border-white/5">
              <h3 className="font-semibold text-[#8C3FE8] mb-2">Hızlı & Güvenli</h3>
              <p className="text-sm text-[#A3B1C6]">Tüm mükellef verileriniz KVKK standartlarına uygun şekilde şifrelenerek Supabase veritabanında saklanır.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-xl border border-white/5">
              <h3 className="font-semibold text-[#00F0FF] mb-2">7/24 Erişilebilirlik</h3>
              <p className="text-sm text-[#A3B1C6]">Mükellefleriniz kendi Workigom Flow uygulamasından size istedikleri an, istedikleri formattaki evrakı anında iletebilirler.</p>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}