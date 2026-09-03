import type { AgentRunInput } from "@settleiq/shared";
import type { Agent, AgentContext, AgentResult } from "../types";
import { AgentNotImplementedError } from "../types";
import { reconciliationAgent } from "../specialists/reconciliation-agent";
import { investigationAgent } from "../specialists/investigation-agent";
import { resolutionAgent } from "../specialists/resolution-agent";

const specialists: Agent[] = [
  reconciliationAgent,
  investigationAgent,
  resolutionAgent,
];

export class Orchestrator {
  async plan(_input: AgentRunInput): Promise<{ agents: string[] }> {
    // Phase 3: LLM-driven planning. For now, return empty plan.
    return { agents: [] };
  }

  async run(
    input: AgentRunInput,
    context: AgentContext,
    agentType?: string,
  ): Promise<AgentResult> {
    if (!agentType) {
      throw new AgentNotImplementedError("ORCHESTRATOR");
    }

    const agent = specialists.find((a) => a.type === agentType);
    if (!agent) {
      throw new AgentNotImplementedError(agentType as "ORCHESTRATOR");
    }

    return agent.run(input, context);
  }

  listAgents(): Pick<Agent, "type" | "name" | "description">[] {
    return specialists.map(({ type, name, description }) => ({
      type,
      name,
      description,
    }));
  }
}

export const orchestrator = new Orchestrator();
