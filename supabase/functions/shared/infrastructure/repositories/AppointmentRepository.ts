const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;

function offsetAt(ms: number, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(ms)).map(x => [x.type, x.value])
  );
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
}

function localToUtc(local: string, tz: string): string {
  const m = LOCAL_RE.exec(local);
  if (!m) throw new Error('INVALID_LOCAL_FORMAT');
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
  const offsets = new Set([-864e5, 0, 864e5].map(d => offsetAt(wall + d, tz)));
  const hits = [...offsets]
    .map(o => wall - o)
    .filter(c => offsetAt(c, tz) === wall - c)
    .sort((a, b) => a - b);
  if (hits.length === 0) throw new Error('INVALID_LOCAL_TIME');
  return new Date(hits[0]).toISOString();
}

export class AppointmentRepository {
  constructor(private readonly supabase: any) {}

  async findConflictingSlot(merchantId: string, startsAt: string, calendarId?: string): Promise<boolean> {
    let query = this.supabase
      .from('appointments')
      .select('id')
      .eq('organization_id', merchantId)
      .eq('date', startsAt)
      .in('status', ['Pending', 'Approved']);

    if (calendarId) {
      query = query.eq('calendar_id', calendarId);
    } else {
      // Legacy behavior: if multi-calendar is off, we still check globally just in case.
      // But if there are multiple calendars, a missing calendarId in check might false-positive collision.
      // So if calendarId is not passed, it means we check globally for the organization.
    }

    const { data, error } = await query.limit(1);
    
    if (error) {
      console.error("[AppointmentRepository] Error checking slot collision:", error);
      throw error;
    }

    return data && data.length > 0;
  }

