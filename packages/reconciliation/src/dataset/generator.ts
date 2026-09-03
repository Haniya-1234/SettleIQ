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
  { kind: "EXACT_MATCH", startIndex: 1, count: 84 },
  { kind: "AMOUNT_MISMATCH", startIndex: 85, count: 6 },
  { kind: "MISSING_SETTLEMENT", startIndex: 91, count: 6 },
  { kind: "DUPLICATE_PAYMENT", startIndex: 97, count: 2 },
  { kind: "UNMATCHED_ORDER", startIndex: 99, count: 5 },
  { kind: "DATE_MISMATCH", startIndex: 104, count: 4 },
  { kind: "STATUS_MISMATCH", startIndex: 108, count: 3 },
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
      if (kind === "STATUS_MISMATCH") {
        paymentStatus = "FAILED";
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
