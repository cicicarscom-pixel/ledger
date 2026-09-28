import { ITool, ToolResult } from '../types.ts';
import { AIContext } from '../../types.ts';
import { AppointmentService, toMinutes } from '../../../domain/appointment/AppointmentService.ts';
import { isSchedulingOnlyText } from '../../guards/ResponseGuards.ts';

export class CreatePendingAppointmentTool implements ITool {
  name = "create_pending_appointment";
  description = "Creates a pending appointment for the customer at a specific date and time. " +
    "Identify the calendar (doctor/staff) by calendarName (preferred) or calendarId. " +
    "Only if the customer EXPLICITLY said they have no preference (e.g. 'farketmez', 'herhangi biri', 'any'), omit both and set anyCalendar: true. " +
    "If the customer has not been asked yet and several calendars are free, the tool returns CALENDAR_CHOICE_REQUIRED with the free calendars: ask the customer.";
  
  schema = {
    type: "object",
    properties: {
      serviceIds: { type: "array", items: { type: "string" }, description: "The IDs of the selected services. Omit if not explicitly matched." },
      startsAt: { type: "string", description: "The requested LOCAL date and time, format YYYY-MM-DDTHH:mm:ss (no timezone suffix)." },
      customerName: { type: "string", description: "Customer's full name, must be collected via conversation before calling this tool." },
      calendarName: { type: "string", description: "Name of the chosen doctor/staff exactly as shown to the customer (e.g. 'Dr.Mehmet YALÇIN'). Preferred over calendarId. Omit only together with anyCalendar: true." },
      anyCalendar: { type: "boolean", description: "true ONLY if the customer explicitly said any doctor/staff is fine. Never set it on your own." },
      calendarId: { type: "string", description: "Real calendar UUID ONLY if it appears in a tool result in THIS turn. Never guess or reconstruct an ID; use calendarName instead." },
      confirmSameDay: { type: "boolean", description: "Set true ONLY after SAME_DAY_APPOINTMENT_EXISTS and the customer explicitly confirmed they want an additional appointment that day." },
      allowCustomerOverlap: { type: "boolean", description: "Set true ONLY after CUSTOMER_TIME_CONFLICT and the customer explicitly wants both appointments." },
      customerRequestRaw: { type: "string", description: "The customer's REASON for the visit in their own words, copied exactly from their message (e.g. 'dolgum düştü'). NOT the date/time, NOT a confirmation like 'onaylıyorum', NOT a doctor preference. Look back in the conversation for it." }
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
    const requestedCalendarId = (args.calendarId as string | undefined) || undefined;
    const requestedCalendarName = (args.calendarName as string | undefined) || undefined;
    const customerRequestRaw = args.customerRequestRaw as string;
    const allowCustomerOverlap = args.allowCustomerOverlap === true;
    const anyCalendar = args.anyCalendar === true;
    const confirmSameDay = args.confirmSameDay === true;

    // Gelme nedeni yerine saat/onay cümlesi gönderildiyse kaydetme (28.09.2026: "sabah 9 olsun").
    if (serviceIds.length === 0 && isSchedulingOnlyText(customerRequestRaw)) {
      return {
        status: "REQUEST_RAW_INVALID",
        message: "customerRequestRaw müşterinin GELME NEDENİ olmalı (ör. 'dolgum düştü'); saat, tarih, onay veya doktor tercihi değil. " +
          "Sohbet geçmişinde müşterinin nedenini söylediği kendi cümlesini bul ve AYNEN kullanarak aracı BU TURDA tekrar çağır. " +
          "Müşteri nedeni hiç söylemediyse, bekleme mesajı vermeden tek cümleyle ne için geleceğini sor.",
      };
    }

    const sameDay = await this.appointmentService.findSameDayActiveAppointments(
      context.merchantId!, context.customerId, startsAt,
    );

    // 1) Önce TAM SAAT çakışması: müşterinin tam bu saatte kendi randevusu varsa bunu doğrudan söyle
    // (28.09.2026 22:44: önce "aynı gün" soruldu, onaydan sonra çakışma çıktı — iki tur boşa gitti).
    if (!allowCustomerOverlap) {
      const reqStart = toMinutes(startsAt.slice(11, 16));
      const reqEnd = reqStart + 30;
      const clash = sameDay.find((a) => reqStart < a.endMin && a.startMin < reqEnd);
      if (clash) {
        return {
          status: "CUSTOMER_TIME_CONFLICT",
          message: "Randevu HENÜZ OLUŞTURULMADI. Müşterinin tam bu saatte KENDİ randevusu var (data.ownAppointment). " +
            "Bunu açıkça söyle (saat, doktor) ve farklı bir saat öner. Müşteri iki randevuyu da aynı saatte istediğini açıkça söylerse " +
            "allowCustomerOverlap: true ile tekrar çağır. " + 'Bu bir hata DEĞİL, olağan bir durumdur: müşteriye "hata", "çakışma", "sistem", "arıza" veya persona benzetmesi ("enerji", "frekans", "icat" vb.) kullanmadan, durumu doğrudan ve sade söyle. ',
          data: { ownAppointment: { time: clash.time, endTime: clash.endTime, calendarName: clash.calendarName, reason: clash.reason } },
        };
      }
    }

    // 2) Aynı gün başka aktif randevusu varsa, müşteriye sormadan ikinci randevu açma
    // (28.09.2026 testi: 30 Eylül'de 09:00 ve 10:00 varken 16:00 sessizce eklendi).
    if (!confirmSameDay) {
      if (sameDay.length > 0) {
        return {
          status: "SAME_DAY_APPOINTMENT_EXISTS",
          message: "Randevu HENÜZ OLUŞTURULMADI. Müşterinin aynı gün aktif randevusu/randevuları var (data.existing). " +
            'Bu bir hata DEĞİL, olağan bir durumdur: müşteriye "hata", "çakışma", "sistem", "arıza" veya persona benzetmesi ("enerji", "frekans", "icat" vb.) kullanmadan, durumu doğrudan ve sade söyle. ' +
            "Bunları sade bir dille hatırlat (saat, varsa doktor ve neden) ve bu yeni randevunun AYRI bir randevu olarak da istenip istenmediğini sor. " +
            "Müşteri açıkça ek randevu isterse aynı bilgilerle confirmSameDay: true ekleyerek tekrar çağır. " +
            "Mevcut randevuyu değiştirmek/taşımak isterse işletmeye yönlendir. Müşteriye randevunun oluşturulduğunu SÖYLEME.",
          data: { existing: sameDay.map((a) => ({ time: a.time, calendarName: a.calendarName, reason: a.reason })) },
        };
      }
    }

    const resolved = await this.appointmentService.resolveCalendar({
      merchantId: context.merchantId!,
      calendarId: requestedCalendarId,
      calendarName: requestedCalendarName,
      startsAt,
      serviceIds,
      multiCalendarEnabled: context.multiCalendarEnabled,
      anyCalendar,
    });

    if (resolved.kind === "choice_required") {
      return {
        status: "CALENDAR_CHOICE_REQUIRED",
        message: "Bu saatte birden fazla uzman müsait; randevu HENÜZ OLUŞTURULMADI. Müşteriye bu adları sade bir dille sun ve hangisini tercih ettiğini sor. " +
          'Bu bir hata DEĞİL, olağan bir durumdur: müşteriye "hata", "çakışma", "sistem", "arıza" veya persona benzetmesi ("enerji", "frekans", "icat" vb.) kullanmadan, durumu doğrudan ve sade söyle. ' +
          "Müşteri bir ad seçerse calendarName ile, 'farketmez' derse anyCalendar: true ile aracı tekrar çağır. Müşteriye randevunun oluşturulduğunu SÖYLEME.",
        data: { availableCalendars: resolved.calendars.map((c) => c.name) },
      };
    }

    if (resolved.kind === "invalid") {
      return {
        status: "INVALID_CALENDAR_ID",
        message: "Belirtilen takvim bulunamadı. Aşağıdaki GERÇEK takvimlerden müşterinin seçtiğini calendarName (veya bu listedeki id) ile " +
          "aracı BU TURDA tekrar çağır. Müşteriye bekleme/kontrol mesajı verme, teknik ayrıntı anlatma. " +
          "Müşteri açıkça 'farketmez' dediyse calendarName/calendarId göndermeden anyCalendar: true ile çağır.",
        data: { calendars: resolved.calendars },
      };
    }

    if (resolved.kind === "no_free_calendar") {
      return {
        status: "SLOT_ALREADY_TAKEN",
        message: "Bu saatte müsait takvim yok. Müşteriye bunu sade bir dille söyle ve list_available_slots ile alternatif saatler sun.",
      };
    }

    const calendarId = resolved.kind === "resolved" ? resolved.id : undefined;
    const calendarName = resolved.kind === "resolved" ? resolved.name : "";

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
      allowCustomerOverlap,
    });

