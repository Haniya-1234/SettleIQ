import { SYNTHETIC_DATASET } from "@settleiq/shared";
import type { AnomalySpec, SyntheticDataset } from "../types";
import {
  addDays,
  baseAmountPaise,
  formatRef,
  ORDER_COUNT,
} from "./constants";
import { createSeededRng } from "./rng";

export { SYNTHETIC_DATASET };

/** Fixed anomaly distribution — deterministic across runs. */
export const ANOMALY_SPECS: AnomalySpec[] = [
  { kind: "EXACT_MATCH", startIndex: 1, count: 75 },
  { kind: "STATUS_MISMATCH", startIndex: 76, count: 9 },
  { kind: "AMOUNT_MISMATCH", startIndex: 85, count: 6 },
  { kind: "MISSING_SETTLEMENT", startIndex: 91, count: 6 },
  { kind: "DUPLICATE_PAYMENT", startIndex: 97, count: 2 },
  { kind: "UNMATCHED_ORDER", startIndex: 99, count: 5 },
  { kind: "DATE_MISMATCH", startIndex: 104, count: 4 },
  // Mandatory PS Demo Case: PAY_0105
  // Deterministically produces a STATUS_MISMATCH (failed payment) mapped to order index 108 (generating payment PAY_0105).
  // This explicitly triggers the existing recovery workflow:
  // -> payment failure -> revenue at risk -> AI diagnosis (insufficient_funds) -> recommended RETRY_LATER
  // -> confidence ~ 0.82 -> requires human approval -> PENDING_APPROVAL -> human approval -> APPROVED -> simulated execution -> RECOVERED
  { kind: "STATUS_MISMATCH", startIndex: 108, count: 1 },
  { kind: "STATUS_MISMATCH", startIndex: 109, count: 2 },
];

function getAnomalyKind(index: number): AnomalySpec["kind"] {
  for (const spec of ANOMALY_SPECS) {
    if (index >= spec.startIndex && index < spec.startIndex + spec.count) {
      return spec.kind;
    }
  }
  return "EXACT_MATCH";
}

export function generateSyntheticDataset(
  seed: number = SYNTHETIC_DATASET.seed,
): SyntheticDataset {
  const rng = createSeededRng(seed);
  const baseDate = new Date("2025-06-01T10:00:00.000Z");

  const orders: SyntheticDataset["orders"] = [];
  const payments: SyntheticDataset["payments"] = [];
  const settlements: SyntheticDataset["settlements"] = [];

  let paymentCounter = 0;

  for (let i = 1; i <= ORDER_COUNT; i++) {
    const kind = getAnomalyKind(i);
    const orderRef = formatRef("ORD", i);
    const amountPaise = baseAmountPaise(i, rng);
    const createdAt = addDays(baseDate, i % 30).toISOString();

    orders.push({
      id: orderRef,
      razorpayOrderId: orderRef,
      externalOrderId: `EXT_${orderRef}`,
      amountPaise,
      currency: "INR",
      status: kind === "UNMATCHED_ORDER" ? "created" : "paid",
      createdAt,
    });

    if (kind === "UNMATCHED_ORDER") {
      continue;
    }

    const paymentCount = kind === "DUPLICATE_PAYMENT" ? 2 : 1;

    for (let p = 0; p < paymentCount; p++) {
      paymentCounter += 1;
      const payIndex = paymentCounter;
      const paymentRef = formatRef("PAY", payIndex);
      const capturedAt = addDays(baseDate, i % 30).toISOString();

      let paymentAmount = amountPaise;
      if (kind === "AMOUNT_MISMATCH") {
        paymentAmount = amountPaise + 30000n; // ₹300 higher than order
      }

      let paymentStatus: SyntheticDataset["payments"][number]["status"] =
        "CAPTURED";
      let method = i % 2 === 0 ? "upi" : "card";
      let failureCode: string | null = null;
      let failureDescription: string | null = null;
      let retryCount = 0;

      if (kind === "STATUS_MISMATCH") {
        paymentStatus = "FAILED";

        if (i === 108) {
          // Mandatory PS Demo Case: PAY_0105
          failureCode = "insufficient_funds";
          failureDescription = "Customer balance was insufficient during authorization.";
          method = "card";
          retryCount = 1;
        } else if (i === 76 || i === 77) {
          failureCode = "bank_declined";
          failureDescription = "Issuer declined the payment attempt.";
          method = "upi";
          retryCount = 0;
        } else if (i === 78 || i === 79) {
          failureCode = "temporary_network_error";
          failureDescription = "A temporary network timeout occurred at the issuer's end.";
          method = "card";
          retryCount = 0;
        } else if (i === 80 || i === 81) {
          failureCode = "authentication_failed";
          failureDescription = "Customer failed 3D Secure authentication.";
          method = "card";
          retryCount = 2;
        } else if (i === 82 || i === 83 || i === 84) {
          failureCode = "insufficient_funds";
          failureDescription = "Customer balance was insufficient during authorization.";
          method = "upi";
          retryCount = 1;
        } else {
          // 109, 110 and fallbacks
          failureCode = i % 2 === 0 ? "expired_card" : "fraud_suspected";
          failureDescription = i % 2 === 0 ? "Stored card has expired." : "Payment blocked by risk policy.";
          method = "card";
          retryCount = 0;
        }
      }

      const settlementRef =
        kind === "MISSING_SETTLEMENT" ? null : formatRef("STL", payIndex);

      payments.push({
        id: paymentRef,
        razorpayPaymentId: paymentRef,
        razorpayOrderId: orderRef,
        razorpaySettlementId: settlementRef,
        orderId: orderRef,
        amountPaise: paymentAmount,
        currency: "INR",
        status: paymentStatus,
        capturedAt,
        method,
        failureCode,
        failureDescription,
        retryCount,
      });

      if (kind === "MISSING_SETTLEMENT") {
        continue;
      }

      let settledAt = capturedAt;
      if (kind === "DATE_MISMATCH") {
        settledAt = addDays(new Date(capturedAt), 5).toISOString();
      }

      const settlementAmount =
        kind === "AMOUNT_MISMATCH"
          ? paymentAmount - 30000n // settlement ₹300 lower than captured payment
          : paymentAmount;

      settlements.push({
        id: settlementRef!,
        razorpaySettlementId: settlementRef!,
        razorpayPaymentId: paymentRef,
        amountPaise: settlementAmount,
        currency: "INR",
        status: "processed",
        settledAt,
      });
    }
  }

  return {
    datasetId: SYNTHETIC_DATASET.id,
    datasetVersion: SYNTHETIC_DATASET.version,
    datasetLabel: SYNTHETIC_DATASET.label,
    seed,
    orders,
    payments,
    settlements,
  };
}
