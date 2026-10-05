import { mulDivRound, toBase, type BaseUnits } from './baseunits';
import type { Catalogue } from './catalogue';
import type { EventBus } from './events';
import type { Stock } from './stock';
import type { PurchaseOrder, PurchaseOrderLine } from './types';

/**
 * Purchase orders: Draft → Sent → In transit → Received → Posted.
 * The real service has DRAFT, SENT, RECEIVED and POSTED; "In transit" is a demo
 * state so the truck has somewhere to be. Posting creates the goods receipt
 * movement and cost layer, which is when stock and average cost move.
 */
export class Purchasing {
  readonly orders = new Map<string, PurchaseOrder>();
  private seq = 0;
  private now = () => 0;

  constructor(
    private readonly catalogue: Catalogue,
    private readonly stock: Stock,
    private readonly events: EventBus,
  ) {}

  bindClock(now: () => number): void {
    this.now = now;
  }

  list(locationId?: string): PurchaseOrder[] {
    const all = [...this.orders.values()];
    return locationId ? all.filter((p) => p.locationId === locationId) : all;
  }

  open(locationId?: string): PurchaseOrder[] {
    return this.list(locationId).filter((p) => p.status !== 'POSTED');
  }

  draft(supplierId: string, locationId: string, lines: Omit<PurchaseOrderLine, 'receivedUnits' | 'receivedUnitCostMinor'>[], opts: { suggested?: boolean } = {}): PurchaseOrder {
    if (!this.catalogue.suppliers.has(supplierId)) throw new Error(`unknown supplier ${supplierId}`);
    this.seq += 1;
    const po: PurchaseOrder = {
      id: `po_${this.seq}`,
      number: `PO-${String(1040 + this.seq)}`,
      supplierId,
      locationId,
      status: 'DRAFT',
      lines: lines.map((l) => ({ ...l })),
      createdTick: this.now(),
      suggested: opts.suggested,
    };
    this.orders.set(po.id, po);
    this.events.emit({ type: 'po', tick: this.now(), poId: po.id, status: 'DRAFT', locationId, supplierId, note: opts.suggested ? 'Suggested from par levels' : undefined });
    return po;
  }

  send(poId: string): PurchaseOrder {
    const po = this.get(poId);
    if (po.status !== 'DRAFT') throw new Error(`PO ${po.number} is ${po.status}, cannot send`);
    const supplier = this.catalogue.suppliers.get(po.supplierId)!;
    po.status = 'SENT';
    po.sentTick = this.now();
    // Supplier picks within a quarter of the lead time, then the truck rolls.
    po.inTransitTick = po.sentTick + Math.max(1, Math.round(supplier.leadTimeTicks * 0.25));
    po.etaTick = po.sentTick + supplier.leadTimeTicks;
    this.events.emit({ type: 'po', tick: this.now(), poId: po.id, status: 'SENT', locationId: po.locationId, supplierId: po.supplierId });
    return po;
  }

  /** Called every tick: moves SENT orders onto the road and announces arrivals. */
  tick(): void {
    const now = this.now();
    for (const po of this.orders.values()) {
      if (po.status === 'SENT' && po.inTransitTick !== undefined && now >= po.inTransitTick) {
        po.status = 'IN_TRANSIT';
        this.events.emit({ type: 'po', tick: now, poId: po.id, status: 'IN_TRANSIT', locationId: po.locationId, supplierId: po.supplierId });
      }
      if (po.status === 'IN_TRANSIT' && po.etaTick !== undefined && po.arrivedTick === undefined && now >= po.etaTick) {
        po.arrivedTick = now;
        this.events.emit({ type: 'po', tick: now, poId: po.id, status: 'ARRIVED', locationId: po.locationId, supplierId: po.supplierId, note: 'Truck at the dock' });
      }
    }
  }

  /** 0..1 progress of the truck between depot and dock. */
  transitProgress(po: PurchaseOrder): number {
    if (po.status === 'DRAFT' || po.status === 'SENT') return 0;
    if (po.arrivedTick !== undefined || po.status === 'RECEIVED' || po.status === 'POSTED') return 1;
    const start = po.inTransitTick ?? 0;
    const end = po.etaTick ?? start + 1;
    return Math.min(1, Math.max(0, (this.now() - start) / Math.max(1, end - start)));
  }

  hasArrived(po: PurchaseOrder): boolean {
    return po.status === 'IN_TRANSIT' && po.arrivedTick !== undefined;
  }

  /** Record what actually came off the truck. Short lines are the demo's credit note moment. */
  receive(poId: string, actuals: { itemId: string; receivedUnits: number; receivedUnitCostMinor?: number }[]): PurchaseOrder {
    const po = this.get(poId);
    if (po.status !== 'IN_TRANSIT' || po.arrivedTick === undefined) throw new Error(`PO ${po.number} has not arrived`);
    for (const line of po.lines) {
      const a = actuals.find((x) => x.itemId === line.itemId);
      line.receivedUnits = a?.receivedUnits ?? line.orderedUnits;
      line.receivedUnitCostMinor = a?.receivedUnitCostMinor ?? line.unitCostMinor;
    }
    po.status = 'RECEIVED';
    po.receivedTick = this.now();
    const short = po.lines.filter((l) => (l.receivedUnits ?? 0) < l.orderedUnits);
    this.events.emit({
      type: 'po',
      tick: this.now(),
      poId: po.id,
      status: 'RECEIVED',
      locationId: po.locationId,
      supplierId: po.supplierId,
      note: short.length ? `${short.length} line${short.length > 1 ? 's' : ''} short of ordered` : 'All lines as ordered',
    });
    return po;
  }

  /** Post: goods receipt movements and cost layers. Stock and average cost update here. */
  post(poId: string): PurchaseOrder {
    const po = this.get(poId);
    if (po.status !== 'RECEIVED') throw new Error(`PO ${po.number} is ${po.status}, cannot post`);
    for (const line of po.lines) {
      const item = this.catalogue.item(line.itemId);
      const units = line.receivedUnits ?? 0;
      if (units <= 0) continue;
      const factor = item.purchaseUnit?.factor ?? 1;
      const qty: BaseUnits = toBase(units * factor);
      const cost = (line.receivedUnitCostMinor ?? line.unitCostMinor) * units;
      this.stock.receive(item.id, po.locationId, qty, cost, 'GOODS_RECEIPT', `po:${po.id}`);
    }
    po.status = 'POSTED';
    po.postedTick = this.now();
    this.events.emit({ type: 'po', tick: this.now(), poId: po.id, status: 'POSTED', locationId: po.locationId, supplierId: po.supplierId });
    return po;
  }

  totalMinor(po: PurchaseOrder, received = false): number {
    return po.lines.reduce((s, l) => s + (received ? (l.receivedUnitCostMinor ?? l.unitCostMinor) * (l.receivedUnits ?? 0) : l.unitCostMinor * l.orderedUnits), 0);
  }

  /** Units needed to bring an item back up to par (Coming: par levels and suggested orders). */
  unitsToPar(itemId: string, locationId: string): number {
    const lvl = this.stock.level(itemId, locationId);
    const item = this.catalogue.item(itemId);
    if (lvl.parLevel === undefined || !item.purchaseUnit) return 0;
    const gap = lvl.parLevel - lvl.qtyOnHand;
    if (gap <= 0) return 0;
    return Math.ceil(mulDivRound(gap, 1, toBase(item.purchaseUnit.factor)));
  }

  get(poId: string): PurchaseOrder {
    const po = this.orders.get(poId);
    if (!po) throw new Error(`unknown PO ${poId}`);
    return po;
  }
}
