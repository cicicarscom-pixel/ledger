'use server';

import { createClient } from '../../utils/supabase/server';
import { cookies } from 'next/headers';
import { routerService } from '../ai-core/router/intent-router';
import { ToolContext, ToolResult } from '../ai-core/shared/types';

export async function submitAiCommand(message: string, conversationId: string): Promise<ToolResult<any>> {
  if (!message || !conversationId) {
    return { success: false, error: 'Message and conversationId are required.' };
  }

  try {
    // SECURITY FIRST: Create server-side Supabase client to fetch trusted context
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Authenticate user securely on the server
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized: User not authenticated.' };
    }

    // 2. Fetch the firm ID securely from the database (RBAC)
    const { data: member, error: memberError } = await supabase
      .from('accounting_firm_members')
      .select('accounting_firm_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return { success: false, error: 'Forbidden: User is not associated with an accounting firm.' };
    }

    // 3. Construct trusted context
    const context: ToolContext = {
      userId: user.id,
      firmId: member.accounting_firm_id,
      role: member.role || 'accountant',
      conversationId
    };

    // 4. Route and execute the command via AI Core
    const result = await routerService.routeMessage(message, context);
    
    // Serialized result returned directly to the client
    return result;

  } catch (error: any) {
    console.error('[AI Action Error]:', error);
    return { success: false, error: 'Internal server error processing AI command.' };
  }
}
