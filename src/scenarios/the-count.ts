import { ITEM, VENUE } from '../data/mcoolio';
import { toBase } from '../sim/baseunits';
import { runService } from '../sim/service';
import type { Scenario } from '../sim/scenario';
import { FITZROY_PROFILE } from './profiles';

const QUIET = { ...FITZROY_PROFILE, ordersPerTick: 0.2 };
let takeId = '';

export const theCount: Scenario = {
  id: 'the-count',
  number: 7,
  title: 'The count',
  strap: 'Stocktake at Fitzroy finds an Absolut variance against theoretical.',
  featureIds: ['stocktakes', 'waste-capture'],
  durationTicks: 90,
  youWillSee: ['A stocktake captures theoretical Absolut, then the shelf is counted.', 'The 140 mL variance posts as a stock movement so system and shelf agree.', 'Where we\'re going breaks the variance down into waste and loss by type.'],
  tryThis: 'Click the Absolut bottles before and after the count posts.',
  suggestedSpeed: 1,
  steps: [
    { at: 0, camera: { view: 'venue', venueId: VENUE.fitzroy, zone: 'bar' }, caption: 'Fitzroy after a shift. Theoretical stock says one thing; the shelf says another.' },
    { at: 1, run: (w) => runService(w, VENUE.fitzroy, QUIET, 90) },
    {
      at: 6,
      caption: 'Stocktake opens on the bar. Theoretical Absolut is captured now.',
      featureId: 'stocktakes',
      run: (w) => {
        takeId = w.stocktakes.start(VENUE.fitzroy, [ITEM.absolut, ITEM.greygoose, ITEM.sugar]).id;
      },
    },
    {
      at: 30,
      caption: 'Counted: 140 mL less Absolut than theoretical. Two generous pours and a spill.',
      featureId: 'stocktakes',
      run: (w) => {
        const take = w.stocktakes.get(takeId);
        for (const line of take.lines) {
          const variance = line.itemId === ITEM.absolut ? -toBase(140) : 0;
          w.stocktakes.count(takeId, line.itemId, line.theoretical + variance);
        }
      },
    },
    {
      at: 44,
      caption: 'Posted. The variance becomes a stock movement and the shelf and the system agree again.',
      featureId: 'stocktakes',
      run: (w) => w.stocktakes.post(takeId),
    },
    {
      at: 56,
      caption: 'Waste and loss by type: spillage, over-pour, breakage, so the variance has a reason.',
      featureId: 'waste-capture',
      ghostCaption: 'Coming: break the variance down into waste and loss by type.',
    },
  ],
};
