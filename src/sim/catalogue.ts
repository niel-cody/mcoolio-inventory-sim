import type { InventoryItem, Product, Supplier, Venue } from './types';

/** Catalogue: inventory items keyed by id, products keyed by posId. */
export class Catalogue {
  readonly items = new Map<string, InventoryItem>();
  readonly products = new Map<string, Product>();
  readonly suppliers = new Map<string, Supplier>();
  readonly venues = new Map<string, Venue>();

  addItem(item: InventoryItem): InventoryItem {
    this.items.set(item.id, item);
    return item;
  }

  addProduct(product: Product): Product {
    if (!this.items.has(product.itemId)) {
      throw new Error(`product ${product.posId} points at unknown item ${product.itemId}`);
    }
    this.products.set(product.posId, product);
    return product;
  }

  addSupplier(s: Supplier): Supplier {
    this.suppliers.set(s.id, s);
    return s;
  }

  addVenue(v: Venue): Venue {
    this.venues.set(v.id, v);
    return v;
  }

  item(id: string): InventoryItem {
    const it = this.items.get(id);
    if (!it) throw new Error(`unknown inventory item ${id}`);
    return it;
  }

  product(posId: string): Product {
    const p = this.products.get(posId);
    if (!p) throw new Error(`unknown product ${posId}`);
    return p;
  }

  /** Mirrors ResolveItemByProductID: undefined means non-tracked, skip silently. */
  resolveItemByPosId(posId: string): InventoryItem | undefined {
    const p = this.products.get(posId);
    return p ? this.items.get(p.itemId) : undefined;
  }

  /** Every product that depends on an item, directly or via the active recipe. */
  productsUsing(itemId: string, expand: (itemId: string) => { ingredientItemId: string }[] | undefined): Product[] {
    const out: Product[] = [];
    for (const p of this.products.values()) {
      if (p.itemId === itemId) {
        out.push(p);
        continue;
      }
      const lines = expand(p.itemId);
      if (lines?.some((l) => l.ingredientItemId === itemId)) out.push(p);
    }
    return out;
  }

  venueList(): Venue[] {
    return [...this.venues.values()];
  }
}
