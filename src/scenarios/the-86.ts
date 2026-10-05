import { ITEM, PRODUCT, VENUE } from '../data/mcoolio';
import { toBase } from '../sim/baseunits';
import { runService } from '../sim/service';
import type { Scenario } from '../sim/scenario';
import { hitZero, onceWhen } from './helpers';
import { FITZROY_PROFILE, NEWTOWN_PROFILE, VALLEY_PROFILE } from './profiles';

// Cocktail night: the kitchen is quiet, so the only story at Fitzroy is the pour pool.
const FITZROY_HARD = { ...FITZROY_PROFILE, ordersPerTick: 0.6, weights: { [PRODUCT.martini]: 9, [PRODUCT.double]: 6, [PRODUCT.nip]: 3, [PRODUCT.kingfisher]: 3 } };

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
          world.after(5, (x) => {
            x.cameraTo({ view: 'world' });
            x.caption('One venue red, two green. Sold out is a place, not a product.');
          });
          world.after(12, (x) => {
            x.cameraTo({ view: 'venue', venueId: VENUE.fitzroy, zone: 'bar' });
            if (!x.featurePlays('ai-stock-manager')) {
              x.caption('Back at the bar. The shelf stays empty until someone notices and acts.', 'ai-stock-manager');
              return;
            }
            x.suggest(VENUE.fitzroy, 'ai-stock-manager', 'Ngara: Fitzroy is out of Absolut with hours of service left. Swap the martini to Grey Goose (3 bottles on the shelf), or transfer 2 bottles from Newtown (10 on hand).');
            x.caption('Ngara spots it and suggests two moves: swap the martini to Grey Goose, or transfer two bottles from Newtown.', 'ai-stock-manager');
          });
          world.after(20, (x) => {
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
          world.after(34, (x) => {
            x.withFeature('transfers', () => {
              x.transfer(ITEM.absolut, VENUE.newtown, VENUE.fitzroy, toBase(1400));
              x.caption('Transfer: 2 bottles of Absolut, Newtown to Fitzroy, at cost. Nip and Double come back.', 'transfers');
            });
          });
        });
      },
    },
    { at: 30, caption: 'Every Nip is 30 mL, every Double 60 mL, every martini 45 mL, all off one pour pool.', featureId: 'recipes-variants' },
    { at: 200, camera: { view: 'world' }, caption: 'End of the night. Compare the rings.' },
  ],
};
