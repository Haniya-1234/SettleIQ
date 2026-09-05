import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle2,
  CircleDashed,
  Clock,
  Cpu,
  FileSearch,
  GitBranch,
  ShieldCheck,
  UserCheck,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentRun, AgentStep } from "@settleiq/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepWithMeta = AgentStep & {
  toolInvocations?: Array<{
    id: string;
    toolName: string;
    error?: string | null;
  }>;
};

type RunWithSteps = AgentRun & {
  steps: StepWithMeta[];
  toolInvocations: Array<{
    id: string;
    toolName: string;
    error?: string | null;
  }>;
};

// ---------------------------------------------------------------------------
// Phase map
// ---------------------------------------------------------------------------

interface Phase {
  id: string;
  label: string;
  icon: React.ReactNode;
  stepTypes: string[];
  agentTypes?: string[];
  color: string;
  dotColor: string;
}

const PHASES: Phase[] = [
  {
    id: "detection",
    label: "Case Detected",
    icon: <AlertCircle className="size-4" />,
    stepTypes: ["detection", "case_creation", "scan"],
    agentTypes: ["ORCHESTRATOR"],
    color: "text-amber-600 dark:text-amber-400",
    dotColor: "bg-amber-500",
  },
  {
    id: "evidence",
    label: "Evidence Collected",
    icon: <FileSearch className="size-4" />,
    stepTypes: [
      "evidence_collection",
      "evidence",
      "data_collection",
      "fetch",
    ],
    color: "text-blue-600 dark:text-blue-400",
    dotColor: "bg-blue-500",
  },
  {
    id: "diagnosis",
    label: "AI Diagnosis",
    icon: <Cpu className="size-4" />,
    stepTypes: [
      "diagnosis",
      "analysis",
      "ai_analysis",
      "heuristic_analysis",
    ],
    agentTypes: ["INVESTIGATION"],
    color: "text-violet-600 dark:text-violet-400",
    dotColor: "bg-violet-500",
  },
  {
    id: "strategy",
    label: "Strategy Selected",
    icon: <GitBranch className="size-4" />,
    stepTypes: [
      "strategy",
      "recommendation",
      "strategy_selection",
      "intervention_selection",
    ],
    color: "text-indigo-600 dark:text-indigo-400",
    dotColor: "bg-indigo-500",
  },
  {
    id: "policy",
    label: "Policy Evaluated",
    icon: <ShieldCheck className="size-4" />,
    stepTypes: [
      "policy_check",
      "policy_decision",
      "policy_evaluation",
      "policy",
    ],
    color: "text-cyan-600 dark:text-cyan-400",
    dotColor: "bg-cyan-500",
  },
  {
    id: "approval",
    label: "Human Approval",
    icon: <UserCheck className="size-4" />,
    stepTypes: ["human_approval", "approval_request", "approval"],
    agentTypes: ["RESOLUTION"],
    color: "text-orange-600 dark:text-orange-400",
    dotColor: "bg-orange-500",
  },
  {
    id: "execution",
    label: "Recovery Execution",
    icon: <Zap className="size-4" />,
    stepTypes: [
      "execution",
      "recovery_execution",
      "tool_call",
      "executor",
    ],
    color: "text-rose-600 dark:text-rose-400",
    dotColor: "bg-rose-500",
  },
  {
    id: "resolution",
    label: "Final Resolution",
    icon: <CheckCircle2 className="size-4" />,
    stepTypes: ["resolution", "complete", "completed", "result", "summary"],
    color: "text-emerald-600 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findPhaseForStep(stepType: string): Phase | undefined {
  const lower = stepType.toLowerCase();
  return PHASES.find((phase) =>
    phase.stepTypes.some(
      (t) => lower === t || lower.includes(t) || t.includes(lower),
    ),
  );
}

function findPhaseForAgentType(agentType: string): Phase | undefined {
  return PHASES.find((phase) => phase.agentTypes?.includes(agentType));
}

function formatTimestamp(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
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
      return "border-muted bg-muted/30 text-muted-foreground";
  }
}

function RunIcon({
  agentType,
  status,
}: {
  agentType: string;
  status: string;
}) {
  if (status === "FAILED")
    return <AlertCircle className="size-3.5 text-red-500" />;
  if (status === "RUNNING")
    return <Clock className="size-3.5 text-blue-500 animate-pulse" />;
  if (agentType === "ORCHESTRATOR")
    return <Bot className="size-3.5 text-primary" />;
  if (agentType === "RESOLUTION")
    return <UserCheck className="size-3.5 text-orange-500" />;
  return <Activity className="size-3.5 text-muted-foreground" />;
}

