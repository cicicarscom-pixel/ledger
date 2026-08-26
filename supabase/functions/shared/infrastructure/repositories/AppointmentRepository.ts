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
    // Basic mock implementation for slots
    return ['09:00', '10:00', '13:00', '15:00'];
  }
}
