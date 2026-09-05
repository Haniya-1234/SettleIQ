import { prisma, Prisma } from "@settleiq/db";
import {
  createRazorpayClient,
  type RazorpayClient,
  type RazorpayOrder,
  type RazorpayPayment,
  type RazorpaySettlement,
  type PaginationOptions,
} from "@settleiq/razorpay";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncOptions {
  organizationId: string;
  /** Unix timestamp – sync records created after this time. */
  from?: number;
  /** Unix timestamp – sync records created before this time. */
  to?: number;
}

export interface SyncResult {
  orders: { synced: number; errors: number };
  payments: { synced: number; errors: number };
  settlements: { synced: number; errors: number };
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Credential resolution
// ---------------------------------------------------------------------------

/**
 * Resolve Razorpay credentials for an organization.
 *
 * Looks up the organization record first. If no stored credentials exist,
 * falls back to server-side environment variables (local dev / buildathon).
 * Never exposes secrets in API responses or client bundles.
 */
async function resolveClient(
  organizationId: string,
): Promise<RazorpayClient> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { razorpayKeyId: true, razorpayKeySecret: true },
  });

  const keyId = org.razorpayKeyId ?? process.env.RAZORPAY_KEY_ID;
  const keySecret = org.razorpayKeySecret ?? process.env.RAZORPAY_KEY_SECRET;

  const client = createRazorpayClient(keyId, keySecret);
  if (!client) {
    throw new Error(
      "Razorpay credentials not configured for this organization and no environment fallback available.",
    );
  }

  return client;
}

// ---------------------------------------------------------------------------
// Paginated fetch helpers
//
// The RazorpayClient fetches a single page per call. These helpers iterate
// through pages until all records in the requested date range are retrieved.
// ---------------------------------------------------------------------------

const PAGE_SIZE = 100; // Razorpay maximum

