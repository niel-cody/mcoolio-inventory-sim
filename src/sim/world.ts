import { AvailabilityIndex } from './availability';
import { Catalogue } from './catalogue';
import { DepletionEngine } from './depletion';
import { EventBus } from './events';
import { Production } from './production';
import { Purchasing } from './purchasing';
import { RecipeBook } from './recipe';
import { Rng } from './rng';
import { Stock } from './stock';
import { Stocktakes } from './stocktake';
import type { BaseUnits } from './baseunits';
import type { OrderEvent, OrderItem, Zone } from './types';
import { FEATURES, featurePlays, type FeatureId, type SimMode } from '../features';

export interface ScheduledTask {
  tick: number;
  seq: number;
  run: (world: SimWorld) => void;
}

export interface SoldTicket {
  orderId: string;
  locationId: string;
  tick: number;
  demands: { itemId: string; qty: BaseUnits }[];
  lines: string[];
}

/**
 * SimWorld owns every module and the clock. The 3D scene only reads it.
 * Everything that happens is either a scenario step or a scheduled task, so the
 * same seed always produces the same world.
 */
export class SimWorld {
  tick = 0;
  readonly rng: Rng;
  readonly events = new EventBus();
  readonly catalogue = new Catalogue();
  readonly recipes = new RecipeBook();
  readonly stock: Stock;
  readonly depletion: DepletionEngine;
  readonly purchasing: Purchasing;
  readonly production: Production;
  readonly stocktakes: Stocktakes;
  readonly availability: AvailabilityIndex;
  mode: SimMode = 'today';

  /** Products switched off at a venue by the Coming sold-out flag. Roadmap mode only. */
  readonly soldOutFlags = new Set<string>(); // `${posId}@${locationId}`

  private queue: ScheduledTask[] = [];
  private taskSeq = 0;
  private orderSeq = 0;
  /** Revenue and cost committed so far, for the GP tile. */
  revenueMinor = 0;
  cogsMinor = 0;

  constructor(readonly seed: number) {
    this.rng = new Rng(seed);
    this.stock = new Stock(this.events);
    this.depletion = new DepletionEngine(this.catalogue, this.recipes, this.stock);
    this.purchasing = new Purchasing(this.catalogue, this.stock, this.events);
    this.production = new Production(this.catalogue, this.recipes, this.stock, this.events);
    this.stocktakes = new Stocktakes(this.stock, this.events);
    this.availability = new AvailabilityIndex(this.catalogue, this.recipes, this.stock);
    const now = () => this.tick;
    this.stock.bindClock(now);
    this.purchasing.bindClock(now);
    this.production.bindClock(now);
    this.stocktakes.bindClock(now);
  }

  // ─── Features ───────────────────────────────────────────────────────────────

  featurePlays(id: FeatureId): boolean {
    return featurePlays(id, this.mode);
  }

  /** Runs `fn` only when the feature plays in the current mode; otherwise emits a ghost caption. */
  withFeature(id: FeatureId, fn: () => void, ghostText?: string): boolean {
    if (this.featurePlays(id)) {
      fn();
      return true;
    }
    if (ghostText) this.caption(ghostText, id);
    return false;
  }

  // ─── Clock and scheduling ───────────────────────────────────────────────────

  schedule(atTick: number, run: (world: SimWorld) => void): void {
    this.taskSeq += 1;
    this.queue.push({ tick: Math.max(atTick, this.tick), seq: this.taskSeq, run });
  }

  after(delay: number, run: (world: SimWorld) => void): void {
    this.schedule(this.tick + delay, run);
  }

  /** Advance one sim minute. Tasks for this tick run in schedule order. */
  step(): void {
    this.tick += 1;
    this.purchasing.tick();
    this.production.tick();
    const due = this.queue.filter((t) => t.tick <= this.tick).sort((a, b) => a.tick - b.tick || a.seq - b.seq);
    if (due.length) {
      this.queue = this.queue.filter((t) => t.tick > this.tick);
      for (const t of due) t.run(this);
    }
    if (this.mode === 'roadmap') this.refreshSoldOutFlags();
  }

  advance(ticks: number): void {
    for (let i = 0; i < ticks; i++) this.step();
  }

  // ─── Orders ─────────────────────────────────────────────────────────────────

  nextOrderId(locationId: string): string {
    this.orderSeq += 1;
    const venue = this.catalogue.venues.get(locationId);
    return `${venue?.shortName.slice(0, 3).toUpperCase() ?? 'ORD'}-${String(this.orderSeq).padStart(4, '0')}`;
  }

