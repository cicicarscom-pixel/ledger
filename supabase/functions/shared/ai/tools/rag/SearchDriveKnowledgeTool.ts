import { ITool, ToolResult } from '../types.ts';
import { AIContext } from '../../types.ts';
import { DriveKnowledgeService } from '../../../domain/knowledge/DriveKnowledgeService.ts';

export class SearchDriveKnowledgeTool implements ITool {
  name = "search_drive_knowledge";
  description = "Searches the business documents (knowledge base) for information to answer customer queries.";
  
  schema = {
    type: "object",
    properties: {
      query: { type: "string", description: "The search query to look up in the documents." }
    },
    required: ["query"]
  };

  constructor(
    private readonly driveKnowledgeService: DriveKnowledgeService,
    private readonly embeddingProvider: { embedText(text: string): Promise<number[]> }
  ) {}

  async execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    
    try {
      // 1. Generate embedding for the query
      const embedding = await this.embeddingProvider.embedText(query);
      
      // 2. Search using tenant-safe RAG
      const chunks = await this.driveKnowledgeService.searchKnowledge(context.organizationId, embedding);
      
      return {
        status: "SUCCESS",
        data: { chunks }
      };
    } catch (error) {
      console.error("[SearchDriveKnowledgeTool] Error searching knowledge:", error);
      return {
        status: "ERROR",
        message: "Failed to search documents."
      };
    }
  }
}
