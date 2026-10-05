import { toBase } from './baseunits';
import type { Catalogue } from './catalogue';
import type { RecipeBook } from './recipe';
import type { Stock } from './stock';
import type { Demand, DepletionAction, DepletionState, OrderEvent, OrderIncludedItem, OrderItem, OrderOption, OrderStatus } from './types';

/**
 * Port of server/internal/modules/depletion/application/service.go.
 * expandOrder walks the order line tree and aggregates base-measure demands by
 * item; resolve switches on item type; decideAction is the state × status matrix.
 */

type Acc = Map<string, number>; // itemId -> decimal qty (rounded to base units once, at the end, like Go)

export interface ExpandResult {
  demands: Demand[];
  /** Human-readable line summary for the event feed. */
  lines: string[];
  revenueMinor: number;
}

export class DepletionEngine {
  readonly states = new Map<string, DepletionState>();
  /** Cost pulled at commit per order, so GP can be reported. */
  readonly orderCost = new Map<string, number>();
  readonly orderRevenue = new Map<string, number>();

  constructor(
    private readonly catalogue: Catalogue,
    private readonly recipes: RecipeBook,
    private readonly stock: Stock,
  ) {}

  // ─── decideAction ───────────────────────────────────────────────────────────

  static decideAction(status: OrderStatus | string, isTraining: boolean, refundOf: string | undefined, current: DepletionState | undefined, version: number): DepletionAction {
    if (isTraining) return 'IGNORE';
    if (current && version < current.lastEventVersion) return 'IGNORE';
    if (refundOf) return DepletionEngine.decideRefundOrCancel(current);
    switch (status) {
      case 'draft':
      case 'scheduled':
        return 'IGNORE';
      case 'created':
      case 'accepted':
        return current ? 'IGNORE' : 'RESERVE';
      case 'complete':
        if (!current) return 'COMMIT';
        return current.state === 'RESERVED' ? 'COMMIT' : 'IGNORE';
      case 'cancelled':
      case 'venue_cancelled':
      case 'rejected':
      case 'refunded':
        return DepletionEngine.decideRefundOrCancel(current);
      default:
        return 'IGNORE';
    }
  }

  private static decideRefundOrCancel(current: DepletionState | undefined): DepletionAction {
    if (!current) return 'IGNORE';
    if (current.state === 'RESERVED') return 'RELEASE';
    if (current.state === 'COMMITTED') return 'REVERSE';
    return 'IGNORE';
  }

  // ─── expandOrder ────────────────────────────────────────────────────────────

  expandOrder(order: OrderEvent): ExpandResult {
    const acc: Acc = new Map();
    const lines: string[] = [];
    let revenueMinor = 0;

    for (const line of order.items) {
      const suppressed = this.suppressedIngredients(line.options);
      const lineHasChildren = (line.includedItems?.length ?? 0) > 0 || (line.bundledItems?.length ?? 0) > 0;
      const isWrapper = this.resolve(order.locationId, line.posId, line.quantity, acc, suppressed, lineHasChildren);

      // A wrapper (empty posId, or a variant parent that IS the stocked pool) contributes 1x:
      // the POS mirrors the absolute count onto the child, so multiplying would square it.
      let lineMult = line.quantity;
      if (isWrapper || !isPosIdShaped(line.posId)) lineMult = 1;

      this.resolveOptions(order.locationId, line.options, lineMult, acc, suppressed);
      for (const b of line.bundledItems ?? []) {
        for (const inc of b.includedItems) this.resolveIncludedItem(order.locationId, inc, lineMult, acc, suppressed);
      }
      for (const inc of line.includedItems ?? []) this.resolveIncludedItem(order.locationId, inc, lineMult, acc, suppressed);

      revenueMinor += this.lineRevenue(line);
      lines.push(this.describeLine(line));
    }

    const demands: Demand[] = [];
    for (const [itemId, qty] of acc) {
      if (qty <= 0) continue; // never emit a non-positive demand
      demands.push({ itemId, locationId: order.locationId, qty: toBase(qty), sourceRef: `order:${order.id}:item:${itemId}` });
    }
    return { demands, lines, revenueMinor };
  }

  /** Returns true only when this call recognised a variant-parent wrapper. */
  private resolve(locationId: string, posId: string, q: number, acc: Acc, suppressed: Set<string>, suppressDirectStock: boolean): boolean {
    if (!isPosIdShaped(posId)) return false; // non-tracked wrapper, skip
    const item = this.catalogue.resolveItemByPosId(posId);
    if (!item) return false; // no inventory row, non-tracked, skip

    switch (item.itemType) {
      case 'STOCKED':
      case 'BATCH':
        // Direct demand, no recipe expansion: BATCH raw ingredients were consumed at production.
        if (suppressDirectStock) return true;
        addDemand(acc, suppressed, item.id, q);
        return false;
      case 'NON_STOCKED': {
        const expanded = this.recipes.expandActive(item.id, locationId) ?? [];
        for (const l of expanded) addDemand(acc, suppressed, l.ingredientItemId, q * l.effectiveQty);
        return false;
      }
    }
  }

