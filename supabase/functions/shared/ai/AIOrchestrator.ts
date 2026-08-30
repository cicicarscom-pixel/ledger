import { AIContext, GeminiTurnResult } from './types.ts';
import { PromptBuilder } from './PromptBuilder.ts';
import { ToolExecutor } from './tools/ToolExecutor.ts';
import { ToolRegistry } from './tools/ToolRegistry.ts';
import { GeminiClient } from '../infrastructure/clients/GeminiClient.ts';

interface AIOrchestratorDeps {
  geminiClient: GeminiClient;
  toolExecutor: ToolExecutor;
  toolRegistry: ToolRegistry;
  promptBuilder: PromptBuilder;
}

export class AIOrchestrator {
  private MAX_TOOL_ROUNDS = 5;

  constructor(private readonly deps: AIOrchestratorDeps) {}

  async handleMessage(
    context: AIContext, 
    userMessage: string, 
    history: { role: string, parts: { text: string }[] }[] = []
  ): Promise<string> {
    const systemPrompt = this.deps.promptBuilder.build(context);
    const tools = this.deps.toolRegistry.getAllSchemas();
    
    // Pass chat history, then append the new user message.
    const messages: any[] = [
      ...history,
      { role: "user", parts: [{ text: userMessage }] }
    ];

    for (let round = 0; round < this.MAX_TOOL_ROUNDS; round++) {
      const turnResult = await this.deps.geminiClient.generateResponse(systemPrompt, messages, tools);

      if (turnResult.type === "text") {
        // Model generated a final text response.
        return turnResult.text;
      }

      if (turnResult.type === "tool_calls") {
        // Model wants to use tools.
        const toolResponses = [];
        
        // Add model's tool call request to history
        messages.push({
          role: "model",
          parts: turnResult.calls.map(c => ({
            functionCall: { name: c.name, args: c.args }
          }))
        });

        // Execute all requested tools in parallel
        for (const call of turnResult.calls) {
          const result = await this.deps.toolExecutor.executeCall(context, call);
          
          toolResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: result }
            }
          });
        }

        // Feed tool results back to the model
        messages.push({
          role: "user", // For Gemini API, function responses are sent as 'user' role or generic function parts
          parts: toolResponses
        });
      }
    }

    console.warn(`[AIOrchestrator] MAX_TOOL_ROUNDS (${this.MAX_TOOL_ROUNDS}) exceeded.`);
    return "Şu an işleminizi gerçekleştiremiyorum. Lütfen daha sonra tekrar deneyin veya doğrudan bizimle iletişime geçin.";
  }
}
