import { ITEM, PRODUCT, SUPPLIER, VENUE } from '../data/mcoolio';
import { runService } from '../sim/service';
import type { Scenario } from '../sim/scenario';
import { belowReorder, onceWhen, poStatus } from './helpers';
import { FITZROY_PROFILE, NEWTOWN_PROFILE, VALLEY_PROFILE } from './profiles';

const VALLEY_THIRSTY = { ...VALLEY_PROFILE, hours: undefined, ordersPerTick: 0.8, weights: { ...VALLEY_PROFILE.weights, [PRODUCT.kingfisher]: 12, [PRODUCT.kf6]: 4 } };
const VALLEY_LATE = { ...VALLEY_PROFILE, ordersPerTick: 0.12 };

export const orderingCycle: Scenario = {
  id: 'ordering-cycle',
  number: 3,
  title: 'The ordering cycle',
  strap: 'Valley Kingfisher drops below its reorder point on Friday night. The order travels overnight: draft, sent, in transit, received short, posted.',
  featureIds: ['purchase-orders', 'suppliers', 'credit-notes', 'par-levels-suggested-orders'],
  durationTicks: 1080,
  youWillSee: ['Valley Kingfisher drops below its reorder point.', 'A purchase order walks Draft, Sent, In transit, Received, Posted; the truck travels from the depot.', 'The delivery lands one carton short; stock and average cost update only at Posted.'],
  tryThis: 'Click the truck on the road, or the cartons on the dock, for the order\'s card.',
  suggestedSpeed: 16,
  steps: [
    { at: 0, camera: { view: 'venue', venueId: VENUE.valley, zone: 'coolroom' }, caption: 'Fortitude Valley. Twelve cartons of Kingfisher in the cool room, reorder point three cartons.' },
    {
      at: 1,
      run: (w) => {
        const rush = runService(w, VENUE.valley, VALLEY_THIRSTY, 360);
        runService(w, VENUE.newtown, NEWTOWN_PROFILE, 1080);
        runService(w, VENUE.fitzroy, FITZROY_PROFILE, 1080);
        onceWhen(w, belowReorder(ITEM.kingfisher, VENUE.valley), (world) => {
          world.caption('Kingfisher at the Valley is below its reorder point.');
          const suggested = world.featurePlays('par-levels-suggested-orders');
          const draftAfter = suggested ? 1 : 8;
          world.after(draftAfter, (x) => {
            const units = Math.max(6, Math.min(12, x.purchasing.unitsToPar(ITEM.kingfisher, VENUE.valley)));
            const po = x.purchasing.draft(SUPPLIER.harbour, VENUE.valley, [{ itemId: ITEM.kingfisher, orderedUnits: units, unitCostMinor: 5040 }], { suggested });
            x.caption(
              suggested
                ? `Suggested order: ${units} cartons drafts itself from the par level. The manager only has to send it.`
                : `The manager raises a purchase order: ${units} cartons from Harbour Liquor Co.`,
              suggested ? 'par-levels-suggested-orders' : 'purchase-orders',
            );
            x.after(6, (y) => {
              y.purchasing.send(po.id);
              y.caption('Sent to Harbour Liquor Co. The truck is loading.', 'purchase-orders');
              // The late crowd thins a little, so the cool room drains slower while the truck is on the road.
              rush.stop();
              runService(y, VENUE.valley, VALLEY_LATE, 1080);
            });
          });
        });
        onceWhen(w, poStatus('SENT', VENUE.valley), (world) => {
          world.after(3, (x) => {
            x.caption('Harbour Liquor picks it overnight. The truck leaves the depot at seven tomorrow morning.', 'purchase-orders');
            x.after(2, (y) => y.cameraTo({ view: 'world' }));
          });
        });
        onceWhen(w, poStatus('IN_TRANSIT', VENUE.valley), (world) => {
          world.requestSpeed(16);
          world.cameraTo({ view: 'world' });
          world.caption('Saturday morning. In transit from the Harbour Liquor depot. Nothing has landed in stock yet.', 'purchase-orders');
        });
        onceWhen(w, poStatus('ARRIVED', VENUE.valley), (world) => {
          world.cameraTo({ view: 'venue', venueId: VENUE.valley, zone: 'dock' });
          world.after(4, (x) => {
            const po = x.purchasing.open(VENUE.valley).find((p) => x.purchasing.hasArrived(p));
            if (!po) return;
            const ordered = po.lines[0].orderedUnits;
            x.purchasing.receive(po.id, [{ itemId: ITEM.kingfisher, receivedUnits: ordered - 1, receivedUnitCostMinor: 5040 }]);
            x.caption(`Received: ${ordered - 1} of ${ordered} cartons. One short. The receiver records the actual count and cost.`, 'purchase-orders');
            x.after(3, (y) => y.caption('The short carton raises a credit note against Harbour Liquor Co.', 'credit-notes'));
            x.after(8, (y) => {
              y.purchasing.post(po.id);
              y.caption('Posted. Stock on hand and average cost update now, and only now.', 'purchase-orders');
            });
          });
        });
      },
    },
    { at: 40, caption: 'Kingfisher is flying out. Watch the cartons in the cool room.' },
    { at: 420, camera: { view: 'world' }, caption: 'Midnight. Nothing moves until the depot opens, so the night runs at 64x.', run: (w) => w.requestSpeed(64) },
    { at: 1000, camera: { view: 'venue', venueId: VENUE.valley, zone: 'coolroom' }, caption: 'Posted. The cool room is full again and the average cost per carton moved with the dearer delivery.' },

  ],
};
