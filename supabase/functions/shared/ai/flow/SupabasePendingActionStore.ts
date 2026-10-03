import type { NewPendingAction, PendingActionRow, PendingActionStore } from './FlowAIGate.ts';

/** flow_ai_pending_actions için service_role istemcisiyle çalışan depo. İstemci (kullanıcı JWT'si) bu tabloya YAZAMAZ. */
export class SupabasePendingActionStore implements PendingActionStore {
  constructor(private readonly admin: any) {}

  async insert(row: NewPendingAction): Promise<PendingActionRow> {
    const { data, error } = await this.admin.from('flow_ai_pending_actions').insert(row).select('*').single();
    if (error) throw error;
    return data as PendingActionRow;
  }

  async claim(id: string, orgId: string, userId: string): Promise<PendingActionRow | null> {
    const { data, error } = await this.admin
      .from('flow_ai_pending_actions')
      .update({ status: 'approved', decided_at: new Date().toISOString() })
      .eq('id', id).eq('org_id', orgId).eq('user_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return (data as PendingActionRow) ?? null;
  }

  async finish(id: string, status: 'executed' | 'failed', result: unknown): Promise<void> {
    const { error } = await this.admin
      .from('flow_ai_pending_actions')
      .update({ status, result, executed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) console.error('[SupabasePendingActionStore] finish hata:', error);
  }

  async reject(id: string, orgId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.admin
      .from('flow_ai_pending_actions')
      .update({ status: 'rejected', decided_at: new Date().toISOString() })
      .eq('id', id).eq('org_id', orgId).eq('user_id', userId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }
}
