"use client";

import { motion } from "framer-motion";
import { Bot, Minus, Pin, Send, X, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface LedgerAIChatPanelProps {
  contextLabel: string;
  onClose: () => void;
}

export function LedgerAIChatPanel({ contextLabel, onClose }: LedgerAIChatPanelProps) {
  const [messages, setMessages] = useState<{ id: string; role: "ai" | "user"; text: string }[]>([
    {
      id: "1",
      role: "ai",
      text: "Merhaba, ben Ledger AI. Şu anda " + contextLabel + " ekranındayız. Size nasıl yardımcı olabilirim?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue;
    setInputValue("");
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", text: userMessage },
    ]);
    
    setIsLoading(true);

    try {
      const history = messages.filter(m => m.id !== "1").map(m => ({ role: m.role, content: m.text }));
      const { data, error } = await supabase.functions.invoke('ledger-ai-chat', {
        body: {
          prompt: userMessage,
          customInstruction: `Kullanıcı ${contextLabel} bağlamında işlem yapıyor. Bu bilgiye göre yardımcı ol.`,
          history
        }
      });

      if (error) throw error;
      
      let replyText = data?.text;
      if (data?.success === false && data?.error) {
        replyText = data.error;
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "ai", text: replyText || "Bir sorun oluştu, lütfen tekrar deneyin." },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "ai", text: `Hata oluştu: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.section
      key="panel"
      initial={{ opacity: 0, y: 18, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="flex h-[30.5rem] max-h-[calc(100vh-40px)] w-[21.25rem] flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#12151C]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
    >
      <header className="flex items-center justify-between border-b border-white/5 px-1 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#9D5CFF]">
            <Bot className="h-5 w-5 text-white" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Ledger AI</p>
            <p className="text-xs text-[#3FB950]">● Çevrimiçi</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="rounded-lg p-2 text-[#8B949E] transition hover:bg-white/5 hover:text-white" aria-label="Sohbeti sabitle">
            <Pin className="h-1 w-1" />
          </button>
          <button onClick={onClose} className="rounded-lg p-2 text-[#8B949E] transition hover:bg-white/5 hover:text-white" aria-label="Sohbeti küçült">
            <Minus className="h-1 w-1" />
          </button>
          <button onClick={onClose} className="rounded-lg p-2 text-[#8B949E] transition hover:bg-white/5 hover:text-white" aria-label="Sohbeti kapat">
            <X className="h-1 w-1" />
          </button>
        </div>
      </header>

      <div className="border-b border-white/5 px-1 py-2">
        <span className="inline-flex rounded-full border border-cyan-400/15 bg-cyan-400/5 px-3 py-1 text-[11px] text-[#00DAF3]">
          Bağlam: {contextLabel}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto p-1 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[85%] rounded-2xl p-3 text-sm ${
              msg.role === "ai"
                ? "rounded-tl-md border border-white/5 bg-white/[0.04] text-[#D7DEE7]"
                : "ml-auto rounded-tr-md bg-gradient-to-r from-[#3B82F6] to-[#9D5CFF] text-white"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-white/5 px-1 py-3">
        {["Özetle", "Durumu kontrol et", "Takip oluştur"].map((command) => (
          <button
            key={command}
            onClick={() => setInputValue(command)}
            className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5 text-xs text-[#8B949E] transition hover:border-cyan-400/20 hover:text-white"
          >
            {command}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/5 p-3">
        <input
          type="text"
          value={inputValue}
          disabled={isLoading}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ledger AI'a sorun..."
          className="min-w-0 flex-1 rounded-xl border border-white/5 bg-white/[0.035] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#65707D] focus:border-cyan-400/30 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#9D5CFF] text-white transition hover:brightness-110 disabled:opacity-50"
          aria-label="Mesaj gönder"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </motion.section>
  );
}
