import {
  prisma,
  Prisma,
  type AgentRun,
  type Case,
  type CaseStatus,
  type Payment,
} from "@settleiq/db";
import {
  createDefaultMerchantPolicy,
  evaluateRecoveryPolicy,
  HeuristicRecoveryAnalysisProvider,
  runRecoveryWorkflow,
  SimulatedRecoveryExecutor,
  type RecoveryPaymentSnapshot,
} from "@settleiq/agents";
import {
  type RecoveryMetrics,
  type RecoveryRecommendation,
  type RecoveryPolicyDecision,
  type RecoveryExecutionResult,
  SYNTHETIC_DATASET,
} from "@settleiq/shared";
import { getNextCaseNumber } from "../org";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function paymentToSnapshot(payment: Payment & { order: { status: string } | null }): RecoveryPaymentSnapshot {
  return {
    id: payment.id,
    organizationId: payment.organizationId,
    razorpayPaymentId: payment.razorpayPaymentId,
    razorpayOrderId: payment.razorpayOrderId,
    amountPaise: payment.amount,
    currency: payment.currency,
    method: payment.method,
    email: payment.email,
    contact: payment.contact,
    retryCount: payment.retryCount,
    failureCode: payment.failureCode,
    failureDescription: payment.failureDescription,
    lastFailedAt: payment.lastFailedAt?.toISOString() ?? null,
    orderStatus: payment.order?.status ?? null,
    synthetic: Boolean((payment.metadata as Record<string, unknown> | null)?.synthetic),
    metadata: (payment.metadata as Record<string, unknown> | null) ?? null,
  };
}

function caseTitle(payment: Payment) {
  return `Revenue at risk - ${payment.razorpayPaymentId}`;
}

async function createAgentRun(
  payment: Payment,
  caseId: string,
): Promise<AgentRun> {
  return prisma.agentRun.create({
    data: {
      organizationId: payment.organizationId,
      caseId,
      agentType: "ORCHESTRATOR",
      status: "RUNNING",
      startedAt: new Date(),
      input: toJsonValue({
        paymentId: payment.id,
        razorpayPaymentId: payment.razorpayPaymentId,
        source: "revenue-recovery-scan",
      }),
    },
  });
}

async function persistWorkflowArtifacts(input: {
  agentRunId: string;
  recommendation: RecoveryRecommendation;
  policyDecision: RecoveryPolicyDecision;
  executionResult: RecoveryExecutionResult;
  steps: ReturnType<typeof runRecoveryWorkflow>["steps"];
}) {
  const { agentRunId, recommendation, policyDecision, executionResult, steps } = input;

  const createdSteps = await prisma.$transaction(
    steps.map((step, index) =>
      prisma.agentStep.create({
        data: {
          agentRunId,
          stepNumber: index + 1,
          stepType: step.stepType,
          content: step.content,
          metadata: step.metadata ? toJsonValue(step.metadata) : undefined,
        },
      }),
    ),
  );

  const executionStep = createdSteps.find((step) => step.stepType === "execution");
  if (executionStep) {
    await prisma.toolInvocation.create({
      data: {
        agentRunId,
        agentStepId: executionStep.id,
        toolName: executionResult.toolName ?? "simulated_recovery_executor",
        input: toJsonValue({
          interventionType: recommendation.recommendedIntervention.type,
          policyDecision: policyDecision.decision,
        }),
        output: toJsonValue(executionResult),
        error: executionResult.error ?? null,
      },
    });
  }

  await prisma.agentRun.update({
    where: { id: agentRunId },
    data: {
      status: executionResult.status === "SIMULATED_FAILURE" ? "FAILED" : "COMPLETED",
      completedAt: new Date(),
      output: toJsonValue({
        diagnosis: recommendation.diagnosis,
        confidence: recommendation.confidence,
        recommendedIntervention: recommendation.recommendedIntervention.type,
        policyDecision: policyDecision.decision,
        executionStatus: executionResult.status,
      }),
    },
  });
}

