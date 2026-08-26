import { DriveKnowledgeRepository } from '../../infrastructure/repositories/DriveKnowledgeRepository.ts';

export class DriveKnowledgeService {
  constructor(private readonly driveKnowledgeRepository: DriveKnowledgeRepository) {}

  async searchKnowledge(organizationId: string, embedding: number[]): Promise<Array<{ content: string; similarity: number; source: string }>> {
    const results = await this.driveKnowledgeRepository.searchDocuments(organizationId, embedding, 3);
    
    return results.map(row => ({
      content: row.content,
      similarity: row.similarity,
      source: row.file_name
    }));
  }
}
