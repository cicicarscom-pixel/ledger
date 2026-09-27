import { ITool, ToolResult } from '../types.ts';
import { AIContext } from '../../types.ts';
import { AppointmentService } from '../../../domain/appointment/AppointmentService.ts';

export class CreatePendingAppointmentTool implements ITool {
  name = "create_pending_appointment";
  description = "Creates a pending appointment for the customer at a specific date and time.";
  
  schema = {
    type: "object",
    properties: {
      serviceIds: { type: "array", items: { type: "string" }, description: "The IDs of the selected services. Omit if not explicitly matched." },
      startsAt: { type: "string", description: "The requested date and time in ISO 8601 format." },
      customerName: { type: "string", description: "Customer's full name, must be collected via conversation before calling this tool." },
      calendarId: { type: "string", description: "The ID of the selected calendar (doctor, room, etc.). Must be populated if provided by list_available_slots." },
      customerRequestRaw: { type: "string", description: "The exact raw text of the customer's request. Must not be summarized." }
    },
    required: ["startsAt", "customerName", "customerRequestRaw"]
  };

  constructor(private readonly appointmentService: AppointmentService) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    if (context.appointmentModuleEnabled === false) {
      return { status: "MODULE_DISABLED", message: "Appointment/reservation feature is disabled for this business." };
    }
    const serviceIds = (args.serviceIds as string[]) || [];
    const startsAt = args.startsAt as string;
    const customerName = context.customerProfile?.name || (args.customerName as string);
    const calendarId = args.calendarId as string | undefined;
    const customerRequestRaw = args.customerRequestRaw as string;

        const result = await this.appointmentService.createPendingAppointment({
      organizationId: context.organizationId,
      merchantId: context.merchantId!,
      customerId: context.customerId,
      customerName,
      serviceIds,
      startsAt,
      calendarId,
        timezone: context.timezone,
      customerRequestRaw,
      // Phase 4 guardrail: forwards the caller's mode so a Live Test
      // (persona-test, executionMode "simulation") never creates a real
      // appointment row - see AppointmentService.createPendingAppointment().
      executionMode: context.executionMode,
    });

    let msg = `Appointment creation attempt resulted in: ${result}`;
    if (result === 'INVALID_CALENDAR_ID') {
      msg = `Belirtilen calendarId sistemde bulunamadı. list_available_slots ile gerçek takvim ID'lerini öğrenip tekrar dene.`;
    } else if (result === 'CUSTOMER_TIME_CONFLICT') {
      msg = "Müşterinin bu saatle çakışan başka bir randevusu zaten var (aktif randevular bağlamda listelenmiştir). Müşteriye bunu açıkça söyle ve ne yapmak istediğini sor: farklı bir saat mi seçmek istiyor, yoksa iki randevuyu da mı istiyor? Yalnızca müşteri açıkça ikisini de isterse allowCustomerOverlap: true ile tekrar çağır.";
    } else if (result === 'DB_ERROR') {
      msg = "Randevu oluşturulamadı. Müşteriye NEDEN UYDURMA (yoğunluk, bakım, sistem sorunu vb. deme). Sadece 'Bu randevuyu şu an oluşturamadım' de ve farklı bir saat öner ya da tekrar denemeyi teklif et.";
    }

    return {
      status: result,
      message: msg
    };
  }
}

