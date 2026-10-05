import { describe, expect, it } from 'vitest';
import { mulDivRound, SCALE, toBase, toDecimal } from './baseunits';
import { EventBus } from './events';
import { Stock } from './stock';

describe('base units', () => {
  it('scale is x10,000 and 7.5 round-trips exactly', () => {
    expect(SCALE).toBe(10_000);
    expect(toBase(7.5)).toBe(75_000);
    expect(toDecimal(75_000)).toBe(7.5);
    expect(toBase(0.33333)).toBe(3333);
  });

  it('mulDivRound rounds half up without losing precision', () => {
    expect(mulDivRound(10, 3, 4)).toBe(8); // 7.5 -> 8
    expect(mulDivRound(1_000_000_000, 1_000_000_000, 3)).toBe(333333333333333333 > Number.MAX_SAFE_INTEGER ? Number(333333333333333333n) : 333333333333333333);
  });
});

describe('stock layers, average cost and reservations', () => {
  const item = 'item_absolut';
  const loc = 'venue_fitzroy';

  it('FIFO layers behind, average cost in front', () => {
    const s = new Stock();
    s.receive(item, loc, toBase(700), 2800, 'GOODS_RECEIPT', 'po:1'); // $0.04/mL
    s.receive(item, loc, toBase(700), 3500, 'GOODS_RECEIPT', 'po:2'); // $0.05/mL
    expect(s.onHand(item, loc)).toBe(toBase(1400));
    expect(s.averageCostMinorPerUnit(item, loc)).toBeCloseTo(4.5, 6); // cents per mL

    const r = s.deplete(item, loc, toBase(700), 'RECIPE_DEDUCTION', 'order:a');
    expect(r.costMinor).toBe(2800); // first layer fully consumed at its own cost
    expect(r.deficit).toBe(0);
    expect(s.averageCostMinorPerUnit(item, loc)).toBeCloseTo(5, 6); // only the $0.05 layer remains

    const r2 = s.deplete(item, loc, toBase(350), 'RECIPE_DEDUCTION', 'order:b');
    expect(r2.costMinor).toBe(1750);
    expect(s.onHandValueMinor(loc)).toBe(1750);
  });

  it('oversell goes into deficit instead of failing, like the DEFICIT batch', () => {
    const bus = new EventBus();
    const s = new Stock(bus);
    s.receive(item, loc, toBase(60), 240, 'GOODS_RECEIPT', 'po:1');
    const r = s.deplete(item, loc, toBase(90), 'RECIPE_DEDUCTION', 'order:a');
    expect(r.deficit).toBe(toBase(30));
    expect(s.onHand(item, loc)).toBe(toBase(-30));
    expect(bus.log.map((e) => e.type)).toEqual(['stock.hit_zero', 'stock.deficit']);
    // A receipt fills the hole first.
    s.receive(item, loc, toBase(700), 2800, 'GOODS_RECEIPT', 'po:2');
    expect(s.onHand(item, loc)).toBe(toBase(670));
    const remaining = s.layersFor(item, loc).reduce((a, l) => a + l.qtyRemaining, 0);
    expect(remaining).toBe(toBase(670));
  });

  it('RESERVED -> COMMITTED on complete, RELEASED on void, REVERSED on refund', () => {
    const s = new Stock();
    s.receive(item, loc, toBase(700), 2800, 'GOODS_RECEIPT', 'po:1');
    const demand = [{ itemId: item, locationId: loc, qty: toBase(45), sourceRef: 'order:1' }];

    s.reserve('ord_1', demand);
    expect(s.reservationsFor('ord_1')[0].status).toBe('RESERVED');
    expect(s.onHand(item, loc)).toBe(toBase(700)); // a reservation is a row, not a movement

    s.commit('ord_1', demand);
    expect(s.reservationsFor('ord_1')[0].status).toBe('COMMITTED');
    expect(s.onHand(item, loc)).toBe(toBase(655));

    s.reserve('ord_2', demand);
    s.release('ord_2');
    expect(s.reservationsFor('ord_2')[0].status).toBe('RELEASED');
    expect(s.onHand(item, loc)).toBe(toBase(655));

    s.reverse('ord_1');
    expect(s.reservationsFor('ord_1')[0].status).toBe('REVERSED');
    expect(s.onHand(item, loc)).toBe(toBase(700));
    expect(s.onHandValueMinor(loc)).toBe(2800); // restocked at the cost it left at
    expect(s.movements.map((m) => m.type)).toEqual(['GOODS_RECEIPT', 'RECIPE_DEDUCTION', 'REVERSAL']);
  });

  it('every quantity in the ledger is an integer', () => {
    const s = new Stock();
    s.receive(item, loc, toBase(700), 2800, 'GOODS_RECEIPT', 'po:1');
    for (let i = 0; i < 20; i++) s.deplete(item, loc, toBase(7.5), 'RECIPE_DEDUCTION', `order:${i}`);
    expect(s.onHand(item, loc)).toBe(toBase(550));
    for (const m of s.movements) expect(Number.isInteger(m.qtyDelta)).toBe(true);
    for (const l of s.layersFor(item, loc)) expect(Number.isInteger(l.qtyRemaining)).toBe(true);
  });
});
