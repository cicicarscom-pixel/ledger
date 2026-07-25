"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function HeroSection() {
  const [activeSignal, setActiveSignal] = useState<number>(0);
  const [pulse, setPulse] = useState(false);

  // Animate the signals moving through the paths
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSignal((prev) => (prev + 1) % 5);
      setPulse(true);
      setTimeout(() => setPulse(false), 500);
    }, 2500); // Trigger every 2.5s
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative z-20 w-full max-w-[1440px] mx-auto px-6 pt-32 pb-24 flex flex-col lg:flex-row items-center justify-between min-h-[90vh]">
      
      {/* Left Column (Text & CTA) */}
      <div className="flex-1 w-full max-w-full lg:max-w-[450px] z-20 mb-16 lg:mb-0">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#111424] border border-[#232B45] mb-6"
        >
          <span className="text-[10px] font-bold tracking-widest text-[#B4B8D0] uppercase">YENİ NESİL AI İŞLETİM SİSTEMİ</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-[40px] md:text-[54px] lg:text-[64px] font-extrabold text-white leading-[1.1] mb-6 tracking-tight"
        >
          İşletmenizi<br/>
          Yöneten Tek<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#8A2BE2]">Yapay </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8A2BE2] to-[#FF00FF]">Zeka</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-[15px] md:text-[17px] text-[#8E95B3] mb-10 max-w-[450px] leading-relaxed"
        >
          Sosyal medyadan muhasebeye, müşteri iletişiminden içerik üretimine kadar tüm iş süreçlerinizi tek platformda otonom yapay zeka ile yönetin.
        </motion.p>

        {/* Feature Ticks */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap gap-x-6 gap-y-3 mb-10"
        >
          {['7/24 AI Asistan', 'Otomatik Yanıtlar', 'Akıllı Muhasebe', 'Gerçek Zamanlı Analiz'].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#8A2BE2]/20 flex items-center justify-center border border-[#8A2BE2]/50">
                <span className="material-symbols-outlined text-[#8A2BE2] text-[10px]">check</span>
              </div>
              <span className="text-[#B4B8D0] text-[12px] font-medium">{item}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center gap-4 mb-12"
        >
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(0,240,255,0.4)" }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-white font-bold px-8 py-3.5 rounded-full transition-all text-[14px] flex items-center gap-2"
          >
            Ücretsiz Deneyin <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </motion.button>
          
          <motion.button 
            whileHover={{ backgroundColor: "rgba(17, 20, 36, 1)" }}
            whileTap={{ scale: 0.95 }}
            className="bg-transparent border border-[#232B45] text-white font-semibold px-8 py-3.5 rounded-full transition-colors text-[14px] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">play_circle</span> Canlı Demo İzle
          </motion.button>
        </motion.div>

        {/* Social Proof */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex items-center gap-4"
        >
          <div className="flex -space-x-2">
            {[1,2,3,4].map(i => (
              <img key={i} src={`https://i.pravatar.cc/100?img=${i}`} alt="User" className="w-8 h-8 rounded-full border-2 border-[#07090E]" />
            ))}
          </div>
          <div>
            <div className="flex items-center gap-1 text-[#F5B400] text-[14px]">
              {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1" }}>star</span>)}
              <span className="text-white font-bold ml-1">4.9/5</span>
            </div>
            <div className="text-[11px] text-[#8E95B3]">1.000+ işletme <span className="text-white">Workigom</span> <span className="text-[#00F0FF]">Flow</span> kullanıyor</div>
          </div>
        </motion.div>
      </div>

      {/* Right Column (Product Video) */}
      <div className="flex-[1.3] relative w-full hidden lg:flex items-center justify-center z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative w-full max-w-4xl"
        >
          {/* Ambient Glow behind video */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#00F0FF]/30 to-[#8A2BE2]/30 blur-[60px] rounded-[2rem]" />
          
          {/* Video Container */}
          <div className="relative z-10 w-full rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-gray-800 overflow-hidden bg-[#07090E]">
            <video 
              src="/videos/hero_video.mp4"
              autoPlay 
              muted 
              loop 
              playsInline
              className="w-full h-auto object-cover"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
