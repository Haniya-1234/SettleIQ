import type {
  NormalizedOrder,
  NormalizedPayment,
  NormalizedSettlement,
  ReconciliationEngineResult,
  ReconciliationFindingResult,
} from "./types";
import { DATE_MISMATCH_THRESHOLD_DAYS, daysBetween } from "./dataset/constants";
import {
  buildFinding,
  computeDifference,
  explainAmountMismatch,
  explainDateMismatch,
  explainDuplicatePayment,
  explainExactMatch,
  explainMissingSettlement,
  explainStatusMismatch,
  explainUnmatchedOrder,
} from "./explain";
import { formatMoney, moneyFromPaise } from "@settleiq/shared";

export interface ReconciliationInput {
  orders: NormalizedOrder[];
  payments: NormalizedPayment[];
  settlements: NormalizedSettlement[];
}

export class ReconciliationEngine {
  reconcile(input: ReconciliationInput): ReconciliationEngineResult {
    const findings: ReconciliationFindingResult[] = [];
    const matchedRecordIds: string[] = [];
    const unresolvedRecordIds: string[] = [];
    const processedOrders = new Set<string>();

    // Stage 1: Index by identifiers
    const ordersById = new Map(input.orders.map((o) => [o.razorpayOrderId, o]));
    const paymentsByOrderId = new Map<string, NormalizedPayment[]>();
    const settlementsByPaymentId = new Map(
      input.settlements.map((s) => [s.razorpayPaymentId, s]),
    );
    const settlementsById = new Map(
      input.settlements.map((s) => [s.razorpaySettlementId, s]),
    );

    for (const payment of input.payments) {
      const list = paymentsByOrderId.get(payment.razorpayOrderId) ?? [];
      list.push(payment);
      paymentsByOrderId.set(payment.razorpayOrderId, list);
    }

    // Stage 2–5: Process each order
    for (const order of input.orders) {
      processedOrders.add(order.razorpayOrderId);
      const payments = paymentsByOrderId.get(order.razorpayOrderId) ?? [];

      if (payments.length === 0) {
        findings.push(
          buildFinding({
            findingKey: `UNMATCHED_ORDER:${order.razorpayOrderId}`,
            type: "UNMATCHED_ORDER",
            recordIds: [order.razorpayOrderId],
            orderRef: order.razorpayOrderId,
            paymentRef: null,
            settlementRef: null,
            expectedValue: formatMoney(moneyFromPaise(order.amountPaise)),
            actualValue: null,
            difference: null,
            explanation: explainUnmatchedOrder(order),
          }),
        );
        unresolvedRecordIds.push(order.razorpayOrderId);
        continue;
      }

      if (payments.length > 1) {
        findings.push(
          buildFinding({
            findingKey: `DUPLICATE_PAYMENT:${order.razorpayOrderId}`,
            type: "DUPLICATE_PAYMENT",
            recordIds: [
              order.razorpayOrderId,
              ...payments.map((p) => p.razorpayPaymentId),
            ],
            orderRef: order.razorpayOrderId,
            paymentRef: payments.map((p) => p.razorpayPaymentId).join(", "),
            settlementRef: null,
            expectedValue: "1 payment",
            actualValue: `${payments.length} payments`,
            difference: `+${payments.length - 1}`,
            explanation: explainDuplicatePayment(order, payments),
          }),
        );
        unresolvedRecordIds.push(order.razorpayOrderId);
        continue;
      }

      const payment = payments[0]!;
      const settlement = payment.razorpaySettlementId
        ? settlementsById.get(payment.razorpaySettlementId) ??
          settlementsByPaymentId.get(payment.razorpayPaymentId)
        : settlementsByPaymentId.get(payment.razorpayPaymentId);

      let hasException = false;

      // Stage 3: Amount + currency
      if (
        payment.currency !== order.currency ||
        payment.amountPaise !== order.amountPaise
      ) {
        findings.push(
          buildFinding({
            findingKey: `AMOUNT_MISMATCH:${order.razorpayOrderId}:${payment.razorpayPaymentId}`,
            type: "AMOUNT_MISMATCH",
            recordIds: [order.razorpayOrderId, payment.razorpayPaymentId],
            orderRef: order.razorpayOrderId,
            paymentRef: payment.razorpayPaymentId,
            settlementRef: settlement?.razorpaySettlementId ?? null,
            expectedValue: formatMoney(moneyFromPaise(order.amountPaise)),
            actualValue: formatMoney(moneyFromPaise(payment.amountPaise)),
            difference: computeDifference(order.amountPaise, payment.amountPaise),
            explanation: explainAmountMismatch(order, payment, settlement),
          }),
        );
        hasException = true;
      } else if (
        settlement &&
        (settlement.currency !== payment.currency ||
          settlement.amountPaise !== payment.amountPaise)
      ) {
        findings.push(
          buildFinding({
            findingKey: `AMOUNT_MISMATCH:${order.razorpayOrderId}:${payment.razorpayPaymentId}:stl`,
            type: "AMOUNT_MISMATCH",
            recordIds: [
              order.razorpayOrderId,
              payment.razorpayPaymentId,
              settlement.razorpaySettlementId,
            ],
            orderRef: order.razorpayOrderId,
            paymentRef: payment.razorpayPaymentId,
            settlementRef: settlement.razorpaySettlementId,
            expectedValue: formatMoney(moneyFromPaise(payment.amountPaise)),
            actualValue: formatMoney(moneyFromPaise(settlement.amountPaise)),
            difference: computeDifference(
              payment.amountPaise,
              settlement.amountPaise,
            ),
            explanation: explainAmountMismatch(order, payment, settlement),
          }),
        );
        hasException = true;
      }

      // Stage 4: Settlement validation
      if (!settlement) {
        findings.push(
          buildFinding({
            findingKey: `MISSING_SETTLEMENT:${payment.razorpayPaymentId}`,
            type: "MISSING_SETTLEMENT",
            recordIds: [order.razorpayOrderId, payment.razorpayPaymentId],
            orderRef: order.razorpayOrderId,
            paymentRef: payment.razorpayPaymentId,
            settlementRef: null,
            expectedValue: "Settlement record",
            actualValue: null,
            difference: null,
            explanation: explainMissingSettlement(payment, order),
          }),
        );
        hasException = true;
      }

      // Stage 5: Status validation
      if (order.status === "paid" && payment.status !== "CAPTURED") {
        findings.push(
          buildFinding({
            findingKey: `STATUS_MISMATCH:${order.razorpayOrderId}:${payment.razorpayPaymentId}`,
            type: "STATUS_MISMATCH",
            recordIds: [order.razorpayOrderId, payment.razorpayPaymentId],
            orderRef: order.razorpayOrderId,
            paymentRef: payment.razorpayPaymentId,
            settlementRef: settlement?.razorpaySettlementId ?? null,
            expectedValue: "CAPTURED",
            actualValue: payment.status,
            difference: null,
            explanation: explainStatusMismatch(order, payment),
          }),
        );
        hasException = true;
      }

      // Stage 5: Date validation
      if (
        settlement &&
        payment.capturedAt &&
        settlement.settledAt &&
        daysBetween(payment.capturedAt, settlement.settledAt) >
          DATE_MISMATCH_THRESHOLD_DAYS
      ) {
        findings.push(
          buildFinding({
            findingKey: `DATE_MISMATCH:${payment.razorpayPaymentId}:${settlement.razorpaySettlementId}`,
            type: "DATE_MISMATCH",
            recordIds: [
              order.razorpayOrderId,
              payment.razorpayPaymentId,
              settlement.razorpaySettlementId,
            ],
            orderRef: order.razorpayOrderId,
            paymentRef: payment.razorpayPaymentId,
            settlementRef: settlement.razorpaySettlementId,
            expectedValue: payment.capturedAt,
            actualValue: settlement.settledAt,
            difference: `${daysBetween(payment.capturedAt, settlement.settledAt)} days`,
            explanation: explainDateMismatch(payment, settlement),
          }),
        );
        hasException = true;
      }

      if (!hasException && settlement) {
        findings.push(
          buildFinding({
            findingKey: `EXACT_MATCH:${order.razorpayOrderId}`,
            type: "EXACT_MATCH",
            recordIds: [
              order.razorpayOrderId,
              payment.razorpayPaymentId,
              settlement.razorpaySettlementId,
            ],
            orderRef: order.razorpayOrderId,
            paymentRef: payment.razorpayPaymentId,
            settlementRef: settlement.razorpaySettlementId,
            expectedValue: formatMoney(moneyFromPaise(order.amountPaise)),
            actualValue: formatMoney(moneyFromPaise(order.amountPaise)),
            difference: formatMoney(moneyFromPaise(0n)),
            explanation: explainExactMatch(order, payment, settlement),
          }),
        );
        matchedRecordIds.push(order.razorpayOrderId);
      } else if (hasException) {
        unresolvedRecordIds.push(order.razorpayOrderId);
      }
    }

    // Orphan payments without orders — unresolved
    for (const payment of input.payments) {
      if (!ordersById.has(payment.razorpayOrderId)) {
        findings.push(
          buildFinding({
            findingKey: `UNMATCHED_ORDER:payment:${payment.razorpayPaymentId}`,
            type: "UNMATCHED_ORDER",
            severity: "HIGH",
            recordIds: [payment.razorpayPaymentId],
            orderRef: null,
            paymentRef: payment.razorpayPaymentId,
            settlementRef: payment.razorpaySettlementId,
            expectedValue: "Linked order",
            actualValue: null,
            difference: null,
            explanation: `Payment ${payment.razorpayPaymentId} references order ${payment.razorpayOrderId}, which does not exist in the dataset.`,
          }),
        );
        unresolvedRecordIds.push(payment.razorpayPaymentId);
      }
    }

    const metrics = computeMetrics(input.orders.length, findings);

    return {
      findings,
      metrics,
      matchedRecordIds,
      unresolvedRecordIds,
    };
  }
}

