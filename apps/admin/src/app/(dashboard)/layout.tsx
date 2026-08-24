import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto bg-gradient-to-br from-[#080A0F] to-[#0E1117]">
        {children}
      </main>
    </div>
  );
}