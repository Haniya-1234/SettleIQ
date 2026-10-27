"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";
import type { PaymentItem } from "@/lib/payments/payment-service";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PaymentMonitorProps {
  initialPayments: PaymentItem[];
}

type StatusFilter = "ALL" | "SUCCESSFUL" | "PENDING" | "FAILED" | "REFUNDED";

function formatCurrency(paise: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getStatusBadge(status: string) {
  switch (status.toUpperCase()) {
    case "CAPTURED":
    case "AUTHORIZED":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] tracking-wide inline-flex items-center gap-1"
        >
          <CheckCircle2 className="size-3" />
          {status}
        </Badge>
      );
    case "CREATED":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[11px] tracking-wide inline-flex items-center gap-1"
        >
          <Clock className="size-3" />
          PENDING
        </Badge>
      );
    case "FAILED":
      return (
        <Badge
          variant="destructive"
          className="font-semibold text-[11px] tracking-wide inline-flex items-center gap-1"
        >
          <XCircle className="size-3" />
          FAILED
        </Badge>
      );
    case "REFUNDED":
      return (
        <Badge
          variant="outline"
          className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold text-[11px] tracking-wide inline-flex items-center gap-1"
        >
          REFUNDED
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[11px] font-medium tracking-wide">
          {status}
        </Badge>
      );
  }
}

