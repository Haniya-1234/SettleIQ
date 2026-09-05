import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Activity,
  Database,
  FileText,
  Layers,
  ShieldCheck,
  Terminal,
  ArrowRight,
  Search,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CaseApprovalAction } from "@/components/cases/case-approval-action";
import { AgentActivityTimeline } from "@/components/cases/agent-activity-timeline";
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
import { getCaseDetail } from "@/lib/recovery/recovery-service";

export const metadata: Metadata = {
  title: "Case detail",
};

export const dynamic = "force-dynamic";

function formatCurrency(amount: number | null | undefined, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format((amount ?? 0) / 100);
}

function getStatusBadge(status: string) {
  switch (status.toUpperCase()) {
    case "OPEN":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-xs tracking-wide"
        >
          OPEN
        </Badge>
      );
    case "RECOVERED":
    case "RESOLVED":
    case "CLOSED":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-xs tracking-wide"
        >
          {status}
        </Badge>
      );
    case "PENDING_APPROVAL":
    case "ACTION_PROPOSED":
      return (
        <Badge
          variant="outline"
          className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold text-xs tracking-wide"
        >
          {status.replace(/_/g, " ")}
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="destructive" className="font-semibold text-xs tracking-wide">
          FAILED
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="font-medium text-xs tracking-wide">
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
          <span className="size-2 rounded-full bg-red-500 animate-pulse" />
          CRITICAL
        </span>
      );
    case "HIGH":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <span className="size-2 rounded-full bg-amber-500" />
          HIGH
        </span>
      );
    case "MEDIUM":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
          <span className="size-2 rounded-full bg-yellow-500" />
          MEDIUM
        </span>
      );
    case "LOW":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="size-2 rounded-full bg-muted-foreground/40" />
          LOW
        </span>
      );
    default:
      return <span className="text-xs text-muted-foreground">{severity}</span>;
  }
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseRecord = await getCaseDetail(id);

  if (!caseRecord) {
    notFound();
  }

  // Derived properties for context switching between Payment Recovery and Reconciliation Exception
  const isReconciliation = caseRecord.source === "RECONCILIATION" || 
    ["MISSING_SETTLEMENT", "AMOUNT_MISMATCH", "DUPLICATE_PAYMENT", "UNMATCHED_ORDER", "DATE_MISMATCH", "STATUS_MISMATCH"].includes(caseRecord.type);

  const recommendation = caseRecord.recommendation as Record<string, unknown> | null;
  const policyDecision = caseRecord.policyDecision as Record<string, unknown> | null;
  const executionResult = caseRecord.executionResult as Record<string, unknown> | null;
  const analysis = caseRecord.analysis as Record<string, unknown> | null;
  
  // Use actual monetary exposure
  const trueFinancialExposure = caseRecord.amountAtRisk || caseRecord.payment?.amount || caseRecord.order?.amount || 0;
  const amountStr = formatCurrency(trueFinancialExposure, caseRecord.currency ?? "INR");

  // Base evidence on stored + derived if missing (so we never show an empty, broken table)
  const storedEvidence = Array.isArray(caseRecord.evidence) ? caseRecord.evidence : [];
  const evidence = [...storedEvidence];
  if (evidence.length === 0) {
     if (caseRecord.payment) {
       evidence.push({ id: 'e1', label: "Payment Status", source: "system", value: caseRecord.payment.status });
     }
     if (caseRecord.order) {
       evidence.push({ id: 'e2', label: "Order Status", source: "system", value: caseRecord.order.status });
     }
     if (caseRecord.payment?.amount) {
       evidence.push({ id: 'e3', label: "Payment Amount", source: "system", value: formatCurrency(caseRecord.payment.amount, caseRecord.currency || "INR") });
     }
     if (caseRecord.order?.amount) {
       evidence.push({ id: 'e4', label: "Order Amount", source: "system", value: formatCurrency(caseRecord.order.amount, caseRecord.currency || "INR") });
     }
     if (caseRecord.type === "MISSING_SETTLEMENT") {
       evidence.push({ id: 'e5', label: "Settlement", source: "reconciliation", value: "Not found" });
       evidence.push({ id: 'e6', label: "Reconciliation", source: "reconciliation", value: "Missing settlement" });
     } else if (caseRecord.type === "AMOUNT_MISMATCH") {
       evidence.push({ id: 'e7', label: "Reconciliation", source: "reconciliation", value: "Amount discrepancy" });
     }
  }

  // Derive Investigation Summary
  let whatHappened = "";
  let whyItMatters = "";
  let found: string[] = [];
  let nextStep = "";
  let resolutionGuidance = "";

  const paymentStr = caseRecord.payment?.razorpayPaymentId || "Payment";
  const orderStr = caseRecord.order?.razorpayOrderId || "Order";

  if (caseRecord.type === "MISSING_SETTLEMENT") {
    whatHappened = `Payment ${paymentStr} for order ${orderStr} was captured for ${amountStr}, but no settlement record was found.`;
    whyItMatters = "The payment appears captured but has no corresponding settlement record, indicating a possible reconciliation gap with the gateway.";
    found = ["Payment exists", "Order exists", "Settlement record is missing", `Financial exposure: ${amountStr}`];
    nextStep = "Investigate settlement status before attempting customer recovery.";
    resolutionGuidance = "The payment is captured but no settlement record is present. Recovery execution should not be attempted until settlement status is understood.";
  } else if (caseRecord.type === "AMOUNT_MISMATCH") {
    whatHappened = `Payment ${paymentStr} was captured, but the amount does not match the expected order amount.`;
    whyItMatters = "There is a discrepancy between the expected funds and the actual captured funds.";
    found = ["Payment exists", "Amount discrepancy detected", `Financial exposure: ${amountStr}`];
    nextStep = "Review payment amount versus expected amount.";
    resolutionGuidance = "Amount discrepancy requires manual review before any action.";
  } else if (caseRecord.type === "FAILED_PAYMENT") {
    whatHappened = `Payment ${paymentStr} failed during checkout for ${amountStr}.`;
    whyItMatters = "A customer attempted to pay but the transaction was not successful, leading to potential revenue loss.";
    found = ["Failed payment intent", `Failure reason: ${caseRecord.payment?.failureDescription || "Gateway failure"}`, `Financial exposure: ${amountStr}`];
    nextStep = "Evaluate recovery policy and attempt intelligent retry or alternative payment collection if eligible.";
  } else {
    whatHappened = caseRecord.description || `Anomaly detected involving ${paymentStr}.`;
    whyItMatters = "This anomaly requires investigation to ensure correct financial reconciliation.";
    found = ["Anomaly detected", `Financial exposure: ${amountStr}`];
    nextStep = "Review case details and determine appropriate resolution.";
  }

  const recSummary = (recommendation?.summary ?? recommendation?.diagnosis ?? "No recommendation summary available.") as string;
  const recIntervention = (recommendation?.recommendedIntervention ?? {}) as Record<string, unknown>;
  const recInterventionType = (recIntervention?.type ?? recommendation?.interventionType ?? "NO_ACTION") as string;
  const recInterventionSummary = (recIntervention?.summary ?? recIntervention?.reason ?? "No intervention details provided.") as string;
  const recRiskLevel = (recommendation?.riskLevel ?? recIntervention?.riskLevel ?? "") as string;
  const recExpectedPaise = (recommendation?.expectedRecoveryPaise ?? recIntervention?.expectedRecoveryPaise ?? 0) as number;
  const recEvidence = Array.isArray(recommendation?.evidence) ? (recommendation.evidence as Record<string, unknown>[]) : [];

  return (
    <DashboardShell
      title={`Case #${caseRecord.caseNumber}`}
      description={caseRecord.title}
    >
      <div className="flex flex-col gap-6">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" className="w-fit text-xs gap-1.5 text-muted-foreground hover:text-foreground" render={<Link href="/cases" />}>
            ← Back to Cases
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {caseRecord.source ?? "RECONCILIATION"}
            </Badge>
            <Badge
              variant="outline"
              className={
                caseRecord.synthetic
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium text-[10px]"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium text-[10px]"
              }
            >
              {caseRecord.synthetic ? "Demo / Synthetic" : "Live Observed"}
            </Badge>
            {getStatusBadge(caseRecord.status)}
            <CaseApprovalAction caseId={caseRecord.id} caseStatus={caseRecord.status} />
          </div>
        </div>

        {/* Overview & Payment Context Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="border-b bg-muted/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Case Overview</CardTitle>
                  <CardDescription className="text-xs" suppressHydrationWarning>
                    Created on {new Date(caseRecord.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </CardDescription>
                </div>
                {getSeverityBadge(caseRecord.severity)}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Financial Exposure Highlight */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Financial Exposure</p>
                  <p className="text-3xl font-extrabold text-foreground tabular-nums">
                    {amountStr}
                  </p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Approval Requirement: </span>
                    <span className={caseRecord.requiresHumanApproval ? "text-amber-600 dark:text-amber-400 font-semibold" : isReconciliation ? "text-muted-foreground font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}>
                      {caseRecord.requiresHumanApproval ? "Human Approval Required" : isReconciliation ? "Not applicable" : "Automated Recovery Eligible"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Case Attributes */}
              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Case Type</p>
                  <Badge variant="outline" className="font-mono text-xs mt-1">
                    {caseRecord.type}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source Stream</p>
                  <p className="font-medium mt-1 text-xs">{caseRecord.source}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Case Reference</p>
                  <p className="font-mono mt-1 text-xs truncate" title={caseRecord.id}>{caseRecord.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Context Card */}
          <Card className="border border-border/80 shadow-sm flex flex-col">
            <CardHeader className="border-b bg-muted/20 px-6 py-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Database className="size-4 text-primary" />
                Payment & Order Context
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-sm flex-1">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Razorpay Payment ID</p>
                <p className="font-mono text-xs font-bold text-foreground bg-muted/40 p-2 rounded-md border">
                  {caseRecord.payment?.razorpayPaymentId ?? "Not available"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Razorpay Order ID</p>
                <p className="font-mono text-xs font-bold text-foreground bg-muted/40 p-2 rounded-md border">
                  {caseRecord.order?.razorpayOrderId ?? "Not available"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</p>
                  {caseRecord.payment?.method ? (
                    <Badge variant="outline" className="font-mono text-xs mt-1 capitalize">
                      {caseRecord.payment.method.toLowerCase()}
                    </Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">Not available</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Retry Attempts</p>
                  <p className="font-mono text-xs font-bold mt-1 tabular-nums">
                    {caseRecord.payment?.retryCount ?? 0}
                  </p>
                </div>
              </div>

              {caseRecord.payment?.failureCode ? (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-1">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">
                    Failure reason: {caseRecord.payment.failureDescription ?? "Gateway failure recorded."}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-mono">
                    Code: {caseRecord.payment.failureCode}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Investigation Summary */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="border-b bg-muted/20 px-6 py-4">
             <CardTitle className="text-base font-bold flex items-center gap-2">
                <Search className="size-4 text-blue-500" />
                Investigation Summary
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
             <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What Happened</p>
                <p className="text-sm text-foreground">{whatHappened}</p>
             </div>
             <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Why It Matters</p>
                <p className="text-sm text-foreground">{whyItMatters}</p>
             </div>
             <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What SettleIQ Found</p>
                <ul className="text-sm text-foreground list-disc pl-4 space-y-1">
                  {found.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
             </div>
             <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Next Step</p>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-start gap-1">
                  <ArrowRight className="size-4 mt-0.5 shrink-0" />
                  <span>{nextStep}</span>
                </p>
             </div>
          </CardContent>
        </Card>

        {/* Evidence Table */}
        <Card className="border border-border/80 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/20 px-6 py-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              Evidence Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {evidence.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider">Signal Label</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider">Source</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider">Observed Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evidence.map((item, index) => {
                    const evidenceItem = item as Record<string, unknown>;
                    return (
                      <TableRow key={String(evidenceItem.id ?? `evidence-${index}`)}>
                        <TableCell className="font-medium text-xs">{String(evidenceItem.label ?? "Signal")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {String(evidenceItem.source ?? "unknown")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-foreground">{String(evidenceItem.value ?? "")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="p-6 text-xs text-muted-foreground">No evidence signals identified.</p>
            )}
          </CardContent>
        </Card>

        {/* AI Diagnosis, Policy Decision & Execution Triad */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Card 1: Diagnosis */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="border-b bg-muted/20 px-5 py-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="size-4 text-blue-500" />
                Diagnosis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              {recommendation || analysis ? (
                <>
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {String(analysis?.diagnosis ?? recommendation?.diagnosis ?? caseRecord.description ?? "No diagnosis available")}
                  </p>
                  <div className="flex items-center justify-between border-t pt-2 text-muted-foreground">
                    <span>Confidence:</span>
                    <Badge variant="outline" className="font-mono font-semibold">
                      {String(analysis?.confidence ?? recommendation?.confidence ?? "High")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Analysis mode:</span>
                    <span className="font-mono font-medium text-foreground">{String(analysis?.mode ?? "Autonomous")}</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    Investigation completed
                  </p>
                  <div className="flex items-center justify-between border-t pt-2 text-muted-foreground">
                    <span>Confidence:</span>
                    <Badge variant="outline" className="font-mono font-semibold">
                      High
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Analysis mode:</span>
                    <span className="font-mono font-medium text-foreground">Reconciliation investigation</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Policy Decision */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="border-b bg-muted/20 px-5 py-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="size-4 text-indigo-500" />
                Policy Decision
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              {isReconciliation && !policyDecision ? (
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Policy Status</p>
                  <p className="text-sm font-bold text-foreground">Not applicable</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This case is a reconciliation investigation and does not require a recovery execution decision.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-muted-foreground uppercase font-bold text-[10px]">Decision</p>
                    <p className="text-sm font-bold text-foreground">
                      {String(policyDecision?.decision ?? "No decision recorded")}
                    </p>
                  </div>
                  <div className="space-y-1 border-t pt-2">
                    <p className="text-muted-foreground uppercase font-bold text-[10px]">Stopping Condition</p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {String(policyDecision?.stoppingReason ?? caseRecord.stoppingReason ?? "No active stopping conditions")}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Execution Engine */}
          <Card className={caseRecord.status === "PENDING_APPROVAL" ? "border border-amber-500/50 shadow-sm bg-amber-500/5" : "border border-border/80 shadow-sm"}>
            <CardHeader className="border-b bg-muted/20 px-5 py-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Database className={caseRecord.status === "PENDING_APPROVAL" ? "size-4 text-amber-500" : "size-4 text-purple-500"} />
                {caseRecord.status === "PENDING_APPROVAL" ? "Awaiting Human Approval" : "Execution"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              {caseRecord.status === "PENDING_APPROVAL" ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Execution is paused until an authorized operator approves the recommended recovery action.</p>
                </div>
              ) : isReconciliation && !executionResult ? (
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Status</p>
                  <p className="text-sm font-bold text-foreground">Not applicable</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recovery execution has not been initiated for this investigation.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">Status:</span>
                    <Badge variant="outline" className="font-mono font-semibold">
                      {String(executionResult?.status ?? "NOT_ATTEMPTED")}
                    </Badge>
                  </div>
                  <div className="space-y-1 border-t pt-2">
                    <p className="text-muted-foreground uppercase font-bold text-[10px]">Summary</p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {String(executionResult?.summary ?? "No execution attempt recorded yet.")}
                    </p>
                  </div>
                  {executionResult?.recoveredAmountPaise ? (
                     <div className="space-y-1 border-t pt-2">
                        <p className="text-muted-foreground uppercase font-bold text-[10px]">Recovered Amount</p>
                        <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                           {formatCurrency(Number(executionResult.recoveredAmountPaise), caseRecord.currency || "INR")}
                        </p>
                     </div>
                  ) : null}
                  {executionResult?.externalReference ? (
                     <div className="space-y-1 border-t pt-2">
                        <p className="text-muted-foreground uppercase font-bold text-[10px]">External Reference</p>
                        <p className="text-xs font-mono text-muted-foreground">
                           {String(executionResult.externalReference)}
                        </p>
                     </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recommendation Payload & Audit Trail Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recommendation & Strategy Card */}
          <Card className="border border-border/80 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="border-b bg-muted/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  {isReconciliation && !recommendation ? "Resolution Guidance" : "AI Recommendation & Strategy"}
                </CardTitle>
                {recRiskLevel ? (
                  <Badge variant="outline" className="font-mono text-[10px] uppercase font-semibold">
                    Risk: {recRiskLevel}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5 flex-1">
              {recommendation ? (
                <>
                  {/* Strategy Summary */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Strategy Summary</p>
                    <p className="text-sm font-medium text-foreground leading-relaxed bg-muted/30 p-3.5 rounded-lg border border-border/60">
                      {recSummary}
                    </p>
                  </div>

                  {/* Recommended Intervention */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-xs">
                          {recInterventionType === "HEURISTIC_FALLBACK" ? "AI Diagnosis" : recInterventionType.replace(/_/g, " ")}
                        </Badge>
                        {recIntervention?.requiresApproval ? (
                          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[10px]">
                            Approval Required
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
                            Auto-Executable
                          </Badge>
                        )}
                      </div>
                      {recExpectedPaise > 0 ? (
                        <span className="font-mono font-bold text-xs text-foreground">
                          Est. Recovery: {formatCurrency(recExpectedPaise)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {recInterventionSummary}
                    </p>
                  </div>

                  {/* Policy Decision Summary */}
                  <div className="grid gap-3 sm:grid-cols-2 rounded-lg border border-border/70 p-3.5 text-xs bg-card">
                    <div>
                      <p className="font-bold text-[10px] uppercase text-muted-foreground">Policy Decision</p>
                      <p className="font-bold text-foreground mt-0.5">
                        {String(policyDecision?.decision ?? "APPROVED")}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-[10px] uppercase text-muted-foreground">Stopping Condition</p>
                      <p className="text-muted-foreground mt-0.5 truncate">
                        {String(policyDecision?.stoppingReason ?? recommendation?.stoppingReason ?? caseRecord.stoppingReason ?? "None")}
                      </p>
                    </div>
                  </div>

                  {/* Evidence Signals */}
                  {recEvidence.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Key Evidence Signals</p>
                      <div className="space-y-1.5">
                        {recEvidence.map((ev, idx) => (
                          <div key={String(ev.id ?? `rec-ev-${idx}`)} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{String(ev.label ?? "Signal")}</span>
                              <Badge variant="outline" className="font-mono text-[9px] uppercase">
                                {String(ev.source ?? "system")}
                              </Badge>
                            </div>
                            <span className="font-mono text-xs font-medium text-foreground">{String(ev.value ?? "")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : isReconciliation ? (
                <div className="space-y-3">
                   <p className="text-sm font-bold text-foreground bg-muted/30 p-3.5 rounded-lg border border-border/60">
                      {nextStep}
                   </p>
                   <p className="text-sm text-muted-foreground bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                      <span className="font-bold text-blue-700 dark:text-blue-400 block mb-1">Reason:</span>
                      {resolutionGuidance}
                   </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No recommendation payload recorded for this case.</p>
              )}
            </CardContent>
          </Card>

          {/* Audit Trail Timeline */}
          <Card className="border border-border/80 shadow-sm flex flex-col">
            <CardHeader className="border-b bg-muted/20 px-6 py-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                {caseRecord.agentRuns.length === 0 ? "Investigation Timeline" : "Audit Trail Timeline"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[420px]">
              {caseRecord.agentRuns.length === 0 ? (
                <div className="relative pl-6 border-l-2 border-primary/20 space-y-6 pb-4 pt-2">
                  {[
                    "Case detected",
                    "Evidence evaluated",
                    "Reconciliation exception identified",
                    "Recovery execution not applicable"
                  ].map((step, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-background bg-primary" />
                      <p className="font-medium text-sm text-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              ) : (
                caseRecord.agentRuns.map((run) => (
                  <div key={run.id} className="relative pl-6 border-l-2 border-primary/20 space-y-2 pb-4 last:pb-0">
                    <span className="absolute -left-[5px] top-1 size-2 rounded-full bg-primary" />
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wider text-foreground">{run.agentType}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {run.status}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {run.steps.map((step) => (
                        <div key={step.id} className="rounded-md border bg-muted/20 p-2.5 space-y-1">
                          <p className="font-semibold text-xs text-primary">{step.stepType}</p>
                          <p className="text-xs text-muted-foreground leading-snug">
                            {step.content?.includes("Execution skipped because policy did not approve automated action")
                              ? "Automatic recovery stopped — human approval required."
                              : step.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agent Activity Timeline */}
        {caseRecord.agentRuns.length > 0 ? (
          <AgentActivityTimeline
            agentRuns={caseRecord.agentRuns as Parameters<typeof AgentActivityTimeline>[0]["agentRuns"]}
            caseCreatedAt={caseRecord.createdAt}
            caseStatus={caseRecord.status}
          />
        ) : (
          <Card className="border border-border/80 shadow-sm">
             <CardHeader className="border-b bg-muted/20 px-6 py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                   <Terminal className="size-4 text-primary" />
                   Agent Activity
                </CardTitle>
             </CardHeader>
             <CardContent className="p-6">
                <div className="bg-muted/30 p-4 rounded-lg border border-border/50 max-w-2xl">
                   <p className="text-sm font-semibold text-foreground mb-1">No recovery agent execution was required for this case.</p>
                   <p className="text-sm text-muted-foreground">This case was identified as a reconciliation exception and is currently handled as an investigation rather than an automated recovery workflow.</p>
                </div>
             </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
