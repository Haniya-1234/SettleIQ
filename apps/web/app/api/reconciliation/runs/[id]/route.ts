import { NextResponse } from "next/server";
import { getReconciliationRun } from "@/lib/reconciliation/run-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const run = await getReconciliationRun(id);

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error("Failed to get reconciliation run:", error);
    return NextResponse.json(
      { error: "Failed to get reconciliation run" },
      { status: 500 },
    );
  }
}
