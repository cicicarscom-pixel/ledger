"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      router.push("/flow"); // or wherever the dashboard is
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#05070A] flex items-center justify-center relative overflow-hidden selection:bg-[#00F0FF]/30">
      
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-[#8A2BE2]/20 to-[#00F0FF]/10 rounded-full blur-[120px] pointer-events-none opacity-50 z-0"></div>
      
      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[440px] bg-[#0A0D14]/80 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 md:p-10 shadow-[0_0_60px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.02)] relative z-10"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/20 flex items-center justify-center border border-[#00F0FF]/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <span className="text-[#00F0FF] text-[16px] font-black">W</span>
            </div>
            <span className="text-white font-extrabold text-[20px] tracking-tight">Workigom <span className="text-[#00F0FF]">Flow</span></span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-white text-[28px] font-bold tracking-tight mb-2">Giriş Yap</h1>
          <p className="text-[#8E95B3] text-[14px]">İşletmenizi yöneten tek yapay zekaya dönün.</p>
        </div>

        {/* Google Login Button */}
        <motion.button 
          whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            const supabase = createClient();
            supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/flow' } });
          }}
          type="button"
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 flex items-center justify-center gap-3 transition-colors mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-white font-medium text-[15px]">Google ile devam et</span>
        </motion.button>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-white/5"></div>
          <span className="text-[#8E95B3] text-[12px] uppercase tracking-wider font-medium">veya e-posta ile</span>
          <div className="flex-1 h-px bg-white/5"></div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-[#8E95B3] text-[13px] font-medium mb-1.5 block">E-posta Adresi</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@sirket.com"
              required
              className="w-full bg-[#07090E] border border-white/10 rounded-xl px-4 py-3.5 text-white text-[14px] outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all placeholder:text-[#8E95B3]/50"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[#8E95B3] text-[13px] font-medium block">Şifre</label>
              <Link href="#" className="text-[#00F0FF] text-[12px] hover:underline">Şifremi unuttum</Link>
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#07090E] border border-white/10 rounded-xl px-4 py-3.5 text-white text-[14px] outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all placeholder:text-[#8E95B3]/50 tracking-widest"
            />
          </div>

          <motion.button 
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(0,240,255,0.4)" }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-[#00F0FF] to-[#8A2BE2] text-white font-bold py-3.5 rounded-xl mt-4 transition-all text-[15px] disabled:opacity-50 flex justify-center items-center h-[52px]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Giriş Yap"
            )}
          </motion.button>
        </form>

        <p className="text-[#8E95B3] text-[14px] text-center mt-8">
          Hesabınız yok mu? <Link href="#" className="text-white font-semibold hover:text-[#00F0FF] transition-colors">Ücretsiz Kayıt Olun</Link>
        </p>
      </motion.div>
    </main>
  );
}
