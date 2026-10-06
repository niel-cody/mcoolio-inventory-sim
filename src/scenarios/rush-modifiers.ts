import { PRODUCT, VENUE } from '../data/mcoolio';
import { runService } from '../sim/service';
import type { Scenario } from '../sim/scenario';
import { FITZROY_PROFILE } from './profiles';

const QUIET = { ...FITZROY_PROFILE, ordersPerTick: 0.15 };

export const rushModifiers: Scenario = {
  id: 'rush-modifiers',
  number: 5,
  title: 'Rush modifiers',
  strap: 'Espresso Martini with an extra shot. Espresso depletes 60 mL, aggregated into one demand.',
  featureIds: ['depletion-engine', 'recipes-variants'],
  durationTicks: 90,
  youWillSee: ['A plain martini takes 30 mL of espresso.', 'An extra shot is its own recipe; the two merge into one 60 mL demand.', 'A Double with a Nip on the side is 90 mL off one pour pool.'],
  tryThis: 'Click the espresso machine to see the demands land as integers in base units.',
  suggestedSpeed: 1,
  steps: [
    { at: 0, camera: { view: 'venue', venueId: VENUE.fitzroy, zone: 'bar' }, caption: 'Fitzroy bar. Watch the espresso machine.' },
    { at: 1, run: (w) => runService(w, VENUE.fitzroy, QUIET, 90) },
    {
      at: 4,
      caption: 'One Espresso Martini. Espresso 30 mL.',
      run: (w) => w.sell(VENUE.fitzroy, [{ posId: PRODUCT.martini, quantity: 1 }], { completeAfter: 2 }),
    },
    {
      at: 14,
      caption: 'Espresso Martini with an extra shot. The modifier is its own recipe: 30 mL more espresso, merged into one 60 mL demand.',
      featureId: 'recipes-variants',
      run: (w) => w.sell(VENUE.fitzroy, [{ posId: PRODUCT.martini, quantity: 1, options: [{ variants: [{ posId: PRODUCT.extraShot }] }] }], { completeAfter: 2 }),
    },
    {
      at: 28,
      caption: 'Two with extra shots on one ticket: espresso 120 mL, still one demand line.',
      run: (w) => w.sell(VENUE.fitzroy, [{ posId: PRODUCT.martini, quantity: 2, options: [{ variants: [{ posId: PRODUCT.extraShot }] }] }], { completeAfter: 2 }),
    },
    {
      at: 44,
      caption: 'A Double with a Nip on the side: 60 mL plus 30 mL, 90 mL off the pour pool as one demand.',
      run: (w) => w.sell(VENUE.fitzroy, [{ posId: PRODUCT.double, quantity: 1, includedItems: [{ posId: PRODUCT.nip, quantity: 1 }] }], { completeAfter: 2 }),
    },
    { at: 60, caption: 'Vodka 45, espresso 30, syrup 7.5, water 7.5. Held as integers in base units, no float drift.' },
  ],
};
