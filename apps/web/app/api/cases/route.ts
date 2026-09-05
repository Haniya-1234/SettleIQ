import { NextResponse } from "next/server";
import { createCaseFromFindingSchema } from "@settleiq/shared";
import { createCaseFromFinding, listCases } from "@/lib/cases/case-service";

export async function GET() {
  try {
    const cases = await listCases();
    return NextResponse.json(cases);
  } catch (error) {
    console.error("Failed to list cases:", error);
    return NextResponse.json({ error: "Failed to list cases" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createCaseFromFindingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const createdCase = await createCaseFromFinding(parsed.data.findingId);
    return NextResponse.json(createdCase, { status: 201 });
  } catch (error) {
    console.error("Failed to create case:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create case",
      },
      { status: 400 },
    );
  }
}
