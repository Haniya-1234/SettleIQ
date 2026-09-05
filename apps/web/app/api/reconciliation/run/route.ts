import { NextResponse } from "next/server";
import { executeReconciliationRun } from "@/lib/reconciliation/run-service";

export async function POST() {
  try {
    const run = await executeReconciliationRun();
    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    console.error("Reconciliation run failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to execute reconciliation run",
      },
      { status: 500 },
    );
  }
}
