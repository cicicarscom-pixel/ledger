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

    console.log(`[DEBUG] ListAvailableSlotsTool service_id=${serviceIds?.join(',')}, merchant_id=${context.organizationId}`);

    const slots = await this.appointmentService.getAvailableSlots(
      context.merchantId!,
      date,
      serviceIds,
      context.multiCalendarEnabled
    );

    console.log(`[DEBUG] ListAvailableSlotsTool bulunan takvimler:`, JSON.stringify(slots));

    // Müşterinin o günkü KENDİ randevuları: asistan bu saatleri müsait saat gibi önermesin
    // (28.09.2026 22:44: müşterinin kendi 16:00 randevusu varken 16:00 için doktor seçtirildi).
    const own = await this.appointmentService
      .findSameDayActiveAppointments(context.merchantId!, context.customerId, `${date}T00:00:00`)
      .catch(() => []);

    if (own.length === 0) {
      return { status: "SUCCESS", data: { slots } };
    }
    return {
      status: "SUCCESS",
      data: {
        slots,
        customerOwnAppointments: own.map((a) => ({ time: a.time, endTime: a.endTime, calendarName: a.calendarName, reason: a.reason })),
        system_note: "customerOwnAppointments müşterinin bu günkü KENDİ randevularıdır. Bu saatleri müşteriye müsait saat olarak ÖNERME. " +
          "Müşteri bu saatlerden birini isterse o saatte zaten kendi randevusu olduğunu sade bir dille söyle ve başka saat öner.",
      },
    };
  }
}
