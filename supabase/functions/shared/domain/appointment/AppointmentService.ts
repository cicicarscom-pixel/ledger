import { AppointmentRepository } from "../../infrastructure/repositories/AppointmentRepository.ts";

export type AppointmentResult =
  | "SUCCESS"
  | "SLOT_ALREADY_TAKEN"
  | "SERVICE_NOT_FOUND"
  | "INVALID_DATE"
  | "CUSTOMER_REQUIRED"
  | "CUSTOMER_NAME_REQUIRED"
  | "DB_ERROR"
  | "APPOINTMENT_NOT_FOUND"
  | "INVALID_CALENDAR_ID"
  | "CUSTOMER_TIME_CONFLICT";

export class AppointmentService {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  /**
   * create_pending_appointment için takvimi SUNUCU TARAFINDA çözer.
   * Neden: Sohbet geçmişi modele yalnız metin olarak gidiyor; önceki turdaki araç
   * sonuçlarındaki takvim UUID'leri kayboluyor ve model UUID uyduruyordu
   * (28.09.2026: üç kez INVALID_CALENDAR_ID). Artık model doktor ADINI verebilir
   * ya da tercih yoksa hiçbir şey vermez; sistem gerçek takvimi kendisi bulur.
   *
   *  - calendarId aktif takvimlerden biriyse → o
   *  - calendarName tek bir aktif takvime eşleşiyorsa → o
   *  - biri verilmiş ama çözülemiyorsa → INVALID (tahmin YOK; yanlış doktora yazmamak için)
   *  - hiçbiri verilmemişse: tek aktif takvim varsa o; çoklu takvimde o saatte
   *    tek müsait takvim varsa o; birden fazla müsaitse YALNIZ anyCalendar=true ise ilki,
   *    değilse CHOICE_REQUIRED (müşteriye sorulmalı — işletme kuralı; 28.09.2026 v93 gerilemesi)
   */
  async resolveCalendar(params: {
    merchantId: string;
    calendarId?: string;
    calendarName?: string;
    startsAt: string;
    serviceIds: string[];
    multiCalendarEnabled?: boolean;
    anyCalendar?: boolean;
  }): Promise<
    | { kind: "resolved"; id: string; name: string }
    | { kind: "none" }
    | { kind: "invalid"; calendars: { id: string; name: string }[] }
    | { kind: "no_free_calendar" }
    | { kind: "choice_required"; calendars: { id: string; name: string }[] }
  > {
    const { data: rows, error } = await this.appointmentRepository["supabase"]
      .from("calendars")
      .select("id, name")
      .eq("merchant_id", params.merchantId)
      .eq("is_active", true);

    if (error) {
      console.error("[AppointmentService.resolveCalendar] calendars okunamadı:", error);
      return params.calendarId ? { kind: "resolved", id: params.calendarId, name: "" } : { kind: "none" };
    }

    const calendars: { id: string; name: string }[] = rows ?? [];
    if (calendars.length === 0) return { kind: "none" };

    if (params.calendarId) {
      const hit = calendars.find((c) => c.id === params.calendarId);
      if (hit) return { kind: "resolved", id: hit.id, name: hit.name };
    }

    if (params.calendarName && params.calendarName.trim() !== "") {
      const wanted = normalizeCalendarName(params.calendarName);
      if (wanted !== "") {
        const exact = calendars.filter((c) => normalizeCalendarName(c.name) === wanted);
        if (exact.length === 1) return { kind: "resolved", id: exact[0].id, name: exact[0].name };
        const partial = calendars.filter((c) => {
          const n = normalizeCalendarName(c.name);
          return n.includes(wanted) || wanted.includes(n);
        });
        if (partial.length === 1) return { kind: "resolved", id: partial[0].id, name: partial[0].name };
      }
    }

    if (params.calendarId || (params.calendarName && params.calendarName.trim() !== "")) {
      console.warn("[AppointmentService.resolveCalendar] çözülemedi:", params.calendarId, params.calendarName);
      return { kind: "invalid", calendars };
    }

    if (calendars.length === 1) {
      return { kind: "resolved", id: calendars[0].id, name: calendars[0].name };
    }

    if (!params.multiCalendarEnabled) return { kind: "none" };

    // Tercih yok ("farketmez"): o saatte müsait ilk takvim.
    const date = params.startsAt.slice(0, 10);
    const time = params.startsAt.slice(11, 16);
    let slots;
    try {
      slots = await this.appointmentRepository.getAvailableSlots(
        params.merchantId,
        date,
        params.serviceIds,
        true,
      );
    } catch (e: any) {
      if (e.message === 'availability_verification_failed') {
         return { kind: "no_free_calendar" };
      }
      throw e;
    }
    const slot = Array.isArray(slots)
      ? slots.find((s: any) => s && typeof s === "object" && s.time === time)
      : null;
    const free: { id: string; name: string }[] = (slot?.availableCalendars ?? []).filter((c: any) => c?.id);
    if (free.length === 0) return { kind: "no_free_calendar" };
    if (free.length === 1 || params.anyCalendar === true) {
      return { kind: "resolved", id: free[0].id, name: free[0].name };
    }
    return { kind: "choice_required", calendars: free.map((c) => ({ id: c.id, name: c.name })) };
  }

