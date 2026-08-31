import { ITool, ToolResult } from '../types.ts';
import { AIContext } from '../../types.ts';
import { AppointmentService } from '../../../domain/appointment/AppointmentService.ts';

export class ListAvailableSlotsTool implements ITool {
  name = "list_available_slots";
  description = "Lists available time slots for a specific date and service.";
  
  schema = {
    type: "object",
    properties: {
      date: { type: "string", description: "The date to check for availability (YYYY-MM-DD format)." },
      serviceId: { type: "string", description: "The ID of the service." }
    },
    required: ["date", "serviceId"]
  };

  constructor(private readonly appointmentService: AppointmentService) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    if (context.appointmentModuleEnabled === false) {
      return { status: "MODULE_DISABLED", message: "Appointment/reservation feature is disabled for this business." };
    }
    const date = args.date as string;
    const serviceId = args.serviceId as string;

    const slots = await this.appointmentService.getAvailableSlots(
      context.organizationId,
      date,
      serviceId
    );

    return {
      status: "SUCCESS",
      data: { slots }
    };
  }
}
