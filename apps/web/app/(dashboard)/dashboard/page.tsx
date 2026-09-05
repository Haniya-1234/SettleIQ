import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Clock,
  Database,
  FolderOpen,
  GitCompareArrows,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
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
  title: "Dashboard | SettleIQ",
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
    case "ANALYZING":
      return (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[10px] tracking-wide">
          {status}
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

  const recentCases = cases.slice(0, 8);
  const recoveryRate = metrics?.recoveryRate ?? 0;

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
      title="Revenue Recovery Command Center"
      description="Monitor at-risk revenue, AI recovery actions, payment health, and operational outcomes."
    >
      <div className="flex flex-col gap-8 pb-8">
      
        {/* ── SECTION 1: HEADER ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/80 bg-gradient-to-r from-card via-card/90 to-card/70 p-5 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-inner">
              <Zap className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold tracking-tight text-foreground">Revenue Recovery Command Center</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monitor at-risk revenue, AI recovery actions, payment health, and operational outcomes.
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

        {/* ── SECTION 2: Primary KPI Hero ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-md transition-all hover:border-amber-500/50 hover:shadow-lg group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Revenue at Risk</CardTitle>
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                <AlertTriangle className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {formatCurrency(metrics?.totalRevenueAtRiskPaise ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-md transition-all hover:border-emerald-500/50 hover:shadow-lg group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Recovered</CardTitle>
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                <Wallet className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {formatCurrency(metrics?.totalRecoveredPaise ?? 0)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recovery Rate</CardTitle>
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {recoveryRate}%
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, recoveryRate))}%` }}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Open / Pending Cases</CardTitle>
              <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                <Activity className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {openCount + pendingApprovalCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── SECTION 3: Recovery Pipeline ── */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Recovery Pipeline</h3>
          <Card className="border border-border/60 shadow-sm p-6 bg-card/40 overflow-hidden relative">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              {/* Connector Line */}
              <div className="hidden md:block absolute top-[40%] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-emerald-500/20 -z-10"></div>
              
              <div className="flex flex-col items-center bg-card p-4 rounded-xl shadow-sm border border-border/50 min-w-[160px] relative overflow-hidden group">
                <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors" />
                <div className="size-12 rounded-full border-2 border-amber-500/30 bg-card flex items-center justify-center text-amber-500 mb-3 z-10 shadow-sm">
                  <ShieldAlert className="size-5" />
                </div>
                <p className="text-base font-bold tabular-nums z-10">{formatCurrency(metrics?.totalRevenueAtRiskPaise ?? 0)}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5 z-10">Revenue At Risk</p>
              </div>

              <div className="hidden md:flex text-muted-foreground/40"><ArrowRight className="size-5" /></div>

              <div className="flex flex-col items-center bg-card p-4 rounded-xl shadow-sm border border-border/50 min-w-[160px] relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                <div className="size-12 rounded-full border-2 border-primary/30 bg-card flex items-center justify-center text-primary mb-3 z-10 shadow-sm">
                  <Search className="size-5" />
                </div>
                <p className="text-base font-bold tabular-nums z-10">{cases.length} Cases</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5 z-10">Cases Detected</p>
              </div>

              <div className="hidden md:flex text-muted-foreground/40"><ArrowRight className="size-5" /></div>

              <div className="flex flex-col items-center bg-card p-4 rounded-xl shadow-sm border border-border/50 min-w-[160px] relative overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors" />
                <div className="size-12 rounded-full border-2 border-indigo-500/30 bg-card flex items-center justify-center text-indigo-500 mb-3 z-10 shadow-sm">
                  <Bot className="size-5" />
                </div>
                <p className="text-base font-bold tabular-nums z-10">{metrics?.recoveryAttempts ?? 0} Actions</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5 z-10">AI Investigated</p>
              </div>

              <div className="hidden md:flex text-muted-foreground/40"><ArrowRight className="size-5" /></div>

              <div className="flex flex-col items-center bg-card p-4 rounded-xl shadow-sm border border-border/50 min-w-[160px] relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
                <div className="size-12 rounded-full border-2 border-emerald-500/30 bg-card flex items-center justify-center text-emerald-500 mb-3 z-10 shadow-sm">
                  <Wallet className="size-5" />
                </div>
                <p className="text-base font-bold tabular-nums z-10">{formatCurrency(metrics?.totalRecoveredPaise ?? 0)}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider mt-1.5 z-10">Revenue Recovered</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── SECTION 4: AI Recovery Operations ── */}
          <Card className="flex flex-col border border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bot className="size-4 text-primary" />
                AI Recovery Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                  <p className="text-3xl font-extrabold">{openCount}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Cases Detected</p>
                </div>
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                  <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{pendingApprovalCount}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400/80 mt-1">Pending Human Approvals</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{recoveredCount}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400/80 mt-1">Recovered Cases</p>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <p className="text-3xl font-extrabold text-red-600 dark:text-red-400">{failedCount}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400/80 mt-1">Failed Cases</p>
                </div>
                <div className="col-span-2 mt-2 p-4 rounded-xl border border-border/50 bg-muted/10 flex justify-between items-center text-sm">
                   <div className="flex flex-col">
                     <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide">Execution Success</span>
                     <span className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">{metrics?.successfulRecoveries ?? 0}</span>
                   </div>
                   <div className="h-8 w-px bg-border"></div>
                   <div className="flex flex-col items-end">
                     <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide">Execution Failure</span>
                     <span className="font-extrabold text-lg text-red-600 dark:text-red-400">{metrics?.failedRecoveries ?? 0}</span>
                   </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4 border-t bg-muted/10">
              <Button variant="ghost" className="w-full text-sm font-semibold justify-between group text-primary hover:text-primary/90" render={<Link href="/cases" />}>
                View Recovery Cases
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>

          {/* ── SECTION 5: Reconciliation Health ── */}
          <Card className="flex flex-col border border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Database className="size-4 text-primary" />
                  Payment Data Health
                </CardTitle>
                {latestRun && <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">{latestRun.status}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-6">
              {latestRun ? (
                <div className="space-y-8">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-5xl font-extrabold tabular-nums tracking-tight text-foreground">{matchRate?.toFixed(1)}<span className="text-3xl text-muted-foreground">%</span></span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Match Rate</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                      {latestRun.totalRecords > 0 && (
                        <>
                          <div className="bg-emerald-500" style={{ width: `${(latestRun.matchedRecords / latestRun.totalRecords) * 100}%` }} />
                          <div className="bg-amber-400" style={{ width: `${(latestRun.mismatchedRecords / latestRun.totalRecords) * 100}%` }} />
                          <div className="bg-red-500" style={{ width: `${(latestRun.unmatchedRecords / latestRun.totalRecords) * 100}%` }} />
                        </>
                      )}
                    </div>
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                      <span className="text-emerald-600 dark:text-emerald-400">{latestRun.matchedRecords} Matched</span>
                      <span className="text-amber-600 dark:text-amber-400">{latestRun.mismatchedRecords} Mismatched</span>
                      <span className="text-red-600 dark:text-red-400">{latestRun.unmatchedRecords} Unmatched</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="size-4" />
                      <span className="font-bold text-[11px] uppercase tracking-wider">Exceptions Detected</span>
                    </div>
                    <span className="font-extrabold text-xl text-amber-600 dark:text-amber-400 tabular-nums">{latestRun.exceptionCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Clock className="size-3.5" />
                    Latest run: {formatDate(latestRun.startedAt)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <Database className="size-10 mb-4 opacity-20" />
                  <p className="text-sm font-medium">No reconciliation data</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="p-4 border-t bg-muted/10">
              <Button variant="ghost" className="w-full text-sm font-semibold justify-between group text-primary hover:text-primary/90" render={<Link href="/reconciliation" />}>
                View Reconciliation
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* ── SECTION 6: Recent Recovery Cases ── */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Recent Recovery Cases</h3>
          <Card className="shadow-sm border border-border/80 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-4">Payment / Case ID</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider">Failure Reason</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider">Recommended Action</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider">Severity</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider">Revenue at Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCases.map((caseRecord) => (
                  <TableRow 
                    key={caseRecord.id} 
                    className={`transition-colors group ${caseRecord.status === 'RECOVERED' ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-muted/30'}`}
                  >
                    <TableCell className="font-medium py-3">
                      <Link href={`/cases/${caseRecord.id}`} className="flex flex-col gap-1">
                        <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                          {caseRecord.payment?.razorpayPaymentId ?? caseRecord.paymentId ?? "Multiple Payments"}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                          #{caseRecord.caseNumber}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm font-medium max-w-[200px] truncate" title={caseRecord.title}>
                      {caseRecord.title}
                    </TableCell>
                    <TableCell className="text-sm">
                       {caseRecord.requiresHumanApproval ? (
                         <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium text-xs">
                           <ShieldCheck className="size-3.5" />
                           Manual Review
                         </span>
                       ) : (
                         <span className="inline-flex items-center gap-1.5 text-primary font-medium text-xs">
                           <Bot className="size-3.5" />
                           AI Resolution
                         </span>
                       )}
                    </TableCell>
                    <TableCell>{getSeverityBadge(caseRecord.severity)}</TableCell>
                    <TableCell>{getStatusBadge(caseRecord.status)}</TableCell>
                    <TableCell className={`text-right font-mono font-bold text-sm tabular-nums ${caseRecord.status === 'RECOVERED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                      {formatCurrency(caseRecord.amountAtRisk ?? caseRecord.payment?.amount ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
                {recentCases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No recovery cases found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
