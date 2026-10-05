import { SimWorld } from '../sim/world';
import { toBase } from '../sim/baseunits';
import type { SimMode } from '../features';

// Every number here is invented demo data. The footer says so.

export const VENUE = {
  newtown: 'venue_newtown',
  valley: 'venue_valley',
  fitzroy: 'venue_fitzroy',
} as const;

export const SUPPLIER = {
  harbour: 'sup_harbour',
  nightowl: 'sup_nightowl',
  spiceroute: 'sup_spiceroute',
} as const;

export const ITEM = {
  kingfisher: 'item_kingfisher',
  absolut: 'item_absolut',
  greygoose: 'item_greygoose',
  espresso: 'item_espresso',
  sugar: 'item_sugar_syrup',
  water: 'item_water',
  rice: 'item_rice',
  chicken: 'item_chicken',
  spice: 'item_spice',
  naan: 'item_naan',
  biryaniPool: 'item_biryani_pool',
  // NON_STOCKED recipe items behind sellable products
  kf6: 'item_kf6',
  nip: 'item_absolut_nip',
  double: 'item_absolut_double',
  martini: 'item_espresso_martini',
  extraShot: 'item_extra_shot',
  meal: 'item_biryani_meal',
} as const;

export const PRODUCT = {
  kingfisher: 'prod_kingfisher',
  kf6: 'prod_kingfisher_6pack',
  nip: 'prod_absolut_nip',
  double: 'prod_absolut_double',
  martini: 'prod_espresso_martini',
  extraShot: 'prod_extra_shot',
  biryani: 'prod_biryani',
  meal: 'prod_biryani_meal',
} as const;

export const BIRYANI_BATCH = { yieldPortions: 20, riceG: 2000, chickenG: 2500, spiceG: 200, durationTicks: 90 } as const;

interface Opening {
  units: number;
  unitCostMinor: number;
}

