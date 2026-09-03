import { z } from "zod";
import {
  AGENT_RUN_STATUSES,
  AGENT_STEP_TYPES,
  AGENT_TYPES,
  CASE_SEVERITIES,
  CASE_STATUSES,
  CASE_TYPES,
  PAYMENT_STATUSES,
} from "../types/index";

export const caseTypeSchema = z.enum(CASE_TYPES);
export const caseSeveritySchema = z.enum(CASE_SEVERITIES);
export const caseStatusSchema = z.enum(CASE_STATUSES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const agentTypeSchema = z.enum(AGENT_TYPES);
export const agentRunStatusSchema = z.enum(AGENT_RUN_STATUSES);
export const agentStepTypeSchema = z.enum(AGENT_STEP_TYPES);

export const evidenceItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  source: z.string(),
  value: z.unknown(),
  timestamp: z.string().optional(),
});

export const proposedActionSchema = z.object({
  type: z.string(),
  description: z.string(),
  requiresApproval: z.boolean(),
  payload: z.record(z.unknown()).optional(),
});

export const caseResolutionSchema = z.object({
  action: z.string(),
  summary: z.string(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  razorpayReference: z.string().optional(),
});

export const agentRunInputSchema = z.object({
  caseId: z.string().optional(),
  organizationId: z.string(),
  context: z.record(z.unknown()).optional(),
});

export const agentRunOutputSchema = z.object({
  summary: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  proposedActions: z.array(proposedActionSchema).optional(),
  evidence: z.array(evidenceItemSchema).optional(),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  clerkOrgId: z.string().optional(),
});

export const razorpayCredentialsSchema = z.object({
  keyId: z.string().min(1),
  keySecret: z.string().min(1),
});

export const syncRequestSchema = z.object({
  organizationId: z.string(),
  resource: z.enum(["payments", "orders", "settlements", "all"]),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export const runAgentSchema = z.object({
  organizationId: z.string(),
  agentType: agentTypeSchema,
  caseId: z.string().optional(),
  input: agentRunInputSchema.optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type RazorpayCredentialsInput = z.infer<typeof razorpayCredentialsSchema>;
export type SyncRequestInput = z.infer<typeof syncRequestSchema>;
export type RunAgentInput = z.infer<typeof runAgentSchema>;

export {
  findingTypeSchema,
  findingSeveritySchema,
  findingStatusSchema,
  reconciliationRunStatusSchema,
  createCaseFromFindingSchema,
} from "./reconciliation";
export {
  caseSourceSchema,
  recoveryInterventionTypeSchema,
  recoveryRiskLevelSchema,
  recoveryPolicyDecisionTypeSchema,
  recoveryAnalysisModeSchema,
  recoveryExecutionModeSchema,
  recoveryExecutionStatusSchema,
  recoveryCandidateInterventionSchema,
  recoveryRecommendationSchema,
  merchantRecoveryPolicySchema,
  recoveryPolicyDecisionSchema,
  recoveryExecutionResultSchema,
  recoveryMetricsSchema,
} from "./recovery";
export type { CreateCaseFromFindingInput } from "./reconciliation";
