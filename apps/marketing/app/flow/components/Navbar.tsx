"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Navbar() {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 w-full px-6 py-4 flex items-center justify-between bg-[#11141E] border-b border-white/5"
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <img src="/images/flow-logo.png" alt="Workigom Flow" className="h-10 w-auto object-contain" />
      </Link>

      {/* Center Links */}
      <nav className="hidden lg:flex items-center gap-8">
        {["Özellikler", "Fiyatlandırma", "Çözümler", "Kaynaklar", "Entegrasyonlar", "Blog"].map((item) => (
          <Link key={item} href={`#${item.toLowerCase()}`} className="text-[#8E95B3] hover:text-white text-[14px] font-medium transition-colors">
            {item}
          </Link>
        ))}
      </nav>

      {/* Right Buttons */}
      <div className="flex items-center gap-4">
        <Link 
          href="https://flow.workigom.com/login" 
          className="px-5 py-2 rounded-full border border-white/10 text-white text-[14px] font-medium hover:bg-white/5 transition-colors"
        >
          Giriş Yap
        </Link>
        <Link 
          href="https://flow.workigom.com/login" 
          className="px-5 py-2 rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#00F0FF] text-white text-[14px] font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)] transition-all"
        >
          Ücretsiz Dene
        </Link>
      </div>
    </motion.header>
  );
}
