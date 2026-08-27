import React from 'react';
import Link from 'next/link';

export function LandingHeader() {
  return (
    <header className="w-full z-50 glass-panel-landing border-b-0 border-white/10 py-4">
      <div className="container mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link href="/">
            <img src="/ledger/ledgerlogo1.png" alt="Workigom Ledger Logo" className="h-8 w-auto object-contain" />
          </Link>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-300">
          <Link className="hover:text-white transition-colors" href="/ozellikler">Özellikler</Link>
          <Link className="hover:text-white transition-colors" href="/avantajlar">Avantajlar</Link>
          <Link className="hover:text-white transition-colors" href="/entegrasyonlar">Entegrasyonlar</Link>
          <Link className="hover:text-white transition-colors" href="/fiyatlandirma">Fiyatlandırma</Link>
          <Link className="hover:text-white transition-colors" href="/kaynaklar">Kaynaklar</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link className="text-sm font-medium hover:text-white transition-colors" href="/login">Giriş Yap</Link>
          <Link className="bg-[#8C3FE8] hover:bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors" href="/register">Ücretsiz Dene</Link>
        </div>
      </div>
    </header>
  );
}