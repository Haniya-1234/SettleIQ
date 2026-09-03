import type { AgentRunInput, AgentRunOutput, AgentType } from "@settleiq/shared";

export interface AgentContext {
  organizationId: string;
  caseId?: string;
  agentRunId: string;
}

export interface AgentResult {
  output: AgentRunOutput;
  steps: AgentStepRecord[];
}

export interface AgentStepRecord {
  stepNumber: number;
  stepType: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface Agent {
  readonly type: AgentType;
  readonly name: string;
  readonly description: string;
  run(input: AgentRunInput, context: AgentContext): Promise<AgentResult>;
}

export class AgentNotImplementedError extends Error {
  constructor(agentType: AgentType) {
    super(
      `Agent "${agentType}" is not yet implemented. Connect AI providers in Phase 3.`,
    );
    this.name = "AgentNotImplementedError";
  }
}
