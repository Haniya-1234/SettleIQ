import {
  absMoney,
  formatMoney,
  formatMoneyDifference,
  moneyFromPaise,
  subtractMoney,
} from "@settleiq/shared";
import type {
  NormalizedOrder,
  NormalizedPayment,
  NormalizedSettlement,
  ReconciliationFindingResult,
} from "./types";
import { DATE_MISMATCH_THRESHOLD_DAYS, daysBetween } from "./dataset/constants";

function severityForType(
  type: ReconciliationFindingResult["type"],
): ReconciliationFindingResult["severity"] {
  switch (type) {
    case "EXACT_MATCH":
      return "LOW";
    case "AMOUNT_MISMATCH":
    case "DUPLICATE_PAYMENT":
      return "HIGH";
    case "MISSING_SETTLEMENT":
    case "STATUS_MISMATCH":
      return "CRITICAL";
    case "UNMATCHED_ORDER":
    case "DATE_MISMATCH":
      return "MEDIUM";
    default:
      return "MEDIUM";
  }
}

export function explainAmountMismatch(
  order: NormalizedOrder,
  payment: NormalizedPayment,
  settlement?: NormalizedSettlement,
): string {
  const orderMoney = moneyFromPaise(order.amountPaise);
  const paymentMoney = moneyFromPaise(payment.amountPaise);

  if (payment.amountPaise !== order.amountPaise) {
    return `Payment ${payment.razorpayPaymentId} is linked to ${order.razorpayOrderId}, but the captured amount is ${formatMoney(paymentMoney)} while the order amount is ${formatMoney(orderMoney)} (difference ${formatMoneyDifference(paymentMoney, orderMoney)}).`;
  }

  if (settlement && settlement.amountPaise !== payment.amountPaise) {
    const settlementMoney = moneyFromPaise(settlement.amountPaise);
    return `Payment ${payment.razorpayPaymentId} is linked to ${order.razorpayOrderId}, but the settlement amount is ${formatMoney(settlementMoney)} while the captured payment amount is ${formatMoney(paymentMoney)} (difference ${formatMoneyDifference(settlementMoney, paymentMoney)}).`;
  }

  return `Amount mismatch detected for ${payment.razorpayPaymentId} against ${order.razorpayOrderId}.`;
}

export function explainMissingSettlement(
  payment: NormalizedPayment,
  order: NormalizedOrder,
): string {
  return `Payment ${payment.razorpayPaymentId} for order ${order.razorpayOrderId} was captured for ${formatMoney(moneyFromPaise(payment.amountPaise))}, but no settlement record was found.`;
}

export function explainDuplicatePayment(
  order: NormalizedOrder,
  payments: NormalizedPayment[],
): string {
  const ids = payments.map((p) => p.razorpayPaymentId).join(", ");
  return `Order ${order.razorpayOrderId} has ${payments.length} captured payments (${ids}), indicating a duplicate payment.`;
}

export function explainUnmatchedOrder(order: NormalizedOrder): string {
  return `Order ${order.razorpayOrderId} for ${formatMoney(moneyFromPaise(order.amountPaise))} has status "${order.status}" but no linked payment was found.`;
}

export function explainDateMismatch(
  payment: NormalizedPayment,
  settlement: NormalizedSettlement,
): string {
  const days = daysBetween(payment.capturedAt ?? "", settlement.settledAt ?? "");
  return `Payment ${payment.razorpayPaymentId} was captured on ${payment.capturedAt}, but settlement ${settlement.razorpaySettlementId} was recorded ${days} days later on ${settlement.settledAt}, exceeding the ${DATE_MISMATCH_THRESHOLD_DAYS}-day threshold.`;
}

export function explainStatusMismatch(
  order: NormalizedOrder,
  payment: NormalizedPayment,
): string {
  return `Order ${order.razorpayOrderId} is marked "${order.status}" but linked payment ${payment.razorpayPaymentId} has status "${payment.status}".`;
}

export function explainExactMatch(
  order: NormalizedOrder,
  payment: NormalizedPayment,
  settlement: NormalizedSettlement,
): string {
  return `Order ${order.razorpayOrderId}, payment ${payment.razorpayPaymentId}, and settlement ${settlement.razorpaySettlementId} reconcile exactly at ${formatMoney(moneyFromPaise(order.amountPaise))}.`;
}

export function buildFinding(
  partial: Omit<ReconciliationFindingResult, "severity" | "status"> & {
    severity?: ReconciliationFindingResult["severity"];
    status?: ReconciliationFindingResult["status"];
  },
): ReconciliationFindingResult {
  return {
    severity: partial.severity ?? severityForType(partial.type),
    status: partial.status ?? "OPEN",
    ...partial,
  };
}

export function computeDifference(
  expectedPaise: bigint,
  actualPaise: bigint,
): string {
  return formatMoneyDifference(
    moneyFromPaise(expectedPaise),
    moneyFromPaise(actualPaise),
  );
}

export function computeAbsDifferencePaise(
  expectedPaise: bigint,
  actualPaise: bigint,
): bigint {
  return absMoney(
    subtractMoney(moneyFromPaise(expectedPaise), moneyFromPaise(actualPaise)),
  ).paise;
}
