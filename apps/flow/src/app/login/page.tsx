'use client'

import { useActionState, useState } from 'react'
import { authenticate } from '@/actions/auth'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const res = await authenticate(formData)
      if (res && !res.success) {
        return { message: res.message }
      }
      return { message: '' }
    },
    { message: '' }
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden" style={{
      backgroundImage: "radial-gradient(circle at top right, rgba(0,162,255,0.1) 0%, transparent 40%), radial-gradient(circle at bottom left, rgba(182,0,248,0.1) 0%, transparent 40%)"
    }}>
      <div className="glass-panel max-w-md w-full rounded-2xl p-xl z-10 border border-white/5 relative">
        <div className="flex flex-col items-center mb-xl">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 mb-sm">
            <span className="material-symbols-outlined text-primary text-[32px]">
              {mode === 'login' ? 'terminal' : 'person_add'}
            </span>
          </div>
          <h1 className="font-headline-lg text-white text-[28px] font-bold tracking-tight">AI-ESNAF</h1>
          <p className="font-label-sm text-on-surface-variant text-[14px]">
            {mode === 'login' ? 'Command Center Login' : 'Create an Account'}
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-md">
          {/* Hidden input to pass mode to server action */}
          <input type="hidden" name="mode" value={mode} />

          {state?.message && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">
              {state.message}
            </div>
          )}
          
          <div className="flex flex-col gap-xs">
            <label className="text-on-surface-variant font-label-sm text-sm ml-1">Email</label>
            <input 
              name="email" 
              type="email" 
              required
              className="bg-surface-container-low border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="admin@flow.ai"
            />
          </div>

          <div className="flex flex-col gap-xs mb-sm">
            <label className="text-on-surface-variant font-label-sm text-sm ml-1">Password</label>
            <input 
              name="password" 
              type="password" 
              required
              className="bg-surface-container-low border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isPending}
            className="w-full bg-gradient-to-r from-primary-container to-tertiary-container hover:from-primary hover:to-tertiary text-on-primary-container font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_0_15px_rgba(0,162,255,0.2)] hover:shadow-[0_0_25px_rgba(0,162,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <div className="w-5 h-5 border-2 border-on-primary-container border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{mode === 'login' ? 'Secure Login' : 'Create Account'}</span>
                <span className="material-symbols-outlined text-[20px]">
                  {mode === 'login' ? 'login' : 'how_to_reg'}
                </span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-on-surface-variant text-sm">
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
            <button 
              type="button" 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>

      {/* Decorative blurred blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tertiary/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
    </div>
  )
}
