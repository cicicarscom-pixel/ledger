import { ITool } from './types.ts';

export class ToolRegistry {
  private tools = new Map<string, ITool>();

  constructor(tools: ITool[]) {
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  getTool(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  getAllSchemas(): Record<string, unknown>[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.schema
    }));
  }
}
