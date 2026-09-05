import { NextResponse } from "next/server";
import { ingestRazorpayWebhook } from "@/lib/recovery/webhook-service";

export async function POST(request: Request) {
  try {
    const rawPayload = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const eventId = request.headers.get("x-razorpay-event-id");

    const result = await ingestRazorpayWebhook({
      rawPayload,
      signature,
      eventId,
    });

    return NextResponse.json(
      {
        received: true,
        duplicate: result.duplicate,
      },
      { status: result.duplicate ? 200 : 202 },
    );
  } catch (error) {
    console.error("Failed to ingest Razorpay webhook:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to ingest webhook",
      },
      { status: 400 },
    );
  }
}
