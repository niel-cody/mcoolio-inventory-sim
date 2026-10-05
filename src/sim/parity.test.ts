// Port of server/internal/modules/depletion/application/scenario_test.go.
// Each test keeps the Go test's name so the two files can be read side by side.
import { describe, expect, it } from 'vitest';
import { toBase, toDecimal } from './baseunits';
import { Catalogue } from './catalogue';
import { DepletionEngine } from './depletion';
import { RecipeBook } from './recipe';
import { Stock } from './stock';
import type { OrderItem, RecipeLine } from './types';

class ScenarioFixture {
  readonly loc = 'loc_test';
  readonly catalogue = new Catalogue();
  readonly recipes = new RecipeBook();
  readonly stock = new Stock();
  readonly svc = new DepletionEngine(this.catalogue, this.recipes, this.stock);
  private n = 0;

  private id(prefix: string): string {
    this.n += 1;
    return `${prefix}_${this.n}`;
  }

  /** A pool item reachable only through a recipe. Not registered as a product. */
  stocked(): string {
    const id = this.id('item');
    this.catalogue.addItem({ id, name: id, itemType: 'STOCKED', baseUom: 'mL', zone: 'bar' });
    return id;
  }

  /** A posId resolving to a STOCKED item. Returns the item id. */
  stockedProduct(pos: string): string {
    const id = this.id('item');
    this.catalogue.addItem({ id, name: id, itemType: 'STOCKED', baseUom: 'each', zone: 'bar' });
    this.catalogue.addProduct({ posId: pos, name: pos, itemId: id, priceMinor: 0 });
    return id;
  }

  /** Registers a posId resolving to a STOCKED pool that already exists (variant parent IS the pool). */
  poolAsProduct(pos: string, poolItemId: string): void {
    this.catalogue.addProduct({ posId: pos, name: pos, itemId: poolItemId, priceMinor: 0 });
  }

  batchItem(pos: string): string {
    const id = this.id('item');
    this.catalogue.addItem({ id, name: id, itemType: 'BATCH', baseUom: 'portion', zone: 'kitchen' });
    this.catalogue.addProduct({ posId: pos, name: pos, itemId: id, priceMinor: 0 });
    return id;
  }

  nonStocked(pos: string, ...lines: RecipeLine[]): string {
    const id = this.id('item');
    this.catalogue.addItem({ id, name: id, itemType: 'NON_STOCKED', baseUom: 'each', zone: 'bar' });
    this.catalogue.addProduct({ posId: pos, name: pos, itemId: id, priceMinor: 0 });
    this.recipes.define(id, lines);
    return id;
  }

  removal(ingredient: string): string {
    const mod = this.id('mod');
    this.recipes.defineRemoval(mod, [ingredient]);
    return mod;
  }

  /** Runs a "complete" order (COMMIT) and returns committed base-unit demands by item id. */
  commit(...items: OrderItem[]): Map<string, number> {
    const r = this.svc.process({ id: 'ord_scenario', locationId: this.loc, status: 'complete', version: 1, items });
    expect(r.action).toBe('COMMIT');
    const m = new Map<string, number>();
    for (const d of r.demands) {
      expect(d.locationId).toBe(this.loc);
      m.set(d.itemId, d.qty);
    }
    // The committed reservations must mirror the demands exactly.
    const rows = this.stock.reservationsFor('ord_scenario');
    expect(rows.every((row) => row.status === 'COMMITTED')).toBe(true);
    expect(rows.length).toBe(r.demands.length);
    return m;
  }
}

const line = (ingredientItemId: string, qty: number): RecipeLine => ({ ingredientItemId, qty });
const itemLine = (posId: string, quantity: number): OrderItem => ({ posId, quantity });
const removeModifier = (modPos: string) => ({ variants: [{ posId: modPos }] });

function assertQty(got: Map<string, number>, item: string, wantDecimal: number, name: string): void {
  const want = toBase(wantDecimal);
  const v = got.get(item);
  expect(v, `${name}: no demand emitted, want ${wantDecimal}`).toBeDefined();
  expect(v, `${name}: demand = ${toDecimal(v ?? 0)}, want ${wantDecimal}`).toBe(want);
  expect(Number.isInteger(v)).toBe(true);
}

