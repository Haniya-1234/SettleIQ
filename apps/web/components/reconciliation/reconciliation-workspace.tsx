"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  GitCompareArrows,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/empty-state";

// ---------------------------------------------------------------------------
// Types (unchanged)
// ---------------------------------------------------------------------------

export interface ReconciliationFinding {
  id: string;
  findingKey: string;
  type: string;
  severity: string;
  status: string;
  recordIds: string[];
  orderRef: string | null;
  paymentRef: string | null;
  settlementRef: string | null;
  expectedValue: string | null;
  actualValue: string | null;
  difference: string | null;
  explanation: string;
  createdAt: string | Date;
}

export interface ReconciliationRunSummary {
  id: string;
  datasetId: string;
  datasetVersion: string;
  datasetLabel: string;
  seed: number;
  status: string;
  startedAt: string | Date;
  completedAt: string | Date | null;
  totalRecords: number;
  matchedRecords: number;
  mismatchedRecords: number;
  unmatchedRecords: number;
  exceptionCount: number;
  matchRate: unknown;
  processingTimeMs: number;
  findings?: ReconciliationFinding[];
  _count?: { findings: number };
}

interface ReconciliationWorkspaceProps {
  initialRuns: ReconciliationRunSummary[];
  initialActiveRun: ReconciliationRunSummary | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRecord(finding: ReconciliationFinding): string {
  return (
    finding.orderRef ??
    finding.paymentRef ??
    finding.settlementRef ??
    finding.recordIds.join(", ")
  );
}

function getSeverityClasses(severity: string): string {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400";
    case "HIGH":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "MEDIUM":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    default:
      return "border-border bg-muted/30 text-muted-foreground";
  }
}

function getSeverityDot(severity: string): string {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return "bg-red-500 animate-pulse";
    case "HIGH":
      return "bg-amber-500";
    case "MEDIUM":
      return "bg-yellow-500";
    default:
      return "bg-muted-foreground/40";
  }
}

function getFindingTypeIcon(type: string) {
  switch (type) {
    case "AMOUNT_MISMATCH":
      return <AlertTriangle className="size-3.5 text-amber-500" />;
    case "MISSING_SETTLEMENT":
      return <XCircle className="size-3.5 text-red-500" />;
    case "DUPLICATE_PAYMENT":
      return <ShieldAlert className="size-3.5 text-rose-500" />;
    case "UNMATCHED_ORDER":
      return <AlertCircle className="size-3.5 text-orange-500" />;
    default:
      return <AlertCircle className="size-3.5 text-muted-foreground" />;
  }
}

function getStatusClasses(status: string): string {
  switch (status.toUpperCase()) {
    case "OPEN":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "RESOLVED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "CONVERTED_TO_CASE":
      return "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400";
    default:
      return "border-border bg-muted/30 text-muted-foreground";
  }
}

