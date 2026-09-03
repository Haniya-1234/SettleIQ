import { SYNTHETIC_DATASET } from "@settleiq/shared";

export const ORDER_COUNT = SYNTHETIC_DATASET.recordCount;

export const DATE_MISMATCH_THRESHOLD_DAYS = 1;

export function formatRef(prefix: string, index: number): string {
  return `${prefix}_${index.toString().padStart(4, "0")}`;
}

export function baseAmountPaise(
  index: number,
  rng: { nextInt: (min: number, max: number) => number },
): bigint {
  // Deterministic base with small seeded variation (still integer paise)
  const variation = BigInt(rng.nextInt(0, 499));
  return 100_000n + BigInt(index) * 1_000n + variation;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return Math.floor(diff / msPerDay);
}
