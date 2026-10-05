import { assertInt, mulDivRound, SCALE, type BaseUnits } from './baseunits';
import type { EventBus } from './events';
import type { CostLayer, LayerSource, MovementType, Reservation, StockLevel, StockMovement } from './types';

const key = (itemId: string, locationId: string) => `${itemId}@${locationId}`;

export interface DepleteResult {
  costMinor: number;
  /** Portion that could not be served from layers (went into deficit). */
  deficit: BaseUnits;
}

/**
 * Stock: levels per (item, location), FIFO cost layers behind, average cost in
 * front, an append-only movement ledger and the reservation lifecycle.
 * Quantities are integer base units; nothing here ever holds a float quantity.
 */
export class Stock {
  readonly levels = new Map<string, StockLevel>();
  readonly layers = new Map<string, CostLayer[]>();
  readonly movements: StockMovement[] = [];
  readonly reservations = new Map<string, Reservation[]>(); // by orderId
  private seq = 0;
  private now = () => 0;

  constructor(private readonly events?: EventBus) {}

  bindClock(now: () => number): void {
    this.now = now;
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq.toString(36)}`;
  }

  level(itemId: string, locationId: string): StockLevel {
    const k = key(itemId, locationId);
    let lvl = this.levels.get(k);
    if (!lvl) {
      lvl = { itemId, locationId, qtyOnHand: 0 };
      this.levels.set(k, lvl);
    }
    return lvl;
  }

  setThresholds(itemId: string, locationId: string, t: { reorderPoint?: BaseUnits; parLevel?: BaseUnits }): void {
    const lvl = this.level(itemId, locationId);
    lvl.reorderPoint = t.reorderPoint;
    lvl.parLevel = t.parLevel;
  }

  onHand(itemId: string, locationId: string): BaseUnits {
    return this.levels.get(key(itemId, locationId))?.qtyOnHand ?? 0;
  }

  layersFor(itemId: string, locationId: string): CostLayer[] {
    const k = key(itemId, locationId);
    let ls = this.layers.get(k);
    if (!ls) {
      ls = [];
      this.layers.set(k, ls);
    }
    return ls;
  }

  /** Average cost in minor currency per WHOLE unit (per mL, per each, per g). Falls back to last known. */
  averageCostMinorPerUnit(itemId: string, locationId: string): number {
    const ls = this.layersFor(itemId, locationId).filter((l) => l.qtyRemaining > 0);
    const qty = ls.reduce((s, l) => s + l.qtyRemaining, 0);
    const cost = ls.reduce((s, l) => s + l.costRemainingMinor, 0);
    if (qty > 0) return (cost / qty) * SCALE;
    return this.lastCost.get(key(itemId, locationId)) ?? 0;
  }

  /** Average cost across all locations, per whole unit. */
  groupAverageCostMinorPerUnit(itemId: string): number {
    let qty = 0;
    let cost = 0;
    for (const [k, ls] of this.layers) {
      if (!k.startsWith(`${itemId}@`)) continue;
      for (const l of ls) {
        if (l.qtyRemaining <= 0) continue;
        qty += l.qtyRemaining;
        cost += l.costRemainingMinor;
      }
    }
    return qty > 0 ? (cost / qty) * SCALE : 0;
  }

  /** Stock on hand value in minor currency for a location (or all). */
  onHandValueMinor(locationId?: string): number {
    let total = 0;
    for (const [k, ls] of this.layers) {
      if (locationId && !k.endsWith(`@${locationId}`)) continue;
      for (const l of ls) if (l.qtyRemaining > 0) total += l.costRemainingMinor;
    }
    return Math.round(total);
  }

  private lastCost = new Map<string, number>();

  private record(m: Omit<StockMovement, 'id' | 'tick'>): StockMovement {
    const mv: StockMovement = { id: this.nextId('mv'), tick: this.now(), ...m };
    this.movements.push(mv);
    return mv;
  }

  /** Adds a cost layer and a positive movement. */
  receive(
    itemId: string,
    locationId: string,
    qty: BaseUnits,
    costMinor: number,
    source: LayerSource,
    sourceRef: string,
    movementType: MovementType = source === 'OPENING' ? 'OPENING' : source === 'PRODUCTION_RUN' ? 'PRODUCTION_RUN' : source === 'REVERSAL' ? 'REVERSAL' : source === 'TRANSFER_IN' ? 'TRANSFER_IN' : source === 'STOCK_TAKE' ? 'STOCK_TAKE' : 'GOODS_RECEIPT',
  ): CostLayer {
    assertInt(qty, 'receive qty');
    if (qty <= 0) throw new Error('receive qty must be positive');
    const lvl = this.level(itemId, locationId);
    const before = lvl.qtyOnHand;
    const ls = this.layersFor(itemId, locationId);

    // A deficit (oversell) is filled first: the real engine drives a DEFICIT batch
    // negative, then receipts bring it back up before any new lot has remaining qty.
    let remaining = qty;
    let costRemaining = costMinor;
    if (before < 0) {
      const fill = Math.min(remaining, -before);
      const fillCost = mulDivRound(costMinor, fill, qty);
      remaining -= fill;
      costRemaining -= fillCost;
    }
    const layer: CostLayer = {
      id: this.nextId('lot'),
      itemId,
      locationId,
      qtyReceived: qty,
      qtyRemaining: remaining,
      costRemainingMinor: costRemaining,
      source,
      sourceRef,
      receivedTick: this.now(),
    };
    ls.push(layer);
    lvl.qtyOnHand += qty;
    if (qty > 0) this.lastCost.set(key(itemId, locationId), (costMinor / qty) * SCALE);
    this.record({ itemId, locationId, qtyDelta: qty, costDeltaMinor: costMinor, type: movementType, sourceRef });
    return layer;
  }

  /** FIFO consumption. Goes into deficit when layers run dry, like the real DEFICIT batch. */
  deplete(itemId: string, locationId: string, qty: BaseUnits, type: MovementType, sourceRef: string, reason?: string): DepleteResult {
    assertInt(qty, 'deplete qty');
    if (qty <= 0) throw new Error('deplete qty must be positive');
    const lvl = this.level(itemId, locationId);
    const ls = this.layersFor(itemId, locationId);
    let remaining = qty;
    let costMinor = 0;
    for (const layer of ls) {
      if (remaining === 0) break;
      if (layer.qtyRemaining <= 0) continue;
      const take = Math.min(layer.qtyRemaining, remaining);
      const cost = take === layer.qtyRemaining ? layer.costRemainingMinor : mulDivRound(layer.costRemainingMinor, take, layer.qtyRemaining);
      layer.qtyRemaining -= take;
      layer.costRemainingMinor -= cost;
      costMinor += cost;
      remaining -= take;
    }
    const deficit = remaining;
    if (deficit > 0) {
      // Value the oversold portion at the last known cost so GP stays sensible.
      costMinor += Math.round((this.averageCostMinorPerUnit(itemId, locationId) * deficit) / SCALE);
    }
    const before = lvl.qtyOnHand;
    lvl.qtyOnHand -= qty;
    this.record({ itemId, locationId, qtyDelta: -qty, costDeltaMinor: -costMinor, type, sourceRef, reason });
    this.announce(itemId, locationId, before, lvl.qtyOnHand);
    return { costMinor, deficit };
  }

  private announce(itemId: string, locationId: string, before: BaseUnits, after: BaseUnits): void {
    if (!this.events) return;
    const tick = this.now();
    const lvl = this.level(itemId, locationId);
    if (before > 0 && after <= 0) this.events.emit({ type: 'stock.hit_zero', tick, itemId, locationId });
    if (after < 0 && before >= 0) this.events.emit({ type: 'stock.deficit', tick, itemId, locationId, qtyOnHand: after });
    if (lvl.reorderPoint !== undefined && before > lvl.reorderPoint && after <= lvl.reorderPoint) {
      this.events.emit({ type: 'stock.below_reorder', tick, itemId, locationId, qtyOnHand: after, reorderPoint: lvl.reorderPoint });
    }
  }

  /** Signed adjustment used by stocktakes: positive adds a layer at average cost, negative depletes. */
  adjust(itemId: string, locationId: string, delta: BaseUnits, type: MovementType, sourceRef: string, reason?: string): void {
    if (delta === 0) return;
    if (delta > 0) {
      const cost = Math.round((this.averageCostMinorPerUnit(itemId, locationId) * delta) / SCALE);
      this.receive(itemId, locationId, delta, cost, 'STOCK_TAKE', sourceRef, type);
    } else {
      this.deplete(itemId, locationId, -delta, type, sourceRef, reason);
    }
  }

  // ─── Reservations: RESERVED → COMMITTED, or RELEASED / REVERSED ──────────────

  reservationsFor(orderId: string): Reservation[] {
    return this.reservations.get(orderId) ?? [];
  }

  reserve(orderId: string, demands: { itemId: string; locationId: string; qty: BaseUnits }[]): Reservation[] {
    const tick = this.now();
    const rows = demands.map<Reservation>((d) => ({
      id: this.nextId('rsv'),
      orderId,
      itemId: d.itemId,
      locationId: d.locationId,
      qty: d.qty,
      status: 'RESERVED',
      committedCostMinor: 0,
      createdTick: tick,
      updatedTick: tick,
    }));
    this.reservations.set(orderId, rows);
    return rows;
  }

  /** Commit replays the demands as depletion. From RESERVED, or straight from nothing (reserve-or-commit). */
  commit(orderId: string, demands: { itemId: string; locationId: string; qty: BaseUnits; sourceRef: string }[]): { rows: Reservation[]; costMinor: number } {
    const tick = this.now();
    const existing = this.reservations.get(orderId);
    const rows = existing && existing.some((r) => r.status === 'RESERVED') ? existing : this.reserve(orderId, demands);
    let costMinor = 0;
    for (const d of demands) {
      const { costMinor: c } = this.deplete(d.itemId, d.locationId, d.qty, 'RECIPE_DEDUCTION', d.sourceRef);
      costMinor += c;
      const row = rows.find((r) => r.itemId === d.itemId && r.locationId === d.locationId && r.status === 'RESERVED');
      if (row) {
        row.status = 'COMMITTED';
        row.committedCostMinor = c;
        row.qty = d.qty;
        row.updatedTick = tick;
      }
    }
    return { rows, costMinor };
  }

  release(orderId: string): Reservation[] {
    const tick = this.now();
    const rows = this.reservationsFor(orderId);
    for (const r of rows) {
      if (r.status === 'RESERVED') {
        r.status = 'RELEASED';
        r.updatedTick = tick;
      }
    }
    return rows;
  }

  /** Reverse a committed order: restock each line at the cost it was taken at. */
  reverse(orderId: string): Reservation[] {
    const tick = this.now();
    const rows = this.reservationsFor(orderId);
    for (const r of rows) {
      if (r.status !== 'COMMITTED') continue;
      this.receive(r.itemId, r.locationId, r.qty, r.committedCostMinor, 'REVERSAL', `order:${orderId}:reverse`);
      r.status = 'REVERSED';
      r.updatedTick = tick;
    }
    return rows;
  }
}
