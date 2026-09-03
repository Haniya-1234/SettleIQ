import {
  type MerchantRecoveryPolicy,
  type RecoveryExecutionResult,
  type RecoveryPolicyDecision,
  type RecoveryRecommendation,
} from "@settleiq/shared";
import { SimulatedRecoveryExecutor } from "./executor";
import {
  createDefaultMerchantPolicy,
  HeuristicRecoveryAnalysisProvider,
} from "./provider";
import { evaluateRecoveryPolicy } from "./policy-engine";
import type {
  RecoveryPaymentSnapshot,
  RecoveryStep,
  RecoveryWorkflowResult,
} from "./types";

function buildSteps(input: {
  recommendation: RecoveryRecommendation;
  policyDecision: RecoveryPolicyDecision;
  executionResult: RecoveryExecutionResult;
}): RecoveryStep[] {
  const { recommendation, policyDecision, executionResult } = input;

  return [
    {
      stepType: "risk_detection",
      content: recommendation.summary,
      metadata: {
        confidence: recommendation.confidence,
        riskLevel: recommendation.riskLevel,
      },
    },
    {
      stepType: "analysis",
      content: recommendation.diagnosis,
      metadata: {
        evidence: recommendation.evidence,
        candidateInterventions: recommendation.candidateInterventions,
      },
    },
    {
      stepType: "policy_decision",
      content:
        policyDecision.stoppingReason ??
        `Policy decision: ${policyDecision.decision}.`,
      metadata: policyDecision as unknown as Record<string, unknown>,
    },
    {
      stepType: "execution",
      content: executionResult.summary,
      metadata: executionResult as unknown as Record<string, unknown>,
    },
  ];
}

function finalStatus(input: {
  policyDecision: RecoveryPolicyDecision;
  executionResult: RecoveryExecutionResult;
}) : RecoveryWorkflowResult["caseStatus"] {
  const { policyDecision, executionResult } = input;

  if (policyDecision.decision === "BLOCKED") {
    return executionResult.interventionType === "ESCALATE_TO_HUMAN"
      ? "ESCALATED"
      : "FAILED";
  }

  if (policyDecision.decision === "REQUIRES_APPROVAL") {
    return "PENDING_APPROVAL";
  }

  return executionResult.status === "SIMULATED_SUCCESS"
    ? "RECOVERED"
    : "ACTION_PROPOSED";
}

export function runRecoveryWorkflow(input: {
  payment: RecoveryPaymentSnapshot;
  policy?: MerchantRecoveryPolicy;
  now?: Date;
}): RecoveryWorkflowResult {
  const now = input.now ?? new Date();
  const policy = input.policy ?? createDefaultMerchantPolicy();
  const provider = new HeuristicRecoveryAnalysisProvider();
  const executor = new SimulatedRecoveryExecutor();

  const diagnosis = provider.analyze({
    payment: input.payment,
    policy,
    now,
  });
  const policyDecision = evaluateRecoveryPolicy({
    payment: input.payment,
    recommendation: diagnosis,
    policy,
  });
  const executionResult = executor.execute({
    payment: input.payment,
    policyDecision,
    recommendation: diagnosis,
    now,
  });

  const caseStatus = finalStatus({ policyDecision, executionResult });
  const steps = buildSteps({ recommendation: diagnosis, policyDecision, executionResult });
  const recoveredAmountPaise = executionResult.recoveredAmountPaise ?? 0;

  return {
    diagnosis,
    policyDecision,
    executionResult,
    steps,
    caseStatus,
    requiresHumanApproval: policyDecision.requiresHumanApproval,
    stoppingReason:
      policyDecision.stoppingReason ?? diagnosis.stoppingReason,
    recoveredAmountPaise,
    baselineRecoveredAmountPaise: 0,
  };
}
