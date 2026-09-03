import { describe, expect, it } from "vitest";
import {
  ReconciliationEngine,
  computeMetrics,
  generateSyntheticDataset,
} from "./index";

describe("generateSyntheticDataset", () => {
  it("produces deterministic output for the same seed", () => {
    const a = generateSyntheticDataset(42);
    const b = generateSyntheticDataset(42);
    expect(a.orders.length).toBe(110);
    expect(a.payments.length).toBe(107);
    expect(a.settlements.length).toBe(101);
    expect(a.orders[0]).toEqual(b.orders[0]);
    expect(a.payments[0]).toEqual(b.payments[0]);
    expect(a.datasetLabel).toBe("Synthetic Buildathon Dataset");
  });

  it("produces different output for different seeds", () => {
    const a = generateSyntheticDataset(42);
    const b = generateSyntheticDataset(43);
    expect(a.orders[10]?.amountPaise).not.toEqual(b.orders[10]?.amountPaise);
  });
});

describe("ReconciliationEngine", () => {
  const engine = new ReconciliationEngine();

  it("produces deterministic findings for the synthetic dataset", () => {
    const dataset = generateSyntheticDataset(42);
    const first = engine.reconcile(dataset);
    const second = engine.reconcile(dataset);

    expect(first.findings.length).toBe(second.findings.length);
    expect(first.metrics).toEqual(second.metrics);
    expect(first.findings.map((f) => f.findingKey)).toEqual(
      second.findings.map((f) => f.findingKey),
    );
  });

  it("detects exact matches", () => {
    const dataset = generateSyntheticDataset(42);
    const { findings } = engine.reconcile(dataset);
    const exact = findings.filter((f) => f.type === "EXACT_MATCH");
    expect(exact.length).toBe(84);
    expect(exact[0]?.explanation).toContain("reconcile exactly");
  });

  it("detects amount mismatches", () => {
    const dataset = generateSyntheticDataset(42);
    const { findings } = engine.reconcile(dataset);
    const mismatches = findings.filter((f) => f.type === "AMOUNT_MISMATCH");
    expect(mismatches.length).toBeGreaterThanOrEqual(6);
    expect(mismatches[0]?.explanation).toMatch(/amount/i);
    expect(mismatches[0]?.difference).not.toBeNull();
  });

  it("detects missing settlements", () => {
    const dataset = generateSyntheticDataset(42);
    const { findings } = engine.reconcile(dataset);
    const missing = findings.filter((f) => f.type === "MISSING_SETTLEMENT");
    expect(missing.length).toBe(6);
    expect(missing[0]?.explanation).toContain("no settlement");
  });

  it("detects duplicate payments", () => {
    const dataset = generateSyntheticDataset(42);
    const { findings } = engine.reconcile(dataset);
    const dupes = findings.filter((f) => f.type === "DUPLICATE_PAYMENT");
    expect(dupes.length).toBe(2);
    expect(dupes[0]?.explanation).toContain("duplicate");
  });

  it("detects unmatched orders", () => {
    const dataset = generateSyntheticDataset(42);
    const { findings } = engine.reconcile(dataset);
    const unmatched = findings.filter((f) => f.type === "UNMATCHED_ORDER");
    expect(unmatched.length).toBe(5);
    expect(unmatched[0]?.explanation).toContain("no linked payment");
  });

  it("detects date mismatches", () => {
    const dataset = generateSyntheticDataset(42);
    const { findings } = engine.reconcile(dataset);
    const dateIssues = findings.filter((f) => f.type === "DATE_MISMATCH");
    expect(dateIssues.length).toBe(4);
    expect(dateIssues[0]?.explanation).toContain("days later");
  });

  it("detects status mismatches", () => {
    const dataset = generateSyntheticDataset(42);
    const { findings } = engine.reconcile(dataset);
    const statusIssues = findings.filter((f) => f.type === "STATUS_MISMATCH");
    expect(statusIssues.length).toBe(3);
    expect(statusIssues[0]?.explanation).toContain("status");
  });

  it("calculates metrics from actual findings", () => {
    const dataset = generateSyntheticDataset(42);
    const { findings, metrics } = engine.reconcile(dataset);

    expect(metrics.totalRecords).toBe(110);
    expect(metrics.matchedRecords).toBe(84);
    expect(metrics.exceptionCount).toBe(26);
    expect(metrics.matchRate).toBeCloseTo(76.364, 2);
    expect(metrics.matchedRecords + metrics.exceptionCount).toBe(
      metrics.totalRecords,
    );

    const recomputed = computeMetrics(110, findings);
    expect(recomputed).toEqual(metrics);
  });

  it("does not false-match deliberately unresolved records", () => {
    const dataset = generateSyntheticDataset(42);
    const { findings, matchedRecordIds } = engine.reconcile(dataset);

    const unresolvedOrderRefs = new Set([
      ...findings
        .filter((f) => f.type !== "EXACT_MATCH")
        .map((f) => f.orderRef)
        .filter(Boolean),
    ]);

    for (const orderRef of matchedRecordIds) {
      expect(unresolvedOrderRefs.has(orderRef)).toBe(false);
    }
  });

  it("discovers discrepancies without pre-set anomaly flags", () => {
    const dataset = generateSyntheticDataset(42);
    const stripped = {
      orders: dataset.orders.map(({ id, razorpayOrderId, externalOrderId, amountPaise, currency, status, createdAt }) => ({
        id,
        razorpayOrderId,
        externalOrderId,
        amountPaise,
        currency,
        status,
        createdAt,
      })),
      payments: dataset.payments.map(({ id, razorpayPaymentId, razorpayOrderId, razorpaySettlementId, orderId, amountPaise, currency, status, capturedAt }) => ({
        id,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySettlementId,
        orderId,
        amountPaise,
        currency,
        status,
        capturedAt,
      })),
      settlements: dataset.settlements.map(({ id, razorpaySettlementId, razorpayPaymentId, amountPaise, currency, status, settledAt }) => ({
        id,
        razorpaySettlementId,
        razorpayPaymentId,
        amountPaise,
        currency,
        status,
        settledAt,
      })),
    };

    const { findings } = engine.reconcile(stripped);
    expect(findings.some((f) => f.type === "AMOUNT_MISMATCH")).toBe(true);
    expect(findings.some((f) => f.type === "MISSING_SETTLEMENT")).toBe(true);
    expect(findings.some((f) => f.type === "DUPLICATE_PAYMENT")).toBe(true);
    expect(findings.some((f) => f.type === "UNMATCHED_ORDER")).toBe(true);
    expect(findings.some((f) => f.type === "DATE_MISMATCH")).toBe(true);
    expect(findings.some((f) => f.type === "STATUS_MISMATCH")).toBe(true);
  });
});
