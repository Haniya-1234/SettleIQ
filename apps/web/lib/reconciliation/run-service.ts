import { prisma, type PaymentStatus, type Prisma } from "@settleiq/db";
import {
  ReconciliationEngine,
  generateSyntheticDataset,
  SYNTHETIC_DATASET,
  type ReconciliationFindingResult,
  type SyntheticDataset,
} from "@settleiq/reconciliation";
import { getOrCreateBuildathonOrganization } from "../org";
import { runRecoveryScanForOrganization } from "../recovery/recovery-service";

// Shared metadata stamp applied to all synthetic demo records.
// Used as the sole selector in clearSyntheticData() to avoid touching real data.
const SYNTHETIC_METADATA = {
  synthetic: true,
  syntheticDataset: "buildathon-phase1",
} as const;

// ---------------------------------------------------------------------------
// Serialization helpers
//
// Prisma returns matchRate as a Decimal object (@db.Decimal(6,3)), which React
// Server Components cannot pass to Client Components as-is. These helpers
// convert the full run object to a plain JS object with matchRate coerced to a
// plain number before it crosses the Server → Client boundary.
//
// The Prisma schema is NOT changed — matchRate stays Decimal in PostgreSQL.
// ---------------------------------------------------------------------------

// Derive the run shapes from the actual Prisma queries so types stay in sync.
type PrismaRunWithFindings = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.reconciliationRun.findUnique<{
        where: { id: string };
        include: {
          findings: {
            orderBy: [{ severity: "desc" }, { type: "asc" }, { createdAt: "asc" }];
          };
        };
      }>
    >
  >
>;

type PrismaRunSummary = Awaited<
  ReturnType<
    typeof prisma.reconciliationRun.findMany<{
      orderBy: { startedAt: "desc" };
      take: 20;
      include: { _count: { select: { findings: true } } };
    }>
  >
>[number];

function serializeRunWithFindings(run: PrismaRunWithFindings) {
  return {
    ...run,
    matchRate: Number(run.matchRate),
  };
}

function serializeRunSummary(run: PrismaRunSummary) {
  return {
    ...run,
    matchRate: Number(run.matchRate),
  };
}

/** Client-Component-safe type for a full run with findings. */
export type SerializedRunWithFindings = ReturnType<typeof serializeRunWithFindings>;
/** Client-Component-safe type for a run summary (list view). */
export type SerializedRunSummary = ReturnType<typeof serializeRunSummary>;

// ---------------------------------------------------------------------------
// Private helpers (unchanged)
// ---------------------------------------------------------------------------

function buildSyntheticPaymentProfile(
  payment: SyntheticDataset["payments"][number],
  index: number,
) {
  const failureProfiles = [
    {
      code: "insufficient_funds",
      description: "Customer balance was insufficient during authorization.",
      method: "card",
    },
    {
      code: "bank_declined",
      description: "Issuer declined the payment attempt.",
      method: "upi",
    },
    {
      code: "expired_card",
      description: "Stored card has expired and needs replacement.",
      method: "card",
    },
  ] as const;

  const legacyFailureProfile = failureProfiles[index % failureProfiles.length];

  const method = payment.method ?? (payment.status === "FAILED" ? legacyFailureProfile.method : index % 2 === 0 ? "upi" : "card");
  const failureCode = payment.status === "FAILED" ? (payment.failureCode ?? legacyFailureProfile.code) : null;
  const failureDescription = payment.status === "FAILED" ? (payment.failureDescription ?? legacyFailureProfile.description) : null;
  const retryCount = payment.status === "FAILED" ? (payment.retryCount ?? (1 + (index % 3))) : 0;

  return {
    method,
    email: `merchant-demo+${payment.razorpayPaymentId.toLowerCase()}@settleiq.dev`,
    contact: `9000000${String(index).padStart(3, "0")}`,
    retryCount,
    failureCode,
    failureDescription,
    lastFailedAt:
      payment.status === "FAILED" && payment.capturedAt
        ? new Date(payment.capturedAt)
        : null,
    metadata: {
      synthetic: true,
      syntheticDataset: "buildathon-phase1",
      customerSegment: index % 2 === 0 ? "repeat" : "new",
    },
  };
}

function mapPaymentStatus(status: string): PaymentStatus {
  const valid: PaymentStatus[] = [
    "CREATED",
    "AUTHORIZED",
    "CAPTURED",
    "REFUNDED",
    "FAILED",
  ];
  return valid.includes(status as PaymentStatus)
    ? (status as PaymentStatus)
    : "CREATED";
}

