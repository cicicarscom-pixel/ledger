import { Search, UserX, Ban, Mail, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { toggleUserStatus, deleteUser } from './actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function UsersPage({ searchParams }: { searchParams: { group?: string } }) {
  const supabase = createClient();
  const group = searchParams.group || 'all';
  
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

  if (group === 'flow') {
    query = query.eq('role', 'taxpayer');
  } else if (group === 'ledger') {
    query = query.eq('role', 'accountant');
  }
  
  const { data: users, error } = await query;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm mb-4">
          <strong className="block mb-1">Veritabanı Hatası (Supabase):</strong>
          {error.message} - {error.details || error.hint}
        </div>
      )}

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Kullanıcı Yönetimi</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="E-posta veya isim ara..." 
            className="pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-64 text-white"
          />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-surface/30 p-1 rounded-xl w-max border border-border">
        <Link 
          href="/users?group=all" 
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${group === 'all' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
        >
          Tümü
        </Link>
        <Link 
          href="/users?group=flow" 
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${group === 'flow' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
        >
          Flow (Esnaf)
        </Link>
        <Link 
          href="/users?group=ledger" 
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${group === 'ledger' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
        >
          Ledger (Müşavir)
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface/50 text-text-muted border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">Kullanıcı</th>
              <th className="px-6 py-4 font-medium">E-posta</th>
              <th className="px-6 py-4 font-medium">Rol</th>
              <th className="px-6 py-4 font-medium">Durum</th>
              <th className="px-6 py-4 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users?.map((user: any) => (
              <tr key={user.id} className="hover:bg-surface/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
                      {user.full_name ? user.full_name.substring(0,2) : 'U'}
                    </div>
                    <span className="font-medium text-white">
                      {user.full_name || 'İsimsiz Kullanıcı'}
                      {user.is_super_admin && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">ADMIN</span>}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-text-muted">{user.email || 'Email yok'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                    user.role === 'accountant' 
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {user.role === 'accountant' ? 'Müşavir' : (user.role || 'Esnaf')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                    user.account_status === 'suspended'
                      ? 'bg-danger/10 text-danger border-danger/20'
                      : 'bg-success/10 text-success border-success/20'
                  }`}>
                    {user.account_status === 'suspended' ? 'Askıda' : 'Aktif'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <form action={toggleUserStatus.bind(null, user.id, user.account_status)}>
                      {user.account_status === 'suspended' ? (
                        <button type="submit" className="p-2 hover:bg-success/10 rounded-lg text-text-muted hover:text-success transition-colors" title="Yasağı Kaldır">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button type="submit" className="p-2 hover:bg-warning/10 rounded-lg text-text-muted hover:text-warning transition-colors" title="Askıya Al">
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </form>
                    <form action={deleteUser.bind(null, user.id)}>
                      <button type="submit" className="p-2 hover:bg-danger/10 rounded-lg text-text-muted hover:text-danger transition-colors" title="Kalıcı Sil">
                        <UserX className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {(!users || users.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-text-muted">
                  Sistemde {group === 'all' ? '' : (group === 'flow' ? 'Flow' : 'Ledger')} kullanıcısı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}