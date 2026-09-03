export const FINDING_TYPES = [
  "EXACT_MATCH",
  "AMOUNT_MISMATCH",
  "MISSING_SETTLEMENT",
  "DUPLICATE_PAYMENT",
  "UNMATCHED_ORDER",
  "DATE_MISMATCH",
  "STATUS_MISMATCH",
] as const;

export const FINDING_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const FINDING_STATUSES = ["OPEN", "RESOLVED", "CONVERTED_TO_CASE"] as const;

export const RECONCILIATION_RUN_STATUSES = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
] as const;

export type FindingType = (typeof FINDING_TYPES)[number];
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];
export type FindingStatus = (typeof FINDING_STATUSES)[number];
export type ReconciliationRunStatus =
  (typeof RECONCILIATION_RUN_STATUSES)[number];

export const SYNTHETIC_DATASET = {
  id: "synthetic-buildathon-v1",
  version: "1.0.0",
  label: "Synthetic Buildathon Dataset",
  seed: 42,
  recordCount: 110,
} as const;