/**
 * Deletes ONLY synthetic demo rows for the given organization.
 *
 * Real/synced data (orders, payments, settlements imported via
 * POST /api/sync/razorpay or webhooks) is never touched.
 *
 * Synthetic rows are identified by metadata.synthetic === true, which is
 * stamped onto every row written by persistDataset(). ReconciliationRuns
 * are scoped by their datasetId matching the known synthetic dataset constant;
 * cascade deletes handle the associated ReconciliationFindings automatically.
 * Cases derived from synthetic payments carry Case.synthetic === true.
 */
async function clearSyntheticData(organizationId: string) {
  const syntheticFilter = { path: ["synthetic"], equals: true };

  // Cases: use the dedicated Case.synthetic boolean column.
  await prisma.case.deleteMany({
    where: { organizationId, synthetic: true },
  });

  // ReconciliationRuns for the synthetic dataset — cascade deletes their
  // ReconciliationFindings automatically via the DB foreign key.
  await prisma.reconciliationRun.deleteMany({
    where: { organizationId, datasetId: SYNTHETIC_DATASET.id },
  });

  // Payments, Settlements, Orders: identified by metadata.synthetic = true or synthetic ID prefix (ORD_, PAY_, STL_).
  await prisma.payment.deleteMany({
    where: {
      organizationId,
      OR: [
        { metadata: { path: syntheticFilter.path, equals: syntheticFilter.equals } },
        { razorpayPaymentId: { startsWith: "PAY_" } },
      ],
    },
  });
  await prisma.settlement.deleteMany({
    where: {
      organizationId,
      OR: [
        { metadata: { path: syntheticFilter.path, equals: syntheticFilter.equals } },
        { razorpaySettlementId: { startsWith: "STL_" } },
      ],
    },
  });
  await prisma.order.deleteMany({
    where: {
      organizationId,
      OR: [
        { metadata: { path: syntheticFilter.path, equals: syntheticFilter.equals } },
        { razorpayOrderId: { startsWith: "ORD_" } },
      ],
    },
  });
}

async function persistDataset(
  organizationId: string,
  dataset: SyntheticDataset,
) {
  const orderIdMap = new Map<string, string>();

  for (const order of dataset.orders) {
    const created = await prisma.order.upsert({
      where: { razorpayOrderId: order.razorpayOrderId },
      update: {
        organizationId,
        externalOrderId: order.externalOrderId,
        amount: Number(order.amountPaise),
        amountPaid: order.status === "paid" ? Number(order.amountPaise) : 0,
        currency: order.currency,
        status: order.status,
        createdAt: new Date(order.createdAt),
        metadata: SYNTHETIC_METADATA,
      },
      create: {
        organizationId,
        razorpayOrderId: order.razorpayOrderId,
        externalOrderId: order.externalOrderId,
        amount: Number(order.amountPaise),
        amountPaid: order.status === "paid" ? Number(order.amountPaise) : 0,
        currency: order.currency,
        status: order.status,
        createdAt: new Date(order.createdAt),
        metadata: SYNTHETIC_METADATA,
      },
    });
    orderIdMap.set(order.razorpayOrderId, created.id);
  }

  let paymentIndex = 0;

  for (const payment of dataset.payments) {
    paymentIndex += 1;
    const profile = buildSyntheticPaymentProfile(payment, paymentIndex);
    await prisma.payment.upsert({
      where: { razorpayPaymentId: payment.razorpayPaymentId },
      update: {
        organizationId,
        razorpayOrderId: payment.razorpayOrderId,
        razorpaySettlementId: payment.razorpaySettlementId,
        orderId: orderIdMap.get(payment.razorpayOrderId) ?? null,
        amount: Number(payment.amountPaise),
        currency: payment.currency,
        status: mapPaymentStatus(payment.status),
        method: profile.method,
        email: profile.email,
        contact: profile.contact,
        retryCount: profile.retryCount,
        failureCode: profile.failureCode,
        failureDescription: profile.failureDescription,
        lastFailedAt: profile.lastFailedAt,
        capturedAt: payment.capturedAt ? new Date(payment.capturedAt) : null,
        metadata: profile.metadata,
      },
      create: {
        organizationId,
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpayOrderId: payment.razorpayOrderId,
        razorpaySettlementId: payment.razorpaySettlementId,
        orderId: orderIdMap.get(payment.razorpayOrderId) ?? null,
        amount: Number(payment.amountPaise),
        currency: payment.currency,
        status: mapPaymentStatus(payment.status),
        method: profile.method,
        email: profile.email,
        contact: profile.contact,
        retryCount: profile.retryCount,
        failureCode: profile.failureCode,
        failureDescription: profile.failureDescription,
        lastFailedAt: profile.lastFailedAt,
        capturedAt: payment.capturedAt ? new Date(payment.capturedAt) : null,
        metadata: profile.metadata,
      },
    });
  }

  for (const settlement of dataset.settlements) {
    await prisma.settlement.upsert({
      where: { razorpaySettlementId: settlement.razorpaySettlementId },
      update: {
        organizationId,
        amount: Number(settlement.amountPaise),
        status: settlement.status,
        settledAt: settlement.settledAt ? new Date(settlement.settledAt) : null,
        metadata: SYNTHETIC_METADATA,
      },
      create: {
        organizationId,
        razorpaySettlementId: settlement.razorpaySettlementId,
        amount: Number(settlement.amountPaise),
        status: settlement.status,
        settledAt: settlement.settledAt ? new Date(settlement.settledAt) : null,
        metadata: SYNTHETIC_METADATA,
      },
    });
  }
}

