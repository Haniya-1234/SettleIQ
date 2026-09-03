import type { FindingSeverity, FindingStatus, FindingType } from "@settleiq/shared";

export type PaymentStatus =
  | "CREATED"
  | "AUTHORIZED"
  | "CAPTURED"
  | "REFUNDED"
  | "FAILED";

export interface NormalizedOrder {
  id: string;
  razorpayOrderId: string;
  externalOrderId: string;
  amountPaise: bigint;
  currency: string;
  status: string;
  createdAt: string;
}

export interface NormalizedPayment {
  id: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySettlementId: string | null;
  orderId: string;
  amountPaise: bigint;
  currency: string;
  status: PaymentStatus;
  capturedAt: string | null;
}

export interface NormalizedSettlement {
  id: string;
  razorpaySettlementId: string;
  razorpayPaymentId: string;
  amountPaise: bigint;
  currency: string;
  status: string;
  settledAt: string | null;
}

export interface ReconciliationFindingResult {
  findingKey: string;
  type: FindingType;
  severity: FindingSeverity;
  status: FindingStatus;
  recordIds: string[];
  orderRef: string | null;
  paymentRef: string | null;
  settlementRef: string | null;
  expectedValue: string | null;
  actualValue: string | null;
  difference: string | null;
  explanation: string;
}

export interface ReconciliationMetrics {
  totalRecords: number;
  matchedRecords: number;
  mismatchedRecords: number;
  unmatchedRecords: number;
  exceptionCount: number;
  matchRate: number;
}

export interface ReconciliationEngineResult {
  findings: ReconciliationFindingResult[];
  metrics: ReconciliationMetrics;
  matchedRecordIds: string[];
  unresolvedRecordIds: string[];
}

export interface SyntheticDataset {
  datasetId: string;
  datasetVersion: string;
  datasetLabel: string;
  seed: number;
  orders: NormalizedOrder[];
  payments: NormalizedPayment[];
  settlements: NormalizedSettlement[];
}

export type AnomalyKind =
  | "EXACT_MATCH"
  | "AMOUNT_MISMATCH"
  | "MISSING_SETTLEMENT"
  | "DUPLICATE_PAYMENT"
  | "UNMATCHED_ORDER"
  | "DATE_MISMATCH"
  | "STATUS_MISMATCH";

export interface AnomalySpec {
  kind: AnomalyKind;
  startIndex: number;
  count: number;
}