  /** Feed one order event through the depletion engine and emit the result. */
  processOrder(order: OrderEvent): ReturnType<DepletionEngine['process']> {
    const result = this.depletion.process(order);
    if (result.action !== 'IGNORE') {
      if (result.action === 'COMMIT') {
        this.revenueMinor += result.revenueMinor;
        this.cogsMinor += result.costMinor;
      } else if (result.action === 'REVERSE') {
        this.revenueMinor += result.revenueMinor; // negative
        this.cogsMinor += result.costMinor; // negative
      }
      this.events.emit({
        type: 'order',
        tick: this.tick,
        orderId: order.id,
        locationId: order.locationId,
        action: result.action,
        status: order.status,
        demands: result.demands.map((d) => ({ itemId: d.itemId, qty: d.qty })),
        revenueMinor: result.revenueMinor,
        lines: result.lines,
      });
    }
    return result;
  }

  /**
   * A typical POS sale: created now (RESERVE), complete a few minutes later (COMMIT).
   * Returns the order id so a scenario can void or refund it.
   */
  sell(locationId: string, items: OrderItem[], opts: { completeAfter?: number; voidAfter?: number; refundAfter?: number } = {}): string {
    const id = this.nextOrderId(locationId);
    const base: OrderEvent = { id, locationId, status: 'created', version: 1, items };
    this.processOrder(base);
    const completeAfter = opts.completeAfter ?? 2;
    if (opts.voidAfter !== undefined && opts.voidAfter < completeAfter) {
      this.after(opts.voidAfter, (w) => w.processOrder({ ...base, status: 'cancelled', version: 2 }));
      return id;
    }
    this.after(completeAfter, (w) => w.processOrder({ ...base, status: 'complete', version: 2 }));
    if (opts.refundAfter !== undefined) {
      this.after(completeAfter + opts.refundAfter, (w) => w.processOrder({ ...base, status: 'refunded', version: 3 }));
    }
    return id;
  }

  void(orderId: string, locationId: string, items: OrderItem[]): void {
    this.processOrder({ id: orderId, locationId, status: 'cancelled', version: 2, items });
  }

  refund(orderId: string, locationId: string, items: OrderItem[]): void {
    this.processOrder({ id: orderId, locationId, status: 'refunded', version: 3, items });
  }

  // ─── Sold-out flag (Coming) ─────────────────────────────────────────────────

  isFlaggedSoldOut(posId: string, locationId: string): boolean {
    return this.soldOutFlags.has(`${posId}@${locationId}`);
  }

  private refreshSoldOutFlags(): void {
    if (!this.featurePlays('sold-out-flag')) return;
    for (const venue of this.catalogue.venues.values()) {
      for (const p of this.catalogue.products.values()) {
        if (p.isModifier) continue;
        const k = `${p.posId}@${venue.id}`;
        const a = this.availability.of(p.posId, venue.id);
        const was = this.soldOutFlags.has(k);
        if (a.soldOut && !was) {
          this.soldOutFlags.add(k);
          this.events.emit({ type: 'sold_out', tick: this.tick, posId: p.posId, locationId: venue.id, on: true });
        } else if (!a.soldOut && was) {
          this.soldOutFlags.delete(k);
          this.events.emit({ type: 'sold_out', tick: this.tick, posId: p.posId, locationId: venue.id, on: false });
        }
      }
    }
  }

  // ─── Coming features that still need a model ────────────────────────────────

  transfer(itemId: string, fromLocationId: string, toLocationId: string, qty: BaseUnits): void {
    const { costMinor } = this.stock.deplete(itemId, fromLocationId, qty, 'TRANSFER_OUT', `transfer:${fromLocationId}>${toLocationId}`);
    this.stock.receive(itemId, toLocationId, qty, costMinor, 'TRANSFER_IN', `transfer:${fromLocationId}>${toLocationId}`);
    this.events.emit({ type: 'transfer', tick: this.tick, itemId, fromLocationId, toLocationId, qty });
  }

  waste(itemId: string, locationId: string, qty: BaseUnits, reason: string): void {
    this.stock.deplete(itemId, locationId, qty, 'WASTE', `waste:${this.tick}`, reason);
    this.events.emit({ type: 'waste', tick: this.tick, itemId, locationId, qty, reason });
  }

  suggest(locationId: string, featureId: FeatureId, text: string): void {
    this.events.emit({ type: 'suggestion', tick: this.tick, locationId, featureId, text });
  }

  /** Ask the view to move. Scenario logic uses this for beats that depend on when something happens. */
  cameraTo(beat: { view: 'world' | 'venue'; venueId?: string; zone?: Zone }): void {
    this.events.emit({ type: 'camera', tick: this.tick, ...beat });
  }

  caption(text: string, featureId?: FeatureId): void {
    this.events.emit({ type: 'caption', tick: this.tick, text, featureId });
  }

  // ─── KPIs ───────────────────────────────────────────────────────────────────

  grossProfitPct(): number {
    if (this.revenueMinor <= 0) return 0;
    return ((this.revenueMinor - this.cogsMinor) / this.revenueMinor) * 100;
  }

  soldOutCountByVenue(): { locationId: string; count: number }[] {
    return this.catalogue.venueList().map((v) => ({ locationId: v.id, count: this.availability.soldOutProducts(v.id).length }));
  }

  featureName(id: FeatureId): string {
    return FEATURES[id].name;
  }
}
