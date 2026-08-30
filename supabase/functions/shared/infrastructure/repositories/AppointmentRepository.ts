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
    serviceId: string;
    startsAt: string;
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('appointments')
      .insert({
        organization_id: params.organizationId,
        customer_phone: params.customerId, // Using customerId as phone for now
        service_id: params.serviceId,
        date: params.startsAt,
        status: 'Pending',
        booking_token: crypto.randomUUID()
      })
      .select()
      .single();

    if (error) {
      console.error("[AppointmentRepository] Error inserting appointment:", error);
      throw error;
    }

    return data;
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
