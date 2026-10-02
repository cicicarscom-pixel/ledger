"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Client } from "@/modules/clients/application/get-clients.action";
import { AdvisorInviteCard } from "./AdvisorInviteCard";
import { ClientList } from "./ClientList";
import { ClientDetail } from "./ClientDetail";
import { acceptConnectionAction } from "@/modules/clients/application/accept-connection.action";
import { rejectConnectionAction } from "@/modules/clients/application/reject-connection.action";
import { AlertCircle, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface ClientsPageProps {
  advisorCode: string | null;
  clients: Client[];
}

export function ClientsPage({ advisorCode, clients }: ClientsPageProps) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id);
  const [query, setQuery] = useState("");
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const router = useRouter();

  // Yeni bağlantı isteği / iptal / koparma anında liste kendiliğinden güncellenir.
  // RLS: firma üyesi yalnız kendi firmasının bağlantı olaylarını alır.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("ledger-client-connections")
      .on("postgres_changes", { event: "*", schema: "public", table: "accountant_taxpayer_links" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const pendingClients = clients.filter((c) => c.connectionStatus === "activation_pending");

  const filteredClients = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr");

    if (!normalized) return clients;

    return clients.filter((client) =>
      [
        client?.companyName,
        client?.contactName,
        client?.taxNumber,
        client?.email,
      ].some((value) =>
        value ? value.toLocaleLowerCase("tr").includes(normalized) : false,
      ),
    );
  }, [query, clients]); // clients de bağımlılık: yenilenen liste ekrana yansısın

  const selectedClient =
    clients.find((client) => client.id === selectedClientId) ?? clients[0];

  const handleAccept = async (clientId: string) => {
    setLoadingActionId(clientId);
    const res = await acceptConnectionAction(clientId);
    if (!res.success) alert(res.error);
    else router.refresh();
    setLoadingActionId(null);
  };

  const handleReject = async (clientId: string) => {
    if (confirm("Bu bağlantı isteğini reddetmek istediğinize emin misiniz?")) {
      setLoadingActionId(clientId);
      const res = await rejectConnectionAction(clientId);
      if (!res.success) alert(res.error);
      else router.refresh();
      setLoadingActionId(null);
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-1 overflow-hidden p-1">
      <AdvisorInviteCard advisorCode={advisorCode || "Bağlantı Kodunuz Bekleniyor"} />

      {pendingClients.length > 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 mb-2 flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Onay Bekleyen Bağlantı İstekleri ({pendingClients.length})</span>
          </div>
          <div className="flex flex-col gap-2">
            {pendingClients.map((client) => (
              <div key={client.id} className="flex items-center justify-between rounded-lg bg-black/20 p-3">
                <span className="text-white text-sm font-medium">{client.companyName} <span className="text-[#8B949E] font-normal">size bağlanmak istiyor.</span></span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleReject(client.id)}
                    disabled={loadingActionId !== null}
                    className="flex items-center gap-1 rounded-md border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <X className="w-3 h-3" /> Reddet
                  </button>
                  <button 
                    onClick={() => handleAccept(client.id)}
                    disabled={loadingActionId !== null}
                    className="flex items-center gap-1 rounded-md bg-[#00daf3] px-3 py-1.5 text-xs font-medium text-black transition hover:bg-[#00b5cc] disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" /> Onayla
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(19rem,34%)_minmax(0,1fr)] gap-1">
        <ClientList
          clients={filteredClients}
          selectedClientId={selectedClient?.id}
          onSelect={setSelectedClientId}
          query={query}
          onQueryChange={setQuery}
        />

        {selectedClient ? (
          <ClientDetail client={selectedClient} />
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-white/5 bg-[#161B22] text-sm text-[#8B949E]">
            Görüntülenecek mükellef bulunamadı.
          </div>
        )}
      </div>
    </section>
  );
}
