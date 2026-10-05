import { describe, expect, it } from 'vitest';
import { createMcOolioWorld, ITEM, PRODUCT, SUPPLIER, VENUE, BIRYANI_BATCH } from '../data/mcoolio';
import { toBase } from './baseunits';
import { runService } from './service';
import { FITZROY_PROFILE, NEWTOWN_PROFILE, VALLEY_PROFILE } from '../scenarios/profiles';

describe('seed sanity', () => {
  it('every product resolves to an item and every recipe ingredient exists', () => {
    const w = createMcOolioWorld(1);
    for (const p of w.catalogue.products.values()) {
      const item = w.catalogue.resolveItemByPosId(p.posId);
      expect(item, p.posId).toBeDefined();
      if (item?.itemType === 'NON_STOCKED') {
        const lines = w.recipes.expandActive(item.id);
        expect(lines && lines.length > 0, `${p.name} needs a recipe`).toBe(true);
        for (const l of lines ?? []) expect(w.catalogue.items.has(l.ingredientItemId)).toBe(true);
      }
    }
  });

  it('the martini recipe matches the engine scenario: 45 / 30 / 7.5 / 7.5', () => {
    const w = createMcOolioWorld(1);
    const r = w.depletion.expandOrder({ id: 'o', locationId: VENUE.fitzroy, status: 'complete', version: 1, items: [{ posId: PRODUCT.martini, quantity: 1 }] });
    const by = new Map(r.demands.map((d) => [d.itemId, d.qty]));
    expect(by.get(ITEM.absolut)).toBe(toBase(45));
    expect(by.get(ITEM.espresso)).toBe(toBase(30));
    expect(by.get(ITEM.sugar)).toBe(toBase(7.5));
    expect(by.get(ITEM.water)).toBe(toBase(7.5));
  });
});

describe('ordering cycle', () => {
  it('Draft -> Sent -> In transit -> Received short -> Posted moves stock and average cost', () => {
    const w = createMcOolioWorld(7);
    const before = w.stock.onHand(ITEM.kingfisher, VENUE.valley);
    const avgBefore = w.stock.averageCostMinorPerUnit(ITEM.kingfisher, VENUE.valley);
    const po = w.purchasing.draft(SUPPLIER.harbour, VENUE.valley, [{ itemId: ITEM.kingfisher, orderedUnits: 5, unitCostMinor: 5040 }]);
    expect(po.status).toBe('DRAFT');
    w.purchasing.send(po.id);
    expect(po.status).toBe('SENT');
    w.advance(po.inTransitTick! - w.tick);
    expect(po.status).toBe('IN_TRANSIT');
    expect(w.stock.onHand(ITEM.kingfisher, VENUE.valley)).toBe(before); // nothing lands until posted
    w.advance(po.etaTick! - w.tick);
    expect(w.purchasing.hasArrived(po)).toBe(true);
    w.purchasing.receive(po.id, [{ itemId: ITEM.kingfisher, receivedUnits: 4 }]); // one carton short
    expect(po.status).toBe('RECEIVED');
    expect(w.stock.onHand(ITEM.kingfisher, VENUE.valley)).toBe(before);
    w.purchasing.post(po.id);
    expect(po.status).toBe('POSTED');
    expect(w.stock.onHand(ITEM.kingfisher, VENUE.valley)).toBe(before + toBase(4 * 24));
    const avgAfter = w.stock.averageCostMinorPerUnit(ITEM.kingfisher, VENUE.valley);
    expect(avgAfter).toBeGreaterThan(avgBefore); // dearer carton pulled the average up
    const statuses = w.events.log.filter((e) => e.type === 'po').map((e) => (e.type === 'po' ? e.status : ''));
    expect(statuses).toEqual(['DRAFT', 'SENT', 'IN_TRANSIT', 'ARRIVED', 'RECEIVED', 'POSTED']);
  });
});

describe('batch boundary on the seed', () => {
  it('a production run consumes rice, chicken and spice; meal sales deplete portions and naan only', () => {
    const w = createMcOolioWorld(3);
    const rice0 = w.stock.onHand(ITEM.rice, VENUE.newtown);
    const pool0 = w.stock.onHand(ITEM.biryaniPool, VENUE.newtown);
    const run = w.production.start(ITEM.biryaniPool, VENUE.newtown, BIRYANI_BATCH.yieldPortions, BIRYANI_BATCH.durationTicks);
    expect(w.stock.onHand(ITEM.rice, VENUE.newtown)).toBe(rice0 - toBase(BIRYANI_BATCH.riceG));
    expect(w.stock.onHand(ITEM.biryaniPool, VENUE.newtown)).toBe(pool0); // not yet
    w.advance(BIRYANI_BATCH.durationTicks);
    expect(run.status).toBe('COMPLETE');
    expect(w.stock.onHand(ITEM.biryaniPool, VENUE.newtown)).toBe(pool0 + toBase(20));
    // The batch carries the cost of what went into it.
    expect(run.costMinor).toBeGreaterThan(0);

    const rice1 = w.stock.onHand(ITEM.rice, VENUE.newtown);
    const naan0 = w.stock.onHand(ITEM.naan, VENUE.newtown);
    w.sell(VENUE.newtown, [{ posId: PRODUCT.meal, quantity: 3 }], { completeAfter: 1 });
    w.advance(2);
    expect(w.stock.onHand(ITEM.rice, VENUE.newtown)).toBe(rice1); // raw rice never moves at sale
    expect(w.stock.onHand(ITEM.naan, VENUE.newtown)).toBe(naan0 - toBase(3));
    expect(w.stock.onHand(ITEM.biryaniPool, VENUE.newtown)).toBe(pool0 + toBase(20) - toBase(3));
  });
});

