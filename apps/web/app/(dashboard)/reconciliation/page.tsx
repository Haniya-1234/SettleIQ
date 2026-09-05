import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ReconciliationWorkspace } from "@/components/reconciliation/reconciliation-workspace";
import {
  getReconciliationRun,
  listReconciliationRuns,
} from "@/lib/reconciliation/run-service";

export const metadata: Metadata = {
  title: "Reconciliation",
};

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const runs = await listReconciliationRuns().catch(() => []);
  const activeRun = runs[0]
    ? await getReconciliationRun(runs[0].id).catch(() => null)
    : null;

  return (
    <DashboardShell
      title="Reconciliation"
      description="Match Razorpay transactions against internal orders"
    >
      <ReconciliationWorkspace
        initialRuns={runs}
        initialActiveRun={activeRun}
      />
    </DashboardShell>
  );
}