function toFindingCreateInput(
  finding: ReconciliationFindingResult,
): Prisma.ReconciliationFindingUncheckedCreateWithoutRunInput {
  return {
    organizationId: "", // set by parent
    findingKey: finding.findingKey,
    type: finding.type,
    severity: finding.severity,
    status: finding.status,
    recordIds: finding.recordIds,
    orderRef: finding.orderRef,
    paymentRef: finding.paymentRef,
    settlementRef: finding.settlementRef,
    expectedValue: finding.expectedValue,
    actualValue: finding.actualValue,
    difference: finding.difference,
    explanation: finding.explanation,
  };
}

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

export async function executeReconciliationRun() {
  const startedAt = Date.now();
  const organization = await getOrCreateBuildathonOrganization();
  const dataset = generateSyntheticDataset();

  // Only remove previously persisted synthetic demo rows.
  // Real data synced from Razorpay (via /api/sync or webhooks) is never deleted.
  await clearSyntheticData(organization.id);
  await persistDataset(organization.id, dataset);

  const engine = new ReconciliationEngine();
  const result = engine.reconcile({
    orders: dataset.orders,
    payments: dataset.payments,
    settlements: dataset.settlements,
  });

  const processingTimeMs = Date.now() - startedAt;

  const run = await prisma.reconciliationRun.create({
    data: {
      organizationId: organization.id,
      datasetId: dataset.datasetId,
      datasetVersion: dataset.datasetVersion,
      datasetLabel: dataset.datasetLabel,
      seed: dataset.seed,
      status: "COMPLETED",
      startedAt: new Date(startedAt),
      completedAt: new Date(),
      totalRecords: result.metrics.totalRecords,
      matchedRecords: result.metrics.matchedRecords,
      mismatchedRecords: result.metrics.mismatchedRecords,
      unmatchedRecords: result.metrics.unmatchedRecords,
      exceptionCount: result.metrics.exceptionCount,
      matchRate: result.metrics.matchRate,
      processingTimeMs,
      findings: {
        create: result.findings.map((finding) => ({
          ...toFindingCreateInput(finding),
          organizationId: organization.id,
        })),
      },
    },
    include: {
      findings: {
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  await runRecoveryScanForOrganization(organization.id);

  // Serialize Prisma Decimal → plain number before crossing Server → Client boundary
  return serializeRunWithFindings(run);
}

export async function getReconciliationRun(id: string) {
  const run = await prisma.reconciliationRun.findUnique({
    where: { id },
    include: {
      findings: {
        orderBy: [{ severity: "desc" }, { type: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!run) return null;
  // Serialize Prisma Decimal → plain number before crossing Server → Client boundary
  return serializeRunWithFindings(run);
}

export async function listReconciliationRuns() {
  const runs = await prisma.reconciliationRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
    include: {
      _count: { select: { findings: true } },
    },
  });
  // Serialize Prisma Decimal → plain number before crossing Server → Client boundary
  return runs.map(serializeRunSummary);
}
