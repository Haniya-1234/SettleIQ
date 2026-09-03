import type { ToolDefinition } from "@settleiq/shared";

export interface Tool<TInput = unknown, TOutput = unknown> {
  definition: ToolDefinition;
  execute(input: TInput): Promise<TOutput>;
}

export interface ToolRegistry {
  register<TInput, TOutput>(tool: Tool<TInput, TOutput>): void;
  get(name: string): Tool | undefined;
  list(): ToolDefinition[];
}

export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, Tool>();

  return {
    register<TInput, TOutput>(tool: Tool<TInput, TOutput>) {
      tools.set(tool.definition.name, tool as Tool);
    },
    get(name: string) {
      return tools.get(name);
    },
    list() {
      return Array.from(tools.values()).map((t) => t.definition);
    },
  };
}
