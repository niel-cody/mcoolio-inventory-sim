import type { BaseUnits } from './baseunits';
import type { EventBus } from './events';
import type { Stock } from './stock';
import type { Stocktake } from './types';

/** Stocktakes: snapshot theoretical, count, post the variance as STOCK_TAKE movements. */
export class Stocktakes {
  readonly takes = new Map<string, Stocktake>();
  private seq = 0;
  private now = () => 0;

  constructor(
    private readonly stock: Stock,
    private readonly events: EventBus,
  ) {}

  bindClock(now: () => number): void {
    this.now = now;
  }

  list(locationId?: string): Stocktake[] {
    const all = [...this.takes.values()];
    return locationId ? all.filter((t) => t.locationId === locationId) : all;
  }

  start(locationId: string, itemIds: string[]): Stocktake {
    this.seq += 1;
    const take: Stocktake = {
      id: `take_${this.seq}`,
      locationId,
      status: 'OPEN',
      lines: itemIds.map((itemId) => ({ itemId, theoretical: this.stock.onHand(itemId, locationId) })),
      startedTick: this.now(),
    };
    this.takes.set(take.id, take);
    this.events.emit({ type: 'stocktake', tick: this.now(), stocktakeId: take.id, locationId, phase: 'started', varianceLines: [] });
    return take;
  }

  count(takeId: string, itemId: string, counted: BaseUnits): void {
    const take = this.get(takeId);
    const line = take.lines.find((l) => l.itemId === itemId);
    if (!line) throw new Error(`item ${itemId} not on stocktake ${takeId}`);
    line.counted = counted;
  }

  variance(take: Stocktake): { itemId: string; variance: BaseUnits }[] {
    return take.lines.filter((l) => l.counted !== undefined).map((l) => ({ itemId: l.itemId, variance: (l.counted ?? 0) - l.theoretical }));
  }

  post(takeId: string): Stocktake {
    const take = this.get(takeId);
    if (take.status !== 'OPEN') return take;
    const lines = this.variance(take);
    for (const v of lines) {
      if (v.variance !== 0) this.stock.adjust(v.itemId, take.locationId, v.variance, 'STOCK_TAKE', `take:${take.id}`, 'Stocktake variance');
    }
    take.status = 'POSTED';
    take.postedTick = this.now();
    this.events.emit({ type: 'stocktake', tick: this.now(), stocktakeId: take.id, locationId: take.locationId, phase: 'posted', varianceLines: lines });
    return take;
  }

  get(id: string): Stocktake {
    const t = this.takes.get(id);
    if (!t) throw new Error(`unknown stocktake ${id}`);
    return t;
  }
}
