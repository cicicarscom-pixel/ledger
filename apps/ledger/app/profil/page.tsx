'use client';
import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{
    authorized_person: string;
    avatar_url: string;
    phone: string;
    email: string;
  }>({
    authorized_person: '',
    avatar_url: '',
    phone: '',
    email: ''
  });
  
  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setProfile(prev => ({ ...prev, email: user.email || '' }));
        const { data } = await supabase
          .from('profiles')
          .select('authorized_person, avatar_url, phone')
          .eq('id', user.id)
          .maybeSingle();
        if (data) {
          setProfile(prev => ({
            ...prev,
            authorized_person: data.authorized_person || '',
            avatar_url: data.avatar_url || '',
            phone: data.phone || ''
          }));
        }
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        authorized_person: profile.authorized_person,
        avatar_url: profile.avatar_url,
        phone: profile.phone,
        updated_at: new Date().toISOString()
      });
      alert('Profil başarıyla güncellendi!');
      window.location.reload();
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-white opacity-70">Yükleniyor...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto mt-4">
      <div className="glass-panel p-8 rounded-2xl relative">
        <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">person</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Profil Bilgilerim</h1>
            <p className="text-xs text-on-surface-variant">Mali Müşavir hesabınıza ait kişisel bilgiler.</p>
          </div>
        </div>
        
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="flex items-center gap-6 mb-2">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-primary/30 shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-surface border-2 border-white/10 flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl">person</span>
              </div>
            )}
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface-variant">Profil Resmi URL</label>
              <input 
                type="text" 
                value={profile.avatar_url} 
                onChange={e => setProfile({...profile, avatar_url: e.target.value})}
                className="bg-surface/50 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all text-sm"
                placeholder="Örn: https://example.com/photo.jpg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface-variant">Ad Soyad</label>
              <input 
                type="text" 
                value={profile.authorized_person} 
                onChange={e => setProfile({...profile, authorized_person: e.target.value})}
                className="bg-surface/50 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all text-sm"
                placeholder="Adınız Soyadınız"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface-variant">Telefon Numarası</label>
              <input 
                type="tel" 
                value={profile.phone} 
                onChange={e => setProfile({...profile, phone: e.target.value})}
                className="bg-surface/50 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all text-sm"
                placeholder="5XX XXX XX XX"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-on-surface-variant">E-posta Adresi (Giriş ID)</label>
            <input 
              type="email" 
              value={profile.email} 
              disabled
              className="bg-black/20 border border-white/5 rounded-xl p-3 text-on-surface-variant cursor-not-allowed opacity-70 text-sm"
            />
            <span className="text-[10px] text-on-surface-variant/70 mt-1">
              E-posta adresinizi değiştirmek için destek ekibiyle iletişime geçiniz.
            </span>
          </div>
          
          <div className="flex justify-end mt-6 border-t border-white/10 pt-6">
            <button 
              type="submit" 
              disabled={saving}
              className="bg-primary opacity-90 hover:opacity-100 text-on-primary font-semibold py-3 px-8 rounded-xl transition-all disabled:opacity-50 shadow-glow-primary text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