export function PaymentMonitor({ initialPayments }: PaymentMonitorProps) {
  const [payments, setPayments] = useState<PaymentItem[]>(initialPayments);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const isInitialMount = useRef(true);

  // Derived Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = payments.length;
    let totalVolumePaise = 0;
    let successfulCount = 0;
    let successfulVolumePaise = 0;
    let pendingCount = 0;
    let pendingVolumePaise = 0;
    let failedCount = 0;
    let failedVolumePaise = 0;
    let refundedCount = 0;
    let refundedVolumePaise = 0;

    for (const p of payments) {
      totalVolumePaise += p.amount;
      if (p.status === "CAPTURED" || p.status === "AUTHORIZED") {
        successfulCount++;
        successfulVolumePaise += p.amount;
      } else if (p.status === "CREATED") {
        pendingCount++;
        pendingVolumePaise += p.amount;
      } else if (p.status === "FAILED") {
        failedCount++;
        failedVolumePaise += p.amount;
      } else if (p.status === "REFUNDED") {
        refundedCount++;
        refundedVolumePaise += p.amount;
      }
    }

    return {
      totalCount,
      totalVolumePaise,
      successfulCount,
      successfulVolumePaise,
      pendingCount,
      pendingVolumePaise,
      failedCount,
      failedVolumePaise,
      refundedCount,
      refundedVolumePaise,
    };
  }, [payments]);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return payments.filter((p) => {
      // 1. Status Filter
      if (statusFilter === "SUCCESSFUL") {
        if (p.status !== "CAPTURED" && p.status !== "AUTHORIZED") return false;
      } else if (statusFilter === "PENDING") {
        if (p.status !== "CREATED") return false;
      } else if (statusFilter === "FAILED") {
        if (p.status !== "FAILED") return false;
      } else if (statusFilter === "REFUNDED") {
        if (p.status !== "REFUNDED") return false;
      }

      // 2. Search Query Filter
      if (!query) return true;

      const paymentIdMatch = p.razorpayPaymentId.toLowerCase().includes(query);
      const orderIdMatch = p.razorpayOrderId?.toLowerCase().includes(query) ?? false;
      const emailMatch = p.email?.toLowerCase().includes(query) ?? false;
      const contactMatch = p.contact?.toLowerCase().includes(query) ?? false;
      const methodMatch = p.method?.toLowerCase().includes(query) ?? false;
      const failureMatch =
        (p.failureCode?.toLowerCase().includes(query) ?? false) ||
        (p.failureDescription?.toLowerCase().includes(query) ?? false);

      return (
        paymentIdMatch ||
        orderIdMatch ||
        emailMatch ||
        contactMatch ||
        methodMatch ||
        failureMatch
      );
    });
  }, [payments, searchQuery, statusFilter]);

  // Debounced screen reader announcement on search or filter changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const count = filteredPayments.length;
      if (count === 0) {
        setLiveAnnouncement("No transactions match your search or filter.");
      } else if (count === 1) {
        setLiveAnnouncement("1 transaction found.");
      } else {
        setLiveAnnouncement(`${count} transactions found.`);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, filteredPayments.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch("/api/payments");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.payments)) {
        setPayments(data.payments);
      } else {
        throw new Error(data.error || "Failed to load payments");
      }
    } catch (err) {
      console.error("Refresh error:", err);
      setRefreshError("Failed to refresh live payments. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Visually hidden live region for search/filter announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveAnnouncement}
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Payments */}
        <Card className="border border-border/70 shadow-xs hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Processed
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight tabular-nums">
              {metrics.totalCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Volume: {formatCurrency(metrics.totalVolumePaise)}
            </p>
          </CardContent>
        </Card>

        {/* Successful Payments */}
        <Card className="border border-emerald-500/20 bg-emerald-500/5 shadow-xs hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Successful
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400 tabular-nums">
              {metrics.successfulCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Volume: {formatCurrency(metrics.successfulVolumePaise)}
            </p>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="border border-amber-500/20 bg-amber-500/5 shadow-xs hover:border-amber-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              Pending Authorization
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-amber-700 dark:text-amber-400 tabular-nums">
              {metrics.pendingCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Volume: {formatCurrency(metrics.pendingVolumePaise)}
            </p>
          </CardContent>
        </Card>

        {/* Failed Payments */}
        <Card className="border border-red-500/20 bg-red-500/5 shadow-xs hover:border-red-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-400">
              Failed / At Risk
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <ShieldAlert className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-red-700 dark:text-red-400 tabular-nums">
              {metrics.failedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Volume: {formatCurrency(metrics.failedVolumePaise)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Search, Filter Toolbar & Actions ── */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base font-bold">
                <h2 className="text-base font-bold text-inherit leading-none">Transaction Feed</h2>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Real-time stream of incoming customer payments, authorizations, and gateway responses.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="Refresh transaction data"
                className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
              >
                <RefreshCw
                  className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {refreshError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400 font-medium"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{refreshError}</span>
            </div>
          )}

          {/* Filters Row */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Payment ID, Order ID, contact..."
                aria-label="Search transactions"
                className="pl-8 pr-8 h-9 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search query"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div
              role="group"
              aria-label="Filter transactions by status"
              className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-muted/50 border border-border/40"
            >
              <Button
                aria-pressed={statusFilter === "ALL"}
                variant={statusFilter === "ALL" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("ALL")}
                className="h-7 text-xs px-2.5 rounded-md font-medium cursor-pointer"
              >
                All ({metrics.totalCount})
              </Button>
              <Button
                aria-pressed={statusFilter === "SUCCESSFUL"}
                variant={statusFilter === "SUCCESSFUL" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("SUCCESSFUL")}
                className="h-7 text-xs px-2.5 rounded-md font-medium cursor-pointer"
              >
                Successful ({metrics.successfulCount})
              </Button>
              <Button
                aria-pressed={statusFilter === "PENDING"}
                variant={statusFilter === "PENDING" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("PENDING")}
                className="h-7 text-xs px-2.5 rounded-md font-medium cursor-pointer"
              >
                Pending ({metrics.pendingCount})
              </Button>
              <Button
                aria-pressed={statusFilter === "FAILED"}
                variant={statusFilter === "FAILED" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("FAILED")}
                className="h-7 text-xs px-2.5 rounded-md font-medium cursor-pointer"
              >
                Failed ({metrics.failedCount})
              </Button>
              {metrics.refundedCount > 0 && (
                <Button
                  aria-pressed={statusFilter === "REFUNDED"}
                  variant={statusFilter === "REFUNDED" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("REFUNDED")}
                  className="h-7 text-xs px-2.5 rounded-md font-medium cursor-pointer"
                >
                  Refunded ({metrics.refundedCount})
                </Button>
              )}
            </div>
          </div>

          {/* ── Transactions Table ── */}
          <div className="rounded-lg border border-border/70 overflow-hidden">
            <Table>
              <TableCaption className="sr-only">
                Payment Transactions
              </TableCaption>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5">
                    Payment ID / Order
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider">
                    Customer / Contact
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider">
                    Method
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider">
                    Issue Details
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider">
                    Amount
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider">
                    Timestamp
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredPayments.map((p) => {
                  const isFailed = p.status === "FAILED";
                  return (
                    <TableRow
                      key={p.id}
                      className={`transition-colors group ${
                        isFailed
                          ? "bg-red-500/5 hover:bg-red-500/10"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      {/* Payment ID & Order */}
                      <TableCell className="py-3 font-medium">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs font-semibold text-foreground tracking-tight">
                            {p.razorpayPaymentId}
                          </span>
                          {p.razorpayOrderId ? (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              Order: {p.razorpayOrderId}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60 italic">
                              Direct Charge
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Customer Info */}
                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-0.5 max-w-[180px]">
                          <span className="truncate font-medium text-foreground">
                            {p.email ?? "—"}
                          </span>
                          {p.contact && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {p.contact}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Payment Method */}
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] uppercase tracking-wider"
                        >
                          {p.method ?? "GATEWAY"}
                        </Badge>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>{getStatusBadge(p.status)}</TableCell>

                      {/* Failure / Issue Details */}
                      <TableCell className="text-xs max-w-[220px]">
                        {isFailed ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-red-600 dark:text-red-400 text-[11px]">
                              {p.failureCode ?? "Transaction Failed"}
                            </span>
                            {p.failureDescription && (
                              <span
                                className="truncate text-[10px] text-muted-foreground"
                                title={p.failureDescription}
                              >
                                {p.failureDescription}
                              </span>
                            )}
                            {p.retryCount > 0 && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">
                                Retries: {p.retryCount}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="text-right font-mono font-bold text-sm tabular-nums text-foreground">
                        {formatCurrency(p.amount, p.currency)}
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(p.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-8 text-center">
                      {searchQuery || statusFilter !== "ALL" ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-4">
                          <Filter className="size-8 text-muted-foreground/50" />
                          <p className="text-sm font-semibold">
                            No transactions match your current filters
                          </p>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            Try adjusting your search query or reset status filters to view all recorded payments.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchQuery("");
                              setStatusFilter("ALL");
                            }}
                            className="mt-2 text-xs cursor-pointer"
                          >
                            Reset Filters
                          </Button>
                        </div>
                      ) : (
                        <EmptyState
                          icon={CreditCard}
                          title="No transactions recorded yet"
                          description="Run reconciliation on the synthetic dataset or sync your live Razorpay gateway to start monitoring transactions in real-time."
                          action={
                            <Button
                              size="sm"
                              render={<Link href="/reconciliation" />}
                              className="gap-1.5 cursor-pointer"
                            >
                              Run Reconciliation
                              <ArrowUpRight className="size-4" />
                            </Button>
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer Count Summary */}
          {filteredPayments.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pt-1">
              <span>
                Showing {filteredPayments.length} of {payments.length} transactions
              </span>
              {searchQuery && (
                <span>
                  Filtered by: &ldquo;<strong className="text-foreground">{searchQuery}</strong>&rdquo;
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
