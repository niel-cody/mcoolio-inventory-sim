import type { BaseUnits } from './baseunits';
import type { DepletionAction, PurchaseOrderStatus } from './types';
import type { FeatureId } from '../features';

export type SimEvent =
  | { type: 'order'; tick: number; orderId: string; locationId: string; action: DepletionAction; status: string; demands: { itemId: string; qty: BaseUnits }[]; revenueMinor: number; lines: string[] }
  | { type: 'stock.hit_zero'; tick: number; itemId: string; locationId: string }
  | { type: 'stock.below_reorder'; tick: number; itemId: string; locationId: string; qtyOnHand: BaseUnits; reorderPoint: BaseUnits }
  | { type: 'stock.deficit'; tick: number; itemId: string; locationId: string; qtyOnHand: BaseUnits }
  | { type: 'po'; tick: number; poId: string; status: PurchaseOrderStatus | 'ARRIVED'; locationId: string; supplierId: string; note?: string }
  | { type: 'production'; tick: number; runId: string; locationId: string; phase: 'started' | 'completed'; batchItemId: string; qty: number }
  | { type: 'stocktake'; tick: number; stocktakeId: string; locationId: string; phase: 'started' | 'posted'; varianceLines: { itemId: string; variance: BaseUnits }[] }
  | { type: 'waste'; tick: number; itemId: string; locationId: string; qty: BaseUnits; reason: string }
  | { type: 'transfer'; tick: number; itemId: string; fromLocationId: string; toLocationId: string; qty: BaseUnits }
  | { type: 'recipe.activated'; tick: number; itemId: string; versionId: string; note?: string }
  | { type: 'sold_out'; tick: number; posId: string; locationId: string; on: boolean }
  | { type: 'suggestion'; tick: number; locationId: string; featureId: FeatureId; text: string }
  | { type: 'caption'; tick: number; text: string; featureId?: FeatureId };

export type SimEventType = SimEvent['type'];

type Listener = (e: SimEvent) => void;

export class EventBus {
  private listeners = new Set<Listener>();
  /** Ring buffer of recent events for the HUD feed. */
  readonly log: SimEvent[] = [];
  private seq = 0;
  readonly limit: number;

  constructor(limit = 6000) {
    this.limit = limit;
  }

  emit(e: SimEvent): void {
    this.seq += 1;
    this.log.push(e);
    if (this.log.length > this.limit) this.log.splice(0, this.log.length - this.limit);
    for (const l of this.listeners) l(e);
  }

  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  get count(): number {
    return this.seq;
  }

  clear(): void {
    this.log.length = 0;
    this.seq = 0;
  }
}
