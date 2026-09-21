'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { sendNotification } from './actions'
import { Send, Loader2, Info } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all duration-200 glow-cyan shadow-[0_0_15px_rgba(0,218,243,0.3)] disabled:opacity-50"
    >
      {pending ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
      {pending ? 'Gönderiliyor...' : 'Bildirimi Gönder'}
    </button>
  )
}

export function NotificationForm({ profiles }: { profiles: any[] }) {
  const [state, formAction] = useFormState(sendNotification, null)
  const [targetType, setTargetType] = useState('all')

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">Hedef Kitle</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'all', label: 'Tüm Kullanıcılar' },
              { id: 'business', label: 'Sadece Mükellefler' },
              { id: 'accountant', label: 'Sadece Mali Müşavirler' },
              { id: 'single', label: 'Tekil Kullanıcı' },
            ].map(type => (
              <label 
                key={type.id} 
                className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${targetType === type.id ? 'bg-primary/10 border-primary text-primary glow-cyan' : 'bg-surface border-border text-text-muted hover:border-white/20'}`}
              >
                <input 
                  type="radio" 
                  name="targetType" 
                  value={type.id} 
                  checked={targetType === type.id} 
                  onChange={(e) => setTargetType(e.target.value)}
                  className="hidden"
                />
                <span className="text-sm font-semibold">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {targetType === 'single' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-sm font-medium text-text-muted mb-2">Kullanıcı Seçin</label>
            <select name="profileId" className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary transition-all">
              <option value="">-- Lütfen bir kullanıcı seçin --</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.display_name || 'İsimsiz'} ({p.email || p.user_type || 'Email yok'})
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" /> Çok fazla kullanıcı varsa buraya ileride arama kutusu (Select2) eklenebilir.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">Bildirim Başlığı</label>
          <input 
            type="text" 
            name="title" 
            required 
            placeholder="Örn: Sistem Bakımı veya Yeni Özellik"
            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">Mesaj İçeriği</label>
          <textarea 
            name="message" 
            required 
            rows={4}
            placeholder="Bildirim metnini buraya yazın..."
            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary transition-all resize-none"
          ></textarea>
        </div>
      </div>

      {state?.error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-2">
          <Info className="h-4 w-4" />
          {state.success}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-border">
        <SubmitButton />
      </div>
    </form>
  )
}
