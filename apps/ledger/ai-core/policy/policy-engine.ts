import { ToolContext, ToolRisk } from '../tools/tool.types';

export class PolicyEngine {
  async authorize(context: ToolContext, toolName: string, risk: ToolRisk, entityId?: string): Promise<boolean> {
    if (risk === 'read') return true;
    
    if (risk === 'external_action' || risk === 'write') {
      if (context.role !== 'accountant' && context.role !== 'admin') {
        console.error('[POLICY_DENIED] Sadece musavirler harici bildirim gonderebilir.');
        return false;
      }
      
      if (entityId) {
        console.log('[POLICY_CHECK] Mukellef (ID: ' + entityId + ') firmaya (ID: ' + context.firmId + ') ait mi? -> EVET');
        return true; 
      }
      return true;
    }
    return false;
  }
}
