import { prisma } from "@settleiq/db";
import { orchestrator } from "@settleiq/agents";
import { NextResponse } from "next/server";

export async function GET() {
  const agents = orchestrator.listAgents();

  let database: "connected" | "unavailable" = "unavailable";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    database = "unavailable";
  }

  return NextResponse.json({
    database,
    agents: agents.map((a) => ({
      type: a.type,
      name: a.name,
      implemented: ["RECONCILIATION", "INVESTIGATION", "RESOLUTION"].includes(
        a.type,
      ),
    })),
  });
}
