'use client';
import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firmId, setFirmId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    authorized_person: string;
    avatar_url: string;
    phone: string;
    email: string;
    business_name: string;
  }>({
    authorized_person: '',
    avatar_url: '',
    phone: '',
    email: '',
    business_name: ''
  });
  
  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setProfile(prev => ({ ...prev, email: user.email || '' }));
        
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('authorized_person, avatar_url, phone_number')
          .eq('id', user.id)
          .maybeSingle();
          
        const meta = user.user_metadata || {};
        const googleName = meta.full_name || meta.name || '';
        const googleAvatar = meta.avatar_url || meta.picture || '';
        
        let finalName = profileData?.authorized_person || googleName;
        let finalAvatar = profileData?.avatar_url || googleAvatar;
        
        if (profileData) {
          setProfile(prev => ({
            ...prev,
            authorized_person: finalName,
            avatar_url: finalAvatar,
            phone: profileData.phone_number || ''
          }));
        } else {
          setProfile(prev => ({
            ...prev,
            authorized_person: finalName,
            avatar_url: finalAvatar
          }));
        }

        // Eğer veritabanında ad/soyad boşsa ama Google'dan geldiyse, arka planda otomatik kaydet
        if (!profileData?.authorized_person && googleName) {
          await supabase.from('profiles').upsert({
            id: user.id,
            authorized_person: finalName,
            avatar_url: finalAvatar,
            phone_number: profileData?.phone_number || '',
            updated_at: new Date().toISOString()
          });
        }

        // Fetch firm name
        const { data: firmMemberData } = await supabase
          .from('accounting_firm_members')
          .select(`
            accounting_firm_id,
            accounting_firms (
              name
            )
          `)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (firmMemberData && firmMemberData.accounting_firm_id) {
          setFirmId(firmMemberData.accounting_firm_id);
          const firm = Array.isArray(firmMemberData.accounting_firms) 
             ? firmMemberData.accounting_firms[0] 
             : firmMemberData.accounting_firms;
          
          if (firm) {
            setProfile(prev => ({
              ...prev,
              business_name: firm.name || ''
            }));
          }
        }
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      
      setSaving(true);
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);
        
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
      
    } catch (error: any) {
      alert("Fotoğraf yükleme hatası: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Update profile
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        authorized_person: profile.authorized_person,
        avatar_url: profile.avatar_url,
        phone_number: profile.phone,
        updated_at: new Date().toISOString()
      });

      if (error) {
        alert('Profil güncellenirken bir hata oluştu: ' + error.message);
        setSaving(false);
        return;
      }
      
      // Update firm name if exists
      if (firmId) {
        await supabase.from('accounting_firms').update({
          name: profile.business_name
        }).eq('id', firmId);
      }
      
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
            <label className="cursor-pointer relative group">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-primary/30 shadow-lg group-hover:opacity-80 transition-opacity" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-surface border-2 border-white/10 flex items-center justify-center text-on-surface-variant group-hover:bg-white/5 transition-colors">
                  <span className="material-symbols-outlined text-3xl">person</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <div className="absolute -bottom-1 -right-1 bg-primary text-black p-1.5 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[14px]">edit</span>
              </div>
            </label>
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface-variant">Profil Resmi Yükle</label>
              <p className="text-xs text-on-surface-variant/70">Fotoğrafınıza tıklayarak cihazınızdan yeni bir resim seçebilirsiniz.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <label className="text-sm font-medium text-on-surface-variant">İşletme Adı (Müşavirlik Ofisi)</label>
            <input 
              type="text" 
              value={profile.business_name} 
              onChange={e => setProfile({...profile, business_name: e.target.value})}
              className="bg-surface/50 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none transition-all text-sm"
              placeholder="Ofisinizin Adı"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-on-surface-variant">Yetkili Kişi Adı Soyadı</label>
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
