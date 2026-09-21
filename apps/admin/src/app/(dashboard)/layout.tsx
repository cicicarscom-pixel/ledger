import { Sidebar } from '@/components/Sidebar';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: admin } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!admin) {
    redirect('/login?error=unauthorized');
  }

  return (
    <div className="flex min-h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto bg-gradient-to-br from-[#080A0F] to-[#0E1117]">
        {children}
      </main>
    </div>
  );
}