function getRunStatusClasses(status: string): string {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "RUNNING":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "FAILED":
      return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400";
    default:
      return "border-border bg-muted/30 text-muted-foreground";
  }
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReconciliationWorkspace({
  initialRuns,
  initialActiveRun,
}: ReconciliationWorkspaceProps) {
  const [runs, setRuns] = useState(initialRuns);
  const [activeRun, setActiveRun] = useState(initialActiveRun);
  const [selectedFinding, setSelectedFinding] = useState<ReconciliationFinding | null>(null);
  const [running, setRunning] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshRuns(activeId?: string) {
    const response = await fetch("/api/reconciliation/runs");
    if (!response.ok) throw new Error("Failed to load reconciliation runs");
    const data: ReconciliationRunSummary[] = await response.json();
    setRuns(data);
    const targetId = activeId ?? data[0]?.id;
    if (!targetId) { setActiveRun(null); return; }
    const detailResponse = await fetch(`/api/reconciliation/runs/${targetId}`);
    if (detailResponse.ok) setActiveRun(await detailResponse.json());
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/reconciliation/run", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Reconciliation run failed");
      }
      const run: ReconciliationRunSummary = await response.json();
      setActiveRun(run);
      await refreshRuns(run.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconciliation run failed");
    } finally {
      setRunning(false);
    }
  }

  async function handleCreateCase(findingId: string) {
    setConvertingId(findingId);
    setError(null);
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to create case");
      }
      if (activeRun) await refreshRuns(activeRun.id);
      setSelectedFinding(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setConvertingId(null);
    }
  }

  const findings = activeRun?.findings ?? [];
  const exceptionFindings = findings.filter((f) => f.type !== "EXACT_MATCH");
  const matchRate = Number(activeRun?.matchRate ?? 0);

  return (
    <div className="flex flex-col gap-6">

      {/* SECTION 1 - HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/80 bg-gradient-to-r from-card via-card/90 to-card/70 p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-inner">
            <GitCompareArrows className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Reconciliation</h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[600px]">
              Verify payment and settlement data, identify discrepancies, and surface exceptions that may impact revenue.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {activeRun && (
            <Button variant="outline" size="sm" onClick={() => refreshRuns(activeRun.id)} className="gap-1.5 text-xs font-semibold">
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          )}
          <Button onClick={handleRun} disabled={running} size="sm" className="gap-2 text-xs font-semibold">
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {running ? "Running\u2026" : "Run Reconciliation"}
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-destructive font-semibold">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!activeRun ? (
        <EmptyState
          icon={GitCompareArrows}
          title="No reconciliation runs yet"
          description="Run reconciliation to verify payment and settlement data and surface exceptions."
          action={
            <Button onClick={handleRun} disabled={running} className="gap-2">
              {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {running ? "Running\u2026" : "Run Reconciliation"}
            </Button>
          }
        />
      ) : (
        <>
          {/* SECTION 2 - RECONCILIATION HEALTH HERO */}
          <Card className="relative overflow-hidden border border-border/80 shadow-md group">
            <div className="absolute inset-0 bg-gradient-to-br from-card to-muted/10 pointer-events-none" />
            <CardContent className="p-10 flex flex-col items-center justify-center text-center relative z-10">
              <div className="flex items-end gap-2 mb-2">
                <span className="text-6xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {matchRate.toFixed(1)}<span className="text-4xl text-muted-foreground">%</span>
                </span>
              </div>
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-8">Match Rate</p>
              
              <div className="w-full max-w-3xl space-y-5">
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                  <div className="bg-emerald-500 transition-all" style={{ width: `${activeRun.totalRecords > 0 ? (activeRun.matchedRecords / activeRun.totalRecords) * 100 : 0}%` }} />
                  <div className="bg-amber-400 transition-all" style={{ width: `${activeRun.totalRecords > 0 ? (activeRun.mismatchedRecords / activeRun.totalRecords) * 100 : 0}%` }} />
                  <div className="bg-red-500 transition-all" style={{ width: `${activeRun.totalRecords > 0 ? (activeRun.unmatchedRecords / activeRun.totalRecords) * 100 : 0}%` }} />
                </div>
                
                <div className="flex items-center justify-center gap-6 text-sm font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <span className="tabular-nums">{activeRun.matchedRecords}</span> Matched
                  </span>
                  <span className="text-muted-foreground/30">&middot;</span>
                  <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <span className="tabular-nums">{activeRun.mismatchedRecords}</span> Mismatched
                  </span>
                  <span className="text-muted-foreground/30">&middot;</span>
                  <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <span className="tabular-nums">{activeRun.unmatchedRecords}</span> Unmatched
                  </span>
                </div>
              </div>

              <div className="mt-8 rounded-full border border-amber-500/30 bg-amber-500/10 px-6 py-2.5">
                <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-4" />
                  {activeRun.exceptionCount} Exceptions Require Attention
                </span>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3 - RECORD SUMMARY */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-border/80 shadow-sm transition-all hover:shadow-md">
              <CardHeader className="border-b bg-muted/20 px-5 py-3">
                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Database className="size-3.5" /> Total Records
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-4xl font-extrabold tabular-nums">{activeRun.totalRecords}</p>
              </CardContent>
            </Card>

            <Card className="border border-emerald-500/30 shadow-sm bg-gradient-to-br from-emerald-500/5 to-transparent relative overflow-hidden transition-all hover:shadow-md hover:border-emerald-500/50">
              <CardHeader className="border-b border-emerald-500/20 bg-emerald-500/10 px-5 py-3">
                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="size-3.5" /> Matched (Healthy)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-4xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{activeRun.matchedRecords}</p>
              </CardContent>
            </Card>

            <Card className="border border-amber-500/30 shadow-sm bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden transition-all hover:shadow-md hover:border-amber-500/50">
              <CardHeader className="border-b border-amber-500/20 bg-amber-500/10 px-5 py-3">
                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertCircle className="size-3.5" /> Mismatched (Review)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-4xl font-extrabold tabular-nums text-amber-600 dark:text-amber-400">{activeRun.mismatchedRecords}</p>
              </CardContent>
            </Card>

            <Card className="border border-red-500/30 shadow-sm bg-gradient-to-br from-red-500/5 to-transparent relative overflow-hidden transition-all hover:shadow-md hover:border-red-500/50">
              <CardHeader className="border-b border-red-500/20 bg-red-500/10 px-5 py-3">
                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-2">
                  <XCircle className="size-3.5" /> Unmatched (Critical)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-4xl font-extrabold tabular-nums text-red-600 dark:text-red-400">{activeRun.unmatchedRecords}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Left Column (Findings) */}
            <div className="lg:col-span-2 space-y-6">
              {/* SECTION 4 - FINDINGS / EXCEPTIONS */}
              <Card className="border border-border/80 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
                <CardHeader className="border-b bg-muted/20 px-6 py-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <ShieldAlert className="size-4 text-amber-500" />
                      Exceptions &amp; Findings
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold">
                      {exceptionFindings.length} Items
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-auto max-h-[600px]">
                  {exceptionFindings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center text-muted-foreground">
                      <CheckCircle2 className="size-12 text-emerald-500 opacity-50" />
                      <p className="text-sm font-semibold text-foreground">All records matched perfectly.</p>
                      <p className="text-xs">No exceptions found in this reconciliation run.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-muted/40 sticky top-0 z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider py-4 pl-6">Reference ID</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider">Type</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Expected</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Actual</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Difference</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-wider pl-4">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exceptionFindings.map((finding) => (
                          <TableRow
                            key={finding.id}
                            className="cursor-pointer hover:bg-muted/40 transition-colors group"
                            onClick={() => setSelectedFinding(finding)}
                          >
                            <TableCell className="font-mono text-xs font-semibold pl-6 py-3 max-w-[140px] truncate group-hover:text-primary transition-colors">
                              {formatRecord(finding)}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1.5">
                                {getFindingTypeIcon(finding.type)}
                                <span className="text-[11px] font-semibold uppercase">{finding.type.replace(/_/g, " ")}</span>
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground tabular-nums text-right max-w-[90px] truncate" title={finding.expectedValue ?? ""}>
                              {finding.expectedValue ?? "\u2014"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground tabular-nums text-right max-w-[90px] truncate" title={finding.actualValue ?? ""}>
                              {finding.actualValue ?? "\u2014"}
                            </TableCell>
                            <TableCell className="text-xs font-mono tabular-nums text-right">
                              {finding.difference ? (
                                <span className="text-red-600 dark:text-red-400 font-bold">{finding.difference}</span>
                              ) : "\u2014"}
                            </TableCell>
                            <TableCell className="pl-4">
                              <Badge variant="outline" className={`text-[9px] uppercase font-bold tracking-wider ${getStatusClasses(finding.status)}`}>
                                {finding.status.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column (Latest Run & History) */}
            <div className="space-y-6">
              {/* SECTION 5 - LATEST RUN */}
              <Card className="border border-border/80 shadow-sm">
                <CardHeader className="border-b bg-muted/20 px-5 py-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Database className="size-4 text-primary" />
                    Latest Run Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</span>
                    <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${getRunStatusClasses(activeRun.status)}`}>
                      {activeRun.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center border-t border-border pt-4">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Records Processed</span>
                    <span className="text-sm font-extrabold tabular-nums">{activeRun.totalRecords}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border pt-4">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Processing Duration</span>
                    <span className="text-sm font-extrabold tabular-nums text-primary">
                      {activeRun.processingTimeMs < 1000
                        ? `${activeRun.processingTimeMs} ms`
                        : `${(activeRun.processingTimeMs / 1000).toFixed(1)} s`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border pt-4">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Timestamp</span>
                    <span className="text-xs font-semibold text-foreground" suppressHydrationWarning>{formatDate(activeRun.startedAt)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 6 - RUN HISTORY */}
              {runs.length > 1 && (
                <Card className="border border-border/80 shadow-sm">
                  <CardHeader className="border-b bg-muted/20 px-5 py-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" />
                      Run History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 max-h-[300px] overflow-auto">
                    {runs.map((run) => (
                      <button
                        key={run.id}
                        type="button"
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${
                          run.id === activeRun.id ? "border-primary/30 bg-primary/5" : "border-border/60"
                        }`}
                        onClick={async () => {
                          const response = await fetch(`/api/reconciliation/runs/${run.id}`);
                          if (response.ok) setActiveRun(await response.json());
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`size-2 shrink-0 rounded-full ${run.id === activeRun.id ? "bg-primary" : "bg-muted-foreground/30"}`} />
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold tabular-nums">{Number(run.matchRate).toFixed(1)}%</span>
                              <span className="text-[10px] font-mono font-semibold text-muted-foreground">{run.totalRecords} records</span>
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground" suppressHydrationWarning>
                              {formatDate(run.startedAt)}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-[9px] font-bold uppercase px-1.5 py-0 tracking-wider ${getRunStatusClasses(run.status)}`}>
                          {run.status === "COMPLETED" ? "OK" : run.status}
                        </Badge>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {/* Finding detail sheet */}
      <Sheet open={selectedFinding !== null} onOpenChange={(open) => !open && setSelectedFinding(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg border-l border-border/80">
          {selectedFinding ? (
            <>
              <SheetHeader className="pb-4 border-b border-border/80">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getFindingTypeIcon(selectedFinding.type)}</div>
                  <div>
                    <SheetTitle className="text-base font-bold tracking-tight">{selectedFinding.type.replace(/_/g, " ")}</SheetTitle>
                    <SheetDescription className="font-mono text-[11px] font-medium mt-0.5 text-muted-foreground">{selectedFinding.findingKey}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6 pt-5 pb-6 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${getSeverityClasses(selectedFinding.severity)}`}>
                    <span className={`size-1.5 rounded-full ${getSeverityDot(selectedFinding.severity)}`} />
                    {selectedFinding.severity}
                  </span>
                  <Badge variant="outline" className={`text-[11px] font-bold uppercase tracking-wider ${getStatusClasses(selectedFinding.status)}`}>
                    {selectedFinding.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Explanation</p>
                  <p className="text-sm font-medium leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/60 text-foreground">
                    {selectedFinding.explanation}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl border border-border/60 bg-muted/10 p-3.5 space-y-1.5">
                    <p className="font-bold uppercase text-[10px] tracking-wider text-muted-foreground">Expected</p>
                    <p className="font-mono font-bold text-foreground break-all">{selectedFinding.expectedValue ?? "\u2014"}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/10 p-3.5 space-y-1.5">
                    <p className="font-bold uppercase text-[10px] tracking-wider text-muted-foreground">Actual</p>
                    <p className="font-mono font-bold text-foreground break-all">{selectedFinding.actualValue ?? "\u2014"}</p>
                  </div>
                  <div className={`rounded-xl border p-3.5 space-y-1.5 ${selectedFinding.difference ? "border-red-500/30 bg-red-500/5" : "border-border/60 bg-muted/10"}`}>
                    <p className="font-bold uppercase text-[10px] tracking-wider text-muted-foreground">Difference</p>
                    <p className={`font-mono font-bold break-all ${selectedFinding.difference ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                      {selectedFinding.difference ?? "\u2014"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">References</p>
                  <div className="space-y-1.5">
                    {selectedFinding.orderRef && (
                      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 px-3.5 py-2.5 text-xs">
                        <span className="text-muted-foreground font-semibold">Order</span>
                        <span className="font-mono font-bold text-foreground">{selectedFinding.orderRef}</span>
                      </div>
                    )}
                    {selectedFinding.paymentRef && (
                      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 px-3.5 py-2.5 text-xs">
                        <span className="text-muted-foreground font-semibold">Payment</span>
                        <span className="font-mono font-bold text-foreground">{selectedFinding.paymentRef}</span>
                      </div>
                    )}
                    {selectedFinding.settlementRef && (
                      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 px-3.5 py-2.5 text-xs">
                        <span className="text-muted-foreground font-semibold">Settlement</span>
                        <span className="font-mono font-bold text-foreground">{selectedFinding.settlementRef}</span>
                      </div>
                    )}
                    {selectedFinding.recordIds.length > 0 && (
                      <div className="rounded-lg border border-border/60 bg-muted/10 px-3.5 py-2.5 text-xs space-y-1">
                        <p className="text-muted-foreground font-semibold">Record IDs</p>
                        <p className="font-mono text-[10px] font-medium break-all text-foreground/80">{selectedFinding.recordIds.join(", ")}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedFinding.type !== "EXACT_MATCH" && selectedFinding.status !== "CONVERTED_TO_CASE" ? (
                  <Button
                    className="w-full gap-2 font-bold"
                    disabled={convertingId === selectedFinding.id}
                    onClick={() => handleCreateCase(selectedFinding.id)}
                  >
                    {convertingId === selectedFinding.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ShieldAlert className="size-4" />
                    )}
                    {convertingId === selectedFinding.id ? "Creating case\u2026" : "Convert to Recovery Case"}
                  </Button>
                ) : selectedFinding.status === "CONVERTED_TO_CASE" ? (
                  <div className="flex items-center gap-2 justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3.5 text-sm text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="size-4" />
                    Already converted to a recovery case
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
