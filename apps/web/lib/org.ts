import { prisma } from "@settleiq/db";
import { SYNTHETIC_DATASET } from "@settleiq/shared";

const BUILDATHON_ORG_SLUG = "synthetic-buildathon";

export async function getOrCreateBuildathonOrganization() {
  const existing = await prisma.organization.findUnique({
    where: { slug: BUILDATHON_ORG_SLUG },
  });

  if (existing) return existing;

  return prisma.organization.create({
    data: {
      name: SYNTHETIC_DATASET.label,
      slug: BUILDATHON_ORG_SLUG,
    },
  });
}

export async function getNextCaseNumber(organizationId: string): Promise<number> {
  const lastCase = await prisma.case.findFirst({
    where: { organizationId },
    orderBy: { caseNumber: "desc" },
    select: { caseNumber: true },
  });
  return (lastCase?.caseNumber ?? 0) + 1;
}
