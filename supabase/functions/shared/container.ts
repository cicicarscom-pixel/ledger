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
import { PersonaRepository } from "./ai/persona/PersonaRepository.ts";
import { PersonaService } from "./ai/persona/PersonaService.ts";
import { PersonaPromptBuilder } from "./ai/persona/PersonaPromptBuilder.ts";

import { CreatePendingAppointmentTool } from "./ai/tools/appointments/CreatePendingAppointmentTool.ts";
import { ListAvailableSlotsTool } from "./ai/tools/appointments/ListAvailableSlotsTool.ts";
import { ListBusinessServicesTool } from "./ai/tools/appointments/ListBusinessServicesTool.ts";
import { SearchDriveKnowledgeTool } from "./ai/tools/rag/SearchDriveKnowledgeTool.ts";

interface AiPipeline {
  aiOrchestrator: AIOrchestrator;
  personaRepository: PersonaRepository;
  personaService: PersonaService;
}

// Shared by BOTH the real message-handling pipeline (createMessageUseCase,
// used by waha-webhook/zernio-webhook) and the Phase 4 Live Test pipeline
// (createPersonaTestPipeline, used by persona-test). This is deliberate, not
// just DRY: guardrail #7 requires persona-test to exercise the exact same
// PromptBuilder/AIOrchestrator/ToolRegistry construction as production — two
// separate build functions could silently drift apart over time and make
// Live Test lie about what a real customer would experience. One function,
// two callers, no drift possible.
function buildAiPipeline(supabaseAdmin: SupabaseClient): AiPipeline {
  const geminiClient = new GeminiClient();

  const appointmentRepository = new AppointmentRepository(supabaseAdmin);
  const appointmentService = new AppointmentService(appointmentRepository);

  const driveRepository = new DriveKnowledgeRepository(supabaseAdmin);
  const driveKnowledgeService = new DriveKnowledgeService(driveRepository);

  // Persona Engine (Phase 3 wiring). Safe even before the Phase 1 migration
  // is applied to the live database: PersonaRepository swallows query errors
  // and returns null, so PersonaService.resolveForMerchant() resolves to
  // null and PromptBuilder's fallback chain (guardrail #6) takes over —
  // nothing here can break an existing merchant's bot.
  const personaRepository = new PersonaRepository(supabaseAdmin);
  const personaService = new PersonaService(personaRepository);
  const personaPromptBuilder = new PersonaPromptBuilder();

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
  const promptBuilder = new PromptBuilder(personaPromptBuilder);

  const aiOrchestrator = new AIOrchestrator({
    geminiClient,
    toolExecutor,
    toolRegistry,
    promptBuilder
  });

  return { aiOrchestrator, personaRepository, personaService };
}

export function createMessageUseCase(supabaseAdmin: SupabaseClient): HandleIncomingMessageUseCase {
  const wahaClient = new WahaClient();
  const zernioClient = new ZernioClient();
  const logger = new CommunicationLoggerRepository();

  const { aiOrchestrator, personaService } = buildAiPipeline(supabaseAdmin);

  return new HandleIncomingMessageUseCase({
    aiOrchestrator,
    wahaClient,
    zernioClient,
    logger,
    personaService
  });
}

// Phase 4: Live Test pipeline (used by the new persona-test edge function).
// Returns the exact same aiOrchestrator construction as production, plus
// personaRepository/personaService directly — persona-test needs
// personaRepository to look up a persona by id, and personaService to
// resolve a config from POSSIBLY-UNSAVED draft dial values the merchant is
// still previewing (see persona-test/index.ts). Deliberately does NOT
// construct or return WahaClient/ZernioClient/CommunicationLoggerRepository
// — persona-test physically cannot send a message to a real channel or log
// to ai_communication_logs as if a real customer conversation happened,
// because those classes are never even instantiated in this code path.
export function createPersonaTestPipeline(supabaseAdmin: SupabaseClient): AiPipeline {
  return buildAiPipeline(supabaseAdmin);
}