  async createPendingAppointment(params: {
    organizationId: string; // Used only for organizations table query
    merchantId: string;
    customerId: string;
    customerName: string;
    customerRequestRaw?: string;
    serviceIds: string[];
    startsAt: string;
    calendarId?: string;
      timezone: string;
      allowCustomerOverlap?: boolean;
  }): Promise<any> {
    const primaryServiceId = params.serviceIds.length > 0 ? params.serviceIds[0] : null;

    // --- Süre hesaplama: her kademe gerçekten "bulundu mu" diye kontrol eder ---
    let durationMins: number | null = null;

    // 1) Hizmet süresi
    if (params.serviceIds.length > 0) {
      const { data: services } = await this.supabase
        .from('business_services')
        .select('duration_minutes')
        .in('id', params.serviceIds);
      if (services && services.length > 0) {
        const totalDuration = services.reduce((sum: number, s: any) => sum + (s.duration_minutes ?? 0), 0);
        if (totalDuration > 0) durationMins = totalDuration;
      }
    }

    // 2) Takvim varsayılanı (hizmet süresi bulunamadıysa)
    if (durationMins === null && params.calendarId) {
      const { data: cal } = await this.supabase
        .from('calendars')
        .select('default_duration_minutes')
        .eq('id', params.calendarId)
        .single();
      if (cal?.default_duration_minutes != null) {
        durationMins = cal.default_duration_minutes;
      }
    }

    // 3) Organizasyon varsayılanı (hâlâ bulunamadıysa)
    if (durationMins === null) {
      const { data: org } = await this.supabase
        .from('organizations')
        .select('default_appointment_duration_minutes')
        .eq('id', params.organizationId)
        .single();
      if (org?.default_appointment_duration_minutes != null) {
        durationMins = org.default_appointment_duration_minutes;
      }
    }

    // 4) Son çare
    if (durationMins === null) {
      durationMins = 30;
    }

    const utcStartsAt = localToUtc(params.startsAt, params.timezone);
    const startsAtDate = new Date(utcStartsAt);
    const endsAtDate = new Date(startsAtDate.getTime() + durationMins * 60000);
    const endsAt = endsAtDate.toISOString();

    console.log(`[AppointmentRepository] createPendingAppointment: starts_at=${params.startsAt}, calculated ends_at=${endsAt} (duration: ${durationMins}m, source: ${params.serviceIds.length > 0 ? 'service/calendar/org' : 'fallback'})`);
    // ---------------------------------

    if (!params.allowCustomerOverlap) {
      const { data: overlaps, error: ovErr } = await this.supabase
        .from('appointments')
        .select('id, starts_at, calendar_id')
        .eq('organization_id', params.merchantId)
        .eq('customer_phone', params.customerId)
        .in('status', ['Pending', 'Approved'])
        .lt('starts_at', endsAt)
        .gt('ends_at', utcStartsAt);
      if (ovErr) throw ovErr;
      if (overlaps && overlaps.length > 0) {
        const e: any = new Error('CUSTOMER_TIME_CONFLICT');
        e.code = 'CUSTOMER_TIME_CONFLICT';
        throw e;
      }
    }

    // 1. Insert into appointments
    const { data, error } = await this.supabase
      .from('appointments')
      .insert({
          organization_id: params.merchantId,
          customer_phone: params.customerId,
          customer_name: params.customerName,
          service_id: primaryServiceId,
          starts_at: utcStartsAt,
          ends_at: endsAt,
          timezone: params.timezone,
          source: 'whatsapp',
            status: 'Pending',
          booking_token: crypto.randomUUID(),
          calendar_id: params.calendarId || null,
          customer_request_raw: params.customerRequestRaw || null
        })
      .select('id')
      .single();

    if (error) {
      console.error("[AppointmentRepository] Error creating appointment:", error);
      throw error;
    }

    // 2. Insert into appointment_services
    if (params.serviceIds.length > 0 && data?.id) {
      const serviceInserts = params.serviceIds.map(sid => ({
        appointment_id: data.id,
        organization_id: params.merchantId,
        service_id: sid
      }));
      
      const { error: asError } = await this.supabase
        .from('appointment_services')
        .insert(serviceInserts);
        
      if (asError) {
        console.error("[AppointmentRepository] Error inserting appointment_services:", asError);
      }
    }

    // 3. Upsert customer record
    await this.upsertCustomer(params.merchantId, params.customerId, params.customerName);

    // 4. Fetch all service names for notification
    let serviceNames = params.customerRequestRaw || "Belirtilmemiş";
    if (params.serviceIds.length > 0) {
      const { data: services } = await this.supabase
        .from('business_services')
        .select('name')
        .in('id', params.serviceIds);
      if (services && services.length > 0) {
        serviceNames = services.map((s: any) => s.name).join(' + ');
      }
    }

    // notifyMerchant is now handled by DB trigger (tr_notify_new_appointment)

    return data;
  }

  async findActiveByPhone(merchantId: string, phone: string, timezone = 'Europe/Istanbul'): Promise<any[]> {
    // Yalnız bugün ve sonrası: geçmiş tarihli "Pending" kayıtlar limit(5)'i doldurup
    // gelecekteki randevuları listeden düşürmesin.
    const todayLocal = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
    const { data, error } = await this.supabase
      .from('appointments')
      .select('id, service_id, date, status')
      .eq('organization_id', merchantId)
      .eq('customer_phone', phone)
      .in('status', ['Pending', 'Approved'])
      .gte('date', `${todayLocal}T00:00:00`)
      .order('date', { ascending: true })
      .limit(5);
    if (error) { console.error("[AppointmentRepository] Error fetching active appointments:", error); return []; }
    return data || [];
  }
  
  private async getServiceName(serviceId: string): Promise<string> {
    if (!serviceId) return 'Hizmet';
    const { data } = await this.supabase.from('business_services').select('name').eq('id', serviceId).maybeSingle();
    return data?.name || 'Hizmet';
  }
  