// ---------------------------------------------------------------------------
// Step row in the per-run timeline
// ---------------------------------------------------------------------------

interface TimelineEventProps {
  step: StepWithMeta;
  phase: Phase | undefined;
  isLast: boolean;
  caseStatus: string;
}

function getNaturalStepContent(content: string | null | undefined): string {
  if (!content) return "";
  
  // Replace the conflicting historical status message with a more accurate historical fact
  if (content.includes("Execution skipped because policy did not approve automated action")) {
    return "Automatic recovery stopped — human approval required.";
  }
  
  return content;
}

function getNaturalStepLabel(stepType: string, phaseLabel?: string): string {
  const type = stepType.toLowerCase();
  if (type.includes("detection") || type.includes("scan")) return "Payment risk detected";
  if (type.includes("diagnosis") || type.includes("analysis") || type.includes("heuristic")) return "AI diagnosed failure";
  if (type.includes("strategy") || type.includes("recommendation")) return "Recovery strategy selected";
  if (type.includes("policy")) return "Policy stopped automatic execution";
  if (type.includes("approval") || type.includes("human")) return "Awaiting human approval";
  if (type.includes("evidence") || type.includes("fetch") || type.includes("data")) return "Evidence collected";
  if (type.includes("execution") || type.includes("tool")) return "Recovery executed";
  if (type.includes("resolution") || type.includes("complete")) return "Case resolved";
  return phaseLabel ?? stepType.replace(/_/g, " ");
}

