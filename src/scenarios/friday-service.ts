import { VENUE } from '../data/mcoolio';
import { runService } from '../sim/service';
import type { Scenario } from '../sim/scenario';
import { FITZROY_PROFILE, NEWTOWN_PROFILE, VALLEY_PROFILE } from './profiles';

export const fridayService: Scenario = {
  id: 'friday-service',
  number: 1,
  title: 'Friday service',
  strap: 'Orders flow at all three venues. Tickets fly, stock ticks down, reservations commit on complete.',
  featureIds: ['depletion-engine', 'catalogue-item-types', 'recipes-variants'],
  durationTicks: 240,
  suggestedSpeed: 4,
  steps: [
    { at: 0, camera: { view: 'world' }, caption: 'This is McOolio: three venues, four products, one inventory.' },
    {
      at: 1,
      run: (w) => {
        runService(w, VENUE.newtown, NEWTOWN_PROFILE, 240);
        runService(w, VENUE.valley, VALLEY_PROFILE, 240);
        runService(w, VENUE.fitzroy, FITZROY_PROFILE, 240);
      },
    },
    { at: 12, camera: { view: 'venue', venueId: VENUE.fitzroy, zone: 'bar' }, caption: 'Fitzroy. Every sale is created first (reserved) and completes a few minutes later (committed).' },
    { at: 40, caption: 'Kingfisher is STOCKED: one bottle sold, one unit off its own pool.', featureId: 'catalogue-item-types' },
    { at: 70, caption: 'The Espresso Martini is NON_STOCKED: one ticket splits four ways, 45 mL vodka, 30 mL espresso, 7.5 mL syrup, 7.5 mL water.', featureId: 'recipes-variants' },
    { at: 100, camera: { view: 'venue', venueId: VENUE.fitzroy, zone: 'kitchen' }, caption: 'Biryani is BATCH: a meal takes one portion from the pot and one naan. The rice sack does not move.', featureId: 'catalogue-item-types' },
    { at: 140, camera: { view: 'world' }, caption: 'Three venues, three different nights. Watch the heat rings.' },
  ],
};