describe('void and refund on the seed', () => {
  it('void before complete releases, refund after complete reverses', () => {
    const w = createMcOolioWorld(5);
    const abs0 = w.stock.onHand(ITEM.absolut, VENUE.fitzroy);
    const kf0 = w.stock.onHand(ITEM.kingfisher, VENUE.fitzroy);
    const voided = w.sell(VENUE.fitzroy, [{ posId: PRODUCT.martini, quantity: 1 }], { completeAfter: 5, voidAfter: 2 });
    const refunded = w.sell(VENUE.fitzroy, [{ posId: PRODUCT.kingfisher, quantity: 2 }], { completeAfter: 1, refundAfter: 3 });
    w.advance(1);
    expect(w.stock.reservationsFor(voided)[0].status).toBe('RESERVED');
    w.advance(1);
    expect(w.stock.reservationsFor(voided).every((r) => r.status === 'RELEASED')).toBe(true);
    expect(w.stock.onHand(ITEM.absolut, VENUE.fitzroy)).toBe(abs0);
    expect(w.stock.reservationsFor(refunded).every((r) => r.status === 'COMMITTED')).toBe(true);
    expect(w.stock.onHand(ITEM.kingfisher, VENUE.fitzroy)).toBe(kf0 - toBase(2));
    w.advance(3);
    expect(w.stock.reservationsFor(refunded).every((r) => r.status === 'REVERSED')).toBe(true);
    expect(w.stock.onHand(ITEM.kingfisher, VENUE.fitzroy)).toBe(kf0);
  });
});

describe('stocktake', () => {
  it('posts the variance against theoretical', () => {
    const w = createMcOolioWorld(9);
    const take = w.stocktakes.start(VENUE.fitzroy, [ITEM.absolut]);
    const theoretical = take.lines[0].theoretical;
    w.stocktakes.count(take.id, ITEM.absolut, theoretical - toBase(140));
    w.stocktakes.post(take.id);
    expect(w.stock.onHand(ITEM.absolut, VENUE.fitzroy)).toBe(theoretical - toBase(140));
    expect(w.stock.movements.at(-1)?.type).toBe('STOCK_TAKE');
  });
});

describe('determinism', () => {
  it('two worlds with the same seed produce the same ledger', () => {
    const run = () => {
      const w = createMcOolioWorld(42);
      runService(w, VENUE.newtown, NEWTOWN_PROFILE, 120);
      runService(w, VENUE.valley, VALLEY_PROFILE, 120);
      runService(w, VENUE.fitzroy, FITZROY_PROFILE, 120);
      w.advance(130);
      return w;
    };
    const a = run();
    const b = run();
    expect(a.stock.movements.length).toBeGreaterThan(50);
    expect(a.stock.movements).toEqual(b.stock.movements);
    expect(a.events.log).toEqual(b.events.log);
    expect(a.revenueMinor).toBe(b.revenueMinor);
  });

  it('sold-out flag only acts in roadmap mode', () => {
    const today = createMcOolioWorld(11, 'today');
    const roadmap = createMcOolioWorld(11, 'roadmap');
    for (const w of [today, roadmap]) {
      // Pour Absolut dry at Fitzroy.
      const onHand = w.stock.onHand(ITEM.absolut, VENUE.fitzroy);
      w.stock.deplete(ITEM.absolut, VENUE.fitzroy, onHand, 'WASTE', 'test');
      w.advance(1);
    }
    expect(today.availability.of(PRODUCT.martini, VENUE.fitzroy).soldOut).toBe(true);
    expect(today.isFlaggedSoldOut(PRODUCT.martini, VENUE.fitzroy)).toBe(false);
    expect(roadmap.isFlaggedSoldOut(PRODUCT.martini, VENUE.fitzroy)).toBe(true);
    expect(roadmap.isFlaggedSoldOut(PRODUCT.martini, VENUE.newtown)).toBe(false);
  });
});
