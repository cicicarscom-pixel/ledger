'use client'

import { useState, useTransition } from 'react'
import { Unplug } from 'lucide-react'
import { disconnectWhatsappSession } from './actions'

export default function DisconnectButton({ session, label }: { session: string; label: string }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const onClick = () => {
    if (!window.confirm(`${label} işletmesinin WhatsApp bağlantısı KESİLECEK ve oturum silinecek. Devam edilsin mi?`)) return
    start(async () => {
      const r = await disconnectWhatsappSession(session)
      setMsg(r.message)
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {msg && <span className="text-xs text-text-muted max-w-[220px] truncate" title={msg}>{msg}</span>}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="p-2 hover:bg-danger/10 rounded-lg text-text-muted hover:text-danger transition-colors disabled:opacity-50"
        title="WhatsApp bağlantısını kes"
      >
        <Unplug className="h-4 w-4" />
      </button>
    </div>
  )
}