export async function runRecoveryScanForOrganization(organizationId: string) {
  const failedPayments = await prisma.payment.findMany({
    where: {
      organizationId,
      status: "FAILED",
    },
    include: {
      order: {
        select: { status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const policy = createDefaultMerchantPolicy();
  const processedCases: Case[] = [];

  for (const payment of failedPayments) {
    const existingCase = await prisma.case.findFirst({
      where: {
        organizationId,
        paymentId: payment.id,
      },
    });

    const currentCase =
      existingCase ??
      (await prisma.case.create({
        data: {
          organizationId,
          caseNumber: await getNextCaseNumber(organizationId),
          type: "FAILED_PAYMENT",
          severity: payment.amount >= 150_000 ? "HIGH" : "MEDIUM",
          status: "OPEN",
          source: "PAYMENT_FAILURE",
          title: caseTitle(payment),
          description:
            payment.failureDescription ??
            "Revenue at risk due to failed payment requiring bounded recovery review.",
          orderId: payment.orderId,
          paymentId: payment.id,
          paymentIds: [payment.razorpayPaymentId],
          amountAtRisk: payment.amount,
          currency: payment.currency,
          expectedValue: `Captured payment of ${payment.amount}`,
          actualValue: "Payment failed",
          difference: `${payment.amount}`,
          synthetic: Boolean(
            (payment.metadata as Record<string, unknown> | null)?.synthetic,
          ),
        },
      }));

    const workflow = runRecoveryWorkflow({
      payment: paymentToSnapshot(payment),
      policy,
    });

    const now = new Date();
    const updatedCase = await prisma.case.update({
      where: { id: currentCase.id },
      data: {
        status: workflow.caseStatus as CaseStatus,
        severity:
          workflow.diagnosis.riskLevel === "CRITICAL"
            ? "CRITICAL"
            : workflow.diagnosis.riskLevel === "HIGH"
              ? "HIGH"
              : workflow.diagnosis.riskLevel === "MEDIUM"
                ? "MEDIUM"
                : "LOW",
        description: workflow.diagnosis.summary,
        evidence: toJsonValue(workflow.diagnosis.evidence),
        analysis: toJsonValue({
          mode: workflow.diagnosis.analysisMode,
          diagnosis: workflow.diagnosis.diagnosis,
          confidence: workflow.diagnosis.confidence,
          summary: workflow.diagnosis.summary,
        }),
        recommendation: toJsonValue(workflow.diagnosis),
        policyDecision: toJsonValue(workflow.policyDecision),
        executionResult: toJsonValue(workflow.executionResult),
        resolution:
          workflow.executionResult.status === "SIMULATED_SUCCESS"
            ? toJsonValue({
                action: workflow.executionResult.interventionType,
                summary: workflow.executionResult.summary,
                razorpayReference: workflow.executionResult.externalReference,
              })
            : Prisma.JsonNull,
        requiresHumanApproval: workflow.requiresHumanApproval,
        stoppingReason: workflow.stoppingReason ?? null,
        lastAnalyzedAt: now,
        lastExecutedAt: workflow.executionResult.attemptedAt ? now : null,
        resolvedAt:
          workflow.caseStatus === "RECOVERED" ? now : null,
      },
    });

    const agentRun = await createAgentRun(payment, updatedCase.id);
    await persistWorkflowArtifacts({
      agentRunId: agentRun.id,
      recommendation: workflow.diagnosis,
      policyDecision: workflow.policyDecision,
      executionResult: workflow.executionResult,
      steps: workflow.steps,
    });

    processedCases.push(updatedCase);
  }

  return processedCases;
}

export async function getRecoveryMetrics(): Promise<RecoveryMetrics> {
  const cases = await prisma.case.findMany({
    where: {
      source: "PAYMENT_FAILURE",
    },
    select: {
      amountAtRisk: true,
      status: true,
      requiresHumanApproval: true,
      synthetic: true,
      executionResult: true,
    },
  });

  const totalRevenueAtRiskPaise = cases.reduce(
    (sum, caseRecord) => sum + (caseRecord.amountAtRisk ?? 0),
    0,
  );
  const totalRecoveredPaise = cases.reduce((sum, caseRecord) => {
    const executionResult = caseRecord.executionResult as
      | RecoveryExecutionResult
      | null;
    return sum + (executionResult?.recoveredAmountPaise ?? 0);
  }, 0);
  const recoveryAttempts = cases.filter((caseRecord) => {
    const executionResult = caseRecord.executionResult as
      | RecoveryExecutionResult
      | null;
    return executionResult?.status && executionResult.status !== "NOT_ATTEMPTED";
  }).length;
  const successfulRecoveries = cases.filter((caseRecord) => caseRecord.status === "RECOVERED").length;
  const failedRecoveries = cases.filter((caseRecord) => caseRecord.status === "FAILED").length;
  const openCases = cases.filter((caseRecord) =>
    ["OPEN", "ANALYZING", "ACTION_PROPOSED", "EXECUTING"].includes(caseRecord.status),
  ).length;
  const approvalQueue = cases.filter((caseRecord) => caseRecord.requiresHumanApproval).length;

  return {
    totalRevenueAtRiskPaise,
    totalRecoveredPaise,
    openCases,
    approvalQueue,
    failedRecoveries,
    successfulRecoveries,
    recoveryAttempts,
    recoveryRate:
      totalRevenueAtRiskPaise > 0
        ? Number(((totalRecoveredPaise / totalRevenueAtRiskPaise) * 100).toFixed(2))
        : 0,
    incrementalRecoveryPaise: totalRecoveredPaise,
    preventedLossPaise: totalRecoveredPaise,
    datasetLabel: SYNTHETIC_DATASET.label,
    dataMode: cases.some((caseRecord) => caseRecord.synthetic)
      ? "DEMO_SYNTHETIC"
      : "LIVE",
  };
}

export async function getCaseDetail(caseId: string) {
  return prisma.case.findUnique({
    where: { id: caseId },
    include: {
      order: true,
      payment: true,
      finding: true,
      agentRuns: {
        orderBy: { createdAt: "asc" },
        include: {
          steps: {
            orderBy: { stepNumber: "asc" },
          },
          toolInvocations: true,
        },
      },
    },
  });
}

export async function approveCase(caseId: string) {
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      payment: {
        include: {
          order: {
            select: { status: true },
          },
        },
      },
      order: true,
    },
  });

  if (!caseRecord) {
    return { error: "Case not found", status: 404 };
  }

  // Only PENDING_APPROVAL cases can be approved
  if (caseRecord.status !== "PENDING_APPROVAL") {
    return {
      error: `Cannot approve case in '${caseRecord.status}' status. Only PENDING_APPROVAL cases can be approved.`,
      status: 400,
    };
  }

  if (!caseRecord.payment) {
    return { error: "Case has no associated payment record", status: 400 };
  }

  // Re-check existing recovery policy before execution
  const policy = createDefaultMerchantPolicy();
  const snapshot = paymentToSnapshot(caseRecord.payment);
  const provider = new HeuristicRecoveryAnalysisProvider();
  const diagnosis = provider.analyze({
    payment: snapshot,
    policy,
    now: new Date(),
  });

  let policyDecision = evaluateRecoveryPolicy({
    payment: snapshot,
    recommendation: diagnosis,
    policy,
  });

  if (policyDecision.decision === "BLOCKED") {
    return {
      error: `Execution blocked by recovery policy: ${policyDecision.stoppingReason ?? "Policy validation failed"}`,
      status: 400,
    };
  }

  // Grant human approval for execution
  policyDecision = {
    ...policyDecision,
    decision: "APPROVED",
    requiresHumanApproval: false,
    stoppingReason: undefined,
  };

  // Use the existing recovery executor
  const executor = new SimulatedRecoveryExecutor();
  const now = new Date();
  const executionResult = executor.execute({
    payment: snapshot,
    policyDecision,
    recommendation: diagnosis,
    now,
  });

  const finalCaseStatus: CaseStatus =
    executionResult.status === "SIMULATED_SUCCESS" ? "RECOVERED" : "FAILED";

  // Update case status and resolution details
  const updatedCase = await prisma.case.update({
    where: { id: caseId },
    data: {
      status: finalCaseStatus,
      requiresHumanApproval: false,
      stoppingReason: finalCaseStatus === "FAILED" ? executionResult.summary : null,
      policyDecision: toJsonValue(policyDecision),
      executionResult: toJsonValue(executionResult),
      resolution:
        executionResult.status === "SIMULATED_SUCCESS"
          ? toJsonValue({
              action: executionResult.interventionType,
              summary: executionResult.summary,
              approvedBy: "human_operator",
              approvedAt: now.toISOString(),
              razorpayReference: executionResult.externalReference,
            })
          : caseRecord.resolution ? toJsonValue(caseRecord.resolution) : Prisma.JsonNull,
      lastExecutedAt: now,
      resolvedAt: finalCaseStatus === "RECOVERED" ? now : caseRecord.resolvedAt,
    },
  });

  // Persist workflow / audit trail artifacts
  const agentRun = await prisma.agentRun.create({
    data: {
      organizationId: caseRecord.organizationId,
      caseId: caseRecord.id,
      agentType: "RESOLUTION",
      status: "RUNNING",
      startedAt: now,
      input: toJsonValue({
        action: "HUMAN_APPROVAL",
        paymentId: caseRecord.paymentId,
        approvedAt: now.toISOString(),
      }),
    },
  });

  const steps = [
    {
      stepType: "human_approval",
      content: "Human operator approved execution for pending recovery case.",
      metadata: { approvedAt: now.toISOString() },
    },
    {
      stepType: "policy_decision",
      content: "Policy re-evaluated and human approval granted.",
      metadata: policyDecision as unknown as Record<string, unknown>,
    },
    {
      stepType: "execution",
      content: executionResult.summary,
      metadata: executionResult as unknown as Record<string, unknown>,
    },
  ];

  await persistWorkflowArtifacts({
    agentRunId: agentRun.id,
    recommendation: diagnosis,
    policyDecision,
    executionResult,
    steps,
  });

  return {
    success: true,
    case: updatedCase,
    executionResult,
    status: 200,
  };
}

