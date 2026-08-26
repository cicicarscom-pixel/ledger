import { AppointmentRepository } from '../../infrastructure/repositories/AppointmentRepository.ts';

export type AppointmentResult = "SUCCESS" | "SLOT_ALREADY_TAKEN" | "SERVICE_NOT_FOUND" | "INVALID_DATE" | "CUSTOMER_REQUIRED";

export class AppointmentService {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async createPendingAppointment(params: {
    organizationId: string;
    customerId?: string;
    serviceId: string;
    startsAt: string;
  }): Promise<AppointmentResult> {
    if (!params.customerId) {
      return "CUSTOMER_REQUIRED";
    }

    if (!params.startsAt) {
      return "INVALID_DATE";
    }

    if (!params.serviceId) {
      return "SERVICE_NOT_FOUND";
    }

    try {
      // 1. Concurrency / Collision Check
      const isTaken = await this.appointmentRepository.findConflictingSlot(params.organizationId, params.startsAt);
      if (isTaken) {
        return "SLOT_ALREADY_TAKEN";
      }

      // 2. Insert Appointment
      await this.appointmentRepository.createPendingAppointment({
        organizationId: params.organizationId,
        customerId: params.customerId,
        serviceId: params.serviceId,
        startsAt: params.startsAt,
      });

      return "SUCCESS";
    } catch (error) {
      console.error("[AppointmentService] Error creating appointment:", error);
      return "INVALID_DATE"; // Fallback error for now
    }
  }

  async getAvailableSlots(organizationId: string, date: string, serviceId: string): Promise<string[]> {
    return this.appointmentRepository.getAvailableSlots(organizationId, date, serviceId);
  }
}
