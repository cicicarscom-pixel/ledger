import { ITool, ToolResult } from '../types.ts';
import { AIContext } from '../../types.ts';

export class ListCalendarsTool implements ITool {
  name = "list_calendars";
  description = "Lists the active calendars (doctors/staff/resources) available for appointments.";
  
  schema = {
    type: "object",
    properties: {},
    required: []
  };

  constructor(private readonly supabase: any) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    if (context.appointmentModuleEnabled === false) {
      return { status: "MODULE_DISABLED", message: "Appointment/reservation feature is disabled for this business." };
    }
    try {
      const { data: calendars, error } = await this.supabase
        .from('calendars')
        .select('id, name')
        .eq('org_id', context.organizationId)
        .eq('is_active', true);

      if (error) {
        console.error("[ListCalendarsTool] Database error:", error);
        return { status: "ERROR", message: "Takvim listesi çekilirken hata oluştu." };
      }

      if (!calendars || calendars.length === 0) {
        return {
          status: "SUCCESS",
          data: { 
            calendars: [], 
            system_note: "DİKKAT: İşletmenin veritabanında henüz kayıtlı aktif bir takvim/doktor bulunmamaktadır."
          }
        };
      }

      return {
        status: "SUCCESS",
        data: { calendars: calendars }
      };

    } catch (error) {
      console.error("[ListCalendarsTool] Exception:", error);
      return { status: "ERROR", message: "Takvim listesi alınamadı." };
    }
  }
}
