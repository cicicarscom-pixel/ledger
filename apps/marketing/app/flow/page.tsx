import React from "react";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import OmnichannelSection from "./components/OmnichannelSection";
import FeaturesSection from "./components/FeaturesSection";
import WorkflowSection from "./components/WorkflowSection";
import IntegrationsSection from "./components/IntegrationsSection";
import CtaSection from "./components/CtaSection";

export const metadata = {
  title: "Workigom Flow | İşletmenizi Yöneten Tek Yapay Zeka",
  description: "Sosyal medyadan muhasebeye, müşteri iletişiminden içerik üretimine kadar tüm iş süreçlerinizi tek platformda otonom yapay zeka ile yönetin.",
};

export default function FlowLandingPage() {
  return (
    <div className="min-h-screen bg-[#070B14] text-white selection:bg-[#00F0FF]/30 selection:text-white font-sans overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#8A2BE2]/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
      <div className="fixed top-[20%] right-[-10%] w-[40%] h-[50%] bg-[#00F0FF]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
      
      {/* Noise overlay for premium feel */}
      <div className="fixed inset-0 bg-[url('/noise.svg')] opacity-[0.03] pointer-events-none z-0 mix-blend-overlay"></div>

      <Navbar />

      <main className="relative z-10 flex flex-col items-center pt-16">
        <HeroSection />
        <OmnichannelSection />
        <FeaturesSection />
        <WorkflowSection />
        <IntegrationsSection />
        <CtaSection />
      </main>
    </div>
  );
}

// Trigger deployment
