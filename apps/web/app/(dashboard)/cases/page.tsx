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
      title="Recovery Cases"
      description="Monitor revenue at risk, AI decisions, and recovery outcomes."
    >
      <CasesWorkspace initialCases={cases} />
    </DashboardShell>
  );
}
