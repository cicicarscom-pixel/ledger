'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get('error') === 'flow_blocked') {
      setError("🚫 Bu hesap Flow (Esnaf) uygulamasına aittir. Müşavir paneline giriş yapamazsınız.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const supabase = createClient();
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setIsPending(false);
      setError(signInError.message);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#07090E] flex flex-col lg:flex-row overflow-hidden font-jakarta">
      {/* Sol Panel: Gorseller */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0D14] via-[#07090E] to-[#04060A] z-0"></div>
        
        <div className="absolute top-0 right-0 w-full h-[500px] bg-[#00F0FF]/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-full h-[500px] bg-[#4318FF]/10 blur-[120px] rounded-full pointer-events-none translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <img src="/ledger/ledger1logo.png" alt="Workigom Ledger" className="h-44 w-auto object-contain" />
          </div>
          
          <div className="max-w-md">
            <h1 className="text-[40px] font-black text-white leading-[1.1] mb-6">
              Yeni Nesil <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#0080FF]">
                AI Muhasebe
              </span>
            </h1>
            <p className="text-[#8E95B3] text-[16px] leading-relaxed">
              Mükelleflerinizle olan tüm tahsilat, onay ve fatura süreçlerini tek bir platformdan yönetin. Yapay zeka ile saatler süren işleri dakikalara indirin.
            </p>
          </div>
        </div>

        {/* Dashboard Mockup (Visual) */}
        <div className="relative z-10 mt-12 pl-12 flex-1">
          <motion.div 
            initial={{ opacity: 0, x: 50, rotateY: 20 }}
            animate={{ opacity: 1, x: 0, rotateY: -10 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-0 left-12 right-[-20%] bottom-[-10%] bg-[#0D1017] border border-[#232B45] rounded-tl-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden"
            style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
          >
            <div className="h-10 border-b border-[#232B45] flex items-center px-4 gap-2 bg-[#0A0D14]/80">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
            </div>
            <div className="p-6 flex gap-6 h-full">
              <div className="w-48 flex flex-col gap-3">
                <div className="h-8 bg-[#232B45]/50 rounded-lg w-full mb-4"></div>
                <div className="h-3 bg-[#232B45]/30 rounded w-3/4"></div>
                <div className="h-3 bg-[#232B45]/30 rounded w-5/6"></div>
                <div className="h-3 bg-[#232B45]/30 rounded w-full"></div>
                <div className="h-3 bg-[#232B45]/30 rounded w-2/3"></div>
              </div>
              <div className="flex-1 flex gap-4 items-end">
                <div className="w-1/4 h-[40%] bg-gradient-to-t from-[#00F0FF]/20 to-[#00F0FF]/60 rounded-t-md relative group"><div className="absolute inset-x-0 top-0 border-t-2 border-[#00F0FF]"></div></div>
                <div className="w-1/4 h-[70%] bg-gradient-to-t from-[#00F0FF]/20 to-[#00F0FF]/60 rounded-t-md relative"><div className="absolute inset-x-0 top-0 border-t-2 border-[#00F0FF]"></div></div>
                <div className="w-1/4 h-[50%] bg-gradient-to-t from-[#00F0FF]/20 to-[#00F0FF]/60 rounded-t-md relative"><div className="absolute inset-x-0 top-0 border-t-2 border-[#00F0FF]"></div></div>
                <div className="w-1/4 h-[90%] bg-gradient-to-t from-[#00F0FF]/20 to-[#00F0FF]/80 rounded-t-md relative shadow-[0_0_20px_rgba(0,240,255,0.4)]"><div className="absolute inset-x-0 top-0 border-t-2 border-[#00F0FF] shadow-[0_0_10px_#00F0FF]"></div></div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="text-[#8E95B3] text-[12px]">
          © {new Date().getFullYear()} Workigom Inc. Tüm hakları saklıdır.
        </div>
      </div>

      {/* Right Column (Login Form) */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 md:p-12 lg:p-24 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-12">
            <img src="/ledger/ledger1logo.png" alt="Workigom Ledger" className="h-24 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold text-white mb-2">Hesabınıza giriş yapın</h2>
            <p className="text-[#8E95B3] text-[14px]">
              Muhasebe ve finans verilerinize ulaşmak için giriş yapın.
            </p>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/50 text-error px-4 py-3 rounded-xl text-[13px] font-medium text-center mb-6">
              {error}
            </div>
          )}

          <button 
            type="button" 
            onClick={async () => {
              try {
                const supabase = createClient()
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
                  },
                })
                if (error) throw error
              } catch (error) {
                console.error('Google login error:', error)
              }
            }}
            className="w-full flex items-center justify-center gap-3 bg-white text-[#07090E] font-bold py-3.5 px-4 rounded-xl hover:bg-gray-100 transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(255,255,255,0.1)] mb-6 relative overflow-hidden group"
          >
            <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="relative z-10">Google ile Giriş Yap</span>
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-[#8E95B3] text-[12px] font-medium uppercase tracking-wider">veya e-posta ile</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-300">E-posta Adresi</label>
              <input 
                type="email" 
                name="email"
                required
                placeholder="ornek@sirket.com" 
                className="w-full bg-[#0D1017] border border-[#232B45] text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF]/50 transition-all placeholder-[#8E95B3]/50"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[13px] font-bold text-gray-300">Şifre</label>
                <a href="#" className="text-[12px] text-[#00F0FF] hover:text-white transition-colors font-medium">Şifremi unuttum</a>
              </div>
              <input 
                type="password" 
                name="password"
                required
                placeholder="••••••••" 
                className="w-full bg-[#0D1017] border border-[#232B45] text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF]/50 transition-all placeholder-[#8E95B3]/50"
              />
            </div>

            <button 
              type="submit" 
              disabled={isPending}
              className={`w-full text-center bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-white font-bold py-3.5 px-4 rounded-xl mt-2 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all hover:scale-[1.02] relative overflow-hidden group ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <span className="relative z-10">{isPending ? "Giriş Yapılıyor..." : "Giriş Yap"}</span>
            </button>
          </form>
        </motion.div>
      </div>

    </div>
  );
}