async function fetchAllOrders(
  client: RazorpayClient,
  from?: number,
  to?: number,
): Promise<RazorpayOrder[]> {
  const all: RazorpayOrder[] = [];
  let skip = 0;

  while (true) {
    const opts: PaginationOptions = { count: PAGE_SIZE, skip, from, to };
    const page = await client.getOrders(opts);
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

async function fetchAllPayments(
  client: RazorpayClient,
  from?: number,
  to?: number,
): Promise<RazorpayPayment[]> {
  const all: RazorpayPayment[] = [];
  let skip = 0;

  while (true) {
    const opts: PaginationOptions = { count: PAGE_SIZE, skip, from, to };
    const page = await client.getPayments(opts);
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

async function fetchAllSettlements(
  client: RazorpayClient,
  from?: number,
  to?: number,
): Promise<RazorpaySettlement[]> {
  const all: RazorpaySettlement[] = [];
  let skip = 0;

  while (true) {
    const opts: PaginationOptions = { count: PAGE_SIZE, skip, from, to };
    const page = await client.getSettlements(opts);
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

// ---------------------------------------------------------------------------
// Prisma upsert mappers
//
// Each upsert is keyed on the unique Razorpay resource ID, making the entire
// sync idempotent — running it multiple times for the same date range is safe.
// ---------------------------------------------------------------------------

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function upsertOrder(
  organizationId: string,
  order: RazorpayOrder,
): Promise<void> {
  const data = {
    organizationId,
    amount: order.amount,
    amountPaid: order.amount_paid,
    currency: order.currency,
    status: order.status,
    receipt: order.receipt,
    metadata: toJsonValue(order.notes ?? {}),
    syncedAt: new Date(),
  };

  await prisma.order.upsert({
    where: { razorpayOrderId: order.id },
    update: data,
    create: {
      ...data,
      razorpayOrderId: order.id,
    },
  });
}

async function upsertPayment(
  organizationId: string,
  payment: RazorpayPayment,
): Promise<void> {
  const statusMap: Record<string, string> = {
    created: "CREATED",
    authorized: "AUTHORIZED",
    captured: "CAPTURED",
    refunded: "REFUNDED",
    failed: "FAILED",
  };

  const normalizedStatus = statusMap[payment.status] ?? "CREATED";

  // Resolve the internal order ID if this payment references a Razorpay order
  let orderId: string | undefined;
  if (payment.order_id) {
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId: payment.order_id },
      select: { id: true },
    });
    orderId = order?.id;
  }

  const data = {
    organizationId,
    razorpayOrderId: payment.order_id,
    orderId,
    amount: payment.amount,
    currency: payment.currency,
    status: normalizedStatus as "CREATED" | "AUTHORIZED" | "CAPTURED" | "REFUNDED" | "FAILED",
    method: payment.method,
    email: payment.email,
    contact: payment.contact,
    failureCode: payment.error_code,
    failureDescription: payment.error_description,
    capturedAt: payment.captured ? new Date(payment.created_at * 1000) : null,
    metadata: toJsonValue(payment.notes ?? {}),
    syncedAt: new Date(),
  };

  await prisma.payment.upsert({
    where: { razorpayPaymentId: payment.id },
    update: data,
    create: {
      ...data,
      razorpayPaymentId: payment.id,
    },
  });
}

async function upsertSettlement(
  organizationId: string,
  settlement: RazorpaySettlement,
): Promise<void> {
  const data = {
    organizationId,
    amount: settlement.amount,
    fees: settlement.fees,
    tax: settlement.tax,
    status: settlement.status,
    utr: settlement.utr,
    settledAt: settlement.created_at
      ? new Date(settlement.created_at * 1000)
      : null,
    metadata: toJsonValue({}),
    syncedAt: new Date(),
  };

  await prisma.settlement.upsert({
    where: { razorpaySettlementId: settlement.id },
    update: data,
    create: {
      ...data,
      razorpaySettlementId: settlement.id,
    },
  });
}

// ---------------------------------------------------------------------------
// Main sync orchestrator
// ---------------------------------------------------------------------------

/**
 * Synchronise Razorpay data into SettleIQ.
 *
 * Fetches orders, payments, and settlements from Razorpay for the given date
 * range and upserts each record individually using its unique Razorpay ID.
 * The operation is fully idempotent.
 */
export async function syncRazorpayData(
  options: SyncOptions,
): Promise<SyncResult> {
  const startTime = Date.now();
  const client = await resolveClient(options.organizationId);

  // Fetch all pages in parallel across resource types
  const [orders, payments, settlements] = await Promise.all([
    fetchAllOrders(client, options.from, options.to),
    fetchAllPayments(client, options.from, options.to),
    fetchAllSettlements(client, options.from, options.to),
  ]);

  const result: SyncResult = {
    orders: { synced: 0, errors: 0 },
    payments: { synced: 0, errors: 0 },
    settlements: { synced: 0, errors: 0 },
    durationMs: 0,
  };

  // Upsert orders first (payments may reference them)
  for (const order of orders) {
    try {
      await upsertOrder(options.organizationId, order);
      result.orders.synced++;
    } catch (error) {
      console.error(`Failed to upsert order ${order.id}:`, error);
      result.orders.errors++;
    }
  }

  // Upsert payments (may resolve order foreign keys)
  for (const payment of payments) {
    try {
      await upsertPayment(options.organizationId, payment);
      result.payments.synced++;
    } catch (error) {
      console.error(`Failed to upsert payment ${payment.id}:`, error);
      result.payments.errors++;
    }
  }

  // Upsert settlements
  for (const settlement of settlements) {
    try {
      await upsertSettlement(options.organizationId, settlement);
      result.settlements.synced++;
    } catch (error) {
      console.error(`Failed to upsert settlement ${settlement.id}:`, error);
      result.settlements.errors++;
    }
  }

  result.durationMs = Date.now() - startTime;
  return result;
}
