export const CASE_TYPES = [
  "AMOUNT_MISMATCH",
  "MISSING_SETTLEMENT",
  "DUPLICATE_PAYMENT",
  "FAILED_PAYMENT",
  "UNMATCHED_ORDER",
  "DATE_MISMATCH",
  "STATUS_MISMATCH",
  "OTHER",
] as const;

export const CASE_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const CASE_STATUSES = [
  "OPEN",
  "ANALYZING",
  "ACTION_PROPOSED",
  "APPROVED",
  "EXECUTING",
  "RECOVERED",
  "FAILED",
  "ESCALATED",
  "CLOSED",
  "INVESTIGATING",
  "PENDING_APPROVAL",
  "RESOLVED",
  "DISMISSED",
] as const;

export const CASE_SOURCES = [
  "RECONCILIATION",
  "PAYMENT_FAILURE",
  "WEBHOOK",
] as const;

export const PAYMENT_STATUSES = [
  "CREATED",
  "AUTHORIZED",
  "CAPTURED",
  "REFUNDED",
  "FAILED",
] as const;

export const AGENT_TYPES = [
  "ORCHESTRATOR",
  "RECONCILIATION",
  "INVESTIGATION",
  "RESOLUTION",
  "EXPLAINABILITY",
] as const;

export const RECOVERY_INTERVENTION_TYPES = [
  "RETRY_NOW",
  "RETRY_LATER",
  "ALTERNATE_PAYMENT_METHOD",
  "CUSTOMER_REMINDER",
  "ESCALATE_TO_HUMAN",
  "NO_ACTION",
] as const;

export const RECOVERY_RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const RECOVERY_POLICY_DECISIONS = [
  "APPROVED",
  "REQUIRES_APPROVAL",
  "BLOCKED",
] as const;
export const RECOVERY_ANALYSIS_MODES = [
  "HEURISTIC_FALLBACK",
  "LLM_PROVIDER",
] as const;
export const RECOVERY_EXECUTION_MODES = [
  "SIMULATED",
  "RAZORPAY_TEST",
  "PRODUCTION",
] as const;
export const RECOVERY_EXECUTION_STATUSES = [
  "NOT_ATTEMPTED",
  "SIMULATED_SUCCESS",
  "SIMULATED_FAILURE",
  "SKIPPED",
] as const;

export const AGENT_RUN_STATUSES = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export const AGENT_STEP_TYPES = [
  "reasoning",
  "tool_call",
  "decision",
  "observation",
  "approval_request",
] as const;

export type CaseType = (typeof CASE_TYPES)[number];
export type CaseSeverity = (typeof CASE_SEVERITIES)[number];
export type CaseStatus = (typeof CASE_STATUSES)[number];
export type CaseSource = (typeof CASE_SOURCES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type AgentType = (typeof AGENT_TYPES)[number];
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];
export type AgentStepType = (typeof AGENT_STEP_TYPES)[number];
export type RecoveryInterventionType =
  (typeof RECOVERY_INTERVENTION_TYPES)[number];
export type RecoveryRiskLevel = (typeof RECOVERY_RISK_LEVELS)[number];
export type RecoveryPolicyDecisionType =
  (typeof RECOVERY_POLICY_DECISIONS)[number];
export type RecoveryAnalysisMode = (typeof RECOVERY_ANALYSIS_MODES)[number];
export type RecoveryExecutionMode = (typeof RECOVERY_EXECUTION_MODES)[number];
export type RecoveryExecutionStatus =
  (typeof RECOVERY_EXECUTION_STATUSES)[number];

export interface EvidenceItem {
  id: string;
  label: string;
  source: string;
  value: unknown;
  timestamp?: string;
}

export interface CaseResolution {
  action: string;
  summary: string;
  approvedBy?: string;
  approvedAt?: string;
  razorpayReference?: string;
}

export interface AgentRunInput {
  caseId?: string;
  organizationId: string;
  context?: Record<string, unknown>;
}

export interface AgentRunOutput {
  summary?: string;
  confidence?: number;
  proposedActions?: ProposedAction[];
  evidence?: EvidenceItem[];
}

export interface ProposedAction {
  type: string;
  description: string;
  requiresApproval: boolean;
  payload?: Record<string, unknown>;
}

export interface RecoveryCandidateIntervention {
  type: RecoveryInterventionType;
  summary: string;
  reason: string;
  priority: number;
  requiresApproval: boolean;
  expectedRecoveryPaise: number;
  riskLevel: RecoveryRiskLevel;
  cooldownMinutes?: number;
  payload?: Record<string, unknown>;
}

export interface RecoveryRecommendation {
  diagnosis: string;
  summary: string;
  confidence: number;
  evidence: EvidenceItem[];
  candidateInterventions: RecoveryCandidateIntervention[];
  recommendedIntervention: RecoveryCandidateIntervention;
  expectedRecoveryPaise: number;
  riskLevel: RecoveryRiskLevel;
  analysisMode: RecoveryAnalysisMode;
  stoppingReason?: string;
}

export interface MerchantRecoveryPolicy {
  maxRetryAttempts: number;
  retryCooldownMinutes: number;
  maxAutoRecoveryAmountPaise: number;
  highAmountApprovalPaise: number;
  contactCooldownHours: number;
  lowConfidenceThreshold: number;
  allowedInterventions: RecoveryInterventionType[];
}

export interface RecoveryPolicyDecision {
  decision: RecoveryPolicyDecisionType;
  allowedInterventions: RecoveryInterventionType[];
  blockedReasons: string[];
  requiresHumanApproval: boolean;
  confidence: number;
  maxAutoRecoveryAmountPaise: number;
  retryLimit: number;
  cooldownMinutes: number;
  stoppingReason?: string;
}

export interface RecoveryExecutionResult {
  status: RecoveryExecutionStatus;
  mode: RecoveryExecutionMode;
  interventionType: RecoveryInterventionType;
  summary: string;
  attemptedAt?: string;
  recoveredAmountPaise?: number;
  toolName?: string;
  externalReference?: string;
  error?: string;
}

export interface RecoveryMetrics {
  totalRevenueAtRiskPaise: number;
  totalRecoveredPaise: number;
  openCases: number;
  approvalQueue: number;
  failedRecoveries: number;
  successfulRecoveries: number;
  recoveryAttempts: number;
  recoveryRate: number;
  incrementalRecoveryPaise: number;
  preventedLossPaise: number;
  datasetLabel: string;
  dataMode: "LIVE" | "DEMO_SYNTHETIC";
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
