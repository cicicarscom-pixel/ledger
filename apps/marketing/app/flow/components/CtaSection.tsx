"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="relative z-20 w-full max-w-[1000px] mx-auto px-6 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="w-full bg-gradient-to-r from-[#0D1017] to-[#161922] border border-white/10 rounded-[32px] p-12 flex flex-col md:flex-row items-center justify-between overflow-hidden shadow-2xl relative group"
      >
        {/* Animated Glow */}
        <div className="absolute top-[-200px] left-[-100px] w-[400px] h-[400px] bg-[#00F0FF]/10 blur-[100px] rounded-full group-hover:bg-[#00F0FF]/20 transition-colors duration-700"></div>
        <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] bg-[#8A2BE2]/10 blur-[80px] rounded-full group-hover:bg-[#8A2BE2]/20 transition-colors duration-700"></div>
        
        {/* Border glow effect on hover */}
        <div className="absolute inset-0 border border-[#00F0FF]/0 rounded-[32px] group-hover:border-[#00F0FF]/30 transition-colors duration-700 shadow-[inset_0_0_0_rgba(0,240,255,0)] group-hover:shadow-[inset_0_0_20px_rgba(0,240,255,0.1)]"></div>

        <div className="flex-1 z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
           {/* Robot Image Placeholder */}
           <div className="w-[120px] h-[120px] md:w-[150px] md:h-[150px] rounded-2xl overflow-hidden shadow-2xl relative shrink-0 bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
             <span className="material-symbols-outlined text-[64px] text-[#00F0FF]">robot_2</span>
             <div className="absolute inset-0 bg-gradient-to-tr from-[#8A2BE2]/40 to-transparent"></div>
           </div>
           
           <div className="flex flex-col items-start">
             <h2 className="text-[36px] font-extrabold text-white mb-4 leading-tight tracking-tight">
               İşletmenizin Geleceği<br/>Bugünden Başlasın
             </h2>
           <p className="text-[#8E95B3] text-[14px] mb-8 font-medium max-w-[350px]">
             <span className="text-white">Workigom</span> <span className="text-[#00F0FF]">Flow</span> ile tanışın, işlerinizi kolaylaştırın ve büyümenize odaklanın.
           </p>
           <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
             <Link
               href="https://flow.workigom.com/login?mode=signup"
               className="w-full md:w-auto bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-white font-bold px-8 py-3.5 rounded-full transition-all text-[14px] relative overflow-hidden block text-center hover:scale-105 hover:shadow-[0_0_25px_rgba(0,240,255,0.5)]"
             >
               <span className="relative z-10">Ücretsiz Hesap Oluştur</span>
               <span className="material-symbols-outlined text-[16px] align-middle ml-1 relative z-10">arrow_forward</span>
               {/* Shine effect */}
               <motion.div 
                 className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                 initial={{ x: "-100%" }}
                 animate={{ x: "200%" }}
                 transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
               />
             </Link>
             <motion.button 
               whileHover={{ backgroundColor: "rgba(17, 20, 36, 1)", borderColor: "rgba(255,255,255,0.2)" }}
               whileTap={{ scale: 0.95 }}
               className="w-full md:w-auto bg-transparent border border-[#232B45] text-white font-semibold px-8 py-3.5 rounded-full transition-colors text-[14px]"
             >
               Demo Talep Et
             </motion.button>
           </div>
        </div>

        {/* 3D Robot Placeholder */}
        <div className="hidden md:flex items-center justify-center w-[200px] h-[200px] bg-[#111424] rounded-full border border-white/5 shadow-inner">
           <div className="w-[120px] h-[120px] bg-gradient-to-b from-[#00F0FF]/20 to-transparent rounded-full flex items-center justify-center animate-pulse">
             <span className="text-[40px]">🤖</span>
           </div>
        </div>
        </div>

        <div className="w-[300px] flex flex-col gap-6 z-10 mt-10 md:mt-0">
           <motion.div whileHover={{ x: 5 }} className="flex gap-4 items-start cursor-default">
             <div className="w-8 h-8 rounded-full bg-[#111424] border border-[#232B45] flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-[#B4B8D0] text-[16px]">credit_card</span></div>
             <div>
               <div className="text-[13px] font-bold text-white mb-0.5">14 Gün Ücretsiz Deneme</div>
               <div className="text-[11px] text-[#8E95B3]">Kredi kartı gerekmez</div>
             </div>
           </motion.div>
           
           <motion.div whileHover={{ x: 5 }} className="flex gap-4 items-start cursor-default">
             <div className="w-8 h-8 rounded-full bg-[#111424] border border-[#232B45] flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-[#B4B8D0] text-[16px]">headset_mic</span></div>
             <div>
               <div className="text-[13px] font-bold text-white mb-0.5">Kurulum Desteği</div>
               <div className="text-[11px] text-[#8E95B3]">Ekibimiz sizinle ilgilenecek</div>
             </div>
           </motion.div>
           
           <motion.div whileHover={{ x: 5 }} className="flex gap-4 items-start cursor-default">
             <div className="w-8 h-8 rounded-full bg-[#111424] border border-[#232B45] flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-[#B4B8D0] text-[16px]">support_agent</span></div>
             <div>
               <div className="text-[13px] font-bold text-white mb-0.5">7/24 Destek</div>
               <div className="text-[11px] text-[#8E95B3]">Her zaman yanınızdayız</div>
             </div>
           </motion.div>
        </div>
        
      </motion.div>
    </section>
  );
}
