export class AppointmentRepository {
  constructor(private readonly supabase: any) {}

  async findConflictingSlot(organizationId: string, startsAt: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('appointments')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('date', startsAt)
      .in('status', ['Pending', 'Approved'])
      .limit(1);
    
    if (error) {
      console.error("[AppointmentRepository] Error checking slot collision:", error);
      throw error;
    }

    return data && data.length > 0;
  }

  async createPendingAppointment(params: {
    organizationId: string;
    customerId: string;
    customerName: string;
    serviceId: string;
    startsAt: string;
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('appointments')
      .insert({
        organization_id: params.organizationId,
        customer_phone: params.customerId,
        customer_name: params.customerName,
        service_id: params.serviceId,
        date: params.startsAt,
        status: 'Pending',
        booking_token: crypto.randomUUID()
      })
      .select()
      .single();

    if (error) {
      console.error("[AppointmentRepository] Error creating appointment:", error);
      throw error;
    }

    // ADIM 2: Upsert customer record
    await this.upsertCustomer(params.organizationId, params.customerId, params.customerName);

    const serviceName = await this.getServiceName(params.serviceId);
    await this.notifyMerchant(
      params.organizationId, 'Yeni Randevu Oluşturuldu',
      `${this.formatLocalTime(params.startsAt)} - ${params.customerName} adına "${serviceName}" hizmeti için randevu oluşturuldu.`
    );

    return data;
  }

  async findActiveByPhone(organizationId: string, phone: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('appointments')
      .select('id, service_id, date, status')
      .eq('organization_id', organizationId)
      .eq('customer_phone', phone)
      .in('status', ['Pending', 'Approved'])
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
  
  private async notifyMerchant(organizationId: string, title: string, message: string): Promise<void> {
    const { error } = await this.supabase.from('notifications').insert({ profile_id: organizationId, title, message, type: 'appointment' });
    if (error) console.error("[AppointmentRepository] Error creating merchant notification:", error);
    // Bildirim hatası ASLA randevu işlemini geri almaz veya başarısız göstermez.
  }
  
  async updateAppointmentDateTime(organizationId: string, appointmentId: string, customerPhone: string, newStartsAt: string): Promise<any> {
    const { data: existing, error: fetchError } = await this.supabase
      .from('appointments').select('*')
      .eq('id', appointmentId).eq('organization_id', organizationId).eq('customer_phone', customerPhone)
      .maybeSingle();
    if (fetchError) { console.error("[AppointmentRepository] Error fetching appointment before reschedule:", fetchError); throw fetchError; }
    if (!existing) return null;
  
    const { data, error } = await this.supabase.from('appointments').update({ date: newStartsAt }).eq('id', appointmentId).select().single();
    if (error) { console.error("[AppointmentRepository] Error updating appointment date:", error); throw error; }
  
    const serviceName = await this.getServiceName(existing.service_id);
    await this.notifyMerchant(
      organizationId, 'Randevu Güncellendi',
      `${existing.customer_name || 'Müşteri'}'in "${serviceName}" için ${this.formatLocalTime(existing.date)} saatindeki randevusu ${this.formatLocalTime(newStartsAt)}'a alındı.`
    );
    return data;
  }

  async upsertCustomer(organizationId: string, phone: string, name: string): Promise<void> {
    const { error } = await this.supabase.from('customers').upsert({
      organization_id: organizationId,
      phone: phone,
      name: name,
      updated_at: new Date().toISOString()
    }, { onConflict: 'organization_id,phone' });

    if (error) {
      console.error("[AppointmentRepository] Error upserting customer:", error);
      // We don't throw here to avoid failing the appointment creation
    }
  }

  async getAvailableSlots(organizationId: string, date: string, serviceId: string): Promise<string[]> {
    try {
      // 1. Get service duration (fallback to 30 mins)
      let durationMins = 30;
      if (serviceId) {
        const { data: service } = await this.supabase
          .from('business_services')
          .select('duration_minutes')
          .eq('id', serviceId)
          .maybeSingle();
        if (service && service.duration_minutes) {
          durationMins = service.duration_minutes;
        }
      }

      // 2. Generate all possible slots for the day (09:00 - 18:00)
      const slots: string[] = [];
      let currentHour = 9;
      let currentMin = 0;
      
      while (currentHour < 18) {
        const hrStr = currentHour.toString().padStart(2, '0');
        const mnStr = currentMin.toString().padStart(2, '0');
        slots.push(`${hrStr}:${mnStr}`);
        
        currentMin += durationMins;
        while (currentMin >= 60) {
          currentHour += 1;
          currentMin -= 60;
        }
      }

      // 3. Fetch taken slots for this date
      // appointments.date might be a full ISO string, so we do a text match using like.
      const { data: takenAppointments, error } = await this.supabase
        .from('appointments')
        .select('date')
        .eq('organization_id', organizationId)
        .in('status', ['Pending', 'Approved'])
        .like('date', `${date}%`);
      
      if (error) {
        console.error("[AppointmentRepository] Error fetching appointments for slots:", error);
        return slots; // Fallback to all slots if DB fails
      }

      const takenSet = new Set(takenAppointments.map((a: any) => {
        // Parse the time part from ISO string. If it's already HH:mm, use it directly.
        if (a.date.includes('T')) {
           // E.g., 2026-08-30T15:00:00.000Z -> we need to extract the HH:mm in local time or UTC.
           // For simplicity, we assume the bot and the DB agree on the string format.
           // Let's just extract the HH:mm from the T part if it exists.
           const match = a.date.match(/T(\d{2}:\d{2})/);
           if (match) return match[1];
        } else if (a.date.length === 5) { // HH:mm
           return a.date;
        } else if (a.date.includes(' ')) { // YYYY-MM-DD HH:mm
           const match = a.date.match(/\s(\d{2}:\d{2})/);
           if (match) return match[1];
        }
        return a.date;
      }));

      // Filter out taken slots
      const availableSlots = slots.filter(slot => !takenSet.has(slot));
      return availableSlots;
      
    } catch (e) {
      console.error("[AppointmentRepository] getAvailableSlots Exception:", e);
      return ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    }
  }
}
