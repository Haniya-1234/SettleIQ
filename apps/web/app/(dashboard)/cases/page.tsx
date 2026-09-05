import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CasesWorkspace } from "@/components/cases/cases-workspace";
import { listCases } from "@/lib/cases/case-service";

export const metadata: Metadata = {
  title: "Cases",
};

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const cases = await listCases().catch(() => []);

  return (
    <DashboardShell
      title="Cases"
      description="Revenue recovery and reconciliation investigation queue"
    >
      <CasesWorkspace initialCases={cases} />
    </DashboardShell>
  );
}
