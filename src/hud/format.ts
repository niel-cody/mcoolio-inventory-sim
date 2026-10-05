import { SCALE, toDecimal, type BaseUnits } from '../sim/baseunits';
import type { InventoryItem } from '../sim/types';

export function money(minor: number, opts: { compact?: boolean } = {}): string {
  const dollars = minor / 100;
  if (opts.compact && Math.abs(dollars) >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return dollars.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 });
}

export function num(n: number, dp = 0): string {
  return n.toLocaleString('en-AU', { maximumFractionDigits: dp, minimumFractionDigits: 0 });
}

/** Whole-unit quantity with its UOM, e.g. "1,245 mL", "72 each", "18 portions". */
export function baseQty(qty: BaseUnits, item: InventoryItem): string {
  const d = toDecimal(qty);
  const uom = item.baseUom === 'portion' ? (Math.abs(d) === 1 ? 'portion' : 'portions') : item.baseUom;
  return `${num(d, Number.isInteger(d) ? 0 : 1)} ${uom}`;
}

/** Quantity in purchase units when the item has one, e.g. "3 cartons + 7 bottles". */
export function purchaseQty(qty: BaseUnits, item: InventoryItem): string | null {
  if (!item.purchaseUnit) return null;
  const factorBase = item.purchaseUnit.factor * SCALE;
  const sign = qty < 0 ? '-' : '';
  const abs = Math.abs(qty);
  const whole = Math.floor(abs / factorBase);
  const rest = abs - whole * factorBase;
  const unitName = item.purchaseUnit.name.toLowerCase();
  const parts: string[] = [];
  if (whole > 0) parts.push(`${whole} ${pluralise(unitName, whole)}`);
  if (rest > 0 || whole === 0) parts.push(`${num(toDecimal(rest), 0)} ${item.baseUom}`);
  return sign + parts.join(' + ');
}

function pluralise(unitName: string, n: number): string {
  // "carton of 24" -> "cartons of 24"; "700 ml bottle" -> "700 ml bottles"; "pack of 10" -> "packs of 10"
  if (n === 1) return unitName;
  const m = unitName.match(/^(\w+)( of .*)$/);
  if (m) return `${m[1]}s${m[2]}`;
  return `${unitName}s`;
}

/** Average cost per sensible unit: per bottle/carton when there is a purchase unit, else per base unit. */
export function avgCost(minorPerUnit: number, item: InventoryItem): string {
  if (item.purchaseUnit) return `${money(minorPerUnit * item.purchaseUnit.factor)} per ${item.purchaseUnit.name.toLowerCase()}`;
  if (item.baseUom === 'portion') return `${money(minorPerUnit)} per portion`;
  return `${money(minorPerUnit)} per ${item.baseUom}`;
}

export function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}
