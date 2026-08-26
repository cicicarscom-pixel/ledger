import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { HandleIncomingMessageUseCase } from "./application/usecases/HandleIncomingMessageUseCase.ts";
import { GeminiClient } from "./infrastructure/clients/GeminiClient.ts";
import { WahaClient } from "./infrastructure/clients/WahaClient.ts";
import { ZernioClient } from "./infrastructure/clients/ZernioClient.ts";
import { CommunicationLoggerRepository } from "./infrastructure/repositories/CommunicationLoggerRepository.ts";
import { AIOrchestrator } from "./ai/AIOrchestrator.ts";
import { PromptBuilder } from "./ai/PromptBuilder.ts";
import { ToolExecutor } from "./ai/tools/ToolExecutor.ts";
import { ToolRegistry } from "./ai/tools/ToolRegistry.ts";
import { AppointmentRepository } from "./infrastructure/repositories/AppointmentRepository.ts";
import { AppointmentService } from "./domain/appointment/AppointmentService.ts";
import { DriveKnowledgeRepository } from "./infrastructure/repositories/DriveKnowledgeRepository.ts";
import { DriveKnowledgeService } from "./domain/knowledge/DriveKnowledgeService.ts";

import { CreatePendingAppointmentTool } from "./ai/tools/appointments/CreatePendingAppointmentTool.ts";
import { ListAvailableSlotsTool } from "./ai/tools/appointments/ListAvailableSlotsTool.ts";
import { ListBusinessServicesTool } from "./ai/tools/appointments/ListBusinessServicesTool.ts";
import { SearchDriveKnowledgeTool } from "./ai/tools/rag/SearchDriveKnowledgeTool.ts";

export function createMessageUseCase(supabaseAdmin: SupabaseClient): HandleIncomingMessageUseCase {
  const geminiClient = new GeminiClient();
  const wahaClient = new WahaClient();
  const zernioClient = new ZernioClient();
  const logger = new CommunicationLoggerRepository();

  const appointmentRepository = new AppointmentRepository(supabaseAdmin);
  const appointmentService = new AppointmentService(appointmentRepository);
  
  const driveRepository = new DriveKnowledgeRepository(supabaseAdmin);
  const driveKnowledgeService = new DriveKnowledgeService(driveRepository);

  // Tools
  const createPendingAppointmentTool = new CreatePendingAppointmentTool(appointmentService);
  const listAvailableSlotsTool = new ListAvailableSlotsTool(appointmentService);
  const listBusinessServicesTool = new ListBusinessServicesTool(supabaseAdmin);
  const searchDriveKnowledgeTool = new SearchDriveKnowledgeTool(driveKnowledgeService, {
    // Temporary mock embedText until actual embedding provider is hooked up
    embedText: async (text: string) => {
      // Return 768-dim dummy vector for now. 
      // In production, call Gemini Text Embedding API or similar.
      return new Array(768).fill(0.01);
    }
  });

  const toolRegistry = new ToolRegistry([
    createPendingAppointmentTool,
    listAvailableSlotsTool,
    listBusinessServicesTool,
    searchDriveKnowledgeTool
  ]);

  const toolExecutor = new ToolExecutor(toolRegistry);
  const promptBuilder = new PromptBuilder();

  const aiOrchestrator = new AIOrchestrator({
    geminiClient,
    toolExecutor,
    toolRegistry,
    promptBuilder
  });

  return new HandleIncomingMessageUseCase({
    aiOrchestrator,
    wahaClient,
    zernioClient,
    logger
  });
}
