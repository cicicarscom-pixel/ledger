"use client";

import { Client } from "@/modules/clients/application/get-clients.action";
import { CheckCircle2, FileText, Send, Phone, MessageSquare, AlertCircle } from "lucide-react";

interface ClientCommunicationProps {
  client: Client;
}

export function ClientCommunication({ client }: ClientCommunicationProps) {
  // Mock timeline events
  const events: any[] = [];

  return (
    <div className="flex h-full flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">İş Akışı / Sekreter Timeline</h3>
        <button className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 border border-white/5">
          + Yeni Aksiyon
        </button>
      </div>

      
      <div className="relative flex-1 pl-2 space-y-6 before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-px before:bg-white/10">
        {events.length > 0 ? (
          events.map((event) => {
            const Icon = event.icon;
            return (
              <div key={event.id} className="relative flex gap-1 items-start">
                <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${event.bg} border border-white/5 shadow-lg`}>
                  <Icon className={`h-3.5 w-3.5 ${event.color}`} />
                </div>
                
                <div className="flex flex-col gap-1 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-1 flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-[13px] font-semibold text-white">{event.title}</h4>
                    <span className="text-[11px] text-[#8B949E]">{event.date}</span>
                  </div>
                  <p className="text-[12px] text-[#8B949E] leading-relaxed">{event.description}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 opacity-50">
            <MessageSquare className="h-8 w-8 text-[#8B949E] mb-3" />
            <p className="text-sm text-[#8B949E]">Henüz bir işlem veya sekreter notu bulunmuyor.</p>
          </div>
        )}
      </div>

    </div>
  );
}