  private formatLocalTime(dateStr: string): string {
    const match = dateStr.match(/T?(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : dateStr;
  }
  
  private async notifyMerchant(profileId: string, title: string, message: string): Promise<void> {
    const { error } = await this.supabase.from('notifications').insert({ profile_id: profileId, title, message, type: 'appointment' });
    if (error) console.error("[AppointmentRepository] Error creating merchant notification:", error);
    // Bildirim hatası ASLA randevu işlemini geri almaz veya başarısız göstermez.
  }
  
  async updateAppointmentDateTime(merchantId: string, appointmentId: string, customerPhone: string, newStartsAt: string): Promise<any> {
    const { data: existing, error: fetchError } = await this.supabase
      .from('appointments').select('*')
      .eq('id', appointmentId).eq('organization_id', merchantId).eq('customer_phone', customerPhone)
      .maybeSingle();
    if (fetchError) { console.error("[AppointmentRepository] Error fetching appointment before reschedule:", fetchError); throw fetchError; }
    if (!existing) return null;
  
    const { data, error } = await this.supabase.from('appointments').update({ date: newStartsAt }).eq('id', appointmentId).select().single();
    if (error) { console.error("[AppointmentRepository] Error updating appointment date:", error); throw error; }
  
    const serviceName = await this.getServiceName(existing.service_id);
    await this.notifyMerchant(
      merchantId, 'Randevu Güncellendi',
      `${existing.customer_name || 'Müşteri'}'in "${serviceName}" için ${this.formatLocalTime(existing.date)} saatindeki randevusu ${this.formatLocalTime(newStartsAt)}'a alındı.`
    );
    return data;
  }

  async upsertCustomer(merchantId: string, phone: string, name: string): Promise<void> {
    const { error } = await this.supabase.from('customers').upsert({
      organization_id: merchantId,
      phone: phone,
      name: name
    }, { onConflict: 'organization_id,phone' });

    if (error) {
      console.error("[AppointmentRepository] Error upserting customer:", error);
      // We don't throw here to avoid failing the appointment creation
    }
  }

  /**
   * Müsait saatler — tek müsaitlik çekirdeği (DB: get_available_slots_for_owner).
   * Web ve mobil aynı hesabı get_available_slots / get_day_schedule ile görür.
   * Kurallar DB'de: doktor çalışma saatleri, hizmet süresi, starts_at/ends_at çakışması,
   * calendar_blocks rezervasyonları (doktor ya da tüm klinik), geçmiş saatler hariç.
   * (Eski hesap date metnine ve yalnız başlangıç saatine bakıyordu; hata durumunda
   * uydurma saatler döndürüyordu — 30.09.2026.)
   *
   * Dönüş biçimi değişmedi:
   *   multiCalendarEnabled=false → ["09:30", "10:00", ...]
   *   multiCalendarEnabled=true  → [{ time: "09:30", availableCalendars: [{ id, name }] }, ...]
   */
  async getAvailableSlots(merchantId: string, date: string, serviceIds: string[], multiCalendarEnabled?: boolean): Promise<any> {
    const { data, error } = await this.supabase.rpc('get_available_slots_for_owner', {
      p_owner: merchantId,
      p_date: date,
      p_service_ids: serviceIds && serviceIds.length > 0 ? serviceIds : null,
      p_calendar_id: null,
    });

    if (error) {
      console.error(`[availability_verification_failed] get_available_slots_for_owner RPC failed for owner ${merchantId}:`, error);
      throw new Error("availability_verification_failed");
    }

    const rows: { local_time: string; calendars: { id: string; name: string }[] }[] = data ?? [];
    if (!multiCalendarEnabled) {
      return rows.map((r) => r.local_time);
    }
    return rows.map((r) => ({ time: r.local_time, availableCalendars: r.calendars ?? [] }));
  }

  async validateServiceIds(merchantId: string, serviceIds: string[]): Promise<boolean> {
    if (!serviceIds || serviceIds.length === 0) return false;
    try {
      const { data, error } = await this.supabase
        .from('business_services')
        .select('id')
        .eq('merchant_id', merchantId)
        .in('id', serviceIds);
      if (error) {
        console.error("[AppointmentRepository] DB Error validating service IDs:", error);
        return false;
      }
      return data && data.length === serviceIds.length;
    } catch (error) {
      console.error("[AppointmentRepository] Exception validating service IDs:", error);
      return false;
    }
  }
}

