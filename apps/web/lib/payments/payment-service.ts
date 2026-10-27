import { prisma, type PaymentStatus } from "@settleiq/db";
import { getOrCreateBuildathonOrganization } from "../org";

export interface PaymentItem {
  id: string;
  razorpayPaymentId: string;
  razorpayOrderId: string | null;
  razorpaySettlementId: string | null;
  amount: number; // in paise
  currency: string;
  status: PaymentStatus;
  method: string | null;
  email: string | null;
  contact: string | null;
  retryCount: number;
  failureCode: string | null;
  failureDescription: string | null;
  lastFailedAt: string | null;
  capturedAt: string | null;
  createdAt: string;
  order?: {
    id: string;
    razorpayOrderId: string;
    status: string;
  } | null;
}

export interface PaymentSummaryMetrics {
  totalCount: number;
  totalVolumePaise: number;
  successfulCount: number;
  successfulVolumePaise: number;
  pendingCount: number;
  pendingVolumePaise: number;
  failedCount: number;
  failedVolumePaise: number;
  refundedCount: number;
  refundedVolumePaise: number;
}

/**
 * Fetch payments for the organization.
 * Queries PostgreSQL via Prisma, falling back to an empty array on DB disconnection.
 */
export async function listPayments(): Promise<PaymentItem[]> {
  try {
    const org = await getOrCreateBuildathonOrganization();

    const records = await prisma.payment.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        order: {
          select: {
            id: true,
            razorpayOrderId: true,
            status: true,
          },
        },
      },
    });

    return records.map((p) => ({
      id: p.id,
      razorpayPaymentId: p.razorpayPaymentId,
      razorpayOrderId: p.razorpayOrderId,
      razorpaySettlementId: p.razorpaySettlementId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      method: p.method,
      email: p.email,
      contact: p.contact,
      retryCount: p.retryCount,
      failureCode: p.failureCode,
      failureDescription: p.failureDescription,
      lastFailedAt: p.lastFailedAt ? p.lastFailedAt.toISOString() : null,
      capturedAt: p.capturedAt ? p.capturedAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      order: p.order,
    }));
  } catch (error) {
    console.error("Failed to list payments from database:", error);
    return [];
  }
}
