import { AppointmentRepository } from '../../infrastructure/repositories/AppointmentRepository.ts';

export type AppointmentResult = "SUCCESS" | "SLOT_ALREADY_TAKEN" | "SERVICE_NOT_FOUND" | "INVALID_DATE" | "CUSTOMER_REQUIRED" | "DB_ERROR";

export class AppointmentService {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async createPendingAppointment(params: {
    organizationId: string;
    customerId?: string;
    serviceId: string;
    startsAt: string;
    // Phase 4 (Persona Engine Live Test) guardrail: when this is "simulation",
    // this method MUST NOT write a real row to the appointments table. It
    // still runs the real collision check (a read) so the preview stays
    // faithful to what a real customer would see, but the actual INSERT is
    // skipped. Any caller that doesn't pass this (there are none left in
    // this codebase) gets the original, unchanged "always write" behavior.
    executionMode?: "production" | "simulation";
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
      // 1. Concurrency / Collision Check (read-only — safe in both modes)
      const isTaken = await this.appointmentRepository.findConflictingSlot(params.organizationId, params.startsAt);
      if (isTaken) {
        return "SLOT_ALREADY_TAKEN";
      }

      // 2. Simulation guardrail: never insert a real appointment during a
      // Live Test preview. The AI's conversational response is still
      // generated normally by the caller (AIOrchestrator) — only the actual
      // database write is suppressed here.
      if (params.executionMode === "simulation") {
        console.log(
          `[AppointmentService] SIMULATION MODE — skipping real insert (org=${params.organizationId}, service=${params.serviceId}, startsAt=${params.startsAt})`,
        );
        return "SUCCESS";
      }

      // 3. Insert Appointment (production only)
      await this.appointmentRepository.createPendingAppointment({
        organizationId: params.organizationId,
        customerId: params.customerId,
        serviceId: params.serviceId,
        startsAt: params.startsAt,
      });

      return "SUCCESS";
    } catch (error: any) {
      console.error("[AppointmentService] DB Error creating appointment:", error.message || error);
      return "DB_ERROR"; // Allows the prompt builder or tool executor to relay a systemic failure rather than blaming the date
    }
  }

  async getAvailableSlots(organizationId: string, date: string, serviceId: string): Promise<string[]> {
    return this.appointmentRepository.getAvailableSlots(organizationId, date, serviceId);
  }
}
