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
// Match rate bar
// ---------------------------------------------------------------------------

function MatchRateBar({
  rate,
  total,
  matched,
  mismatched,
  unmatched,
}: {
  rate: number;
  total: number;
  matched: number;
  mismatched: number;
  unmatched: number;
}) {
  const matchedPct = total > 0 ? (matched / total) * 100 : 0;
  const mismatchedPct = total > 0 ? (mismatched / total) * 100 : 0;
  const unmatchedPct = total > 0 ? (unmatched / total) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <span className="text-4xl font-extrabold tabular-nums text-foreground">
          {rate.toFixed(1)}
          <span className="text-2xl text-muted-foreground">%</span>
        </span>
        <span className="mb-1 text-sm text-muted-foreground font-medium">match rate</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/50">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${matchedPct}%` }} />
        <div className="h-full bg-amber-400 transition-all" style={{ width: `${mismatchedPct}%` }} />
        <div className="h-full bg-red-400 transition-all" style={{ width: `${unmatchedPct}%` }} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          Matched ({matched})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-400" />
          Mismatched ({mismatched})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-400" />
          Unmatched ({unmatched})
        </span>
      </div>
    </div>
  );
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
  const criticalCount = exceptionFindings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = exceptionFindings.filter((f) => f.severity === "HIGH").length;

  return (
    <div className="flex flex-col gap-6">

      {/* Action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="size-4" />
          <span>Deterministic reconciliation &middot; synthetic buildathon dataset</span>
        </div>
        <div className="flex items-center gap-2">
          {activeRun && (
            <Button variant="outline" size="sm" onClick={() => refreshRuns(activeRun.id)} className="gap-1.5 text-xs">
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          )}
          <Button onClick={handleRun} disabled={running} className="gap-2">
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {running ? "Running\u2026" : "Run Reconciliation"}
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-destructive">
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
          description="Run reconciliation to load the deterministic synthetic dataset, compare orders, payments, and settlements, and surface real findings."
          action={
            <Button onClick={handleRun} disabled={running} className="gap-2">
              {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {running ? "Running\u2026" : "Run Reconciliation"}
            </Button>
          }
        />
      ) : (
        <>
          {/* Health overview */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {/* Match rate hero (spans 2 cols) */}
            <Card className="sm:col-span-2 border border-border/80 shadow-sm overflow-hidden">
              <CardHeader className="border-b bg-muted/20 px-6 py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="size-4 text-emerald-500" />
                    Reconciliation Health
                  </CardTitle>
                  <Badge variant="outline" className={`font-mono text-[10px] uppercase ${getRunStatusClasses(activeRun.status)}`}>
                    {activeRun.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <MatchRateBar
                  rate={matchRate}
                  total={activeRun.totalRecords}
                  matched={activeRun.matchedRecords}
                  mismatched={activeRun.mismatchedRecords}
                  unmatched={activeRun.unmatchedRecords}
                />
              </CardContent>
            </Card>

            {/* Records card */}
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="border-b bg-muted/20 px-5 py-3">
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Records</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div>
                  <p className="text-3xl font-extrabold tabular-nums">{activeRun.totalRecords}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">total scanned</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{activeRun.matchedRecords}</p>
                    <p className="text-muted-foreground">matched</p>
                  </div>
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2">
                    <p className="font-bold text-red-600 dark:text-red-400 tabular-nums">{activeRun.unmatchedRecords}</p>
                    <p className="text-muted-foreground">unmatched</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exceptions card */}
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="border-b bg-muted/20 px-5 py-3">
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Exceptions</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div>
                  <p className="text-3xl font-extrabold tabular-nums">{activeRun.exceptionCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">findings requiring review</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {criticalCount > 0 && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2">
                      <p className="font-bold text-red-600 dark:text-red-400 tabular-nums">{criticalCount}</p>
                      <p className="text-muted-foreground">critical</p>
                    </div>
                  )}
                  {highCount > 0 && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                      <p className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{highCount}</p>
                      <p className="text-muted-foreground">high</p>
                    </div>
                  )}
                  {criticalCount === 0 && highCount === 0 && (
                    <div className="col-span-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      <p className="text-emerald-600 dark:text-emerald-400 font-semibold">No critical issues</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Run info strip */}
          <Card className="border border-border/80 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Database className="size-3.5" />
                  <span className="font-semibold text-foreground">{activeRun.datasetLabel}</span>
                  <Badge variant="outline" className="font-mono text-[10px] ml-1">v{activeRun.datasetVersion}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  <span suppressHydrationWarning>Ran {formatDate(activeRun.startedAt)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="size-3.5" />
                  <span>
                    {activeRun.processingTimeMs < 1000
                      ? `${activeRun.processingTimeMs}ms`
                      : `${(activeRun.processingTimeMs / 1000).toFixed(2)}s`}
                    {" "}processing time
                  </span>
                </div>
                <span>Seed: <span className="font-mono font-semibold text-foreground">{activeRun.seed}</span></span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground/50">{activeRun.id.slice(0, 12)}\u2026</span>
              </div>
            </CardContent>
          </Card>

          {/* Findings table */}
          <Card className="border border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20 px-6 py-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldAlert className="size-4 text-amber-500" />
                    Exceptions &amp; Findings
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {exceptionFindings.length} exception{exceptionFindings.length !== 1 ? "s" : ""} &middot;{" "}
                    {findings.length - exceptionFindings.length} exact match{findings.length - exceptionFindings.length !== 1 ? "es" : ""} &middot;{" "}
                    Click a row to inspect or convert to case
                  </p>
                </div>
                {exceptionFindings.length > 0 && (
                  <div className="flex items-center gap-2">
                    {criticalCount > 0 && (
                      <Badge variant="outline" className="gap-1.5 border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-[10px]">
                        <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                        {criticalCount} Critical
                      </Badge>
                    )}
                    {highCount > 0 && (
                      <Badge variant="outline" className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px]">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        {highCount} High
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {exceptionFindings.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <CheckCircle2 className="size-10 text-emerald-500 opacity-70" />
                  <p className="text-sm font-semibold">All records matched</p>
                  <p className="text-xs text-muted-foreground">No exceptions found in this reconciliation run.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider w-10" />
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider">Type</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider">Severity</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider">Reference</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider">Expected</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider">Actual</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider">Difference</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exceptionFindings.map((finding) => (
                      <TableRow
                        key={finding.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors group"
                        onClick={() => setSelectedFinding(finding)}
                      >
                        <TableCell className="pl-4">{getFindingTypeIcon(finding.type)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px] uppercase">
                            {finding.type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getSeverityClasses(finding.severity)}`}>
                            <span className={`size-1.5 rounded-full ${getSeverityDot(finding.severity)}`} />
                            {finding.severity}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium max-w-[160px] truncate">
                          {formatRecord(finding)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[130px] truncate">
                          {finding.expectedValue ?? "\u2014"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[130px] truncate">
                          {finding.actualValue ?? "\u2014"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {finding.difference ? (
                            <span className="text-red-600 dark:text-red-400 font-semibold">{finding.difference}</span>
                          ) : "\u2014"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] uppercase ${getStatusClasses(finding.status)}`}>
                            {finding.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="size-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Run history */}
          {runs.length > 1 && (
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="border-b bg-muted/20 px-6 py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  Run History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {runs.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                      run.id === activeRun.id ? "border-primary/30 bg-primary/5" : "border-border/60"
                    }`}
                    onClick={async () => {
                      const response = await fetch(`/api/reconciliation/runs/${run.id}`);
                      if (response.ok) setActiveRun(await response.json());
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-2 rounded-full ${run.id === activeRun.id ? "bg-primary" : "bg-muted-foreground/30"}`} />
                      <div>
                        <p className="text-xs font-semibold text-foreground">{run.datasetLabel}</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5" suppressHydrationWarning>
                          {formatDate(run.startedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold tabular-nums">{Number(run.matchRate).toFixed(1)}%</span>
                      <Badge variant="outline" className={`text-[10px] uppercase ${getRunStatusClasses(run.status)}`}>
                        {run.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Finding detail sheet */}
      <Sheet open={selectedFinding !== null} onOpenChange={(open) => !open && setSelectedFinding(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selectedFinding ? (
            <>
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getFindingTypeIcon(selectedFinding.type)}</div>
                  <div>
                    <SheetTitle className="text-base">{selectedFinding.type.replace(/_/g, " ")}</SheetTitle>
                    <SheetDescription className="font-mono text-[11px] mt-0.5">{selectedFinding.findingKey}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-5 pt-5 pb-6 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${getSeverityClasses(selectedFinding.severity)}`}>
                    <span className={`size-1.5 rounded-full ${getSeverityDot(selectedFinding.severity)}`} />
                    {selectedFinding.severity}
                  </span>
                  <Badge variant="outline" className={`text-[11px] uppercase ${getStatusClasses(selectedFinding.status)}`}>
                    {selectedFinding.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Explanation</p>
                  <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50">
                    {selectedFinding.explanation}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <p className="font-bold uppercase text-[10px] text-muted-foreground">Expected</p>
                    <p className="font-mono font-semibold">{selectedFinding.expectedValue ?? "\u2014"}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <p className="font-bold uppercase text-[10px] text-muted-foreground">Actual</p>
                    <p className="font-mono font-semibold">{selectedFinding.actualValue ?? "\u2014"}</p>
                  </div>
                  <div className={`rounded-lg border p-3 space-y-1 ${selectedFinding.difference ? "border-red-500/30 bg-red-500/5" : "border-border bg-muted/20"}`}>
                    <p className="font-bold uppercase text-[10px] text-muted-foreground">Difference</p>
                    <p className={`font-mono font-semibold ${selectedFinding.difference ? "text-red-600 dark:text-red-400" : ""}`}>
                      {selectedFinding.difference ?? "\u2014"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">References</p>
                  <div className="space-y-1.5">
                    {selectedFinding.orderRef && (
                      <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-xs">
                        <span className="text-muted-foreground font-semibold">Order</span>
                        <span className="font-mono">{selectedFinding.orderRef}</span>
                      </div>
                    )}
                    {selectedFinding.paymentRef && (
                      <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-xs">
                        <span className="text-muted-foreground font-semibold">Payment</span>
                        <span className="font-mono">{selectedFinding.paymentRef}</span>
                      </div>
                    )}
                    {selectedFinding.settlementRef && (
                      <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-xs">
                        <span className="text-muted-foreground font-semibold">Settlement</span>
                        <span className="font-mono">{selectedFinding.settlementRef}</span>
                      </div>
                    )}
                    {selectedFinding.recordIds.length > 0 && (
                      <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs space-y-0.5">
                        <p className="text-muted-foreground font-semibold">Record IDs</p>
                        <p className="font-mono text-[10px] break-all">{selectedFinding.recordIds.join(", ")}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedFinding.type !== "EXACT_MATCH" && selectedFinding.status !== "CONVERTED_TO_CASE" ? (
                  <Button
                    className="w-full gap-2"
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
                  <div className="flex items-center gap-2 justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/5 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
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
