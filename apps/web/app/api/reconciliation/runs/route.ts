import { NextResponse } from "next/server";
import { listReconciliationRuns } from "@/lib/reconciliation/run-service";

export async function GET() {
  try {
    const runs = await listReconciliationRuns();
    return NextResponse.json(runs);
  } catch (error) {
    console.error("Failed to list reconciliation runs:", error);
    return NextResponse.json(
      { error: "Failed to list reconciliation runs" },
      { status: 500 },
    );
  }
}