  async rescheduleAppointment(
    params: {
      merchantId: string;
      customerId?: string;
      appointmentId: string;
      newStartsAt: string;
      executionMode?: "production" | "simulation";
      allowCustomerOverlap?: boolean;
    },
  ): Promise<AppointmentResult> {
    if (!params.customerId) return "CUSTOMER_REQUIRED";
    if (!params.newStartsAt) return "INVALID_DATE";
    if (!params.appointmentId) return "APPOINTMENT_NOT_FOUND";
    try {
      if (params.executionMode === "simulation") {
        console.log(
          `[AppointmentService] SIMULATION MODE — skipping real reschedule`,
        );
        return "SUCCESS";
      }
      const updated = await this.appointmentRepository
        .updateAppointmentDateTime(
          params.merchantId,
          params.appointmentId,
          params.customerId,
          params.newStartsAt,
        );
      if (!updated) return "APPOINTMENT_NOT_FOUND";
      return "SUCCESS";
    } catch (error: any) {
      console.error(
        "[AppointmentService] DB Error rescheduling appointment:",
        error.message || error,
      );

      const errCode = error?.code || error?.details?.code;
      if (
        errCode === "23505" || errCode === "23P01" ||
        (error.message && error.message.includes("conflicts with"))
      ) {
        return "SLOT_ALREADY_TAKEN";
      }

      return "DB_ERROR";
    }
  }

  async createPendingAppointment(params: {
    organizationId: string;
    merchantId: string;
    customerId?: string;
    customerName?: string;
    customerRequestRaw?: string;
    serviceIds: string[];
    startsAt: string;
    calendarId?: string;
      timezone: string;
    // Phase 4 (Persona Engine Live Test) guardrail: when this is "simulation",
    // this method MUST NOT write a real row to the appointments table. It
    // still runs the real collision check (a read) so the preview stays
    // faithful to what a real customer would see, but the actual INSERT is
    // skipped. Any caller that doesn't pass this (there are none left in
    // this codebase) gets the original, unchanged "always write" behavior.
    executionMode?: "production" | "simulation";
      allowCustomerOverlap?: boolean;
    }): Promise<AppointmentResult> {
    if (!params.customerId) {
      return "CUSTOMER_REQUIRED";
    }

    if (!params.customerName || params.customerName.trim() === "") {
      return "CUSTOMER_NAME_REQUIRED";
    }

    if (!params.startsAt) {
      return "INVALID_DATE";
    }

    if (params.calendarId) {
      const { data: calExists } = await this.appointmentRepository["supabase"]
        .from("calendars")
        .select("id")
        .eq("id", params.calendarId)
        .eq("merchant_id", params.merchantId)
        .maybeSingle();

      if (!calExists) {
        return "INVALID_CALENDAR_ID";
      }
    }

    if (!params.serviceIds || params.serviceIds.length === 0) {
      if (!params.customerRequestRaw) {
        return "SERVICE_NOT_FOUND";
      }
    } else {
      const areServicesValid = await this.appointmentRepository
        .validateServiceIds(params.merchantId, params.serviceIds);
      if (!areServicesValid) {
        console.warn(
          "[AppointmentService] Invalid service IDs provided:",
          params.serviceIds,
        );
        return "SERVICE_NOT_FOUND";
      }
    }

    try {
      // 2. Simulation guardrail: never insert a real appointment during a
      // Live Test preview. The AI's conversational response is still
      // generated normally by the caller (AIOrchestrator) — only the actual
      // database write is suppressed here.
      if (params.executionMode === "simulation") {
        console.log(
          `[AppointmentService] SIMULATION MODE — skipping real insert (org=${params.organizationId}, services=${
            params.serviceIds.join(",")
          }, startsAt=${params.startsAt})`,
        );
        return "SUCCESS";
      }

      // 3. Insert Appointment (production only)
      await this.appointmentRepository.createPendingAppointment({
        organizationId: params.organizationId,
        merchantId: params.merchantId,
        customerId: params.customerId!,
        customerName: params.customerName!,
        customerRequestRaw: params.customerRequestRaw,
        serviceIds: params.serviceIds,
        startsAt: params.startsAt,
        calendarId: params.calendarId,
          timezone: params.timezone,
        allowCustomerOverlap: params.allowCustomerOverlap
      });

      return "SUCCESS";
    } catch (error: any) {
      if (error?.code === 'CUSTOMER_TIME_CONFLICT' || error?.message === 'CUSTOMER_TIME_CONFLICT') {
        return "CUSTOMER_TIME_CONFLICT";
      }

      console.error(
        "[AppointmentService] DB Error creating appointment:",
        error.message || error,
      );

      // PostgreSQL error codes for Unique Violation (23505) and Exclusion Violation (23P01)
      const errCode = error?.code || error?.details?.code;
      if (
        errCode === "23505" || errCode === "23P01" ||
        (error.message && error.message.includes("conflicts with"))
      ) {
        return "SLOT_ALREADY_TAKEN";
      }

      return "DB_ERROR"; // Allows the prompt builder or tool executor to relay a systemic failure rather than blaming the date
    }
  }