describe('depletion parity with the Go scenario tests', () => {
  it('TestScenario_KingfisherSixPack: 2 six-packs = 12 each, one demand', () => {
    const f = new ScenarioFixture();
    const kingfisher = f.stocked();
    f.nonStocked('prodKf6', line(kingfisher, 6));
    const got = f.commit(itemLine('prodKf6', 2));
    expect(got.size).toBe(1);
    assertQty(got, kingfisher, 12, 'kingfisher');
  });

  it('TestScenario_EspressoMartini: four demands, 45 / 30 / 7.5 / 7.5', () => {
    const f = new ScenarioFixture();
    const [vodka, espresso, sugar, water] = [f.stocked(), f.stocked(), f.stocked(), f.stocked()];
    f.nonStocked('prodMartini', line(vodka, 45), line(espresso, 30), line(sugar, 7.5), line(water, 7.5));
    const got = f.commit(itemLine('prodMartini', 1));
    expect(got.size).toBe(4);
    assertQty(got, vodka, 45, 'vodka');
    assertQty(got, espresso, 30, 'espresso');
    assertQty(got, sugar, 7.5, 'sugar');
    assertQty(got, water, 7.5, 'water');
    expect(got.get(sugar)).toBe(75_000); // 7.5 x 10,000 exactly, no float drift
  });

  it('TestScenario_EspressoMartini_ExtraShotModifier: espresso 30 + 30 aggregated to 60', () => {
    const f = new ScenarioFixture();
    const [vodka, espresso, sugar, water] = [f.stocked(), f.stocked(), f.stocked(), f.stocked()];
    f.nonStocked('prodMartini', line(vodka, 45), line(espresso, 30), line(sugar, 7.5), line(water, 7.5));
    f.nonStocked('prodExtraShot', line(espresso, 30));
    const got = f.commit({ posId: 'prodMartini', quantity: 1, options: [{ variants: [{ posId: 'prodExtraShot' }] }] });
    assertQty(got, espresso, 60, 'espresso (base + extra shot)');
    assertQty(got, vodka, 45, 'vodka');
  });

  it('TestScenario_BiryaniMeal_BatchBoundary: pool + naan, raw rice never appears', () => {
    const f = new ScenarioFixture();
    const biryaniBatch = f.stocked();
    const naan = f.stocked();
    const rawRice = f.stocked();
    f.nonStocked('prodMeal', line(biryaniBatch, 1), line(naan, 1));
    const got = f.commit(itemLine('prodMeal', 3));
    expect(got.size).toBe(2);
    assertQty(got, biryaniBatch, 3, 'biryani batch pool');
    assertQty(got, naan, 3, 'naan');
    expect(got.has(rawRice)).toBe(false);
  });

  it('TestScenario_BiryaniBatchItem_Direct: BATCH depletes its pool and ignores its recipe', () => {
    const f = new ScenarioFixture();
    const itemBiryani = f.batchItem('prodBiryani');
    const rawRice = f.stocked();
    f.recipes.define(itemBiryani, [line(rawRice, 200)]);
    const got = f.commit(itemLine('prodBiryani', 4));
    expect(got.size).toBe(1);
    assertQty(got, itemBiryani, 4, 'biryani batch item');
    expect(got.has(rawRice)).toBe(false);
  });

  it('TestScenario_AbsolutVodka_PourVariantsAggregate: double 60 + nip 30 = 90 on one pool', () => {
    const f = new ScenarioFixture();
    const absolutPour = f.stocked();
    f.nonStocked('prodDouble', line(absolutPour, 60));
    f.nonStocked('prodNip', line(absolutPour, 30));
    const got = f.commit({ posId: 'prodDouble', quantity: 1, includedItems: [{ posId: 'prodNip', quantity: 1 }] });
    expect(got.size).toBe(1);
    assertQty(got, absolutPour, 90, 'absolut pour (double 60 + nip 30)');
  });

  it('TestScenario_VariantWrapperIncludedItem_NoQuantitySquaring: 6 x 60 = 360, not 36 x 60', () => {
    const f = new ScenarioFixture();
    const absolutPour = f.stocked();
    f.nonStocked('prod60', line(absolutPour, 60));
    const got = f.commit({ posId: '', quantity: 6, includedItems: [{ posId: 'prod60', quantity: 6 }] });
    assertQty(got, absolutPour, 360, 'absolut (6 x 60 ml, not 36 x 60)');
  });

  it('TestScenario_ProductLineWithIncludedItem_StillMultipliesByLineQuantity', () => {
    const f = new ScenarioFixture();
    const [vodka, garnish] = [f.stocked(), f.stocked()];
    f.nonStocked('prodDouble', line(vodka, 60));
    f.nonStocked('prodGarnish', line(garnish, 5));
    const got = f.commit({ posId: 'prodDouble', quantity: 2, includedItems: [{ posId: 'prodGarnish', quantity: 1 }] });
    assertQty(got, vodka, 120, 'vodka (2 doubles x 60)');
    assertQty(got, garnish, 10, 'garnish (2 doubles x 1 x 5)');
  });

  it('TestScenario_VariantParentIsStockedPool_NoDoubleCount: child recipe only, 30 not 31', () => {
    const f = new ScenarioFixture();
    const pool = f.stocked();
    f.poolAsProduct('parentPos', pool);
    f.nonStocked('childPos', line(pool, 30));
    const got = f.commit({ posId: 'parentPos', quantity: 1, includedItems: [{ posId: 'childPos', quantity: 1 }] });
    expect(got.size).toBe(1);
    assertQty(got, pool, 30, 'absolut pool (child recipe only)');
  });

  it('TestScenario_VariantParentWrapper_NoQuantitySquaring: 2 x 30 = 60, not 2 x 2 x 30', () => {
    const f = new ScenarioFixture();
    const pool = f.stocked();
    f.poolAsProduct('parentPos', pool);
    f.nonStocked('childPos', line(pool, 30));
    const got = f.commit({ posId: 'parentPos', quantity: 2, includedItems: [{ posId: 'childPos', quantity: 2 }] });
    assertQty(got, pool, 60, 'absolut pool (2 x 30 mL)');
  });

  it('TestScenario_VariantParentWrapper_ModifierStillDepletes', () => {
    const f = new ScenarioFixture();
    const pool = f.stocked();
    f.poolAsProduct('parentPos', pool);
    f.nonStocked('childPos', line(pool, 30));
    const modItem = f.batchItem('modPos');
    const got = f.commit({
      posId: 'parentPos',
      quantity: 1,
      options: [{ variants: [{ posId: 'modPos' }] }],
      includedItems: [{ posId: 'childPos', quantity: 1 }],
    });
    assertQty(got, pool, 30, 'pool (child recipe, parent not double-counted)');
    assertQty(got, modItem, 1, 'modifier on wrapper line still depletes');
  });

  it('TestScenario_StockedNonVariant_WithModifier_BothDeplete: 2 beers + 2 add-ons', () => {
    const f = new ScenarioFixture();
    const beer = f.stockedProduct('beerPos');
    const modItem = f.stockedProduct('modPos');
    const got = f.commit({ posId: 'beerPos', quantity: 2, options: [{ variants: [{ posId: 'modPos' }] }] });
    assertQty(got, beer, 2, 'stocked product depletes directly');
    assertQty(got, modItem, 2, 'modifier depletes (2 x 1)');
  });

  it('TestScenario_PizzaRecipe: multi-ingredient food recipe x2', () => {
    const f = new ScenarioFixture();
    const [dough, cheese, sauce] = [f.stocked(), f.stocked(), f.stocked()];
    f.nonStocked('prodPizza', line(dough, 1), line(cheese, 150), line(sauce, 80));
    const got = f.commit(itemLine('prodPizza', 2));
    assertQty(got, dough, 2, 'dough');
    assertQty(got, cheese, 300, 'cheese');
    assertQty(got, sauce, 160, 'sauce');
  });

  it('TestScenario_PizzaCombo_BundledItems: only bundled components deplete', () => {
    const f = new ScenarioFixture();
    const [dough, cheese, cola] = [f.stocked(), f.stocked(), f.stocked()];
    f.nonStocked('prodPizza', line(dough, 1), line(cheese, 150));
    f.nonStocked('prodCola', line(cola, 330));
    const got = f.commit({
      posId: 'comboPos', // not registered, non-tracked
      quantity: 1,
      bundledItems: [{ includedItems: [{ posId: 'prodPizza', quantity: 1 }, { posId: 'prodCola', quantity: 2 }] }],
    });
    assertQty(got, dough, 1, 'dough');
    assertQty(got, cheese, 150, 'cheese');
    assertQty(got, cola, 660, 'cola (2 x 330)');
  });

  it('TestScenario_ComboBundledItem_ModifierOnIncludedItem: ketchup on the bundled biryani depletes', () => {
    const f = new ScenarioFixture();
    const itemKingfisher = f.batchItem('prodKingfisher');
    const itemBiryani = f.batchItem('prodBiryani');
    const itemKetchup = f.batchItem('prodKetchup');
    const got = f.commit({
      posId: 'comboPos',
      quantity: 1,
      bundledItems: [
        { includedItems: [{ posId: 'prodKingfisher', quantity: 1 }] },
        { includedItems: [{ posId: 'prodBiryani', quantity: 1, options: [{ variants: [{ posId: 'prodKetchup' }] }] }] },
      ],
    });
    assertQty(got, itemKingfisher, 1, 'kingfisher (combo component)');
    assertQty(got, itemBiryani, 1, 'biryani (combo component)');
    assertQty(got, itemKetchup, 1, 'ketchup (modifier on bundled biryani)');
  });

  it('TestScenario_MultiProductOrder: seven aggregated demands', () => {
    const f = new ScenarioFixture();
    const kingfisher = f.stocked();
    f.nonStocked('prodKf6', line(kingfisher, 6));
    const [vodka, espresso, sugar, water] = [f.stocked(), f.stocked(), f.stocked(), f.stocked()];
    f.nonStocked('prodMartini', line(vodka, 45), line(espresso, 30), line(sugar, 7.5), line(water, 7.5));
    const [biryaniBatch, naan] = [f.stocked(), f.stocked()];
    f.nonStocked('prodMeal', line(biryaniBatch, 1), line(naan, 1));
    const got = f.commit(itemLine('prodKf6', 2), itemLine('prodMartini', 1), itemLine('prodMeal', 3));
    expect(got.size).toBe(7);
    assertQty(got, kingfisher, 12, 'kingfisher');
    assertQty(got, vodka, 45, 'vodka');
    assertQty(got, espresso, 30, 'espresso');
    assertQty(got, sugar, 7.5, 'sugar');
    assertQty(got, water, 7.5, 'water');
    assertQty(got, biryaniBatch, 3, 'biryani batch');
    assertQty(got, naan, 3, 'naan');
  });

  it('TestScenario_RemovalModifier_SuppressesIngredient: No Kahlua drops the Kahlua demand', () => {
    const f = new ScenarioFixture();
    const [vodka, espresso, kahlua] = [f.stocked(), f.stocked(), f.stocked()];
    f.nonStocked('prodMartini', line(vodka, 45), line(espresso, 30), line(kahlua, 10));
    const noKahlua = f.removal(kahlua);
    const got = f.commit({ posId: 'prodMartini', quantity: 1, options: [removeModifier(noKahlua)] });
    assertQty(got, vodka, 45, 'vodka');
    assertQty(got, espresso, 30, 'espresso');
    expect(got.has(kahlua)).toBe(false);
  });

  it('TestScenario_RemovalAndAdditiveModifiers_Compose', () => {
    const f = new ScenarioFixture();
    const [vodka, espresso, kahlua] = [f.stocked(), f.stocked(), f.stocked()];
    f.nonStocked('prodMartini', line(vodka, 45), line(espresso, 30), line(kahlua, 10));
    f.nonStocked('prodExtraShot', line(espresso, 30));
    const noKahlua = f.removal(kahlua);
    const got = f.commit({
      posId: 'prodMartini',
      quantity: 1,
      options: [{ variants: [{ posId: 'prodExtraShot' }] }, removeModifier(noKahlua)],
    });
    assertQty(got, espresso, 60, 'espresso (base 30 + extra shot 30)');
    assertQty(got, vodka, 45, 'vodka');
    expect(got.has(kahlua)).toBe(false);
  });

  it('TestScenario_RemovalModifier_ScopedToLine: removal on one line leaves the other alone', () => {
    const f = new ScenarioFixture();
    const [vodka, kahlua] = [f.stocked(), f.stocked()];
    f.nonStocked('prodMartini', line(vodka, 45), line(kahlua, 10));
    const noKahlua = f.removal(kahlua);
    const got = f.commit({ posId: 'prodMartini', quantity: 1, options: [removeModifier(noKahlua)] }, itemLine('prodMartini', 1));
    assertQty(got, vodka, 90, 'vodka (both lines)');
    assertQty(got, kahlua, 10, 'kahlua (only the un-modified line)');
  });
});
