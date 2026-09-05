"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CaseApprovalActionProps {
  caseId: string;
  caseStatus: string;
}

export function CaseApprovalAction({ caseId, caseStatus }: CaseApprovalActionProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (caseStatus !== "PENDING_APPROVAL") {
    return null;
  }

  async function handleApprove() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to approve recovery action.");
      }

      setSuccess("Recovery action approved and executed successfully.");
      setShowConfirm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during approval.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!showConfirm ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
            onClick={() => setShowConfirm(true)}
          >
            <CheckCircle2 className="size-4" />
            Approve & Execute Recovery
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">Confirm Recovery Action Approval</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to approve this case? Re-checking policy and executing recovery action.
                </p>
              </div>
            </div>
            <button
              disabled={loading}
              onClick={() => setShowConfirm(false)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="size-4" />
            </button>
          </div>

          {error ? (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {success ? (
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{success}</span>
            </div>
          ) : null}

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
              onClick={handleApprove}
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Executing Recovery...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Confirm & Execute
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              className="text-xs"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
