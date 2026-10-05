import { BIRYANI_BATCH, ITEM, PRODUCT, VENUE } from '../data/mcoolio';
import { toBase } from '../sim/baseunits';
import { runService } from '../sim/service';
import type { Scenario } from '../sim/scenario';
import { NEWTOWN_PROFILE } from './profiles';

const NEWTOWN_MEALS = { ...NEWTOWN_PROFILE, ordersPerTick: 0.18, maxLines: 1, weights: { ...NEWTOWN_PROFILE.weights, [PRODUCT.meal]: 9, [PRODUCT.biryani]: 6 } };

export const batchDay: Scenario = {
  id: 'batch-day',
  number: 4,
  title: 'Batch day',
  strap: 'Newtown cooks a biryani batch. Rice, chicken and spice go in at production. Sales take portions, never rice.',
  featureIds: ['batch-production-backoffice', 'catalogue-item-types', 'waste-capture', 'batch-production-pos-kds'],
  durationTicks: 240,
  suggestedSpeed: 4,
  setup: (w) => {
    // Opening count for batch day: the lunch batch is nearly gone.
    const pool = w.stock.onHand(ITEM.biryaniPool, VENUE.newtown);
    if (pool > toBase(10)) w.stock.adjust(ITEM.biryaniPool, VENUE.newtown, toBase(10) - pool, 'MANUAL_ADJUSTMENT', 'scenario:batch-day', 'Opening count');
  },
  steps: [
    { at: 0, camera: { view: 'venue', venueId: VENUE.newtown, zone: 'kitchen' }, caption: 'Newtown kitchen. Ten portions left from the lunch batch, four bags of rice in the store.' },
    {
      at: 5,
      caption: 'Production run: 2 kg rice, 2.5 kg chicken, 200 g spice go into the pot. 20 portions planned.',
      featureId: 'batch-production-backoffice',
      run: (w) => {
        w.production.start(ITEM.biryaniPool, VENUE.newtown, BIRYANI_BATCH.yieldPortions, BIRYANI_BATCH.durationTicks);
      },
    },
    { at: 8, caption: 'The sacks shrink now, at production. This is the batch boundary.', featureId: 'batch-production-backoffice' },
    { at: 20, run: (w) => runService(w, VENUE.newtown, NEWTOWN_MEALS, 230), caption: 'Service starts. Biryani Meals sell while the pot is still cooking.' },
    { at: 60, caption: 'Each meal takes one portion from the pool and one naan. The rice does not move at the till.', featureId: 'catalogue-item-types' },
    { at: 100, caption: 'The batch lands: 20 portions, carrying the cost of what went into them.', featureId: 'batch-production-backoffice' },
    { at: 150, caption: 'Recording the batch from the KDS as it comes off the stove.', featureId: 'batch-production-pos-kds', ghostCaption: 'Coming: record the batch from the KDS instead of the back office.' },
    {
      at: 232,
      caption: 'Close. Leftover portions recorded as waste, so tomorrow starts honest.',
      featureId: 'waste-capture',
      ghostCaption: 'Coming: leftover portions at close recorded as waste with a reason.',
      run: (w) => {
        const left = w.stock.onHand(ITEM.biryaniPool, VENUE.newtown);
        if (left > 0) w.waste(ITEM.biryaniPool, VENUE.newtown, Math.min(left, toBase(4)), 'End of night');
      },
    },
  ],
};
