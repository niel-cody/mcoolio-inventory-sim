import { describe, expect, it } from 'vitest';
import { createMcOolioWorld, ITEM, PRODUCT, VENUE } from '../data/mcoolio';
import { ScenarioRunner } from '../sim/scenario';
import { SCENARIOS, scenarioById } from './index';

const build = (seed: number, mode: 'today' | 'roadmap') => createMcOolioWorld(seed, mode);

describe('scenarios', () => {
  it('every playbook runs to completion in both modes without throwing', () => {
    for (const s of SCENARIOS) {
      for (const mode of ['today', 'roadmap'] as const) {
        const r = new ScenarioRunner(build, s, mode);
        r.advance(s.durationTicks + 5);
        expect(r.done, `${s.id} ${mode}`).toBe(true);
      }
    }
  });

  it('replays identically and resets cleanly', () => {
    for (const s of SCENARIOS) {
      const a = new ScenarioRunner(build, s, 'roadmap');
      a.advance(s.durationTicks);
      const first = a.world.events.log.map((e) => JSON.stringify(e));
      a.reset();
      expect(a.world.tick).toBe(0);
      a.advance(s.durationTicks);
      const second = a.world.events.log.map((e) => JSON.stringify(e));
      expect(second, s.id).toEqual(first);
    }
  });

  it('the 86 goes red at Fitzroy only, and Today never flags sold out', () => {
    const today = new ScenarioRunner(build, scenarioById('the-86'), 'today');
    today.advance(270);
    const w = today.world;
    expect(w.availability.of(PRODUCT.martini, VENUE.fitzroy).soldOut).toBe(true);
    expect(w.availability.of(PRODUCT.martini, VENUE.newtown).soldOut).toBe(false);
    expect(w.availability.of(PRODUCT.martini, VENUE.valley).soldOut).toBe(false);
    expect(w.soldOutFlags.size).toBe(0);
    expect(w.events.log.some((e) => e.type === 'suggestion')).toBe(false);
    expect(w.events.log.some((e) => e.type === 'transfer')).toBe(false);

    const roadmap = new ScenarioRunner(build, scenarioById('the-86'), 'roadmap');
    roadmap.advance(270);
    const log = roadmap.world.events.log;
    expect(log.some((e) => e.type === 'sold_out' && e.locationId === VENUE.fitzroy && e.on)).toBe(true);
    expect(log.some((e) => e.type === 'sold_out' && e.locationId === VENUE.newtown && e.posId === PRODUCT.martini)).toBe(false);
    expect(log.some((e) => e.type === 'suggestion')).toBe(true);
    expect(log.some((e) => e.type === 'recipe.activated')).toBe(true);
    expect(log.some((e) => e.type === 'transfer')).toBe(true);
    // The swap is scoped to Fitzroy: Newtown still pours Absolut.
    expect(roadmap.world.recipes.expandActive(ITEM.martini, VENUE.newtown)?.[0].ingredientItemId).toBe(ITEM.absolut);
    expect(roadmap.world.recipes.expandActive(ITEM.martini, VENUE.fitzroy)?.[0].ingredientItemId).toBe(ITEM.greygoose);
  });

  it('the ordering cycle reaches POSTED and stock comes back up', () => {
    for (const mode of ['today', 'roadmap'] as const) {
      const r = new ScenarioRunner(build, scenarioById('ordering-cycle'), mode);
      r.advance(1080);
      const statuses = r.world.events.log.filter((e) => e.type === 'po').map((e) => (e.type === 'po' ? e.status : ''));
      expect(statuses, mode).toEqual(['DRAFT', 'SENT', 'IN_TRANSIT', 'ARRIVED', 'RECEIVED', 'POSTED']);
      const po = r.world.purchasing.list(VENUE.valley)[0];
      expect(po.suggested ?? false).toBe(mode === 'roadmap');
      expect((po.lines[0].receivedUnits ?? 0) + 1).toBe(po.lines[0].orderedUnits);
    }
  });

  it('batch day: rice only moves at production', () => {
    const r = new ScenarioRunner(build, scenarioById('batch-day'), 'today');
    const riceMoves = () => r.world.stock.movements.filter((m) => m.itemId === ITEM.rice && m.type !== 'OPENING');
    r.advance(240);
    expect(riceMoves().length).toBe(1);
    expect(riceMoves()[0].type).toBe('PRODUCTION_RUN');
    expect(r.world.events.log.some((e) => e.type === 'waste')).toBe(false);
    const rm = new ScenarioRunner(build, scenarioById('batch-day'), 'roadmap');
    rm.advance(240);
    expect(rm.world.events.log.some((e) => e.type === 'waste')).toBe(true);
  });
});

describe('seeking', () => {
  it('seeking backwards replays to an identical world', () => {
    const r = new ScenarioRunner(build, scenarioById('the-86'), 'roadmap');
    r.advance(150);
    const atOneFifty = r.world.events.log.map((e) => JSON.stringify(e));
    r.seekTo(60);
    expect(r.world.tick).toBe(60);
    expect(r.seeking).toBe(false);
    r.seekTo(150);
    expect(r.world.events.log.map((e) => JSON.stringify(e))).toEqual(atOneFifty);
    r.seekTo(10_000);
    expect(r.world.tick).toBe(270);
    expect(r.done).toBe(true);
  });

  it('every scenario has beats, three things to see and a try-this line', () => {
    for (const s of SCENARIOS) {
      const r = new ScenarioRunner(build, s, 'today');
      expect(r.beats().length, s.id).toBeGreaterThan(1);
      expect(s.youWillSee.length, s.id).toBe(3);
      expect(s.tryThis.length, s.id).toBeGreaterThan(10);
    }
  });
});

describe('the long weekend', () => {
  it('trades in hours, orders at close, delivers next morning, and ends with nothing sold out', () => {
    const r = new ScenarioRunner(build, scenarioById('long-weekend'), 'today');
    r.advance(r.scenario.durationTicks);
    const w = r.world;
    const orders = w.events.log.filter((e) => e.type === 'order' && e.action === 'COMMIT');
    // Nothing sells between 02:00 and 11:00 anywhere.
    expect(orders.some((e) => { const h = w.hour(e.tick); return h >= 2 && h < 11; })).toBe(false);
    const pos = w.purchasing.list();
    expect(pos.length).toBeGreaterThan(2);
    expect(pos.every((p) => p.status === 'POSTED')).toBe(true);
    // Every order was sent at night and dispatched the next morning at the supplier's hour.
    for (const p of pos) {
      const sup = w.catalogue.suppliers.get(p.supplierId)!;
      expect(Math.abs(w.hour(p.inTransitTick!) - sup.dispatchHour)).toBeLessThan(0.02);
      expect(w.clock(p.inTransitTick!) - w.clock(p.sentTick!)).toBeLessThan(24 * 60);
    }
    for (const v of w.catalogue.venueList()) expect(w.availability.venueHeat(v.id), v.name).not.toBe('soldout');
    expect(w.events.log.filter((e) => e.type === 'production' && e.phase === 'completed').length).toBe(7);
    // Daylight follows the clock: full day at Saturday noon, night at Saturday 23:00.
    expect(w.daylight(r.scenario.steps.find((s) => s.caption?.startsWith('Saturday lunch'))!.at)).toBe(1);
    expect(w.daylight(r.scenario.steps.find((s) => s.caption?.startsWith('Midnight'))!.at)).toBe(0);
  });
});
