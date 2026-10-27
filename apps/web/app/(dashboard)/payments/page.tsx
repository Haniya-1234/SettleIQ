import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PaymentMonitor } from "@/components/payments/payment-monitor";
import { listPayments } from "@/lib/payments/payment-service";

export const metadata: Metadata = {
  title: "Payment Monitor | SettleIQ",
  description: "Real-time payment tracking, failure detection, and transaction volume monitoring.",
};

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const payments = await listPayments().catch(() => []);

  return (
    <DashboardShell
      title="Payment Monitor"
      description="Track transaction statuses, failure reasons, and authorization flow in real-time."
    >
      <PaymentMonitor initialPayments={payments} />
    </DashboardShell>
  );
}
