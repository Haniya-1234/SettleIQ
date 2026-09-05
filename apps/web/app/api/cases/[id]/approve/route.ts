import { NextResponse } from "next/server";
import { approveCase } from "@/lib/recovery/recovery-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await approveCase(id);

    if ("error" in result && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to approve case:", error);
    return NextResponse.json(
      { error: "Failed to approve case" },
      { status: 500 },
    );
  }
}
