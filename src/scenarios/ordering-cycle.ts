import { ITEM, PRODUCT, SUPPLIER, VENUE } from '../data/mcoolio';
import { runService } from '../sim/service';
import type { Scenario } from '../sim/scenario';
import { belowReorder, onceWhen, poStatus } from './helpers';
import { FITZROY_PROFILE, NEWTOWN_PROFILE, VALLEY_PROFILE } from './profiles';

const VALLEY_THIRSTY = { ...VALLEY_PROFILE, ordersPerTick: 1.0, weights: { ...VALLEY_PROFILE.weights, [PRODUCT.kingfisher]: 12, [PRODUCT.kf6]: 4 } };

export const orderingCycle: Scenario = {
  id: 'ordering-cycle',
  number: 3,
  title: 'The ordering cycle',
  strap: 'Valley Kingfisher drops below its reorder point. Draft, sent, in transit, received short, posted.',
  featureIds: ['purchase-orders', 'suppliers', 'credit-notes', 'par-levels-suggested-orders'],
  durationTicks: 360,
  suggestedSpeed: 16,
  steps: [
    { at: 0, camera: { view: 'venue', venueId: VENUE.valley, zone: 'coolroom' }, caption: 'Fortitude Valley. Six cartons of Kingfisher in the cool room, reorder point one carton.' },
    {
      at: 1,
      run: (w) => {
        runService(w, VENUE.valley, VALLEY_THIRSTY, 360);
        runService(w, VENUE.newtown, NEWTOWN_PROFILE, 360);
        runService(w, VENUE.fitzroy, FITZROY_PROFILE, 360);
        onceWhen(w, belowReorder(ITEM.kingfisher, VENUE.valley), (world) => {
          world.caption('Kingfisher at the Valley is below its reorder point.');
          const suggested = world.featurePlays('par-levels-suggested-orders');
          const draftAfter = suggested ? 1 : 8;
          world.after(draftAfter, (x) => {
            const units = Math.max(4, x.purchasing.unitsToPar(ITEM.kingfisher, VENUE.valley));
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
            });
          });
        });
        onceWhen(w, poStatus('IN_TRANSIT', VENUE.valley), (world) => {
          world.caption('In transit. Nothing has landed in stock yet; the cool room keeps draining.', 'purchase-orders');
        });
        onceWhen(w, poStatus('ARRIVED', VENUE.valley), (world) => {
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
    { at: 60, camera: { view: 'venue', venueId: VENUE.valley, zone: 'dock' }, caption: 'The dock at the Valley. Deliveries land here and get checked against the order.' },
    { at: 200, camera: { view: 'world' }, caption: 'Follow the truck from the Harbour Liquor depot.' },
    { at: 300, camera: { view: 'venue', venueId: VENUE.valley, zone: 'dock' } },
  ],
};
