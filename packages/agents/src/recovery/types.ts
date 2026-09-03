import type {
  EvidenceItem,
  MerchantRecoveryPolicy,
  RecoveryExecutionResult,
  RecoveryPolicyDecision,
  RecoveryRecommendation,
} from "@settleiq/shared";

export interface RecoveryPaymentSnapshot {
  id: string;
  organizationId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string | null;
  amountPaise: number;
  currency: string;
  method: string | null;
  email: string | null;
  contact: string | null;
  retryCount: number;
  failureCode: string | null;
  failureDescription: string | null;
  lastFailedAt: string | null;
  orderStatus?: string | null;
  synthetic: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface RecoveryStep {
  stepType: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface RecoveryWorkflowResult {
  diagnosis: RecoveryRecommendation;
  policyDecision: RecoveryPolicyDecision;
  executionResult: RecoveryExecutionResult;
  steps: RecoveryStep[];
  caseStatus:
    | "ACTION_PROPOSED"
    | "PENDING_APPROVAL"
    | "FAILED"
    | "ESCALATED"
    | "RECOVERED";
  requiresHumanApproval: boolean;
  stoppingReason?: string;
  recoveredAmountPaise: number;
  baselineRecoveredAmountPaise: number;
}

export interface RecoveryAnalysisContext {
  payment: RecoveryPaymentSnapshot;
  policy: MerchantRecoveryPolicy;
  now: Date;
}

export interface RecoveryAnalysisProvider {
  readonly mode: RecoveryRecommendation["analysisMode"];
  analyze(input: RecoveryAnalysisContext): RecoveryRecommendation;
}

export interface RecoveryExecutionContext {
  payment: RecoveryPaymentSnapshot;
  policyDecision: RecoveryPolicyDecision;
  recommendation: RecoveryRecommendation;
  now: Date;
}

export interface RecoveryExecutor {
  execute(input: RecoveryExecutionContext): RecoveryExecutionResult;
}

export interface RecoveryMetricRecord {
  amountAtRiskPaise: number;
  recoveredAmountPaise: number;
  status: string;
  requiresHumanApproval: boolean;
  executionStatus?: string | null;
}

export interface RecoveryDashboardSnapshot {
  diagnosis: RecoveryRecommendation;
  policyDecision: RecoveryPolicyDecision;
  executionResult: RecoveryExecutionResult;
  evidence: EvidenceItem[];
}
