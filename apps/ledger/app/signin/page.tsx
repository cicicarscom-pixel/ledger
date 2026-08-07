"use client";

import React, { useState, useTransition } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LedgerLoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: formData.get('email') as string,
          password: formData.get('password') as string,
        });

        if (authError) {
          setError("E-posta veya şifre hatalı.");
          return;
        }

        router.push("/clients");
        router.refresh();
      } catch (err: any) {
        console.error("Giriş Hatası:", err);
        setError("Sunucuya bağlanılırken bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.");
      }
    });
  };
  return (
    <div className="min-h-screen bg-[#070B14] text-white selection:bg-[#00F0FF]/30 selection:text-white font-sans flex overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#00F0FF]/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-[#8A2BE2]/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
      <div className="fixed inset-0 bg-[url('/noise.svg')] opacity-[0.03] pointer-events-none z-0 mix-blend-overlay"></div>

      {/* Left Column (Visuals) */}
      <div className="hidden lg:flex flex-1 relative z-10 flex-col justify-between p-12 overflow-hidden border-r border-white/5 bg-[#0A0D14]/50 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/20 flex items-center justify-center border border-[#00F0FF]/50 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <span className="text-[#00F0FF] text-[16px] font-black">W</span>
          </div>
          <span className="text-white font-bold text-[20px] tracking-tight">Workigom <span className="text-[#00F0FF]">Ledger</span></span>
        </motion.div>

        <div className="relative z-10 my-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h1 className="text-[42px] font-extrabold leading-tight mb-4 tracking-tight">
              Finansal zekanızı <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#0080FF]">otomatikleştiren</span> güç.
            </h1>
            <p className="text-[#8E95B3] text-[16px] max-w-[400px] leading-relaxed">
              Ön muhasebe, gelir-gider takibi ve yapay zeka destekli raporlama ile işletmenizin geleceğini bugünden görün.
            </p>
          </motion.div>

          {/* Abstract floating UI representation */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="w-full h-[250px] relative mt-12 perspective-1000"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00F0FF]/10 to-transparent border border-white/10 rounded-2xl transform rotate-x-12 rotate-y-[-12deg] shadow-2xl overflow-hidden flex flex-col p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="w-24 h-4 bg-white/10 rounded-full animate-pulse"></div>
                <div className="w-12 h-4 bg-[#00F0FF]/30 rounded-full"></div>
              </div>
              <div className="flex-1 flex gap-4 items-end">
                <div className="w-1/4 h-[40%] bg-gradient-to-t from-[#00F0FF]/20 to-[#00F0FF]/60 rounded-t-md relative group"><div className="absolute inset-x-0 top-0 border-t-2 border-[#00F0FF]"></div></div>
                <div className="w-1/4 h-[70%] bg-gradient-to-t from-[#00F0FF]/20 to-[#00F0FF]/60 rounded-t-md relative"><div className="absolute inset-x-0 top-0 border-t-2 border-[#00F0FF]"></div></div>
                <div className="w-1/4 h-[50%] bg-gradient-to-t from-[#00F0FF]/20 to-[#00F0FF]/60 rounded-t-md relative"><div className="absolute inset-x-0 top-0 border-t-2 border-[#00F0FF]"></div></div>
                <div className="w-1/4 h-[90%] bg-gradient-to-t from-[#00F0FF]/20 to-[#00F0FF]/80 rounded-t-md relative shadow-[0_0_20px_rgba(0,240,255,0.4)]"><div className="absolute inset-x-0 top-0 border-t-2 border-[#00F0FF] shadow-[0_0_10px_#00F0FF]"></div></div>
              </div>
            </div>
            
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 5 }}
              className="absolute -right-8 top-12 w-[180px] bg-[#0A0D14]/90 backdrop-blur-xl border border-[#00F0FF]/30 rounded-xl p-4 shadow-[0_15px_30px_rgba(0,0,0,0.5)] flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-[#25D366]/20 flex items-center justify-center border border-[#25D366]/30">
                <span className="material-symbols-outlined text-[#25D366] text-[20px]">check_circle</span>
              </div>
              <div>
                <div className="text-white text-[12px] font-bold">Tahsilat Alındı</div>
                <div className="text-[#00F0FF] text-[14px] font-black">+ 12.500 ₺</div>
              </div>
            </motion.div>
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
            <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/20 flex items-center justify-center border border-[#00F0FF]/50 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <span className="text-[#00F0FF] text-[16px] font-black">W</span>
            </div>
            <span className="text-white font-bold text-[24px] tracking-tight">Workigom <span className="text-[#00F0FF]">Ledger</span></span>
          </div>

          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold text-white mb-2">Hesabınıza giriş yapın</h2>
            <p className="text-[#8E95B3] text-[14px]">
              Muhasebe ve finans verilerinize ulaşmak için giriş yapın.
            </p>
          </div>

          <Link href="/dashboard" className="w-full flex items-center justify-center gap-3 bg-white text-[#07090E] font-bold py-3.5 px-4 rounded-xl hover:bg-gray-100 transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(255,255,255,0.1)] mb-6 relative overflow-hidden group">
            <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="relative z-10">Google ile Giriş Yap</span>
            <div className="absolute inset-0 bg-white/20 -translate-x-[150%] skew-x-[-20deg] group-hover:animate-[shine_1.5s_ease-in-out]"></div>
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-[#8E95B3] text-[12px] font-medium uppercase tracking-wider">veya e-posta ile</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-error/10 border border-error/50 text-error px-4 py-3 rounded-xl text-[13px] font-medium text-center">
                {error}
              </div>
            )}
            
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
              {!isPending && (
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                />
              )}
            </button>
          </form>

          <p className="text-center text-[14px] text-[#8E95B3] mt-8">
            Henüz hesabınız yok mu? <Link href="/register" className="text-white font-bold hover:text-[#00F0FF] transition-colors">Ücretsiz Hesap Oluştur</Link>
          </p>
        </motion.div>
      </div>

    </div>
  );
}
