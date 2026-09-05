import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  FolderOpen,
  GitCompareArrows,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCases } from "@/lib/cases/case-service";
import { getRecoveryMetrics } from "@/lib/recovery/recovery-service";
import { listReconciliationRuns } from "@/lib/reconciliation/run-service";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getStatusBadge(status: string) {
  switch (status.toUpperCase()) {
    case "OPEN":
      return (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[10px] tracking-wide">
          OPEN
        </Badge>
      );
    case "RECOVERED":
    case "RESOLVED":
    case "CLOSED":
      return (
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] tracking-wide">
          {status}
        </Badge>
      );
    case "PENDING_APPROVAL":
    case "ACTION_PROPOSED":
      return (
        <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold text-[10px] tracking-wide">
          {status.replace(/_/g, " ")}
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="destructive" className="font-semibold text-[10px] tracking-wide">
          FAILED
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="font-medium text-[10px] tracking-wide">
          {status}
        </Badge>
      );
  }
}

function getSeverityBadge(severity: string) {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
          <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
          CRITICAL
        </span>
      );
    case "HIGH":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <span className="size-1.5 rounded-full bg-amber-500" />
          HIGH
        </span>
      );
    case "MEDIUM":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
          <span className="size-1.5 rounded-full bg-yellow-500" />
          MEDIUM
        </span>
      );
    case "LOW":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
          LOW
        </span>
      );
    default:
      return <span className="text-xs text-muted-foreground">{severity}</span>;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const [metrics, cases, runs] = await Promise.all([
    getRecoveryMetrics().catch(() => null),
    listCases().catch(() => []),
    listReconciliationRuns().catch(() => []),
  ]);

  const recentCases = cases.slice(0, 6);
  const recoveryRate = metrics?.recoveryRate ?? 0;
  const isDemo = (metrics?.dataMode ?? "DEMO_SYNTHETIC") === "DEMO_SYNTHETIC";

  // Severity distribution
  const criticalCount = cases.filter((c) => c.severity?.toUpperCase() === "CRITICAL").length;
  const highCount = cases.filter((c) => c.severity?.toUpperCase() === "HIGH").length;
  const mediumCount = cases.filter((c) => c.severity?.toUpperCase() === "MEDIUM").length;
  const lowCount = cases.filter((c) => c.severity?.toUpperCase() === "LOW").length;

  // Case status distribution
  const openCount = cases.filter((c) => ["OPEN", "ANALYZING", "ACTION_PROPOSED", "EXECUTING"].includes(c.status)).length;
  const pendingApprovalCount = cases.filter((c) => c.requiresHumanApproval && c.status !== "RECOVERED").length;
  const recoveredCount = cases.filter((c) => c.status === "RECOVERED").length;
  const failedCount = cases.filter((c) => c.status === "FAILED").length;

  // Latest reconciliation run
  const latestRun = runs[0] ?? null;
  const matchRate = latestRun ? Number(latestRun.matchRate) : null;

  return (
    <DashboardShell
      title="Dashboard"
      description="Revenue recovery and reconciliation control center"
    >
      <div className="flex flex-col gap-6">

        {/* ── Hero Control Bar ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/80 bg-gradient-to-r from-card via-card/90 to-card/70 p-5 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-inner">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold tracking-tight text-foreground">SettleIQ Control Center</h2>
                <Badge
                  variant="outline"
                  className={
                    isDemo
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[11px]"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]"
                  }
                >
                  <span className={`size-1.5 rounded-full ${isDemo ? "bg-amber-500" : "bg-emerald-500"} mr-1.5`} />
                  {isDemo ? "Demo / Synthetic Dataset" : "Live Razorpay Feed"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Autonomous Razorpay reconciliation engine &amp; bounded AI recovery agent
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" render={<Link href="/cases" />}>
              <FolderOpen className="size-4 mr-1.5 text-muted-foreground" />
              View Cases
            </Button>
            <Button size="sm" render={<Link href="/reconciliation" />}>
              <GitCompareArrows className="size-4 mr-1.5" />
              Run Reconciliation
            </Button>
          </div>
        </div>

        {/* ── 4 Primary KPI Cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* Revenue at Risk */}
          <Card className="relative overflow-hidden border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-sm transition-all hover:border-amber-500/50 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Revenue at Risk</CardTitle>
              <div className="flex size-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {formatCurrency(metrics?.totalRevenueAtRiskPaise ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span className="font-semibold text-foreground">{openCount}</span> active anomaly cases
              </p>
            </CardContent>
          </Card>

          {/* Total Recovered */}
          <Card className="relative overflow-hidden border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-sm transition-all hover:border-emerald-500/50 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Recovered</CardTitle>
              <div className="flex size-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {formatCurrency(metrics?.totalRecoveredPaise ?? 0)}
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Recovery rate</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{recoveryRate}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, recoveryRate))}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Case Operations */}
          <Card className="relative overflow-hidden border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-card to-card shadow-sm transition-all hover:border-indigo-500/50 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Case Operations</CardTitle>
              <div className="flex size-9 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <FolderOpen className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {cases.length}
              </p>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="size-3" />
                  {recoveredCount} resolved
                </span>
                {pendingApprovalCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {pendingApprovalCount} pending
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Execution Engine */}
          <Card className="relative overflow-hidden border border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-card to-card shadow-sm transition-all hover:border-purple-500/50 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Execution Engine</CardTitle>
              <div className="flex size-9 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Zap className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {metrics?.recoveryAttempts ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{metrics?.successfulRecoveries ?? 0}</span>{" "}
                successes ·{" "}
                <span className="font-semibold tabular-nums">{metrics?.failedRecoveries ?? 0}</span>{" "}
                failures
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Two-column middle section: Reconciliation Health + Operational Status ── */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Reconciliation Health */}
          <Card className="border border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <GitCompareArrows className="size-4 text-primary" />
                    Reconciliation Health
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {latestRun
                      ? `Latest run · ${latestRun.datasetLabel}`
                      : "No reconciliation runs yet"}
                  </CardDescription>
                </div>
                {latestRun && (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  >
                    {latestRun.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {!latestRun ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Database className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No reconciliation data</p>
                  <Button size="sm" variant="outline" render={<Link href="/reconciliation" />}>
                    <GitCompareArrows className="size-3.5 mr-1.5" />
                    Run Reconciliation
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Big match rate */}
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-extrabold tabular-nums text-foreground">
                      {matchRate?.toFixed(1)}
                      <span className="text-2xl text-muted-foreground">%</span>
                    </span>
                    <span className="mb-1 text-sm text-muted-foreground font-medium">match rate</span>
                  </div>

                  {/* Stacked bar */}
                  <div className="space-y-1.5">
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
                      {latestRun.totalRecords > 0 && (
                        <>
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${(latestRun.matchedRecords / latestRun.totalRecords) * 100}%` }}
                          />
                          <div
                            className="h-full bg-amber-400 transition-all"
                            style={{ width: `${(latestRun.mismatchedRecords / latestRun.totalRecords) * 100}%` }}
                          />
                          <div
                            className="h-full bg-red-400 transition-all"
                            style={{ width: `${(latestRun.unmatchedRecords / latestRun.totalRecords) * 100}%` }}
                          />
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        {latestRun.matchedRecords} matched
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-amber-400" />
                        {latestRun.mismatchedRecords} mismatched
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-red-400" />
                        {latestRun.unmatchedRecords} unmatched
                      </span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="rounded-lg border bg-muted/20 p-3 text-center">
                      <p className="text-lg font-bold tabular-nums">{latestRun.totalRecords}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Total</p>
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                      <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">{latestRun.exceptionCount}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Exceptions</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3 text-center">
                      <p className="text-lg font-bold tabular-nums text-muted-foreground">
                        {latestRun.processingTimeMs < 1000
                          ? `${latestRun.processingTimeMs}ms`
                          : `${(latestRun.processingTimeMs / 1000).toFixed(1)}s`}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Duration</p>
                    </div>
                  </div>

                  {/* Timestamp + link */}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5" suppressHydrationWarning>
                      <Clock className="size-3" />
                      Last run {formatDate(latestRun.startedAt)}
                    </p>
                    <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary h-auto py-0" render={<Link href="/reconciliation" />}>
                      Details <ArrowRight className="size-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Operational Status */}
          <Card className="border border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20 px-6 py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Operational Status
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Case pipeline and recovery agent performance
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">

              {/* Case status grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1">
                  <p className="text-2xl font-extrabold tabular-nums text-foreground">{openCount}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Open Cases</p>
                </div>
                <div className={`rounded-lg border p-3.5 space-y-1 ${pendingApprovalCount > 0 ? "border-indigo-500/20 bg-indigo-500/5" : "border-border bg-muted/20"}`}>
                  <p className={`text-2xl font-extrabold tabular-nums ${pendingApprovalCount > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-foreground"}`}>
                    {pendingApprovalCount}
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {pendingApprovalCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                        <span className="size-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        Awaiting Approval
                      </span>
                    ) : "Pending Approval"}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1">
                  <p className="text-2xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{recoveredCount}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Recovered</p>
                </div>
                <div className={`rounded-lg border p-3.5 space-y-1 ${failedCount > 0 ? "border-red-500/20 bg-red-500/5" : "border-border bg-muted/20"}`}>
                  <p className={`text-2xl font-extrabold tabular-nums ${failedCount > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>{failedCount}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Failed</p>
                </div>
              </div>

              {/* Severity strip */}
              {cases.length > 0 && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Risk Distribution</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                      <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                      {criticalCount} Critical
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      {highCount} High
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-[11px] font-bold text-yellow-600 dark:text-yellow-400">
                      <span className="size-1.5 rounded-full bg-yellow-500" />
                      {mediumCount} Medium
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                      {lowCount} Low
                    </span>
                  </div>
                </div>
              )}

              {/* View all link */}
              <div className="flex justify-end pt-1">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary h-auto py-0" render={<Link href="/cases" />}>
                  View all cases <ArrowRight className="size-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Recent Cases Table ── */}
        {recentCases.length === 0 ? (
          <EmptyState
            icon={GitCompareArrows}
            title="No operational data yet"
            description="Run reconciliation to seed the synthetic buildathon dataset, generate findings, and create bounded recovery cases with audit trails."
            action={
              <Button size="sm" render={<Link href="/reconciliation" />}>
                <GitCompareArrows className="size-4 mr-1.5" />
                Run Reconciliation
              </Button>
            }
          />
        ) : (
          <Card className="shadow-sm border border-border/80 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-4 border-b bg-muted/20 px-6 py-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <CardTitle className="text-base font-bold tracking-tight">Recent Case Workflows</CardTitle>
                  <Badge variant="outline" className="text-[10px] font-mono font-medium">
                    {recentCases.length} items
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Active reconciliation findings and recovery actions requiring operational resolution
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs font-semibold gap-1 text-primary hover:text-primary/80" render={<Link href="/cases" />}>
                View All
                <ArrowRight className="size-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[340px] text-[11px] font-bold uppercase tracking-wider">Case Title &amp; ID</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider">Severity</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider hidden md:table-cell">Type</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider">Amount at Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCases.map((caseRecord) => (
                    <TableRow key={caseRecord.id} className="hover:bg-muted/30 transition-colors group">
                      <TableCell className="font-medium">
                        <Link href={`/cases/${caseRecord.id}`} className="flex items-start gap-2.5">
                          <span className="font-mono text-xs font-medium text-muted-foreground group-hover:text-foreground mt-0.5">
                            #{caseRecord.caseNumber}
                          </span>
                          <span className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-1">
                            {caseRecord.title}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>{getStatusBadge(caseRecord.status)}</TableCell>
                      <TableCell>{getSeverityBadge(caseRecord.severity)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase font-semibold">
                          {caseRecord.type ?? caseRecord.source ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-sm tabular-nums text-foreground">
                        {formatCurrency(caseRecord.amountAtRisk ?? caseRecord.payment?.amount ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── Run History Quick Strip ── */}
        {runs.length > 1 && (
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="border-b bg-muted/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <RefreshCw className="size-4 text-muted-foreground" />
                  Reconciliation History
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary h-auto py-0" render={<Link href="/reconciliation" />}>
                  Full view <ArrowRight className="size-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                {runs.slice(0, 4).map((run, idx) => (
                  <div key={run.id} className="flex items-center gap-4 rounded-lg border border-border/60 px-4 py-2.5 text-xs">
                    <span className={`size-2 rounded-full ${idx === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    <span className="font-semibold text-foreground flex-1 truncate">{run.datasetLabel}</span>
                    <span className="font-bold tabular-nums text-foreground">{Number(run.matchRate).toFixed(1)}%</span>
                    <span className="text-muted-foreground tabular-nums hidden sm:block" suppressHydrationWarning>
                      {formatDate(run.startedAt)}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      {run.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardShell>
  );
}