function TimelineEvent({ step, phase, isLast, caseStatus }: TimelineEventProps) {
  const label = getNaturalStepLabel(step.stepType, phase?.label);
  const displayContent = getNaturalStepContent(step.content);
  const dotColor = phase?.dotColor ?? "bg-muted-foreground/50";
  const textColor = phase?.color ?? "text-muted-foreground";
  const icon = phase?.icon ?? <CircleDashed className="size-4" />;

  return (
    <div className={`relative flex gap-4 ${isLast ? "" : "pb-5"}`}>
      {!isLast && (
        <span className="absolute left-[11px] top-7 bottom-0 w-px bg-border/70" />
      )}

      {/* Dot */}
      <div className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-background bg-background shadow-sm">
        <span className={`size-2.5 rounded-full ${dotColor}`} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`flex items-center gap-1.5 text-xs font-bold ${textColor}`}
          >
            {icon}
            {label}
          </span>
          <Badge
            variant="outline"
            className="font-mono text-[10px] uppercase px-1.5 py-0"
          >
            {step.stepType}
          </Badge>
        </div>

        {displayContent && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {displayContent}
          </p>
        )}

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 pt-0.5">
          <span className="font-mono">Step #{step.stepNumber}</span>
          {step.createdAt && (
            <span suppressHydrationWarning>
              {formatTimestamp(step.createdAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export interface AgentActivityTimelineProps {
  agentRuns: RunWithSteps[];
  caseCreatedAt: Date;
  caseStatus: string;
}

export function AgentActivityTimeline({
  agentRuns,
  caseCreatedAt,
  caseStatus,
}: AgentActivityTimelineProps) {
  if (agentRuns.length === 0) {
    return (
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b bg-muted/20 px-6 py-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            Agent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <CircleDashed className="size-10 opacity-30" />
            <p className="text-sm font-medium">No agent runs recorded yet</p>
            <p className="text-xs opacity-60">
              Agent activity will appear here after the recovery workflow
              executes.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compute which phases are "hit" from actual data
  const hitPhaseIds = new Set<string>();
  hitPhaseIds.add("detection"); // case exists, so detection always happened
  agentRuns.forEach((run) => {
    const rp = findPhaseForAgentType(run.agentType);
    if (rp) hitPhaseIds.add(rp.id);
    run.steps.forEach((step) => {
      const sp = findPhaseForStep(step.stepType);
      if (sp) hitPhaseIds.add(sp.id);
    });
  });
  if (["RECOVERED", "RESOLVED", "CLOSED"].includes(caseStatus.toUpperCase())) {
    ["detection", "evidence", "diagnosis", "strategy", "policy", "approval", "execution", "resolution"].forEach(p => hitPhaseIds.add(p));
  } else if (caseStatus.toUpperCase() === "FAILED") {
    ["detection", "evidence", "diagnosis", "strategy", "policy", "execution", "resolution"].forEach(p => hitPhaseIds.add(p));
  }

  const totalRuns = agentRuns.length;
  const completedRuns = agentRuns.filter((r) => r.status === "COMPLETED").length;
  const failedRuns = agentRuns.filter((r) => r.status === "FAILED").length;

  return (
    <Card className="border border-border/80 shadow-sm overflow-hidden">
      <CardHeader className="border-b bg-muted/20 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            Agent Activity
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">
              {totalRuns} run{totalRuns !== 1 ? "s" : ""}
            </span>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {completedRuns} completed
            </span>
            {failedRuns > 0 && (
              <>
                <span>·</span>
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  {failedRuns} failed
                </span>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {/* ── Phase Progress Strip ── */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Workflow Phases
          </p>
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {PHASES.map((phase, idx) => {
              const isHit = hitPhaseIds.has(phase.id);
              const isLast = idx === PHASES.length - 1;
              const isCurrent = caseStatus === "PENDING_APPROVAL" && phase.id === "approval";
              const effectivelyHit = isHit || (["detection", "evidence", "diagnosis", "strategy", "policy"].includes(phase.id) && caseStatus === "PENDING_APPROVAL");

              return (
                <div key={phase.id} className="flex items-start shrink-0">
                  <div className="flex flex-col items-center gap-1.5 px-1 w-[82px]">
                    <div
                      className={`size-9 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCurrent
                          ? "border-orange-500 bg-orange-500/20 text-orange-600 animate-pulse"
                          : effectivelyHit
                          ? `${phase.dotColor} border-transparent text-white shadow-sm`
                          : "border-border/50 bg-muted/30 text-muted-foreground/40"
                      }`}
                    >
                      {phase.icon}
                    </div>
                    <span
                      className={`text-center leading-tight text-[10px] font-semibold ${
                        isCurrent
                          ? "text-orange-600 dark:text-orange-400"
                          : effectivelyHit
                          ? phase.color
                          : "text-muted-foreground/40"
                      }`}
                    >
                      {phase.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`w-4 h-px mt-[18px] shrink-0 ${
                        effectivelyHit ? "bg-primary/40" : "bg-border/50"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Per-Run Timelines ── */}
        <div className="space-y-5">
          {agentRuns.map((run, runIdx) => (
            <div
              key={run.id}
              className="rounded-xl border border-border/60 overflow-hidden"
            >
              {/* Run header */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-full bg-background border border-border/60 flex items-center justify-center">
                    <RunIcon agentType={run.agentType} status={run.status} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground">
                        Run #{runIdx + 1}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] uppercase px-1.5 py-0"
                      >
                        {run.agentType}
                      </Badge>
                    </div>
                    {run.startedAt && (
                      <p
                        className="text-[10px] text-muted-foreground font-mono mt-0.5"
                        suppressHydrationWarning
                      >
                        Started {formatTimestamp(run.startedAt)}
                        {run.completedAt && (
                          <> · Finished {formatTimestamp(run.completedAt)}</>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] uppercase ${getRunStatusClasses(run.status)}`}
                >
                  {run.status}
                </Badge>
              </div>

              {/* Steps */}
              <div className="p-4 pt-5">
                {run.steps.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-10">
                    No steps recorded for this run.
                  </p>
                ) : (
                  <div className="space-y-0">
                    {run.steps.map((step, stepIdx) => (
                      <TimelineEvent
                        key={step.id}
                        step={step}
                        phase={findPhaseForStep(step.stepType)}
                        isLast={stepIdx === run.steps.length - 1}
                        caseStatus={caseStatus}
                      />
                    ))}
                  </div>
                )}

                {/* Tool invocations */}
                {run.toolInvocations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Tool Invocations
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {run.toolInvocations.map((inv) => (
                        <Badge
                          key={inv.id}
                          variant="outline"
                          className={`font-mono text-[10px] gap-1 ${
                            inv.error
                              ? "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400"
                              : "border-primary/20 bg-primary/5 text-primary"
                          }`}
                        >
                          {inv.error ? (
                            <AlertCircle className="size-2.5" />
                          ) : (
                            <CheckCircle2 className="size-2.5" />
                          )}
                          {inv.toolName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Anchor: Case opened ── */}
        <div className="flex items-center gap-3 pt-1 border-t border-border/50">
          <div className="size-6 rounded-full bg-muted/60 border border-border flex items-center justify-center">
            <span className="size-2 rounded-full bg-muted-foreground/40" />
          </div>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            <span className="font-semibold text-foreground">Case opened</span>
            {" · "}
            {formatTimestamp(caseCreatedAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
