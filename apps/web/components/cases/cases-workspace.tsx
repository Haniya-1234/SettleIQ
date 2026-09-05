"use client";

import Link from "next/link";
import { FolderOpen, GitCompareArrows } from "lucide-react";
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

export interface CaseRecord {
  id: string;
  caseNumber: number;
  type: string;
  severity: string;
  status: string;
  source?: string;
  title: string;
  description: string | null;
  amountAtRisk?: number | null;
  currency?: string | null;
  expectedValue: string | null;
  actualValue: string | null;
  difference: string | null;
  paymentIds: string[];
  createdAt: string | Date;
  payment?: {
    razorpayPaymentId: string;
    amount: number;
    currency: string;
    status: string;
  } | null;
  finding?: { id: string; type: string; runId: string } | null;
}

interface CasesWorkspaceProps {
  initialCases: CaseRecord[];
}

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
          className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[10px] tracking-wide"
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
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] tracking-wide"
        >
          {status}
        </Badge>
      );
    case "PENDING_APPROVAL":
    case "ACTION_PROPOSED":
      return (
        <Badge
          variant="outline"
          className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold text-[10px] tracking-wide"
        >
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

export function CasesWorkspace({ initialCases }: CasesWorkspaceProps) {
  if (initialCases.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No cases yet"
        description="Run reconciliation to seed demo payment data, convert reconciliation exceptions, and generate revenue recovery cases."
        action={
          <Button size="sm" render={<Link href="/reconciliation" />}>
            <GitCompareArrows className="size-4 mr-1.5" />
            Run Reconciliation
          </Button>
        }
      />
    );
  }

  const totalAmountAtRisk = initialCases.reduce(
    (sum, c) => sum + (c.amountAtRisk ?? c.payment?.amount ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Stat Ribbon */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Cases</p>
          <p className="text-2xl font-extrabold text-foreground tabular-nums">{initialCases.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Exposure</p>
          <p className="text-2xl font-extrabold text-foreground tabular-nums">{formatCurrency(totalAmountAtRisk)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Queue Status</p>
          <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            Active Investigation Queue
          </p>
        </div>
      </div>

      <Card className="shadow-sm border border-border/80 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 px-6 py-4">
          <div>
            <CardTitle className="text-base font-bold tracking-tight">Case Queue</CardTitle>
            <CardDescription className="text-xs">
              {initialCases.length} case{initialCases.length === 1 ? "" : "s"} across reconciliation & recovery workflows
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[320px] text-[11px] font-bold uppercase tracking-wider">Case Title & ID</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider">Type</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider">Source</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider">Severity</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider">Amount</TableHead>
                <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialCases.map((caseRecord) => (
                <TableRow key={caseRecord.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <Link
                      href={`/cases/${caseRecord.id}`}
                      className="flex items-center gap-2 group"
                    >
                      <span className="font-mono text-xs font-semibold text-muted-foreground group-hover:text-foreground">
                        #{caseRecord.caseNumber}
                      </span>
                      <span className="text-sm font-semibold group-hover:text-primary group-hover:underline transition-colors line-clamp-1">
                        {caseRecord.title}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] uppercase font-medium">
                      {caseRecord.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {caseRecord.source ?? "RECONCILIATION"}
                  </TableCell>
                  <TableCell>{getSeverityBadge(caseRecord.severity)}</TableCell>
                  <TableCell>{getStatusBadge(caseRecord.status)}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-sm tabular-nums">
                    {formatCurrency(
                      caseRecord.amountAtRisk ?? caseRecord.payment?.amount,
                      caseRecord.currency ?? caseRecord.payment?.currency ?? "INR",
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground" suppressHydrationWarning>
                    {new Date(caseRecord.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

