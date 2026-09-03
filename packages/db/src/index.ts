import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient, Prisma };
export type {
  Organization,
  Payment,
  Order,
  Settlement,
  Case,
  AgentRun,
  AgentStep,
  ToolInvocation,
  ReconciliationRun,
  ReconciliationFinding,
  PaymentStatus,
  CaseType,
  CaseSeverity,
  CaseStatus,
  AgentRunStatus,
  AgentType,
  FindingType,
  FindingSeverity,
  FindingStatus,
  ReconciliationRunStatus,
} from "@prisma/client";
