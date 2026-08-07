"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerAccountantAction } from "../../modules/auth/application/auth.actions";

export default function LedgerRegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await registerAccountantAction(formData);

    if (result.success) {
      setSuccessMsg("Hesabınız başarıyla oluşturuldu! Lütfen giriş yapın.");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } else {
      setErrorMsg(result.error || "Bir hata oluştu.");
      setIsLoading(false);
    }
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
              Mükelleflerinizle <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#0080FF]">anında</span> bağlanın.
            </h1>
            <p className="text-[#8E95B3] text-[16px] max-w-[400px] leading-relaxed">
              Kayıt olun, size özel üretilen müşavir kodunuzu mükellefinize verin ve tüm finansal süreci tek ekrandan yönetmeye başlayın.
            </p>
          </motion.div>

          {/* Abstract floating UI representation */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="w-full h-[250px] relative mt-12 perspective-1000"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#8A2BE2]/10 to-transparent border border-white/10 rounded-2xl transform rotate-x-12 rotate-y-[-12deg] shadow-2xl overflow-hidden flex flex-col p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="w-24 h-4 bg-white/10 rounded-full animate-pulse"></div>
                <div className="w-32 h-6 bg-[#00F0FF]/20 border border-[#00F0FF]/40 rounded-md flex items-center justify-center">
                  <span className="text-[#00F0FF] text-xs font-mono font-bold tracking-widest">WG-12345</span>
                </div>
              </div>
              <div className="flex-1 flex gap-4 items-end">
                <div className="w-1/4 h-[60%] bg-gradient-to-t from-[#8A2BE2]/20 to-[#8A2BE2]/60 rounded-t-md relative group"><div className="absolute inset-x-0 top-0 border-t-2 border-[#8A2BE2]"></div></div>
                <div className="w-1/4 h-[40%] bg-gradient-to-t from-[#8A2BE2]/20 to-[#8A2BE2]/60 rounded-t-md relative"><div className="absolute inset-x-0 top-0 border-t-2 border-[#8A2BE2]"></div></div>
                <div className="w-1/4 h-[80%] bg-gradient-to-t from-[#8A2BE2]/20 to-[#8A2BE2]/60 rounded-t-md relative"><div className="absolute inset-x-0 top-0 border-t-2 border-[#8A2BE2]"></div></div>
                <div className="w-1/4 h-[90%] bg-gradient-to-t from-[#00F0FF]/20 to-[#00F0FF]/80 rounded-t-md relative shadow-[0_0_20px_rgba(0,240,255,0.4)]"><div className="absolute inset-x-0 top-0 border-t-2 border-[#00F0FF] shadow-[0_0_10px_#00F0FF]"></div></div>
              </div>
            </div>
            
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 5 }}
              className="absolute -right-8 top-12 w-[200px] bg-[#0A0D14]/90 backdrop-blur-xl border border-[#8A2BE2]/30 rounded-xl p-4 shadow-[0_15px_30px_rgba(0,0,0,0.5)] flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-[#8A2BE2]/20 flex items-center justify-center border border-[#8A2BE2]/30">
                <span className="material-symbols-outlined text-[#8A2BE2] text-[20px]">handshake</span>
              </div>
              <div>
                <div className="text-white text-[12px] font-bold">Mükellef Bağlandı</div>
                <div className="text-[#8A2BE2] text-[12px] font-medium mt-0.5">Demir Lojistik A.Ş.</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="text-[#8E95B3] text-[12px]">
          © {new Date().getFullYear()} Workigom Inc. Tüm hakları saklıdır.
        </div>
      </div>

      {/* Right Column (Register Form) */}
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
            <h2 className="text-[28px] font-extrabold text-white mb-2">Müşavir Hesabı Oluştur</h2>
            <p className="text-[#8E95B3] text-[14px]">
              Tüm mükelleflerinizi tek bir platformdan yönetmeye başlayın.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[13px] font-medium">
              {successMsg}
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[13px] font-bold text-gray-300">Ad Soyad</label>
                <input 
                  type="text" 
                  name="fullName"
                  required
                  placeholder="Ahmet Yılmaz" 
                  className="w-full bg-[#0D1017] border border-[#232B45] text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF]/50 transition-all placeholder-[#8E95B3]/50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-300">Firma / Ofis Adı</label>
              <input 
                type="text" 
                name="firmName"
                required
                placeholder="Yılmaz Mali Müşavirlik" 
                className="w-full bg-[#0D1017] border border-[#232B45] text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF]/50 transition-all placeholder-[#8E95B3]/50"
              />
            </div>

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
              <label className="text-[13px] font-bold text-gray-300">Şifre</label>
              <input 
                type="password" 
                name="password"
                required
                minLength={6}
                placeholder="••••••••" 
                className="w-full bg-[#0D1017] border border-[#232B45] text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF]/50 transition-all placeholder-[#8E95B3]/50"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full text-center bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-white font-bold py-3.5 px-4 rounded-xl mt-2 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden group"
            >
              <span className="relative z-10">{isLoading ? "Hesap Oluşturuluyor..." : "Ücretsiz Kayıt Ol"}</span>
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
              />
            </button>
          </form>

          <p className="text-center text-[14px] text-[#8E95B3] mt-8">
            Zaten hesabınız var mı? <Link href="/login" className="text-white font-bold hover:text-[#00F0FF] transition-colors">Giriş Yapın</Link>
          </p>
        </motion.div>
      </div>

    </div>
  );
}
