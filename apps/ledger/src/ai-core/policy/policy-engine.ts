import { ToolContext, ToolRisk } from '../shared/types';

/**
 * The Policy Engine is responsible for authorizing tool execution
 * based on the user's role, firm context, and the tool's inherent risk level.
 */
export class PolicyEngine {
  
  /**
   * Determines if the current context has permission to execute a tool with the given risk.
   * 
   * @param toolRisk The risk level declared by the tool ('read' | 'write' | 'external_action')
   * @param context The tenant and user context
   * @returns boolean indicating approval
   */
  public canExecute(toolRisk: ToolRisk, context: ToolContext): boolean {
    if (!context || !context.userId || !context.firmId) {
      return false; // Instant block on invalid context
    }

    if (toolRisk === 'read') {
      return true; // Read operations are generally safe within the tenant boundary
    }

    if (toolRisk === 'external_action') {
      // TODO: FUTURE STRICT RLS/ROLE ENFORCEMENT GOES HERE.
      // E.g., if (context.role !== 'admin' && context.role !== 'partner') return false;
      // For now, we mock approval to establish the architecture pattern.
      console.warn(\[POLICY ENGINE] Mock approval granted for external_action by user \\);
      return true; 
    }

    if (toolRisk === 'write') {
      // Mock approval
      return true;
    }

    return false;
  }
}

export const policyEngine = new PolicyEngine();
