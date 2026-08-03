import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { ConnectionRepository } from '../../../../modules/flow-connections/infrastructure/connection.repository';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Authenticate the Mobile App User
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim. Lütfen giriş yapın.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Davet kodu gerekli.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    const repository = new ConnectionRepository(adminSupabase);

    // 2. Look up the firm
    const firm = await repository.findFirmByConnectionCode(code.trim());

    if (!firm) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz veya süresi dolmuş kod.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      firm: {
        name: firm.name,
        location: firm.location,
        rating: firm.rating,
        activeTaxpayers: firm.active_taxpayers,
      }
    });

  } catch (error: any) {
    console.error('Flow Verify API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