export function computeMetrics(
  totalRecords: number,
  findings: ReconciliationFindingResult[],
): ReconciliationEngineResult["metrics"] {
  const exactMatchOrders = new Set(
    findings
      .filter((f) => f.type === "EXACT_MATCH")
      .map((f) => f.orderRef)
      .filter(Boolean),
  );

  const exceptionFindings = findings.filter((f) => f.type !== "EXACT_MATCH");
  const mismatchedRecords = new Set(
    exceptionFindings
      .filter((f) =>
        [
          "AMOUNT_MISMATCH",
          "DUPLICATE_PAYMENT",
          "DATE_MISMATCH",
          "STATUS_MISMATCH",
        ].includes(f.type),
      )
      .map((f) => f.orderRef ?? f.paymentRef)
      .filter(Boolean),
  ).size;

  const unmatchedRecords = new Set(
    exceptionFindings
      .filter((f) => ["MISSING_SETTLEMENT", "UNMATCHED_ORDER"].includes(f.type))
      .map((f) => f.orderRef ?? f.paymentRef)
      .filter(Boolean),
  ).size;

  const matchedRecords = exactMatchOrders.size;
  const exceptionCount = totalRecords - matchedRecords;
  const matchRate =
    totalRecords > 0
      ? Math.round((matchedRecords / totalRecords) * 100_000) / 1000
      : 0;

  return {
    totalRecords,
    matchedRecords,
    mismatchedRecords,
    unmatchedRecords,
    exceptionCount,
    matchRate,
  };
}

export const reconciliationEngine = new ReconciliationEngine();