  private resolveOptions(locationId: string, opts: OrderOption[] | undefined, mult: number, acc: Acc, suppressed: Set<string>): void {
    for (const opt of opts ?? []) {
      for (const v of opt.variants) {
        const varQty = v.quantity ?? 1;
        this.resolve(locationId, v.posId, mult * varQty, acc, suppressed, false);
      }
    }
  }

  private resolveIncludedItem(locationId: string, inc: OrderIncludedItem, mult: number, acc: Acc, parentSuppressed: Set<string>): void {
    const own = this.suppressedIngredients(inc.options);
    const suppressed = own.size === 0 ? parentSuppressed : new Set([...parentSuppressed, ...own]);
    const incMult = mult * inc.quantity;
    this.resolve(locationId, inc.posId, incMult, acc, suppressed, false);
    this.resolveOptions(locationId, inc.options, incMult, acc, suppressed);
  }

  private suppressedIngredients(opts: OrderOption[] | undefined): Set<string> {
    const ids: string[] = [];
    for (const opt of opts ?? []) for (const v of opt.variants) if (isPosIdShaped(v.posId)) ids.push(v.posId);
    return ids.length ? this.recipes.resolveRemovals(ids) : new Set();
  }

  private lineRevenue(line: OrderItem): number {
    let total = 0;
    const p = this.catalogue.products.get(line.posId);
    if (p) total += p.priceMinor * line.quantity;
    for (const opt of line.options ?? []) for (const v of opt.variants) {
      const m = this.catalogue.products.get(v.posId);
      if (m) total += m.priceMinor * (v.quantity ?? 1) * (p ? line.quantity : 1);
    }
    for (const inc of line.includedItems ?? []) {
      const ip = this.catalogue.products.get(inc.posId);
      if (ip) total += ip.priceMinor * inc.quantity * (p ? 1 : 1);
    }
    for (const b of line.bundledItems ?? []) for (const inc of b.includedItems) {
      const ip = this.catalogue.products.get(inc.posId);
      if (ip) total += ip.priceMinor * inc.quantity * line.quantity;
    }
    return total;
  }

  private describeLine(line: OrderItem): string {
    const name = this.catalogue.products.get(line.posId)?.name ?? (line.posId ? 'Untracked item' : 'Variant');
    const mods = (line.options ?? []).flatMap((o) => o.variants.map((v) => this.catalogue.products.get(v.posId)?.name)).filter(Boolean);
    const incs = (line.includedItems ?? []).map((i) => `${i.quantity} ${this.catalogue.products.get(i.posId)?.name ?? i.posId}`);
    const parts = [`${line.quantity} ${name}`];
    if (incs.length) parts.push(incs.join(', '));
    if (mods.length) parts.push(`+ ${mods.join(', ')}`);
    return parts.join(' ');
  }

  // ─── ProcessOrderEvent ──────────────────────────────────────────────────────

  process(order: OrderEvent): { action: DepletionAction; demands: Demand[]; lines: string[]; revenueMinor: number; costMinor: number } {
    const current = this.states.get(order.id);
    const action = DepletionEngine.decideAction(order.status, order.isTraining ?? false, order.refundOf, current, order.version);
    if (action === 'IGNORE') return { action, demands: [], lines: [], revenueMinor: 0, costMinor: 0 };

    let demands: Demand[] = [];
    let lines: string[] = [];
    let revenueMinor = 0;
    let costMinor = 0;

    if (action === 'RESERVE' || action === 'COMMIT') {
      const r = this.expandOrder(order);
      demands = r.demands;
      lines = r.lines;
      revenueMinor = r.revenueMinor;
      if (demands.length === 0) return { action: 'IGNORE', demands, lines, revenueMinor: 0, costMinor: 0 };
    }

    switch (action) {
      case 'RESERVE':
        this.stock.reserve(order.id, demands);
        this.orderRevenue.set(order.id, revenueMinor);
        break;
      case 'COMMIT': {
        const res = this.stock.commit(order.id, demands);
        costMinor = res.costMinor;
        this.orderCost.set(order.id, costMinor);
        this.orderRevenue.set(order.id, revenueMinor);
        break;
      }
      case 'RELEASE':
        this.stock.release(order.id);
        break;
      case 'REVERSE':
        this.stock.reverse(order.id);
        costMinor = -(this.orderCost.get(order.id) ?? 0);
        revenueMinor = -(this.orderRevenue.get(order.id) ?? 0);
        break;
    }

    const next: Record<Exclude<DepletionAction, 'IGNORE'>, DepletionState['state']> = {
      RESERVE: 'RESERVED',
      COMMIT: 'COMMITTED',
      RELEASE: 'RELEASED',
      REVERSE: 'REVERSED',
    };
    this.states.set(order.id, { state: next[action], lastEventVersion: order.version });
    return { action, demands, lines, revenueMinor, costMinor };
  }
}

function addDemand(acc: Acc, suppressed: Set<string>, itemId: string, q: number): void {
  if (suppressed.has(itemId)) return;
  acc.set(itemId, (acc.get(itemId) ?? 0) + q);
}

/** Go parses posId as a UUID; here any non-empty id counts as product-shaped. */
function isPosIdShaped(posId: string): boolean {
  return posId.length > 0;
}
