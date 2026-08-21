'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { createClient } from '@/utils/supabase/client';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="fixed left-0 top-0 h-full w-[64px] bg-surface border-r border-border z-50 flex flex-col items-center py-4">
      <div className="mb-4 w-full flex items-center justify-center relative group">
        <span className="material-symbols-outlined text-primary text-card-title cursor-pointer hover:scale-110 transition-transform">token</span>
      </div>
      
      <div className="flex-1 w-full flex flex-col gap-1 items-center">
        <SidebarItem icon="dashboard" label="Dashboard" href="/dashboard" active={isActive('/dashboard')} />
        <SidebarItem icon="groups" label="Mükellefler" href="/clients" active={isActive('/clients')} />
        <SidebarItem icon="fact_check" label="Onay Merkezi" href="/approval" active={pathname?.startsWith('/approval')} />
        <SidebarItem icon="archive" label="Onaylananlar" href="/approved" active={isActive('/approved')} />
        <SidebarItem icon="analytics" label="Analitik" href="/analytics" active={isActive('/analytics')} />
        <SidebarItem icon="person" label="Profil" href="/profil" active={isActive('/profil')} />
        <SidebarItem icon="settings" label="Ayarlar" href="/settings" active={isActive('/settings') || isActive('/ai-settings')} />
      </div>

      <div className="mt-auto w-full flex flex-col gap-1 items-center pb-2">
        <SidebarItem icon="help" label="Destek" href="#" />
        <SidebarItem icon="logout" label="Çıkış" onClick={handleLogout} />
      </div>
    </nav>
  );
}

function SidebarItem({ icon, label, href, active, onClick }: { icon: string, label: string, href?: string, active?: boolean, onClick?: () => void }) {
  const content = (
    <>
      <span className={`material-symbols-outlined text-[20px] transition-colors duration-medium ${active ? 'text-primary' : 'text-text-muted group-hover/item:text-text'}`} style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
      
      {/* Tooltip */}
      <div className="absolute left-[56px] top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:translate-x-[4px] transition-all duration-medium ease-in-out z-50 flex items-center">
        <div className={`px-3 py-2 rounded-card whitespace-nowrap font-bold text-label shadow-glow-primary relative ${active ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-surface border border-border text-text'}`}>
          <div className={`absolute -left-[6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[6px] ${active ? 'border-r-primary/20' : 'border-r-border'}`}></div>
          {label}
        </div>
      </div>
    </>
  );

  const className = `relative flex items-center justify-center w-[42px] h-[42px] rounded-[12px] group/item transition-all duration-medium ease-in-out ${active ? 'bg-primary/10 border-l-[3px] border-l-primary' : 'hover:bg-card/50 hover:scale-[1.02]'}`;

  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href || '#'} className={className}>
      {content}
    </Link>
  );
}
