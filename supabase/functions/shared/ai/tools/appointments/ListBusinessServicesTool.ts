import { ITool, ToolResult } from '../types.ts';
import { AIContext } from '../../types.ts';

export class ListBusinessServicesTool implements ITool {
  name = "list_business_services";
  description = "Lists the active services and prices offered by the business. Use it silently to match the customer's need; do not read the list to the customer unless they ask.";

  schema = {
    type: "object",
    properties: {},
    required: []
  };

  constructor(private readonly supabase: any) {}

  async execute(context: AIContext, _args: Record<string, unknown>): Promise<ToolResult> {
    if (context.appointmentModuleEnabled === false) {
      return { status: "MODULE_DISABLED", message: "Appointment/reservation feature is disabled for this business." };
    }
    try {
      const { data: services, error } = await this.supabase
        .from('business_services')
        .select('id, name, duration_minutes, price, currency, unit, description')
        .eq('merchant_id', context.merchantId)
        .eq('is_visible', true);

      if (error) {
        console.error(`[ListBusinessServicesTool] merchant_id=${context.merchantId} database error:`, error);
        return { status: "ERROR", message: "Hizmet listesi alınamadı." };
      }

      console.log(`[ListBusinessServicesTool] merchant_id=${context.merchantId} hizmet sayısı: ${services?.length ?? 0}`);

      if (!services || services.length === 0) {
        return {
          status: "SUCCESS",
          data: {
            services: [],
            system_note:
              "Bu işletmenin tanımlı bir hizmet listesi yok; bu normal bir durumdur. " +
              "Müşteriye hizmet listesi olmadığını SÖYLEME ve listeden hizmet SEÇTİRME. " +
              "Hizmet uydurma, örnek hizmet sayma. " +
              "Müşteri ne için geleceğini söylediyse onu customerRequestRaw olarak AYNEN kullan ve serviceIds'i boş bırak. " +
              "Söylemediyse bir kez, doğal bir dille 'Ne için gelmek istersiniz?' diye sorabilirsin. " +
              "Yalnızca müşteri açıkça hizmetleri veya fiyatları sorarsa, sabit bir listenin olmadığını ve ihtiyacını dinleyerek yardımcı olacağını kısaca söyle."
          }
        };
      }

      return {
        status: "SUCCESS",
        data: { services }
      };
    } catch (error) {
      console.error("[ListBusinessServicesTool] Exception:", error);
      return { status: "ERROR", message: "Hizmet listesi alınamadı." };
    }
  }
}
