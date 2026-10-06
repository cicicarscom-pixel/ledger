'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addServer(input: any) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Oturum bulunamadı" };

  const { p_name, p_base_url, p_api_key_secret_name, p_webhook_secret_name, p_fill_order, p_max_sessions, p_warn_percent } = input;

  if (!Number.isInteger(p_fill_order) || p_fill_order < 1) return { ok: false, message: "Geçersiz sıra numarası" };
  if (!Number.isInteger(p_max_sessions) || p_max_sessions < 1) return { ok: false, message: "Geçersiz kapasite" };
  if (!Number.isInteger(p_warn_percent) || p_warn_percent < 1 || p_warn_percent > 100) return { ok: false, message: "Geçersiz gri bölge yüzdesi" };

  const { error } = await supabase.rpc('admin_upsert_waha_server', {
    p_id: null,
    p_name,
    p_base_url,
    p_api_key_secret_name,
    p_webhook_secret_name,
    p_fill_order,
    p_max_sessions,
    p_warn_percent
  });

  if (error) {
    if (error.code === '42501') return { ok: false, message: "Yetkiniz yok." };
    if (error.message?.includes('HTTPS_REQUIRED')) return { ok: false, message: "Adres https:// ile başlamalı." };
    if (error.message?.includes('INVALID_SECRET_NAME')) return { ok: false, message: "API anahtarı adı WAHA_API_KEY[_...], webhook adı WAHA_WEBHOOK_SECRET[_...] formatında olmalı." };
    if (error.code === '23505') return { ok: false, message: "Bu sıra numarası başka bir sunucuda kullanımda." };
    return { ok: false, message: `Sunucu kaydedilemedi (${error.code || error.message})` };
  }

  revalidatePath('/whatsapp-sunuculari');
  return { ok: true, message: "Sunucu eklendi" };
}

export async function setAcceptingNew(id: string, value: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Oturum bulunamadı" };

  const { error } = await supabase.rpc('admin_set_waha_server_flags', {
    p_id: id,
    p_is_active: null,
    p_accepting_new: value,
    p_max_sessions: null
  });

  if (error) return { ok: false, message: `İşlem başarısız (${error.message})` };
  revalidatePath('/whatsapp-sunuculari');
  return { ok: true, message: "Sunucu durumu güncellendi" };
}

export async function setMaxSessions(id: string, value: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Oturum bulunamadı" };

  if (!Number.isInteger(value) || value < 1 || value > 100000) return { ok: false, message: "Geçersiz kapasite değeri" };

  const { error } = await supabase.rpc('admin_set_waha_server_flags', {
    p_id: id,
    p_is_active: null,
    p_accepting_new: null,
    p_max_sessions: value
  });

  if (error) return { ok: false, message: `İşlem başarısız (${error.message})` };
  revalidatePath('/whatsapp-sunuculari');
  return { ok: true, message: "Kapasite güncellendi" };
}

export async function resolveAlert(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Oturum bulunamadı" };

  const { error } = await supabase.rpc('admin_resolve_waha_alert', { p_id: id });
  
  if (error) return { ok: false, message: `Uyarı çözülemedi (${error.message})` };
  revalidatePath('/whatsapp-sunuculari');
  return { ok: true, message: "Uyarı çözüldü işaretlendi" };
}

export async function refreshWebhooks(serverId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Oturum bulunamadı" };

  const { data, error } = await supabase.functions.invoke('admin-waha', {
    body: { action: 'refresh-webhooks', serverId }
  });

  if (error || !data?.success) {
    return { ok: false, message: `Webhooklar güncellenemedi (${error?.message || data?.error})` };
  }

  revalidatePath('/whatsapp-sunuculari');
  return { ok: true, message: `${data.successCount} başarılı, ${data.failCount} başarısız`, data };
}

export async function testConnection(input: { baseUrl: string; apiKeySecretName: string }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Oturum bulunamadı" };

  const { data, error } = await supabase.functions.invoke('admin-waha', {
    body: { action: 'test-connection', baseUrl: input.baseUrl, apiKeySecretName: input.apiKeySecretName }
  });

  if (error || !data?.ok) {
    let msg = "Bağlantı başarısız";
    const errCode = data?.error || error?.message;
    if (errCode === 'HTTPS_REQUIRED') msg = "Adres https:// olmalı";
    else if (errCode === 'INVALID_URL') msg = "Adres geçersiz";
    else if (errCode === 'HOST_NOT_ALLOWED') msg = "Bu adrese bağlanılamaz (dahili adres)";
    else if (errCode === 'INVALID_SECRET_NAME') msg = "Secret adı geçersiz";
    else if (errCode === 'SECRET_MISSING') msg = `Supabase'de ${data?.secretName} secret'ı yok; önce ekleyin`;
    else if (errCode === 'WAHA_AUTH_FAILED') msg = "WAHA kodu reddedildi";
    else if (errCode === 'WAHA_HTTP_ERROR') msg = `WAHA hata döndürdü (${data?.status})`;
    else if (errCode === 'TIMEOUT') msg = "Zaman aşımı (10 sn)";
    else if (errCode === 'UNREACHABLE') msg = "Sunucuya ulaşılamadı";
    else msg = `Test başarısız (${errCode})`;

    return { ok: false, message: msg };
  }

  return { ok: true, message: `Bağlandı — ${data.sessionCount} kayıt, ${data.latencyMs} ms`, data };
}
