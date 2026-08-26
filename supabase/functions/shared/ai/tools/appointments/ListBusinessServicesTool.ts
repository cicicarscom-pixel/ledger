import { ITool, ToolResult } from '../types.ts';
import { AIContext } from '../../types.ts';
// Assume BusinessServiceRepository will handle the fetching, or a BusinessService for now.
// I'll create a basic mock for this to satisfy the contract.

export class ListBusinessServicesTool implements ITool {
  name = "list_business_services";
  description = "Lists the services offered by the business.";
  
  schema = {
    type: "object",
    properties: {},
    required: []
  };

  constructor(private readonly supabase: any) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    // In a full implementation, this would call a domain service.
    // For now, returning mock discovery contract data as requested by user.
    const services = [
      {
        id: "svc_haircut",
        name: "Saç Kesimi",
        durationMinutes: 30,
        price: 500
      }
    ];

    return {
      status: "SUCCESS",
      data: { services }
    };
  }
}
