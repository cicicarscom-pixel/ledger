"use client";

import { useState } from "react";
import { Client } from "@/modules/clients/application/get-clients.action";
import { ClientConnection } from "./ClientConnection";
import { ClientCommunication } from "./ClientCommunication";
import { Mail, Phone, Calendar, Globe, FileText, CheckCircle2 } from "lucide-react";

interface ClientDetailProps {
  client: Client;
}

type TabType = "genel" | "ai" | "baglanti" | "notlar" | "gecmis";

export function ClientDetail({ client }: ClientDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>("genel");

  const tabs: { id: TabType; label: string }[] = [
    { id: "genel", label: "Genel Bilgiler" },
    { id: "ai", label: "İş Akışı" },
    { id: "baglanti", label: "Bağlantı" },
    { id: "notlar", label: "Notlar" },
    { id: "gecmis", label: "Geçmiş" },
  ];

  return (
    <div className="flex flex-col rounded-[16px] border border-white/5 bg-[#12151C] shadow-[0_4px_20px_rgba(0,0,0,0.2)] overflow-hidden">
      
      {/* Header Info */}
      <div className="border-b border-white/5 bg-[#161B22] p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{client.companyName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#8B949E]">
              <span>VKN: <span className="text-white">{client.taxNumber}</span></span>
              <span>Vergi Dairesi: <span className="text-white">{client.taxOffice}</span></span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className="rounded-xl border border-white/10 bg-[#161B22] px-1 py-2 text-sm font-medium text-white transition hover:bg-white/5">
              Düzenle
            </button>
            <button className="rounded-xl bg-white/5 px-1 py-2 text-sm font-medium text-white transition hover:bg-white/10">
              Mesaj Gönder
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-2 gap-y-1 rounded-xl border border-white/5 bg-[#12151C] p-1 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[#8B949E]">Yetkili Kişi</span>
            <div className="flex items-center gap-2 text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-white/10">
                <span className="text-[10px]">{client.initials}</span>
              </span>
              {client.contactName}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[#8B949E]">İletişim</span>
            <div className="flex items-center gap-1 text-white">
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#8B949E]" /> {client.phone}</span>
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-[#8B949E]" /> {client.email}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[#8B949E]">Sorumlu Müşavir</span>
            <span className="text-white">{client.assignedAccountant}</span>
          </div>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="flex items-center gap-6 border-b border-white/5 bg-[#161B22] px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative border-b-2 py-1 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-[#00DAF3] text-[#00DAF3]"
                : "border-transparent text-[#8B949E] hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeTab === "genel" && (
          <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/5 bg-[#161B22] p-5">
                <h3 className="mb-1 text-sm font-semibold text-white">Firma Bilgileri</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#8B949E]">Firma Türü</span>
                    <span className="text-white">Limited Şirket</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#8B949E]">Kuruluş Tarihi</span>
                    <span className="text-white">12.03.2018</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#8B949E]">Faaliyet Alanı</span>
                    <span className="text-white">Yazılım</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#8B949E]">Ülke / Dil</span>
                    <span className="text-white">{client.country} / {client.language}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#8B949E]">Açık Adres</span>
                    <span className="text-white text-right max-w-[150px] truncate" title={client.address?.fullAddress || `${client.address?.district || ''} ${client.address?.city || ''}`}>
                      {client.address 
                        ? `${client.address.district || ''}, ${client.address.city || ''}`
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#161B22] p-5">
                <h3 className="mb-1 text-sm font-semibold text-white">Operasyon Özeti</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#8B949E]">Sonraki Takip</span>
                    <span className="text-white">{client.nextFollowUp || "-"}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#8B949E]">Son AI Aksiyonu</span>
                    <span className="text-white">{client.recentAIAction || "-"}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#8B949E]">Bu ay gelen evrak</span>
                    <span className="text-white">18</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#8B949E]">Eksik evrak</span>
                    <span className="text-red-400">2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "ai" && <ClientCommunication client={client} />}
        
        {activeTab === "baglanti" && <ClientConnection client={client} />}

        {activeTab === "notlar" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-[#8B949E]">Bu notlar mükellefe görünmez, sadece ofis içi kullanımdır.</p>
              <button className="rounded-lg bg-white/5 px-1 py-2 text-sm font-medium text-white transition hover:bg-white/10">
                + Yeni Not Ekle
              </button>
            </div>
            
            <div className="rounded-xl border border-white/5 bg-[#161B22] p-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-300">EK</div>
                  <span className="text-sm font-medium text-white">Elif K.</span>
                  <span className="text-xs text-[#8B949E]">• 2 gün önce</span>
                </div>
                <span className="rounded bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-400">Önemli</span>
              </div>
              <p className="mt-3 text-sm text-[#D7DEE7] leading-relaxed">
                Mayıs dönemi KDV ödemeleri hakkında bilgi verildi. Evrakların ayın 15'ine kadar sisteme yüklenmesi konusunda anlaşıldı. Ledger AI üzerinden hatırlatmalar aktif edildi.
              </p>
            </div>
          </div>
        )}

        {activeTab === "gecmis" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center justify-center h-8">
            <p className="text-sm text-[#8B949E]">Sistem geçmişi yakında eklenecektir.</p>
          </div>
        )}
      </div>
    </div>
  );
}
