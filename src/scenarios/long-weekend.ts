import { BIRYANI_BATCH, ITEM, VENUE } from '../data/mcoolio';
import { runService } from '../sim/service';
import type { Scenario } from '../sim/scenario';
import type { SimWorld } from '../sim/world';
import { FITZROY_LUNCH, FITZROY_PROFILE, NEWTOWN_LUNCH, NEWTOWN_PROFILE, VALLEY_PROFILE } from './profiles';

const START_HOUR = 16; // Friday 16:00
const DAY = 24 * 60;
const at = (dayOffset: number, hour: number) => dayOffset * DAY + Math.round((hour - START_HOUR) * 60);
const END = at(2, 15); // Sunday 15:00

const NEWTOWN_DINNER = { ...NEWTOWN_PROFILE, hours: [[17.5, 22.5]] as [number, number][] };

/** Close of night: top up everything at or near its reorder point, one order per supplier per venue. */
function raiseOrders(w: SimWorld, suggested: boolean): number {
  let raised = 0;
  for (const venue of w.catalogue.venueList()) {
    const bySupplier = new Map<string, { itemId: string; orderedUnits: number; unitCostMinor: number }[]>();
    for (const item of w.catalogue.items.values()) {
      if (!item.supplierId || !item.purchaseUnit) continue;
      if (!w.stock.levels.has(`${item.id}@${venue.id}`)) continue; // the venue does not stock it
      const lvl = w.stock.level(item.id, venue.id);
      if (lvl.parLevel === undefined || lvl.qtyOnHand > lvl.parLevel * 0.6) continue;
      const units = w.purchasing.unitsToPar(item.id, venue.id);
      if (units <= 0) continue;
      const unitCost = Math.round((w.stock.averageCostMinorPerUnit(item.id, venue.id) * item.purchaseUnit.factor) * 1.04) || 1000;
      const lines = bySupplier.get(item.supplierId) ?? [];
      lines.push({ itemId: item.id, orderedUnits: units, unitCostMinor: unitCost });
      bySupplier.set(item.supplierId, lines);
    }
    for (const [supplierId, lines] of bySupplier) {
      const po = w.purchasing.draft(supplierId, venue.id, lines, { suggested });
      w.after(3, (x) => x.purchasing.send(po.id));
      raised += 1;
    }
  }
  return raised;
}

/** Dinner pots at every venue. */
function dinnerPots(w: SimWorld, newtownBatches: number): void {
  w.production.start(ITEM.biryaniPool, VENUE.newtown, BIRYANI_BATCH.yieldPortions * newtownBatches, BIRYANI_BATCH.durationTicks);
  w.production.start(ITEM.biryaniPool, VENUE.valley, BIRYANI_BATCH.yieldPortions, BIRYANI_BATCH.durationTicks);
  w.production.start(ITEM.biryaniPool, VENUE.fitzroy, BIRYANI_BATCH.yieldPortions, BIRYANI_BATCH.durationTicks);
}

function closeOfNight(w: SimWorld, label: string): void {
  const suggested = w.featurePlays('par-levels-suggested-orders');
  const n = raiseOrders(w, suggested);
  w.cameraTo({ view: 'world' });
  w.caption(
    suggested
      ? `${label} close. ${n} suggested orders draft themselves from par at the venues that need them; the managers only send.`
      : `${label} close. The managers raise ${n} purchase orders for everything under sixty percent of par. Trucks come tomorrow.`,
    suggested ? 'par-levels-suggested-orders' : 'purchase-orders',
  );
}

