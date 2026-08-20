/**
 * Abstraction layer for LLM Providers (e.g., Gemini, OpenAI, Claude).
 * Decouples the core AI logic from specific vendor SDKs.
 */
export interface AIProvider {
  /**
   * Fast Path: Analyzes the user's input to determine the core intent.
   * Useful for routing directly to a specific tool or workflow without full orchestration.
   * 
   * @param prompt The user's raw message
   * @param possibleIntents List of intents the system currently supports
   * @returns The identified intent name, or null if ambiguous
   */
  classifyIntent(prompt: string, possibleIntents: string[]): Promise<string | null>;

  /**
   * Forces the LLM to return a strictly typed JSON object matching the requested schema.
   * Useful for data extraction, entity resolution, and parsing user requirements.
   * 
   * @param prompt The system and user instructions
   * @param schema The Zod schema or JSON schema definition
   * @returns The parsed object matching the schema
   */
  structuredOutput<T>(prompt: string, schema: any): Promise<T>;

  /**
   * General text generation with tool calling capabilities.
   * (Placeholder for future orchestration features)
   */
  generateText(prompt: string, options?: any): Promise<string>;
}
