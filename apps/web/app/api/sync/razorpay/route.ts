import { NextResponse } from "next/server";
import { syncRazorpayData } from "@/lib/sync/razorpay-sync";
import { getOrCreateBuildathonOrganization } from "@/lib/org";

/**
 * POST /api/sync/razorpay
 *
 * Triggers a unidirectional Razorpay → SettleIQ data synchronisation.
 *
 * Request body (JSON):
 *   - organizationId (optional): The SettleIQ organization to sync. Defaults to buildathon org.
 *   - from (optional): Unix timestamp – sync records created after this time.
 *   - to   (optional): Unix timestamp – sync records created before this time.
 *
 * Returns the sync result with counts of synced/errored records per resource.
 */
export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text) as Record<string, unknown>;
      }
    } catch (e) {
      // Ignore parse errors, proceed with empty body
    }

    let organizationId = typeof body.organizationId === "string" ? body.organizationId : undefined;

    if (!organizationId) {
      const org = await getOrCreateBuildathonOrganization();
      organizationId = org.id;
    }

    const from =
      typeof body.from === "number" ? body.from : undefined;
    const to =
      typeof body.to === "number" ? body.to : undefined;

    const result = await syncRazorpayData({
      organizationId,
      from,
      to,
    });

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    console.error("Razorpay sync failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during sync.",
      },
      { status: 500 },
    );
  }
}