export const longWeekend: Scenario = {
  id: 'long-weekend',
  number: 8,
  title: 'The long weekend',
  strap: 'Friday afternoon to Sunday lunch. Nights fast forward, trucks roll at dawn, the kitchen cooks for lunch, and the bars open at five.',
  featureIds: ['depletion-engine', 'purchase-orders', 'suppliers', 'batch-production-backoffice', 'par-levels-suggested-orders', 'credit-notes'],
  durationTicks: END,
  suggestedSpeed: 16,
  startHour: START_HOUR,
  youWillSee: [
    'Day turns to night and back; venues trade only in their hours.',
    'Each close raises orders for what ran low; each morning the trucks deliver before service.',
    'Saturday lunch gets a fresh biryani batch, and the weekend ends with nothing sold out.',
  ],
  tryThis: 'Use the sun and moon buttons on the deck to jump between mornings and evenings, then click a cool room before and after a delivery.',
  steps: [
    { at: 0, camera: { view: 'world' }, caption: 'Friday, four in the afternoon. The kitchens are prepping, the bars open at five.' },
    {
      at: 1,
      run: (w) => {
        runService(w, VENUE.newtown, NEWTOWN_DINNER, END);
        runService(w, VENUE.newtown, NEWTOWN_LUNCH, END);
        runService(w, VENUE.valley, VALLEY_PROFILE, END);
        runService(w, VENUE.fitzroy, FITZROY_PROFILE, END);
        runService(w, VENUE.fitzroy, FITZROY_LUNCH, END);
        // Every arrival gets checked and posted before service. Harbour's Saturday run to the Valley is a carton short.
        let saidMorning = -1;
        w.events.on((e) => {
          if (e.type !== 'po' || e.status !== 'ARRIVED') return;
          const po = w.purchasing.get(e.poId);
          const day = Math.floor(w.clock() / DAY);
          w.after(4, (x) => {
            const short = day === 1 && po.locationId === VENUE.valley && po.supplierId === 'sup_harbour';
            x.purchasing.receive(
              po.id,
              po.lines.map((l, i) => ({ itemId: l.itemId, receivedUnits: short && i === 0 ? Math.max(0, l.orderedUnits - 1) : l.orderedUnits })),
            );
            if (short) x.caption('Harbour Liquor is a carton short at the Valley again. Received as counted; the credit note follows.', 'credit-notes');
            x.after(6, (y) => y.purchasing.post(po.id));
          });
          if (saidMorning !== day) {
            saidMorning = day;
            w.cameraTo({ view: 'venue', venueId: po.locationId, zone: 'dock' });
            w.caption('Deliveries land on the docks, get checked against the order, and post into stock before the doors open.', 'purchase-orders');
          }
        });
      },
    },
    { at: at(0, 17), camera: { view: 'venue', venueId: VENUE.fitzroy, zone: 'bar' }, caption: 'Five o’clock. Fitzroy and the Valley open; Newtown turns the kitchen over for dinner.' },
    { at: at(0, 20), camera: { view: 'world' }, caption: 'Friday night in full swing. Watch the rings drift towards amber as the night wears on.' },
    { at: at(0, 23.5), run: (w) => closeOfNight(w, 'Friday') },
    { at: at(1, 0), caption: 'Midnight. The depots are shut, so the night runs at 64x.', run: (w) => w.requestSpeed(64) },
    { at: at(1, 6.5), camera: { view: 'world' }, caption: 'Saturday, half six. The depots open and the trucks roll at seven.', run: (w) => w.requestSpeed(16) },
    {
      at: at(1, 10),
      camera: { view: 'venue', venueId: VENUE.newtown, zone: 'kitchen' },
      caption: 'Ten o’clock at Newtown: a double batch of biryani for lunch and dinner. Rice, chicken and spice go in now.',
      featureId: 'batch-production-backoffice',
      run: (w) => {
        w.production.start(ITEM.biryaniPool, VENUE.newtown, BIRYANI_BATCH.yieldPortions * 2, BIRYANI_BATCH.durationTicks);
      },
    },
    { at: at(1, 12), camera: { view: 'world' }, caption: 'Saturday lunch. The kitchens trade in daylight; the bars wait for five.' },
    {
      at: at(1, 16.5),
      camera: { view: 'venue', venueId: VENUE.newtown, zone: 'kitchen' },
      caption: 'Half four: every kitchen puts a pot on for dinner. Newtown cooks three batches, the bars one each.',
      featureId: 'batch-production-backoffice',
      run: (w) => dinnerPots(w, 3),
    },
    { at: at(1, 17.5), camera: { view: 'venue', venueId: VENUE.fitzroy, zone: 'bar' }, caption: 'Saturday night. The Absolut shelf is full again because Friday’s order landed this morning.' },
    { at: at(1, 23.5), run: (w) => closeOfNight(w, 'Saturday') },
    { at: at(2, 0), caption: 'Second night. 64x again.', run: (w) => w.requestSpeed(64) },
    { at: at(2, 6.5), camera: { view: 'world' }, caption: 'Sunday morning. Same routine: trucks, docks, post, open.', run: (w) => w.requestSpeed(16) },
    {
      at: at(2, 10),
      camera: { view: 'venue', venueId: VENUE.newtown, zone: 'kitchen' },
      caption: 'Sunday: pots on everywhere for the lunch rush, a triple batch at Newtown.',
      featureId: 'batch-production-backoffice',
      run: (w) => dinnerPots(w, 3),
    },
    { at: at(2, 12.5), camera: { view: 'world' }, caption: 'Sunday lunch. Three days of trading. Every night’s gap became the next morning’s delivery.' },
  ],
};
