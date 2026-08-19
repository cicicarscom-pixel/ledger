import { WorkigomTool, ToolContext, ToolResult } from '../tool.types';
import { TaxpayerResolver } from '../../entities/taxpayer-resolver';
import { ResolveResult } from '../../entities/entity.types';

// Dependency injection of the resolver
let resolverInstance: TaxpayerResolver;
export function setResolverForTools(resolver: TaxpayerResolver) {
  resolverInstance = resolver;
}

export const findTaxpayerTool: WorkigomTool<{ query: string }, ResolveResult> = {
  name: 'find_taxpayer',
  description: 'İsmi veya takma adı verilen mükellefi arar ve eşleşme güven skorunu (confidence) döndürür.',
  risk: 'read',
  inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  
  async execute(context: ToolContext, input: { query: string }): Promise<ToolResult<ResolveResult>> {
    if (!resolverInstance) {
      return { success: false, error: { code: 'NO_RESOLVER', message: 'Resolver is not initialized' } };
    }
    try {
      const resolveContext = { activeTaxpayerId: context.activeTaxpayerId };
      const result = await resolverInstance.resolve(input.query, resolveContext);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: { code: 'RESOLVE_ERROR', message: err.message } };
    }
  }
};
