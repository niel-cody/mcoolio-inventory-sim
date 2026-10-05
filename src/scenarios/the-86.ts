import { ITEM, PRODUCT, VENUE } from '../data/mcoolio';
import { toBase } from '../sim/baseunits';
import { runService } from '../sim/service';
import type { Scenario } from '../sim/scenario';
import { hitZero, onceWhen } from './helpers';
import { FITZROY_PROFILE, NEWTOWN_PROFILE, VALLEY_PROFILE } from './profiles';

const FITZROY_HARD = { ...FITZROY_PROFILE, ordersPerTick: 0.6, weights: { ...FITZROY_PROFILE.weights, [PRODUCT.martini]: 9, [PRODUCT.double]: 6 } };

export const the86: Scenario = {
  id: 'the-86',
  number: 2,
  title: 'The 86',
  strap: 'Fitzroy pours Absolut hard. The pour pool hits zero and the martini, Nip and Double go down at Fitzroy only.',
  featureIds: ['depletion-engine', 'sold-out-flag', 'ai-stock-manager', 'ingredient-swap', 'transfers'],
  durationTicks: 220,
  suggestedSpeed: 4,
  steps: [
    { at: 0, camera: { view: 'venue', venueId: VENUE.fitzroy, zone: 'bar' }, caption: 'Fitzroy on a big night. Five bottles of Absolut on the shelf, 3,500 mL.' },
    {
      at: 1,
      run: (w) => {
        runService(w, VENUE.fitzroy, FITZROY_HARD, 220);
        runService(w, VENUE.newtown, NEWTOWN_PROFILE, 220);
        runService(w, VENUE.valley, VALLEY_PROFILE, 220);
        onceWhen(w, hitZero(ITEM.absolut, VENUE.fitzroy), (world) => {
          world.caption('Absolut at Fitzroy: zero. Newtown and the Valley still have theirs.');
          if (world.featurePlays('sold-out-flag')) {
            world.after(1, (x) => x.caption('Absolut Nip, Absolut Double and the Espresso Martini switch off on the Fitzroy POS only.', 'sold-out-flag'));
          } else {
            world.after(1, (x) => x.caption('Today: the engine keeps depleting into a deficit and raises a warning. Switching the products off at the venue is still to come.', 'sold-out-flag'));
          }
          world.after(6, (x) => {
            if (!x.featurePlays('ai-stock-manager')) return;
            x.suggest(VENUE.fitzroy, 'ai-stock-manager', 'Ngara: Fitzroy is out of Absolut with hours of service left. Swap the martini to Grey Goose (3 bottles on the shelf), or transfer 2 bottles from Newtown (10 on hand).');
          });
          world.after(16, (x) => {
            x.withFeature('ingredient-swap', () => {
              const v = x.recipes.addVersion(ITEM.martini, [
                { ingredientItemId: ITEM.greygoose, qty: 45 },
                { ingredientItemId: ITEM.espresso, qty: 30 },
                { ingredientItemId: ITEM.sugar, qty: 7.5 },
                { ingredientItemId: ITEM.water, qty: 7.5 },
              ], { note: 'Grey Goose swap, Fitzroy only' });
              x.recipes.activateAt(ITEM.martini, v.id, VENUE.fitzroy);
              x.events.emit({ type: 'recipe.activated', tick: x.tick, itemId: ITEM.martini, versionId: v.id, note: 'Grey Goose swap at Fitzroy' });
              x.caption('Swap accepted. The Fitzroy martini now pours Grey Goose and is back on the menu.', 'ingredient-swap');
            });
          });
          world.after(30, (x) => {
            x.withFeature('transfers', () => {
              x.transfer(ITEM.absolut, VENUE.newtown, VENUE.fitzroy, toBase(1400));
              x.caption('Transfer: 2 bottles of Absolut, Newtown to Fitzroy, at cost. Nip and Double come back.', 'transfers');
            });
          });
        });
      },
    },
    { at: 30, caption: 'Every Nip is 30 mL, every Double 60 mL, every martini 45 mL, all off one pour pool.', featureId: 'recipes-variants' },
    { at: 150, camera: { view: 'world' }, caption: 'One venue red, two green. Sold out is a place, not a product.' },
  ],
};