export function createMcOolioWorld(seed: number, mode: SimMode = 'today'): SimWorld {
  const w = new SimWorld(seed);
  w.mode = mode;
  const c = w.catalogue;

  // ─── Venues ───────────────────────────────────────────────────────────────
  c.addVenue({ id: VENUE.newtown, name: 'McOolio Newtown', shortName: 'Newtown', character: 'Flagship, biggest kitchen', position: [-10, 3] });
  c.addVenue({ id: VENUE.valley, name: 'McOolio Fortitude Valley', shortName: 'Valley', character: 'Late-night bar heavy', position: [9, 5] });
  c.addVenue({ id: VENUE.fitzroy, name: 'McOolio Fitzroy', shortName: 'Fitzroy', character: 'Cocktail-led', position: [0, -8] });

  // ─── Suppliers ────────────────────────────────────────────────────────────
  c.addSupplier({ id: SUPPLIER.harbour, name: 'Harbour Liquor Co', type: 'LIQUOR', leadTimeTicks: 90, colour: '#f2b134' });
  c.addSupplier({ id: SUPPLIER.nightowl, name: 'Night Owl Roasters', type: 'COFFEE', leadTimeTicks: 200, colour: '#c9774a' });
  c.addSupplier({ id: SUPPLIER.spiceroute, name: 'Spice Route Wholesale', type: 'FOOD', leadTimeTicks: 120, colour: '#e0553d' });

  // ─── Stock items ──────────────────────────────────────────────────────────
  c.addItem({ id: ITEM.kingfisher, name: 'Kingfisher 330 mL', itemType: 'STOCKED', baseUom: 'each', zone: 'coolroom', purchaseUnit: { name: 'Carton of 24', factor: 24 }, supplierId: SUPPLIER.harbour, colour: '#f5a524' });
  c.addItem({ id: ITEM.absolut, name: 'Absolut Vodka', itemType: 'STOCKED', baseUom: 'mL', zone: 'bar', purchaseUnit: { name: '700 mL bottle', factor: 700 }, supplierId: SUPPLIER.harbour, colour: '#9fd8ff' });
  c.addItem({ id: ITEM.greygoose, name: 'Grey Goose Vodka', itemType: 'STOCKED', baseUom: 'mL', zone: 'bar', purchaseUnit: { name: '700 mL bottle', factor: 700 }, supplierId: SUPPLIER.harbour, colour: '#dfe9f3' });
  c.addItem({ id: ITEM.espresso, name: 'Espresso (from beans)', itemType: 'STOCKED', baseUom: 'mL', zone: 'bar', purchaseUnit: { name: '1 kg bag', factor: 3600 }, supplierId: SUPPLIER.nightowl, colour: '#5b3a29' });
  c.addItem({ id: ITEM.sugar, name: 'Sugar syrup', itemType: 'STOCKED', baseUom: 'mL', zone: 'bar', purchaseUnit: { name: '1 L bottle', factor: 1000 }, supplierId: SUPPLIER.harbour, colour: '#f7e3a1' });
  c.addItem({ id: ITEM.water, name: 'Filtered water', itemType: 'STOCKED', baseUom: 'mL', zone: 'bar', colour: '#bfe6ff' });
  c.addItem({ id: ITEM.rice, name: 'Basmati rice', itemType: 'STOCKED', baseUom: 'g', zone: 'kitchen', purchaseUnit: { name: '10 kg bag', factor: 10_000 }, supplierId: SUPPLIER.spiceroute, colour: '#f3ead5' });
  c.addItem({ id: ITEM.chicken, name: 'Chicken thigh', itemType: 'STOCKED', baseUom: 'g', zone: 'kitchen', purchaseUnit: { name: '5 kg case', factor: 5_000 }, supplierId: SUPPLIER.spiceroute, colour: '#f0b7a4' });
  c.addItem({ id: ITEM.spice, name: 'Biryani spice mix', itemType: 'STOCKED', baseUom: 'g', zone: 'kitchen', purchaseUnit: { name: '1 kg tub', factor: 1_000 }, supplierId: SUPPLIER.spiceroute, colour: '#d9742b' });
  c.addItem({ id: ITEM.naan, name: 'Naan', itemType: 'STOCKED', baseUom: 'each', zone: 'kitchen', purchaseUnit: { name: 'Pack of 10', factor: 10 }, supplierId: SUPPLIER.spiceroute, colour: '#f1d9a6' });
  c.addItem({ id: ITEM.biryaniPool, name: 'Biryani (batch pool)', itemType: 'BATCH', baseUom: 'portion', zone: 'kitchen', colour: '#e8a33d' });

  // NON_STOCKED items: recipe only, no stock of their own.
  c.addItem({ id: ITEM.kf6, name: 'Kingfisher 6-pack', itemType: 'NON_STOCKED', baseUom: 'each', zone: 'coolroom' });
  c.addItem({ id: ITEM.nip, name: 'Absolut Nip 30 mL', itemType: 'NON_STOCKED', baseUom: 'each', zone: 'bar' });
  c.addItem({ id: ITEM.double, name: 'Absolut Double 60 mL', itemType: 'NON_STOCKED', baseUom: 'each', zone: 'bar' });
  c.addItem({ id: ITEM.martini, name: 'Espresso Martini', itemType: 'NON_STOCKED', baseUom: 'each', zone: 'bar' });
  c.addItem({ id: ITEM.extraShot, name: 'Extra shot', itemType: 'NON_STOCKED', baseUom: 'each', zone: 'bar' });
  c.addItem({ id: ITEM.meal, name: 'Biryani Meal', itemType: 'NON_STOCKED', baseUom: 'each', zone: 'kitchen' });

  // ─── Recipes (spec section 3, Go scenario numbers) ────────────────────────
  w.recipes.define(ITEM.kf6, [{ ingredientItemId: ITEM.kingfisher, qty: 6 }]);
  w.recipes.define(ITEM.nip, [{ ingredientItemId: ITEM.absolut, qty: 30 }]);
  w.recipes.define(ITEM.double, [{ ingredientItemId: ITEM.absolut, qty: 60 }]);
  w.recipes.define(ITEM.martini, [
    { ingredientItemId: ITEM.absolut, qty: 45 },
    { ingredientItemId: ITEM.espresso, qty: 30 },
    { ingredientItemId: ITEM.sugar, qty: 7.5 },
    { ingredientItemId: ITEM.water, qty: 7.5 },
  ]);
  w.recipes.define(ITEM.extraShot, [{ ingredientItemId: ITEM.espresso, qty: 30 }]);
  w.recipes.define(ITEM.meal, [
    { ingredientItemId: ITEM.biryaniPool, qty: 1 },
    { ingredientItemId: ITEM.naan, qty: 1 },
  ]);
  w.recipes.define(
    ITEM.biryaniPool,
    [
      { ingredientItemId: ITEM.rice, qty: BIRYANI_BATCH.riceG },
      { ingredientItemId: ITEM.chicken, qty: BIRYANI_BATCH.chickenG },
      { ingredientItemId: ITEM.spice, qty: BIRYANI_BATCH.spiceG },
    ],
    { yieldQty: BIRYANI_BATCH.yieldPortions, note: 'House biryani, 20 portions' },
  );

  // ─── Sellable products ────────────────────────────────────────────────────
  c.addProduct({ posId: PRODUCT.kingfisher, name: 'Kingfisher', itemId: ITEM.kingfisher, priceMinor: 950 });
  c.addProduct({ posId: PRODUCT.kf6, name: 'Kingfisher 6-pack', itemId: ITEM.kf6, priceMinor: 4800 });
  c.addProduct({ posId: PRODUCT.nip, name: 'Absolut Nip', itemId: ITEM.nip, priceMinor: 1100 });
  c.addProduct({ posId: PRODUCT.double, name: 'Absolut Double', itemId: ITEM.double, priceMinor: 1800 });
  c.addProduct({ posId: PRODUCT.martini, name: 'Espresso Martini', itemId: ITEM.martini, priceMinor: 2200 });
  c.addProduct({ posId: PRODUCT.extraShot, name: 'Extra shot', itemId: ITEM.extraShot, priceMinor: 300, isModifier: true });
  c.addProduct({ posId: PRODUCT.biryani, name: 'Biryani', itemId: ITEM.biryaniPool, priceMinor: 1800 });
  c.addProduct({ posId: PRODUCT.meal, name: 'Biryani Meal', itemId: ITEM.meal, priceMinor: 2400 });

  // ─── Opening stock, in purchase units ─────────────────────────────────────
  const opening: Record<string, Partial<Record<string, Opening>>> = {
    [VENUE.newtown]: {
      [ITEM.kingfisher]: { units: 10, unitCostMinor: 4800 },
      [ITEM.absolut]: { units: 10, unitCostMinor: 2800 },
      [ITEM.greygoose]: { units: 2, unitCostMinor: 5200 },
      [ITEM.espresso]: { units: 2, unitCostMinor: 4500 },
      [ITEM.sugar]: { units: 3, unitCostMinor: 900 },
      [ITEM.rice]: { units: 4, unitCostMinor: 3200 },
      [ITEM.chicken]: { units: 3, unitCostMinor: 5500 },
      [ITEM.spice]: { units: 2, unitCostMinor: 2400 },
      [ITEM.naan]: { units: 6, unitCostMinor: 1200 },
    },
    [VENUE.valley]: {
      [ITEM.kingfisher]: { units: 6, unitCostMinor: 4800 },
      [ITEM.absolut]: { units: 6, unitCostMinor: 2800 },
      [ITEM.espresso]: { units: 1, unitCostMinor: 4500 },
      [ITEM.sugar]: { units: 2, unitCostMinor: 900 },
      [ITEM.rice]: { units: 2, unitCostMinor: 3200 },
      [ITEM.chicken]: { units: 1, unitCostMinor: 5500 },
      [ITEM.spice]: { units: 1, unitCostMinor: 2400 },
      [ITEM.naan]: { units: 3, unitCostMinor: 1200 },
    },
    [VENUE.fitzroy]: {
      [ITEM.kingfisher]: { units: 6, unitCostMinor: 4800 },
      [ITEM.absolut]: { units: 5, unitCostMinor: 2800 },
      [ITEM.greygoose]: { units: 3, unitCostMinor: 5200 },
      [ITEM.espresso]: { units: 2, unitCostMinor: 4500 },
      [ITEM.sugar]: { units: 2, unitCostMinor: 900 },
      [ITEM.rice]: { units: 2, unitCostMinor: 3200 },
      [ITEM.chicken]: { units: 1, unitCostMinor: 5500 },
      [ITEM.spice]: { units: 1, unitCostMinor: 2400 },
      [ITEM.naan]: { units: 3, unitCostMinor: 1200 },
    },
  };
  for (const [venueId, items] of Object.entries(opening)) {
    for (const [itemId, o] of Object.entries(items)) {
      if (!o) continue;
      const item = c.item(itemId);
      const factor = item.purchaseUnit?.factor ?? 1;
      w.stock.receive(itemId, venueId, toBase(o.units * factor), o.unitCostMinor * o.units, 'OPENING', 'opening');
    }
    // Water is on tap: plenty of it, no cost.
    w.stock.receive(ITEM.water, venueId, toBase(200_000), 0, 'OPENING', 'opening');
  }

  // Portions left from yesterday's batch, valued at a demo cost per portion.
  w.stock.receive(ITEM.biryaniPool, VENUE.newtown, toBase(60), 60 * 310, 'OPENING', 'opening');
  w.stock.receive(ITEM.biryaniPool, VENUE.valley, toBase(24), 24 * 310, 'OPENING', 'opening');
  w.stock.receive(ITEM.biryaniPool, VENUE.fitzroy, toBase(18), 18 * 310, 'OPENING', 'opening');

  // ─── Reorder points and pars (par-driven ordering is a Coming feature; the thresholds themselves are plain data) ─
  const thresholds: Record<string, { reorder: number; par: number }> = {
    [ITEM.kingfisher]: { reorder: 48, par: 144 },
    [ITEM.absolut]: { reorder: 700, par: 4200 },
    [ITEM.greygoose]: { reorder: 350, par: 1400 },
    [ITEM.espresso]: { reorder: 600, par: 7200 },
    [ITEM.sugar]: { reorder: 500, par: 3000 },
    [ITEM.rice]: { reorder: 5_000, par: 40_000 },
    [ITEM.chicken]: { reorder: 2_500, par: 15_000 },
    [ITEM.spice]: { reorder: 300, par: 2_000 },
    [ITEM.naan]: { reorder: 10, par: 60 },
    [ITEM.biryaniPool]: { reorder: 4, par: 20 },
  };
  for (const venue of c.venueList()) {
    for (const [itemId, t] of Object.entries(thresholds)) {
      // Only items the venue actually stocks get thresholds; an empty level would read as sold out.
      if (!w.stock.levels.has(`${itemId}@${venue.id}`)) continue;
      w.stock.setThresholds(itemId, venue.id, { reorderPoint: toBase(t.reorder), parLevel: toBase(t.par) });
    }
  }

  // Opening stock should not count in the event feed.
  w.events.clear();
  return w;
}
