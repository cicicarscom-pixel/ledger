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

      return {
        status: "SUCCESS",
        data: { services: services || [] }
      };

    } catch (error) {
      console.error("[ListBusinessServicesTool] Exception:", error);
      return { status: "ERROR", message: "Hizmet listesi alýnamadý." };
    }
  }
}
