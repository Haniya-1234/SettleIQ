import type {
  MerchantRecoveryPolicy,
  RecoveryCandidateIntervention,
  RecoveryInterventionType,
  RecoveryRecommendation,
  RecoveryRiskLevel,
} from "@settleiq/shared";
import type {
  RecoveryAnalysisContext,
  RecoveryAnalysisProvider,
  RecoveryPaymentSnapshot,
} from "./types";

function buildEvidence(payment: RecoveryPaymentSnapshot) {
  const retryCount = payment.retryCount;
  const amountTier =
    payment.amountPaise >= 150_000 ? "high_amount" : "standard_amount";

  return [
    {
      id: "payment_failure_code",
      label: "Failure code",
      source: payment.synthetic ? "synthetic-payment" : "razorpay-payment",
      value: payment.failureCode ?? "unknown",
      timestamp: payment.lastFailedAt ?? undefined,
    },
    {
      id: "retry_count",
      label: "Retry count",
      source: "payment-metadata",
      value: retryCount,
      timestamp: payment.lastFailedAt ?? undefined,
    },
    {
      id: "payment_method",
      label: "Payment method",
      source: "payment-method",
      value: payment.method ?? "unknown",
    },
    {
      id: "amount_tier",
      label: "Amount tier",
      source: "risk-heuristic",
      value: amountTier,
    },
  ];
}

function riskFromPayment(
  payment: RecoveryPaymentSnapshot,
  policy: MerchantRecoveryPolicy,
): { confidence: number; riskLevel: RecoveryRiskLevel; diagnosis: string } {
  if (payment.retryCount >= policy.maxRetryAttempts) {
    return {
      confidence: 0.39,
      riskLevel: "CRITICAL",
      diagnosis: "Payment has exhausted the merchant retry budget.",
    };
  }

  if (payment.failureCode === "insufficient_funds") {
    return {
      confidence: 0.82,
      riskLevel: payment.amountPaise >= 150_000 ? "HIGH" : "MEDIUM",
      diagnosis: "Insufficient funds often recover after a bounded cooldown retry.",
    };
  }

  if (payment.failureCode === "bank_declined") {
    return {
      confidence: 0.71,
      riskLevel: "HIGH",
      diagnosis: "Issuer decline suggests a reminder or alternate method is safer than an immediate retry.",
    };
  }

  if (payment.failureCode === "expired_card") {
    return {
      confidence: 0.68,
      riskLevel: "MEDIUM",
      diagnosis: "The stored payment instrument is stale and likely needs customer intervention.",
    };
  }

  return {
    confidence: 0.56,
    riskLevel: "MEDIUM",
    diagnosis: "Failure pattern is recoverable but requires bounded handling.",
  };
}

function buildCandidates(
  payment: RecoveryPaymentSnapshot,
  policy: MerchantRecoveryPolicy,
  confidence: number,
  riskLevel: RecoveryRiskLevel,
): RecoveryCandidateIntervention[] {
  const candidates: RecoveryCandidateIntervention[] = [];
  const common = {
    expectedRecoveryPaise: payment.amountPaise,
    riskLevel,
  };

  if (payment.retryCount < policy.maxRetryAttempts) {
    const immediateRetryPreferred = payment.failureCode === "insufficient_funds";
    candidates.push({
      type: immediateRetryPreferred ? "RETRY_LATER" : "RETRY_NOW",
      summary: immediateRetryPreferred
        ? "Retry after a short cooldown"
        : "Retry the payment immediately",
      reason: immediateRetryPreferred
        ? "Recent insufficient-funds failures often recover after a short wait."
        : "The payment has remaining retry budget and no hard stop has fired.",
      priority: 1,
      requiresApproval:
        payment.amountPaise > policy.maxAutoRecoveryAmountPaise || confidence < 0.6,
      cooldownMinutes: immediateRetryPreferred
        ? policy.retryCooldownMinutes
        : 0,
      payload: {
        retryCount: payment.retryCount + 1,
      },
      ...common,
    });
  }

  candidates.push({
    type: "CUSTOMER_REMINDER",
    summary: "Send a customer reminder with a secure retry prompt",
    reason: "Customer outreach is safer when the failure indicates an instrument or issuer issue.",
    priority: 2,
    requiresApproval: false,
    payload: {
      channel: payment.contact ? "sms" : "email",
    },
    ...common,
  });

  candidates.push({
    type: "ALTERNATE_PAYMENT_METHOD",
    summary: "Prompt for an alternate payment method",
    reason: "Recommended when the current instrument is unlikely to recover cleanly.",
    priority: 3,
    requiresApproval: false,
    payload: {
      currentMethod: payment.method,
    },
    ...common,
  });

  candidates.push({
    type: "ESCALATE_TO_HUMAN",
    summary: "Escalate the case to an operator",
    reason: "Needed when policy or confidence prevents automated handling.",
    priority: 4,
    requiresApproval: true,
    payload: {
      queue: "revenue-ops",
    },
    ...common,
  });

  candidates.push({
    type: "NO_ACTION",
    summary: "Take no automated action",
    reason: "Preserves safety when none of the bounded interventions are appropriate.",
    priority: 5,
    requiresApproval: false,
    payload: {},
    ...common,
  });

  return candidates.filter((candidate) =>
    policy.allowedInterventions.includes(candidate.type),
  );
}

export class HeuristicRecoveryAnalysisProvider
  implements RecoveryAnalysisProvider
{
  readonly mode = "HEURISTIC_FALLBACK" as const;

  analyze(input: RecoveryAnalysisContext): RecoveryRecommendation {
    const { payment, policy } = input;
    const evidence = buildEvidence(payment);
    const assessment = riskFromPayment(payment, policy);
    const candidates = buildCandidates(
      payment,
      policy,
      assessment.confidence,
      assessment.riskLevel,
    );
    const recommendedIntervention =
      candidates[0] ??
      ({
        type: "NO_ACTION",
        summary: "No intervention available",
        reason: "Policy disallows all bounded interventions for this case.",
        priority: 99,
        requiresApproval: false,
        expectedRecoveryPaise: 0,
        riskLevel: "CRITICAL",
      } satisfies RecoveryCandidateIntervention);

    return {
      diagnosis: assessment.diagnosis,
      summary: `Detected revenue at risk on payment ${payment.razorpayPaymentId}.`,
      confidence: assessment.confidence,
      evidence,
      candidateInterventions: candidates,
      recommendedIntervention,
      expectedRecoveryPaise:
        recommendedIntervention.type === "NO_ACTION" ? 0 : payment.amountPaise,
      riskLevel: assessment.riskLevel,
      analysisMode: this.mode,
      stoppingReason:
        recommendedIntervention.type === "NO_ACTION"
          ? "No bounded intervention passed policy pre-filtering."
          : undefined,
    };
  }
}

export function createDefaultMerchantPolicy(): MerchantRecoveryPolicy {
  return {
    maxRetryAttempts: 3,
    retryCooldownMinutes: 180,
    maxAutoRecoveryAmountPaise: 120_000,
    highAmountApprovalPaise: 150_000,
    contactCooldownHours: 24,
    lowConfidenceThreshold: 0.58,
    allowedInterventions: [
      "RETRY_NOW",
      "RETRY_LATER",
      "ALTERNATE_PAYMENT_METHOD",
      "CUSTOMER_REMINDER",
      "ESCALATE_TO_HUMAN",
      "NO_ACTION",
    ],
  };
}
