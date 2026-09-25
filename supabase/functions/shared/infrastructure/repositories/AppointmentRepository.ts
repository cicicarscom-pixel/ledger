export class AppointmentRepository {
  constructor(private readonly supabase: any) {}

  async findConflictingSlot(organizationId: string, startsAt: string, calendarId?: string): Promise<boolean> {
    let query = this.supabase
      .from('appointments')
      .select('id')
      .eq('organization_id', organizationId)
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
    organizationId: string;
    customerId: string;
    customerName: string;
    serviceIds: string[];
    startsAt: string;
    calendarId?: string;
  }): Promise<any> {
    const primaryServiceId = params.serviceIds.length > 0 ? params.serviceIds[0] : null;

    // 1. Insert into appointments
    const { data, error } = await this.supabase
      .from('appointments')
      .insert({
        organization_id: params.organizationId,
        customer_phone: params.customerId,
        customer_name: params.customerName,
        service_id: primaryServiceId, // for backwards compatibility
        date: params.startsAt,
        status: 'Pending',
        booking_token: crypto.randomUUID(),
        calendar_id: params.calendarId || null
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
        organization_id: params.organizationId,
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
    await this.upsertCustomer(params.organizationId, params.customerId, params.customerName);

    // 4. Fetch all service names for notification
    let serviceNames = "Bilinmeyen Hizmet";
    if (params.serviceIds.length > 0) {
      const { data: services } = await this.supabase
        .from('business_services')
        .select('name')
        .in('id', params.serviceIds);
      if (services && services.length > 0) {
        serviceNames = services.map((s: any) => s.name).join(' + ');
      }
    }

    await this.notifyMerchant(
      params.organizationId, 'Yeni Randevu Oluşturuldu',
      `${this.formatLocalTime(params.startsAt)} - ${params.customerName} adına "${serviceNames}" hizmeti için randevu oluşturuldu.`
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
      name: name
    }, { onConflict: 'organization_id,phone' });

    if (error) {
      console.error("[AppointmentRepository] Error upserting customer:", error);
      // We don't throw here to avoid failing the appointment creation
    }
  }

  async getAvailableSlots(organizationId: string, date: string, serviceIds: string[], multiCalendarEnabled?: boolean): Promise<any> {
    try {
      // 1. Get total service duration (fallback to 30 mins)
      let durationMins = 30;
      if (serviceIds && serviceIds.length > 0) {
        const { data: services } = await this.supabase
          .from('business_services')
          .select('duration_minutes')
          .in('id', serviceIds);
        
        if (services && services.length > 0) {
          durationMins = services.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0) || 30;
        }
      }

      // 2. Generate all possible slots for the day (09:00 - 18:00)
      const slots: string[] = [];
      let currentHour = 9;
      let currentMin = 0;
      
      while (currentHour < 18) {
        const hrStr = currentHour.toString().padStart(2, '0');
        const mnStr = currentMin.toString().padStart(2, '0');
        
        const endHour = currentHour + Math.floor((currentMin + durationMins) / 60);
        const endMin = (currentMin + durationMins) % 60;
        if (endHour > 18 || (endHour === 18 && endMin > 0)) {
          break;
        }

        slots.push(`${hrStr}:${mnStr}`);
        
        currentMin += 30;
        while (currentMin >= 60) {
          currentHour += 1;
          currentMin -= 60;
        }
      }

      // If multi-calendar is OFF, use the legacy logic
      if (!multiCalendarEnabled) {
        const { data: takenAppointments, error } = await this.supabase
          .from('appointments')
          .select('date')
          .eq('organization_id', organizationId)
          .in('status', ['Pending', 'Approved'])
          .like('date', `${date}%`);
        
        if (error) {
          console.error("[AppointmentRepository] Error fetching appointments for slots:", error);
          return slots; 
        }

        const takenSet = new Set(takenAppointments.map((a: any) => {
          if (a.date.includes('T')) {
             const match = a.date.match(/T(\d{2}:\d{2})/);
             if (match) return match[1];
          } else if (a.date.length === 5) {
             return a.date;
          } else if (a.date.includes(' ')) {
             const match = a.date.match(/\s(\d{2}:\d{2})/);
             if (match) return match[1];
          }
          return a.date;
        }));

        const availableSlots = slots.filter(slot => !takenSet.has(slot));
        return availableSlots;
      }

      // If multi-calendar is ON, compute per-calendar availability
      const { data: allCalendars, error: calError } = await this.supabase
        .from('calendars')
        .select('id, name')
        .eq('merchant_id', organizationId)
        .eq('is_active', true);
        
      if (calError || !allCalendars || allCalendars.length === 0) {
        // Fallback to legacy string array if no calendars are found
        return slots;
      }

      let calendarsToConsider = allCalendars;

      // 1. FILTER BY SERVICES: A calendar must offer ALL requested services
      if (serviceIds && serviceIds.length > 0) {
        const { data: calServices, error: csError } = await this.supabase
          .from('calendar_services')
          .select('calendar_id, service_id')
          .in('calendar_id', allCalendars.map((c: any) => c.id))
          .in('service_id', serviceIds);

        if (!csError && calServices) {
           const calServiceMap = new Map<string, Set<string>>();
           for (const cs of calServices) {
             if (!calServiceMap.has(cs.calendar_id)) calServiceMap.set(cs.calendar_id, new Set());
             calServiceMap.get(cs.calendar_id)!.add(cs.service_id);
           }
           
           calendarsToConsider = allCalendars.filter((c: any) => {
             const servicesForCal = calServiceMap.get(c.id);
             if (!servicesForCal) return false;
             for (const sid of serviceIds) {
               if (!servicesForCal.has(sid)) return false;
             }
             return true;
           });
        }
      }

      if (calendarsToConsider.length === 0) {
        return []; // No calendar provides the requested services
      }

      const { data: takenAppointments, error: apptError } = await this.supabase
        .from('appointments')
        .select('date, calendar_id')
        .eq('organization_id', organizationId)
        .in('status', ['Pending', 'Approved'])
        .like('date', `${date}%`);

      if (apptError) {
        console.error("[AppointmentRepository] Error fetching appointments for multi-calendar slots:", apptError);
        return slots;
      }

      // Group taken slots by calendar_id
      const takenByCalendar = new Map<string, Set<string>>();
      for (const cal of calendarsToConsider) {
        takenByCalendar.set(cal.id, new Set<string>());
      }

      for (const a of (takenAppointments || [])) {
        if (!a.calendar_id) continue;
        if (!takenByCalendar.has(a.calendar_id)) continue;
        
        let timeSlot = a.date;
        if (a.date.includes('T')) {
           const match = a.date.match(/T(\d{2}:\d{2})/);
           if (match) timeSlot = match[1];
        } else if (a.date.length === 5) {
           timeSlot = a.date;
        } else if (a.date.includes(' ')) {
           const match = a.date.match(/\s(\d{2}:\d{2})/);
           if (match) timeSlot = match[1];
        }

        takenByCalendar.get(a.calendar_id)!.add(timeSlot);
      }

      // Map each slot to available calendars
      const structuredSlots = slots.map(slot => {
        const availableCalendars = calendarsToConsider.filter((cal: any) => !takenByCalendar.get(cal.id)?.has(slot));
        return {
          time: slot,
          availableCalendars: availableCalendars.map((c: any) => ({ id: c.id, name: c.name }))
        };
      });

      // Optionally filter out slots where NO calendars are available
      return structuredSlots.filter(s => s.availableCalendars.length > 0);
      
    } catch (e) {
      console.error("[AppointmentRepository] getAvailableSlots Exception:", e);
      return ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    }
  }

  async validateServiceIds(organizationId: string, serviceIds: string[]): Promise<boolean> {
    if (!serviceIds || serviceIds.length === 0) return false;
    try {
      const { data, error } = await this.supabase
        .from('business_services')
        .select('id')
        .eq('merchant_id', organizationId)
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
