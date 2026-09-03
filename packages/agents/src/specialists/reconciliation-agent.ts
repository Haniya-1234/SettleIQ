import type { AgentRunInput } from "@settleiq/shared";
import type { Agent, AgentContext, AgentResult } from "../types";
import { AgentNotImplementedError } from "../types";

function createStubAgent(
  type: Agent["type"],
  name: string,
  description: string,
): Agent {
  return {
    type,
    name,
    description,
    async run(_input: AgentRunInput, _context: AgentContext): Promise<AgentResult> {
      throw new AgentNotImplementedError(type);
    },
  };
}

export const reconciliationAgent = createStubAgent(
  "RECONCILIATION",
  "Reconciliation Agent",
  "Matches Razorpay transactions to internal orders and flags anomalies.",
);

export const investigationAgent = createStubAgent(
  "INVESTIGATION",
  "Investigation Agent",
  "Deep-dives into payment cases to determine root cause with evidence.",
);

export const resolutionAgent = createStubAgent(
  "RESOLUTION",
  "Resolution Agent",
  "Proposes and executes approved remediation actions via Razorpay.",
);

export { reconciliationAgent as default };
