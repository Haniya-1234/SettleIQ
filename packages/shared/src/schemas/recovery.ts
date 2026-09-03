import { z } from "zod";
import {
  CASE_SOURCES,
  RECOVERY_ANALYSIS_MODES,
  RECOVERY_EXECUTION_MODES,
  RECOVERY_EXECUTION_STATUSES,
  RECOVERY_INTERVENTION_TYPES,
  RECOVERY_POLICY_DECISIONS,
  RECOVERY_RISK_LEVELS,
} from "../types";

const evidenceItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  source: z.string(),
  value: z.unknown(),
  timestamp: z.string().optional(),
});

export const caseSourceSchema = z.enum(CASE_SOURCES);
export const recoveryInterventionTypeSchema = z.enum(
  RECOVERY_INTERVENTION_TYPES,
);
export const recoveryRiskLevelSchema = z.enum(RECOVERY_RISK_LEVELS);
export const recoveryPolicyDecisionTypeSchema = z.enum(
  RECOVERY_POLICY_DECISIONS,
);
export const recoveryAnalysisModeSchema = z.enum(RECOVERY_ANALYSIS_MODES);
export const recoveryExecutionModeSchema = z.enum(RECOVERY_EXECUTION_MODES);
export const recoveryExecutionStatusSchema = z.enum(
  RECOVERY_EXECUTION_STATUSES,
);

export const recoveryCandidateInterventionSchema = z.object({
  type: recoveryInterventionTypeSchema,
  summary: z.string(),
  reason: z.string(),
  priority: z.number().int().nonnegative(),
  requiresApproval: z.boolean(),
  expectedRecoveryPaise: z.number().int().nonnegative(),
  riskLevel: recoveryRiskLevelSchema,
  cooldownMinutes: z.number().int().nonnegative().optional(),
  payload: z.record(z.unknown()).optional(),
});

export const recoveryRecommendationSchema = z.object({
  diagnosis: z.string(),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(evidenceItemSchema),
  candidateInterventions: z.array(recoveryCandidateInterventionSchema),
  recommendedIntervention: recoveryCandidateInterventionSchema,
  expectedRecoveryPaise: z.number().int().nonnegative(),
  riskLevel: recoveryRiskLevelSchema,
  analysisMode: recoveryAnalysisModeSchema,
  stoppingReason: z.string().optional(),
});

export const merchantRecoveryPolicySchema = z.object({
  maxRetryAttempts: z.number().int().nonnegative(),
  retryCooldownMinutes: z.number().int().nonnegative(),
  maxAutoRecoveryAmountPaise: z.number().int().nonnegative(),
  highAmountApprovalPaise: z.number().int().nonnegative(),
  contactCooldownHours: z.number().int().nonnegative(),
  lowConfidenceThreshold: z.number().min(0).max(1),
  allowedInterventions: z.array(recoveryInterventionTypeSchema),
});

export const recoveryPolicyDecisionSchema = z.object({
  decision: recoveryPolicyDecisionTypeSchema,
  allowedInterventions: z.array(recoveryInterventionTypeSchema),
  blockedReasons: z.array(z.string()),
  requiresHumanApproval: z.boolean(),
  confidence: z.number().min(0).max(1),
  maxAutoRecoveryAmountPaise: z.number().int().nonnegative(),
  retryLimit: z.number().int().nonnegative(),
  cooldownMinutes: z.number().int().nonnegative(),
  stoppingReason: z.string().optional(),
});

export const recoveryExecutionResultSchema = z.object({
  status: recoveryExecutionStatusSchema,
  mode: recoveryExecutionModeSchema,
  interventionType: recoveryInterventionTypeSchema,
  summary: z.string(),
  attemptedAt: z.string().optional(),
  recoveredAmountPaise: z.number().int().nonnegative().optional(),
  toolName: z.string().optional(),
  externalReference: z.string().optional(),
  error: z.string().optional(),
});

export const recoveryMetricsSchema = z.object({
  totalRevenueAtRiskPaise: z.number().int().nonnegative(),
  totalRecoveredPaise: z.number().int().nonnegative(),
  openCases: z.number().int().nonnegative(),
  approvalQueue: z.number().int().nonnegative(),
  failedRecoveries: z.number().int().nonnegative(),
  successfulRecoveries: z.number().int().nonnegative(),
  recoveryAttempts: z.number().int().nonnegative(),
  recoveryRate: z.number().min(0),
  incrementalRecoveryPaise: z.number().int().nonnegative(),
  preventedLossPaise: z.number().int().nonnegative(),
  datasetLabel: z.string(),
  dataMode: z.enum(["LIVE", "DEMO_SYNTHETIC"]),
});
