export class DriveKnowledgeRepository {
  constructor(private readonly supabase: any) {}

  async searchDocuments(organizationId: string, embedding: number[], limit: number = 3): Promise<any[]> {
    const { data, error } = await this.supabase.rpc('match_company_documents', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit,
      p_profile_id: organizationId
    });

    if (error) {
      console.error("[DriveKnowledgeRepository] Error searching documents:", error);
      throw error;
    }

    return data || [];
  }
}
