'use client'

import type { ReactNode } from 'react'

// Yıkıcı admin işlemleri (kalıcı silme, askıya alma) için tarayıcı onayı. Onay verilmezse form gönderilmez.
export default function ConfirmButton({ message, className, title, children }: { message: string; className?: string; title?: string; children: ReactNode }) {
  return (
    <button
      type="submit"
      className={className}
      title={title}
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault() }}
    >
      {children}
    </button>
  )
}