  /**
   * Müşterinin, istenen yerel günde (startsAt'ın tarihi) başka aktif randevusu var mı?
   * appointments.date yerel saat metnidir (trigger doldurur): "YYYY-MM-DDTHH:mm:ss".
   */
  async findSameDayActiveAppointments(
    merchantId: string,
    customerPhone: string | undefined,
    startsAt: string,
  ): Promise<{ time: string; endTime: string; startMin: number; endMin: number; calendarName: string; reason: string }[]> {
    if (!customerPhone || !startsAt) return [];
    const day = startsAt.slice(0, 10);
    const supabase = this.appointmentRepository["supabase"];
    const { data: rows, error } = await supabase
      .from("appointments")
      .select("date, starts_at, ends_at, calendar_id, customer_request_raw")
      .eq("organization_id", merchantId)
      .eq("customer_phone", customerPhone)
      .in("status", ["Pending", "Approved"])
      .gte("date", `${day}T00:00:00`)
      .lte("date", `${day}T23:59:59`)
      .order("date", { ascending: true });
    if (error) {
      console.error("[AppointmentService.findSameDayActiveAppointments]", error);
      return [];
    }
    const list = rows ?? [];
    if (list.length === 0) return [];
    const calIds = [...new Set(list.map((r: any) => r.calendar_id).filter(Boolean))];
    const names = new Map<string, string>();
    if (calIds.length > 0) {
      const { data: cals } = await supabase.from("calendars").select("id, name").in("id", calIds);
      for (const c of cals ?? []) names.set(c.id, c.name);
    }
    return list.map((r: any) => {
      const time = String(r.date).slice(11, 16);
      const startMin = toMinutes(time);
      const durMin = r.starts_at && r.ends_at
        ? Math.max(1, Math.round((new Date(r.ends_at).getTime() - new Date(r.starts_at).getTime()) / 60000))
        : 30;
      const endMin = startMin + durMin;
      return {
        time,
        endTime: fromMinutes(endMin),
        startMin,
        endMin,
        calendarName: r.calendar_id ? names.get(r.calendar_id) ?? "" : "",
        reason: r.customer_request_raw ?? "",
      };
    });
  }

  async getAvailableSlots(
    merchantId: string,
    date: string,
    serviceIds: string[],
    multiCalendarEnabled?: boolean,
  ): Promise<any> {
    return this.appointmentRepository.getAvailableSlots(
      merchantId,
      date,
      serviceIds,
      multiCalendarEnabled,
    );
  }
}

/** "Dr.Mehmet YALÇIN", "dr. mehmet yalçın", "Mehmet Yalcin" → "mehmetyalcin" */
export function normalizeCalendarName(name: string): string {
  return (name ?? "")
    .toLocaleLowerCase("tr")
    .replace(/(^|[^\p{L}])(dr|dt|doktor|uzm|uzman|prof|doç)(?=[^\p{L}]|$)\.?/gu, "$1")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    // Türkçe harfleri sadeleştir: model "Yalcin" yazsa da "YALÇIN" ile eşleşsin
    .replace(/ı/g, "i").replace(/ç/g, "c").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ü/g, "u");
}

/** "09:30" → 570 */
export function toMinutes(hhmm: string): number {
  const [h, m] = (hhmm ?? "").split(":").map((x) => parseInt(x, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/** 570 → "09:30" */
export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
