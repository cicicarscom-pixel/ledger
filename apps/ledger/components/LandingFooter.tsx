import React from 'react';
import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="border-t border-white/5 py-16 bg-[#0B0F19]">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          <div className="lg:col-span-2">
            <Link className="flex items-center gap-2 mb-6" href="/">
              <img src="/ledger/ledgerlogo1.png" alt="Workigom Ledger Logo" className="h-8 w-auto object-contain" />
            </Link>
            <p className="text-xs text-[#A3B1C6] mb-6 max-w-sm">
              Workigom Ledger, mali müşavirlerin mükellef ilişkilerini yönettikleri yapay zeka destekli akıllı bir platformdur.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm text-white">Ürün</h4>
            <ul className="space-y-2 text-xs text-[#A3B1C6]">
              <li><Link className="hover:text-white transition-colors" href="/ozellikler">Özellikler</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/fiyatlandirma">Fiyatlandırma</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/entegrasyonlar">Entegrasyonlar</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm text-white">Kaynaklar</h4>
            <ul className="space-y-2 text-xs text-[#A3B1C6]">
              <li><Link className="hover:text-white transition-colors" href="/kaynaklar">Blog & Rehberler</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/kaynaklar">SSS</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm text-white">Şirket</h4>
            <ul className="space-y-2 text-xs text-[#A3B1C6]">
              <li><Link className="hover:text-white transition-colors" href="https://www.workigom.com/hakkimizda">Hakkımızda</Link></li>
              <li><Link className="hover:text-white transition-colors" href="https://www.workigom.com/policy">Gizlilik Politikası</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 pt-6 flex justify-between items-center text-[10px] text-[#A3B1C6]">
          <p>© {new Date().getFullYear()} Workigom Ledger. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
}