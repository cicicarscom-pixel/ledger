'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

// Random 5 digit number generator (string)
function generateConnectionCode(): string {
  const code = Math.floor(10000 + Math.random() * 90000);
  return `WG-${code}`;
}

export async function loginAccountantAction(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { success: false, error: 'Lütfen e-posta ve şifrenizi girin.' };
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Giriş hatası:', error.message);
      return { success: false, error: 'E-posta veya şifre hatalı.' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('loginAccountantAction beklenmeyen hata:', error);
    return { success: false, error: 'Beklenmeyen bir sunucu hatası oluştu.' };
  }
}

export async function registerAccountantAction(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const firmName = formData.get('firmName') as string;

    if (!email || !password || !fullName || !firmName) {
      return { success: false, error: 'Lütfen tüm alanları doldurun.' };
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const adminSupabase = createAdminClient();

    // 1. Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workigom.com'}/ledger/auth/callback?next=/dashboard`,
        data: {
          full_name: fullName,
          user_type: 'accountant'
        }
      }
    });

    if (authError) {
      console.error('Kayıt hatası:', authError.message);
      return { success: false, error: 'Kayıt başarısız: ' + authError.message };
    }

    const userId = authData.user?.id;
    if (!userId) {
      return { success: false, error: 'Kullanıcı ID alınamadı.' };
    }

    // Generate a unique connection code
    let connectionCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      connectionCode = generateConnectionCode();
      const { data, error: checkError } = await adminSupabase
        .from('ledger_accounting_firms')
        .select('id')
        .eq('connection_code', connectionCode)
        .single();
      
      if (checkError && checkError.code === 'PGRST116') {
        // No rows returned -> Unique!
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      await adminSupabase.auth.admin.deleteUser(userId);
      return { success: false, error: 'Bağlantı kodu üretilemedi. Lütfen tekrar deneyin.' };
    }

    // 2. Insert into ledger_accounting_firms
    const { error: firmError } = await adminSupabase
      .from('ledger_accounting_firms')
      .insert({
        user_id: userId,
        firm_name: firmName,
        connection_code: connectionCode
      });

    if (firmError) {
      console.error('Firma kayıt hatası:', firmError);
      // Rollback is complex in Supabase auth without edge functions, but we can attempt to delete the user using admin
      await adminSupabase.auth.admin.deleteUser(userId);
      return { success: false, error: 'Firma oluşturulamadı. İşlem iptal edildi.' };
    }

    // 3. Ensure profile is updated (auth.signUp data mostly handles it, but let's be safe)
    await adminSupabase.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      updated_at: new Date().toISOString()
    });

    return { success: true };
  } catch (error: any) {
    console.error('registerAccountantAction beklenmeyen hata:', error);
    return { success: false, error: 'Beklenmeyen bir sunucu hatası oluştu.' };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
