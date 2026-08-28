import { ITool, ToolResult } from '../types.ts';
import { AIContext } from '../../types.ts';
import { AppointmentService } from '../../../domain/appointment/AppointmentService.ts';

export class CreatePendingAppointmentTool implements ITool {
  name = "create_pending_appointment";
  description = "Creates a pending appointment for the customer at a specific date and time.";
  
  schema = {
    type: "object",
    properties: {
      serviceId: { type: "string", description: "The ID of the selected service." },
      startsAt: { type: "string", description: "The requested date and time in ISO 8601 format." }
    },
    required: ["serviceId", "startsAt"]
  };

  constructor(private readonly appointmentService: AppointmentService) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const serviceId = args.serviceId as string;
    const startsAt = args.startsAt as string;

    const result = await this.appointmentService.createPendingAppointment({
      organizationId: context.organizationId,
      customerId: context.customerId,
      serviceId,
      startsAt,
      // Phase 4 guardrail: forwards the caller's mode so a Live Test
      // (persona-test, executionMode "simulation") never creates a real
      // appointment row — see AppointmentService.createPendingAppointment().
      executionMode: context.executionMode,
    });

    return {
      status: result,
      message: `Appointment creation attempt resulted in: ${result}`
    };
  }
}
