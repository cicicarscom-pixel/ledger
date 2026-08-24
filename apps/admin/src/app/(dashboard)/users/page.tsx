import { Search, UserX, Ban, CheckCircle2, Phone } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { toggleUserStatus, deleteUser } from './actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function UsersPage({ searchParams }: { searchParams: { group?: string } }) {
  const supabase = createClient();
  const group = searchParams.group || 'all';
  
  // profiles tablosunda role yok, hepsi Esnaf kabul ediliyor.
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

  const { data: users, error } = await query;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm mb-4">
          <strong className="block mb-1">Veritabanı Hatası (Supabase):</strong>
          {error.message}
        </div>
      )}

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Kullanıcı Yönetimi</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="İşletme veya yetkili ara..." 
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
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface/50 text-text-muted border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">İşletme / Yetkili</th>
              <th className="px-6 py-4 font-medium">İletişim Bilgisi</th>
              <th className="px-6 py-4 font-medium">AI Planı</th>
              <th className="px-6 py-4 font-medium">Durum</th>
              <th className="px-6 py-4 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users?.map((user: any) => (
              <tr key={user.id} className="hover:bg-surface/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase shrink-0">
                      {user.business_name ? user.business_name.substring(0,2) : (user.authorized_person ? user.authorized_person.substring(0,2) : 'U')}
                    </div>
                    <div>
                      <div className="font-medium text-white flex items-center gap-2">
                        {user.business_name || 'İsimsiz İşletme'}
                        {user.is_super_admin && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">ADMIN</span>}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {user.authorized_person ? `Yetkili: ${user.authorized_person}` : 'Yetkili eklenmemiş'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {user.phone_number ? (
                    <div className="flex items-center gap-2 text-text-muted">
                      <Phone className="w-3 h-3" />
                      {user.country_code ? `+${user.country_code}` : ''} {user.phone_number}
                    </div>
                  ) : (
                    <span className="text-text-muted/50 italic">Kayıtlı numara yok</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium border bg-white/5 text-purple-400 border-white/10 uppercase">
                    {user.ai_plan || 'free'}
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
            {(!users || users.length === 0) && !error && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-text-muted">
                  Sistemde kullanıcı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}