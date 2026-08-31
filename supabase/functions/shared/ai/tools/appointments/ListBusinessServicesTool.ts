import { ITool, ToolResult } from '../types.ts';
import { AIContext } from '../../types.ts';

export class ListBusinessServicesTool implements ITool {
  name = "list_business_services";
  description = "Lists the active services and prices offered by the business.";
  
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
      const { data: services, error } = await this.supabase
        .from('business_services')
        .select('id, name, duration_minutes, price, currency, unit, description')
        .eq('merchant_id', context.organizationId)
        .eq('is_visible', true);

      if (error) {
        console.error("[ListBusinessServicesTool] Database error:", error);
        return { status: "ERROR", message: "Hizmet listesi çekilirken geçici bir sistem hatasý oluþtu." };
      }

      if (!services || services.length === 0) {
        return {
          status: "SUCCESS",
          data: { 
            services: [], 
            system_note: "DÝKKAT: Ýþletmenin veritabanýnda henüz kayýtlý hiçbir hizmeti bulunmamaktadýr. Kullanýcýya hizmetleri sorulduðunda ASLA varsayýlan hizmetler (cilt bakýmý, manikür, saç kesimi vb.) uydurmayýn. Doðrudan 'Þu an sistemimizde kayýtlý hizmet bulunmamaktadýr' þeklinde yanýt verin."
          }
        };
      }

      return {
        status: "SUCCESS",
        data: { services: services }
      };

    } catch (error) {
      console.error("[ListBusinessServicesTool] Exception:", error);
      return { status: "ERROR", message: "Hizmet listesi alýnamadý." };
    }
  }
}

