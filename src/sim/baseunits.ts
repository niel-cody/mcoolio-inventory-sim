// Fixed-point base units, mirroring server/internal/modules/stock/domain/baseunits.go.
// Quantities are integer counts of 1/SCALE of a whole measured unit (mL, g, each).

export const SCALE = 10_000;

/** Integer count of 1/10,000 units. Never a float. */
export type BaseUnits = number;

/** Decimal quantity to base units, rounding half away from zero (non-negative inputs). */
export function toBase(decimal: number): BaseUnits {
  return Math.round(decimal * SCALE);
}

/** Base units back to a decimal, used only at the display boundary. */
export function toDecimal(units: BaseUnits): number {
  return units / SCALE;
}

/** round(a*b/c) with a BigInt intermediate so the product cannot lose precision. */
export function mulDivRound(a: number, b: number, c: number): number {
  if (c <= 0) throw new Error('mulDivRound: divisor must be positive');
  const num = BigInt(Math.trunc(a)) * BigInt(Math.trunc(b));
  const den = BigInt(Math.trunc(c));
  let q = num / den;
  const r = num % den;
  if (r * 2n >= den) q += 1n;
  return Number(q);
}

export function assertInt(n: number, label = 'quantity'): void {
  if (!Number.isInteger(n)) throw new Error(`${label} must be an integer base-unit count, got ${n}`);
}
