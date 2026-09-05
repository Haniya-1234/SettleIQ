import { prisma, type CaseType } from "@settleiq/db";
import type { FindingType } from "@settleiq/shared";
import { getNextCaseNumber } from "../org";

function findingTypeToCaseType(type: FindingType): CaseType {
  if (type === "EXACT_MATCH") {
    throw new Error("Exact match findings cannot be converted to cases.");
  }

  const mapping: Record<Exclude<FindingType, "EXACT_MATCH">, CaseType> = {
    AMOUNT_MISMATCH: "AMOUNT_MISMATCH",
    MISSING_SETTLEMENT: "MISSING_SETTLEMENT",
    DUPLICATE_PAYMENT: "DUPLICATE_PAYMENT",
    UNMATCHED_ORDER: "UNMATCHED_ORDER",
    DATE_MISMATCH: "DATE_MISMATCH",
    STATUS_MISMATCH: "STATUS_MISMATCH",
  };

  return mapping[type as Exclude<FindingType, "EXACT_MATCH">];
}

export async function createCaseFromFinding(findingId: string) {
  const finding = await prisma.reconciliationFinding.findUnique({
    where: { id: findingId },
    include: { case: true },
  });

  if (!finding) {
    throw new Error("Finding not found");
  }

  if (finding.type === "EXACT_MATCH") {
    throw new Error("Exact match findings cannot be converted to cases.");
  }

  if (finding.case) {
    return finding.case;
  }

  const order = finding.orderRef
    ? await prisma.order.findFirst({
        where: {
          organizationId: finding.organizationId,
          razorpayOrderId: finding.orderRef,
        },
      })
    : null;

  const paymentIds = finding.paymentRef
    ? finding.paymentRef.split(",").map((s) => s.trim())
    : [];

  const caseNumber = await getNextCaseNumber(finding.organizationId);

  const [createdCase] = await prisma.$transaction([
    prisma.case.create({
      data: {
        organizationId: finding.organizationId,
        caseNumber,
        type: findingTypeToCaseType(finding.type),
        severity: finding.severity,
        status: "OPEN",
        source: "RECONCILIATION",
        title: `${finding.type.replace(/_/g, " ")} — ${finding.orderRef ?? finding.paymentRef ?? finding.id}`,
        description: finding.explanation,
        orderId: order?.id ?? null,
        paymentIds,
        findingId: finding.id,
        expectedValue: finding.expectedValue,
        actualValue: finding.actualValue,
        difference: finding.difference,
        evidence: {
          findingId: finding.id,
          runId: finding.runId,
          recordIds: finding.recordIds,
          orderRef: finding.orderRef,
          paymentRef: finding.paymentRef,
          settlementRef: finding.settlementRef,
        },
      },
    }),
    prisma.reconciliationFinding.update({
      where: { id: finding.id },
      data: { status: "CONVERTED_TO_CASE" },
    }),
  ]);

  return createdCase;
}

export async function listCases() {
  return prisma.case.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      finding: {
        select: {
          id: true,
          type: true,
          runId: true,
        },
      },
      payment: {
        select: {
          razorpayPaymentId: true,
          amount: true,
          currency: true,
          status: true,
        },
      },
    },
  });
}
