import { z } from "zod";
import {
  FINDING_SEVERITIES,
  FINDING_STATUSES,
  FINDING_TYPES,
  RECONCILIATION_RUN_STATUSES,
} from "../types/reconciliation";

export const findingTypeSchema = z.enum(FINDING_TYPES);
export const findingSeveritySchema = z.enum(FINDING_SEVERITIES);
export const findingStatusSchema = z.enum(FINDING_STATUSES);
export const reconciliationRunStatusSchema = z.enum(RECONCILIATION_RUN_STATUSES);

export const createCaseFromFindingSchema = z.object({
  findingId: z.string().min(1),
});

export type CreateCaseFromFindingInput = z.infer<
  typeof createCaseFromFindingSchema
>;
