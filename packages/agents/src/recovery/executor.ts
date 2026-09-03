import type { RecoveryExecutionResult } from "@settleiq/shared";
import type { RecoveryExecutionContext, RecoveryExecutor } from "./types";

function simulationReference(paymentId: string) {
  return `sim-${paymentId.toLowerCase()}`;
}

export class SimulatedRecoveryExecutor implements RecoveryExecutor {
  execute(input: RecoveryExecutionContext): RecoveryExecutionResult {
    const { payment, policyDecision, recommendation, now } = input;

    if (policyDecision.decision !== "APPROVED") {
      return {
        status: "SKIPPED",
        mode: "SIMULATED",
        interventionType: recommendation.recommendedIntervention.type,
        summary: "Execution skipped because policy did not approve automated action.",
        attemptedAt: now.toISOString(),
        toolName: "simulated_recovery_executor",
      };
    }

    const succeeds =
      recommendation.recommendedIntervention.type === "RETRY_LATER" ||
      recommendation.recommendedIntervention.type === "CUSTOMER_REMINDER";

    if (!succeeds) {
      return {
        status: "SIMULATED_FAILURE",
        mode: "SIMULATED",
        interventionType: recommendation.recommendedIntervention.type,
        summary: "Simulation completed and the recovery action did not recover the payment.",
        attemptedAt: now.toISOString(),
        toolName: "simulated_recovery_executor",
        externalReference: simulationReference(payment.razorpayPaymentId),
        error: "Simulated payment remained unrecovered.",
      };
    }

    return {
      status: "SIMULATED_SUCCESS",
      mode: "SIMULATED",
      interventionType: recommendation.recommendedIntervention.type,
      summary: "Simulation completed and observed a successful recovery outcome.",
      attemptedAt: now.toISOString(),
      recoveredAmountPaise: payment.amountPaise,
      toolName: "simulated_recovery_executor",
      externalReference: simulationReference(payment.razorpayPaymentId),
    };
  }
}
