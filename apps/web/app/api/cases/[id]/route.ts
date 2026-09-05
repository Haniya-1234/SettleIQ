import { NextResponse } from "next/server";
import { getCaseDetail } from "@/lib/recovery/recovery-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const caseRecord = await getCaseDetail(id);

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json(caseRecord);
  } catch (error) {
    console.error("Failed to load case:", error);
    return NextResponse.json({ error: "Failed to load case" }, { status: 500 });
  }
}
