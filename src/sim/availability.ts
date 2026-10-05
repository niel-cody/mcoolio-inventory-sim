import { toBase, type BaseUnits } from './baseunits';
import type { Catalogue } from './catalogue';
import type { RecipeBook } from './recipe';
import type { Stock } from './stock';

export interface Availability {
  posId: string;
  locationId: string;
  /** Whole servings the stock on hand can make. Negative when oversold. */
  servingsLeft: number;
  /** The ingredient that limits the product, if any. */
  limitingItemId?: string;
  soldOut: boolean;
}

export type HeatLevel = 'healthy' | 'warning' | 'soldout';

/**
 * Read-only availability derived from stock. Depletion taking an ingredient to
 * zero is today; switching the product off at that venue's POS is the Coming
 * sold-out flag. This module only answers "how many could we make".
 */
export class AvailabilityIndex {
  constructor(
    private readonly catalogue: Catalogue,
    private readonly recipes: RecipeBook,
    private readonly stock: Stock,
  ) {}

  /** Demand per one unit of the product, by ingredient item, in base units. */
  perUnitDemand(posId: string, locationId?: string): { itemId: string; qty: BaseUnits }[] {
    const item = this.catalogue.resolveItemByPosId(posId);
    if (!item) return [];
    if (item.itemType !== 'NON_STOCKED') return [{ itemId: item.id, qty: toBase(1) }];
    return (this.recipes.expandActive(item.id, locationId) ?? []).map((l) => ({ itemId: l.ingredientItemId, qty: toBase(l.effectiveQty) }));
  }

  of(posId: string, locationId: string): Availability {
    const demand = this.perUnitDemand(posId, locationId);
    let servingsLeft = Number.POSITIVE_INFINITY;
    let limitingItemId: string | undefined;
    for (const d of demand) {
      if (d.qty <= 0) continue;
      const onHand = this.stock.onHand(d.itemId, locationId);
      const servings = Math.floor(onHand / d.qty);
      if (servings < servingsLeft) {
        servingsLeft = servings;
        limitingItemId = d.itemId;
      }
    }
    if (!Number.isFinite(servingsLeft)) servingsLeft = 0;
    return { posId, locationId, servingsLeft, limitingItemId, soldOut: servingsLeft <= 0 };
  }

  soldOutProducts(locationId: string): Availability[] {
    const out: Availability[] = [];
    for (const p of this.catalogue.products.values()) {
      if (p.isModifier) continue;
      const a = this.of(p.posId, locationId);
      if (a.soldOut) out.push(a);
    }
    return out;
  }

  /** Heat for an item at a location: red at or below zero, amber at or below reorder point. */
  itemHeat(itemId: string, locationId: string): HeatLevel {
    const lvl = this.stock.level(itemId, locationId);
    if (lvl.qtyOnHand <= 0) return 'soldout';
    if (lvl.reorderPoint !== undefined && lvl.qtyOnHand <= lvl.reorderPoint) return 'warning';
    return 'healthy';
  }

  /** Worst heat across every purchased item at a venue. */
  venueHeat(locationId: string): HeatLevel {
    let worst: HeatLevel = 'healthy';
    for (const item of this.catalogue.items.values()) {
      if (item.itemType === 'NON_STOCKED') continue;
      if (!this.stock.levels.has(`${item.id}@${locationId}`)) continue;
      const h = this.itemHeat(item.id, locationId);
      if (h === 'soldout') return 'soldout';
      if (h === 'warning') worst = 'warning';
    }
    return worst;
  }
}
