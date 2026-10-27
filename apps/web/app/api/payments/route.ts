import { NextResponse } from "next/server";
import { listPayments } from "@/lib/payments/payment-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payments = await listPayments();
    return NextResponse.json({ ok: true, payments });
  } catch (error) {
    console.error("API /api/payments failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
