import type {
  MerchantRecoveryPolicy,
  RecoveryPolicyDecision,
  RecoveryRecommendation,
} from "@settleiq/shared";
import type { RecoveryPaymentSnapshot } from "./types";

export function evaluateRecoveryPolicy(input: {
  payment: RecoveryPaymentSnapshot;
  recommendation: RecoveryRecommendation;
  policy: MerchantRecoveryPolicy;
}): RecoveryPolicyDecision {
  const { payment, recommendation } = input;
  const { policy } = input;
  const blockedReasons: string[] = [];

  if (payment.retryCount >= policy.maxRetryAttempts) {
    blockedReasons.push("Maximum retries exceeded.");
  }

  if (recommendation.confidence < policy.lowConfidenceThreshold) {
    blockedReasons.push("Confidence below the automation threshold.");
  }

  const requiresHumanApproval =
    recommendation.recommendedIntervention.requiresApproval ||
    payment.amountPaise > policy.highAmountApprovalPaise;

  if (!policy.allowedInterventions.includes(recommendation.recommendedIntervention.type)) {
    blockedReasons.push("Recommended intervention is not permitted by merchant policy.");
  }

  if (recommendation.recommendedIntervention.type === "RETRY_NOW" && payment.failureCode === "bank_declined") {
    blockedReasons.push("Immediate retries are blocked for issuer-decline failures.");
  }

  if (blockedReasons.length > 0) {
    return {
      decision: "BLOCKED",
      allowedInterventions: policy.allowedInterventions,
      blockedReasons,
      requiresHumanApproval,
      confidence: recommendation.confidence,
      maxAutoRecoveryAmountPaise: policy.maxAutoRecoveryAmountPaise,
      retryLimit: policy.maxRetryAttempts,
      cooldownMinutes: policy.retryCooldownMinutes,
      stoppingReason: blockedReasons[0],
    };
  }

  if (requiresHumanApproval) {
    return {
      decision: "REQUIRES_APPROVAL",
      allowedInterventions: policy.allowedInterventions,
      blockedReasons: [],
      requiresHumanApproval: true,
      confidence: recommendation.confidence,
      maxAutoRecoveryAmountPaise: policy.maxAutoRecoveryAmountPaise,
      retryLimit: policy.maxRetryAttempts,
      cooldownMinutes: policy.retryCooldownMinutes,
      stoppingReason: "Case requires human approval before execution.",
    };
  }

  return {
    decision: "APPROVED",
    allowedInterventions: policy.allowedInterventions,
    blockedReasons: [],
    requiresHumanApproval: false,
    confidence: recommendation.confidence,
    maxAutoRecoveryAmountPaise: policy.maxAutoRecoveryAmountPaise,
    retryLimit: policy.maxRetryAttempts,
    cooldownMinutes: policy.retryCooldownMinutes,
  };
}
