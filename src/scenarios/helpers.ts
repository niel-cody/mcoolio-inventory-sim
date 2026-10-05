import type { SimEvent } from '../sim/events';
import type { SimWorld } from '../sim/world';

/** Run `fn` the first time an event matches. Registered from a scenario step, so it stays deterministic. */
export function onceWhen(world: SimWorld, match: (e: SimEvent) => boolean, fn: (world: SimWorld, e: SimEvent) => void): void {
  const off = world.events.on((e) => {
    if (!match(e)) return;
    off();
    fn(world, e);
  });
}

export function hitZero(itemId: string, locationId: string) {
  return (e: SimEvent) => e.type === 'stock.hit_zero' && e.itemId === itemId && e.locationId === locationId;
}

export function belowReorder(itemId: string, locationId: string) {
  return (e: SimEvent) => e.type === 'stock.below_reorder' && e.itemId === itemId && e.locationId === locationId;
}

export function poStatus(status: string, locationId: string) {
  return (e: SimEvent) => e.type === 'po' && e.status === status && e.locationId === locationId;
}
