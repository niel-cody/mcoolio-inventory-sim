import type { SimWorld } from './world';
import type { OrderItem } from './types';
import { withinHours } from './clock';

/**
 * The Friday service order generator. Pure function of the world's seeded RNG,
 * so the same seed gives the same orders. Weights describe a venue's character.
 */
export interface ServiceProfile {
  /** Average orders per sim minute. */
  ordersPerTick: number;
  /** posId -> weight */
  weights: Record<string, number>;
  /** posId -> modifier posId -> chance */
  modifiers?: Record<string, Record<string, number>>;
  /** Variant parent lines (e.g. Absolut sold as parent + child size) are rare; keep as plain lines here. */
  voidChance?: number;
  refundChance?: number;
  maxLines?: number;
  /** Trading windows as [open, close] hours; close may be past midnight. Absent means always open. */
  hours?: [number, number][];
}

export interface ServiceHandle {
  stop: () => void;
}

export function runService(world: SimWorld, locationId: string, profile: ServiceProfile, untilTick: number): ServiceHandle {
  let stopped = false;
  const stepTask = (w: SimWorld): void => {
    if (stopped || w.tick > untilTick) return;
    if (isOpen(w.hour(), profile)) {
      const n = w.rng.poisson(profile.ordersPerTick);
      for (let i = 0; i < n; i++) placeOrder(w, locationId, profile);
    }
    w.after(1, stepTask);
  };
  world.after(1, stepTask);
  return { stop: () => (stopped = true) };
}

export function placeOrder(world: SimWorld, locationId: string, profile: ServiceProfile): string | undefined {
  const rng = world.rng;
  const entries = Object.entries(profile.weights).map(([posId, w]) => [posId, w] as const);
  const lineCount = rng.int(1, profile.maxLines ?? 3);
  const items: OrderItem[] = [];
  for (let i = 0; i < lineCount; i++) {
    let posId = rng.pick(entries);
    // Roadmap mode: a product flagged sold out at this venue cannot be sold here.
    if (world.isFlaggedSoldOut(posId, locationId)) {
      const alternatives = entries.filter(([p]) => !world.isFlaggedSoldOut(p, locationId));
      if (alternatives.length === 0) continue;
      posId = rng.pick(alternatives);
    }
    const quantity = rng.chance(0.8) ? 1 : rng.int(2, 3);
    const line: OrderItem = { posId, quantity };
    const mods = profile.modifiers?.[posId];
    if (mods) {
      for (const [modPosId, chance] of Object.entries(mods)) {
        if (rng.chance(chance)) line.options = [...(line.options ?? []), { variants: [{ posId: modPosId }] }];
      }
    }
    items.push(line);
  }
  if (items.length === 0) return undefined;
  const completeAfter = rng.int(2, 6);
  const opts: { completeAfter: number; voidAfter?: number; refundAfter?: number } = { completeAfter };
  if (rng.chance(profile.voidChance ?? 0.03)) opts.voidAfter = rng.int(1, Math.max(1, completeAfter - 1));
  else if (rng.chance(profile.refundChance ?? 0.015)) opts.refundAfter = rng.int(3, 12);
  return world.sell(locationId, items, opts);
}

export function isOpen(hour: number, profile: ServiceProfile): boolean {
  if (!profile.hours || profile.hours.length === 0) return true;
  return profile.hours.some(([open, close]) => withinHours(hour, open, close));
}
