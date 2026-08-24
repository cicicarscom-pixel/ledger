'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Building2, Activity, ShieldAlert, LogOut } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Kullanıcılar', href: '/users', icon: Users },
  { name: 'Organizasyonlar', href: '/organizations', icon: Building2 },
  { name: 'Sistem İzleme', href: '/activity', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-72 flex-col bg-surface border-r border-border">
      <div className="flex h-20 shrink-0 items-center px-6 border-b border-border gap-3">
        <ShieldAlert className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
          Super Admin
        </span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto pt-6 px-4">
        <nav className="flex-1 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={"group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 \"}
              >
                <Icon className={"h-5 w-5 shrink-0 \"} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="pb-6 pt-4 border-t border-border mt-auto">
          <button className="w-full group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-danger hover:bg-danger/10 transition-all duration-200 border border-transparent hover:border-danger/20">
            <LogOut className="h-5 w-5 shrink-0" />
            Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
}