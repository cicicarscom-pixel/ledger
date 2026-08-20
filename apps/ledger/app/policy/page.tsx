import Link from 'next/link';

export default function PolicyPage() {
  return (
    <div className="min-h-screen bg-[#070B14] text-white p-8 md:p-16 selection:bg-[#00F0FF]/30 selection:text-white">
      <div className="max-w-4xl mx-auto bg-[#0A0D14]/50 backdrop-blur-md border border-white/5 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#00F0FF]/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-[#8A2BE2]/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
        
        <div className="relative z-10">
          <Link href="/login" className="inline-flex items-center gap-2 text-[#8E95B3] hover:text-white transition-colors mb-8">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Geri D&ouml;n</span>
          </Link>
          
          <h1 className="text-3xl md:text-4xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#0080FF]">
            Gizlilik Politikas&yacute; ve Kullan&yacute;m Ko&thorn;ullar&yacute;
          </h1>
          
          <div className="space-y-6 text-[#8E95B3] leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-white mb-3">1. Giri&thorn;</h2>
              <p>Workigom Ledger olarak gizlili&eth;inize &ouml;nem veriyoruz. Bu metin, finansal verilerinizin ve muhasebe kay&yacute;tlar&yacute;n&yacute;z&yacute;n nas&yacute;l g&uuml;vende tutuldu&eth;unu a&ccedil;&yacute;klamaktad&yacute;r.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-white mb-3">2. Veri G&uuml;venli&eth;i</h2>
              <p>Muhasebe verileriniz u&ccedil;tan uca &thorn;ifrelemeyle korunur. Yetkilendirilmemi&thorn; hi&ccedil;bir ki&thorn;i veya kurum verilerinize eri&thorn;emez.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">3. &Uuml;&ccedil;&uuml;nc&uuml; Taraf Ba&eth;lant&yacute;lar&yacute;</h2>
              <p>Banka veya Google entegrasyonlar&yacute;nda veriler salt okunur (read-only) olarak veya onay&yacute;n&yacute;z dahilinde i&thorn;lenir.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-white mb-3">4. &Yacute;leti&thorn;im</h2>
              <p>Hesaplar&yacute;n&yacute;zla veya verilerinizle ilgili her t&uuml;rl&uuml; soru i&ccedil;in destek ekibimizle ileti&thorn;ime ge&ccedil;ebilirsiniz.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
