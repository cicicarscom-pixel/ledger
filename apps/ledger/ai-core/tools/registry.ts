import { WorkigomTool } from './tool.types';

export class ToolRegistry {
  private tools = new Map<string, WorkigomTool<any, any>>();

  register(tool: WorkigomTool<any, any>) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): WorkigomTool<any, any> | undefined {
    return this.tools.get(name);
  }

  getAllTools(): WorkigomTool<any, any>[] {
    return Array.from(this.tools.values());
  }
}