    let msg = `Appointment creation attempt resulted in: ${result}`;
    if (result === 'SUCCESS') {
      msg = calendarName
        ? `Randevu oluşturuldu. Takvim: ${calendarName}. Müşteriye tarih, saat ve bu takvim adını sade bir dille bildir.`
        : "Randevu oluşturuldu. Müşteriye tarih ve saati sade bir dille bildir.";
    } else if (result === 'INVALID_CALENDAR_ID') {
      msg = "Belirtilen takvim bulunamadı. calendarName ile BU TURDA tekrar dene; müşteriye bekleme mesajı verme.";
    } else if (result === 'SLOT_ALREADY_TAKEN') {
      msg = "Bu saat az önce doldu. Müşteriye sade bir dille söyle ve list_available_slots ile alternatif saatler sun.";
    } else if (result === 'CUSTOMER_TIME_CONFLICT') {
      msg = "Müşterinin bu saatte kendi randevusu zaten var (aktif randevular bağlamda listelenmiştir). Müşteriye bunu açıkça söyle ve ne yapmak istediğini sor: farklı bir saat mi seçmek istiyor, yoksa iki randevuyu da mı istiyor? Yalnızca müşteri açıkça ikisini de isterse allowCustomerOverlap: true ile tekrar çağır. " + 'Bu bir hata DEĞİL, olağan bir durumdur: müşteriye "hata", "çakışma", "sistem", "arıza" veya persona benzetmesi ("enerji", "frekans", "icat" vb.) kullanmadan, durumu doğrudan ve sade söyle. ';
    } else if (result === 'DB_ERROR') {
      msg = "Randevu oluşturulamadı. Müşteriye NEDEN UYDURMA (yoğunluk, bakım, sistem sorunu vb. deme). Sadece 'Bu randevuyu şu an oluşturamadım' de ve farklı bir saat öner ya da tekrar denemeyi teklif et.";
    }

    return {
      status: result,
      message: msg,
      ...(result === 'SUCCESS' && calendarName ? { data: { calendarName } } : {}),
    };
  }
}
