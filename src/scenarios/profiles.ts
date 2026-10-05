import { PRODUCT } from '../data/mcoolio';
import type { ServiceProfile } from '../sim/service';

// Rates are orders per sim minute. A Friday service is 240 ticks, so these are
// tuned to drain roughly a third to a half of a venue's opening stock, with the
// story item for each scenario pushed harder in that scenario's own profile.

/** Newtown: flagship, kitchen-led. */
export const NEWTOWN_PROFILE: ServiceProfile = {
  ordersPerTick: 0.3,
  weights: {
    [PRODUCT.biryani]: 3,
    [PRODUCT.meal]: 4,
    [PRODUCT.kingfisher]: 5,
    [PRODUCT.kf6]: 1,
    [PRODUCT.martini]: 2,
    [PRODUCT.nip]: 1,
    [PRODUCT.double]: 1,
  },
  modifiers: { [PRODUCT.martini]: { [PRODUCT.extraShot]: 0.25 } },
  maxLines: 2,
};

/** Fortitude Valley: late-night, burns Kingfisher. */
export const VALLEY_PROFILE: ServiceProfile = {
  ordersPerTick: 0.35,
  weights: {
    [PRODUCT.kingfisher]: 9,
    [PRODUCT.kf6]: 1,
    [PRODUCT.nip]: 2,
    [PRODUCT.double]: 2,
    [PRODUCT.martini]: 1,
    [PRODUCT.biryani]: 2,
    [PRODUCT.meal]: 1,
  },
  modifiers: { [PRODUCT.martini]: { [PRODUCT.extraShot]: 0.2 } },
  maxLines: 2,
};

/** Fitzroy: cocktail-led, pours Absolut hard. */
export const FITZROY_PROFILE: ServiceProfile = {
  ordersPerTick: 0.22,
  weights: {
    [PRODUCT.martini]: 7,
    [PRODUCT.nip]: 3,
    [PRODUCT.double]: 4,
    [PRODUCT.kingfisher]: 3,
    [PRODUCT.biryani]: 1,
    [PRODUCT.meal]: 1,
  },
  modifiers: { [PRODUCT.martini]: { [PRODUCT.extraShot]: 0.3 } },
  maxLines: 2,
};
