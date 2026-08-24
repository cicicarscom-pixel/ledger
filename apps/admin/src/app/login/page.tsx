'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { login } from './actions'
import { ShieldAlert, Loader2 } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center glow-cyan shadow-[0_0_15px_rgba(0,218,243,0.3)]"
    >
      {pending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sisteme Giriş Yap'}
    </button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState(
    async (prevState: any, formData: FormData) => await login(formData),
    null
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#080A0F] to-[#0E1117] p-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-card border border-border shadow-2xl relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col items-center mb-8">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <ShieldAlert className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
            Workigom Super Admin
          </h1>
          <p className="text-text-muted text-sm mt-2">Yetkili personel girişi</p>
        </div>

        <form action={formAction} className="relative z-10 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-muted">E-posta</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="admin@workigom.com"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-muted">Şifre</label>
            <input
              name="password"
              type="password"
              required
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm text-center font-medium">
              {state.error}
            </div>
          )}

          <div className="pt-2">
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  )
}