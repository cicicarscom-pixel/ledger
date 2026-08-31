import { ITool, ToolResult } from '../types.ts';
import { AIContext } from '../../types.ts';
import { AppointmentService } from '../../../domain/appointment/AppointmentService.ts';

export class ListAvailableSlotsTool implements ITool {
  name = "list_available_slots";
  description = "Lists available time slots for a specific date and services.";
  
  schema = {
    type: "object",
    properties: {
      date: { type: "string", description: "The date to check for availability (YYYY-MM-DD format)." },
      serviceIds: { type: "array", items: { type: "string" }, description: "The IDs of the selected services." }
    },
    required: ["date", "serviceIds"]
  };

  constructor(private readonly appointmentService: AppointmentService) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    if (context.appointmentModuleEnabled === false) {
      return { status: "MODULE_DISABLED", message: "Appointment/reservation feature is disabled for this business." };
    }
    const date = args.date as string;
    const serviceIds = args.serviceIds as string[];

    const slots = await this.appointmentService.getAvailableSlots(
      context.organizationId,
      date,
      serviceIds
    );

    return {
      status: "SUCCESS",
      data: { slots }
    };
  }
}
