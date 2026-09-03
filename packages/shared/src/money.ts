/**
 * Money utilities using integer paise (1/100 INR) to avoid floating-point errors.
 * All arithmetic is performed on bigint values.
 */

const PAISE_PER_UNIT = 100n;

export type Currency = "INR";

export interface MoneyAmount {
  /** Amount in paise (smallest currency unit). */
  paise: bigint;
  currency: Currency;
}

export function moneyFromPaise(paise: number | bigint, currency: Currency = "INR"): MoneyAmount {
  return { paise: BigInt(paise), currency };
}

export function moneyFromRupees(rupees: number, currency: Currency = "INR"): MoneyAmount {
  // Use string conversion to avoid float issues for whole rupees
  const paise = BigInt(rupees) * PAISE_PER_UNIT;
  return { paise, currency };
}

export function addMoney(a: MoneyAmount, b: MoneyAmount): MoneyAmount {
  assertSameCurrency(a, b);
  return { paise: a.paise + b.paise, currency: a.currency };
}

export function subtractMoney(a: MoneyAmount, b: MoneyAmount): MoneyAmount {
  assertSameCurrency(a, b);
  return { paise: a.paise - b.paise, currency: a.currency };
}

export function absMoney(a: MoneyAmount): MoneyAmount {
  return { paise: a.paise < 0n ? -a.paise : a.paise, currency: a.currency };
}

export function compareMoney(a: MoneyAmount, b: MoneyAmount): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.paise < b.paise) return -1;
  if (a.paise > b.paise) return 1;
  return 0;
}

export function formatMoney(amount: MoneyAmount): string {
  const negative = amount.paise < 0n;
  const absPaise = negative ? -amount.paise : amount.paise;
  const rupees = absPaise / PAISE_PER_UNIT;
  const paise = absPaise % PAISE_PER_UNIT;
  const formatted = `${rupees.toString()}.${paise.toString().padStart(2, "0")}`;
  const symbol = amount.currency === "INR" ? "₹" : amount.currency;
  return `${negative ? "-" : ""}${symbol}${formatted}`;
}

export function formatMoneyDifference(a: MoneyAmount, b: MoneyAmount): string {
  const diff = subtractMoney(a, b);
  const formatted = formatMoney(absMoney(diff));
  if (diff.paise === 0n) return formatted;
  return diff.paise > 0n ? `+${formatted}` : `-${formatted}`;
}

export function moneyToDecimalString(amount: MoneyAmount): string {
  const negative = amount.paise < 0n;
  const absPaise = negative ? -amount.paise : amount.paise;
  const rupees = absPaise / PAISE_PER_UNIT;
  const paise = absPaise % PAISE_PER_UNIT;
  return `${negative ? "-" : ""}${rupees}.${paise.toString().padStart(2, "0")}`;
}

function assertSameCurrency(a: MoneyAmount, b: MoneyAmount): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}
