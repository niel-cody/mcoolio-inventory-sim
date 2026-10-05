import { PRODUCT, VENUE } from '../data/mcoolio';
import { runService } from '../sim/service';
import type { Scenario } from '../sim/scenario';
import { FITZROY_PROFILE } from './profiles';

const QUIET = { ...FITZROY_PROFILE, ordersPerTick: 0.12, voidChance: 0, refundChance: 0 };

export const voidRefund: Scenario = {
  id: 'void-refund',
  number: 6,
  title: 'Void and refund',
  strap: 'A martini voided before complete releases its reservation. A completed Kingfisher refunded reverses it.',
  featureIds: ['depletion-engine', 'waste-capture'],
  durationTicks: 70,
  suggestedSpeed: 1,
  steps: [
    { at: 0, camera: { view: 'venue', venueId: VENUE.fitzroy, zone: 'bar' }, caption: 'Reservations: created reserves, complete commits, void releases, refund reverses.' },
    { at: 1, run: (w) => runService(w, VENUE.fitzroy, QUIET, 70) },
    {
      at: 4,
      caption: 'A martini is rung up: RESERVED. Stock has not moved.',
      run: (w) => w.sell(VENUE.fitzroy, [{ posId: PRODUCT.martini, quantity: 1 }], { completeAfter: 10, voidAfter: 5 }),
    },
    { at: 10, caption: 'Voided before it completes: RELEASED. The 45 mL never left the bottle.' },
    {
      at: 20,
      caption: 'Two Kingfishers complete: COMMITTED, two bottles off the cool room.',
      run: (w) => w.sell(VENUE.fitzroy, [{ posId: PRODUCT.kingfisher, quantity: 2 }], { completeAfter: 1, refundAfter: 8 }),
    },
    { at: 30, caption: 'Refunded: REVERSED. The two bottles come back at the cost they left at.' },
    {
      at: 34,
      caption: 'Was it made, can it be resold? The refund asks, and the answer becomes waste or stock.',
      featureId: 'waste-capture',
      ghostCaption: 'Coming: on refund, ask whether the item was made and whether it can be resold.',
    },
    { at: 50, caption: 'Every state change is a row with a status, not a guess.' },
  ],
};
