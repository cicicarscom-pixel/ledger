import { ITool, ToolResult } from '../types.ts';
import { AIContext } from '../../types.ts';
import { AppointmentService } from '../../../domain/appointment/AppointmentService.ts';

export class UpdateAppointmentTool implements ITool {
  name = "update_appointment";
  description = "Reschedules an existing pending or approved appointment to a new date/time for the current customer.";
  schema = {
    type: "object",
    properties: {
      appointmentId: { type: "string", description: "The internal ID of the existing appointment, given to you in the business context. Never ask the customer for this ID." },
      newStartsAt: { type: "string", description: "The new requested date and time in ISO 8601 format." }
    },
    required: ["appointmentId", "newStartsAt"]
  };
  constructor(private readonly appointmentService: AppointmentService) {}
  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    if (context.appointmentModuleEnabled === false) {
      return { status: "MODULE_DISABLED", message: "Appointment/reservation feature is disabled for this business." };
    }
    const result = await this.appointmentService.rescheduleAppointment({
      organizationId: context.organizationId, customerId: context.customerId,
      appointmentId: args.appointmentId as string, newStartsAt: args.newStartsAt as string,
      executionMode: context.executionMode,
    });
    return { status: result, message: `Appointment reschedule attempt resulted in: ${result}` };
  }
}
