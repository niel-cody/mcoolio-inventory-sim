# Changelog and progress log

Newest first. Commits are on `main` in github.com/niel-cody/mcoolio-inventory-sim and deploy to https://mcoolio-inventory-sim.vercel.app on push.

## After the first review

- `9e56911` Day and night follow the sim clock. Sky, fog, sun angle, lamps, neon and stars follow the hour. Venues trade in their hours, suppliers dispatch at 07:00 the next day with their own transit time, scenarios can request a speed change so nights run at 64x, the deck gains sun and moon seeks, and playbook 8 The long weekend runs Friday 16:00 to Sunday 15:00. Opening stock and pars resized for whole nights after measuring consumption (Newtown pours about 147 Kingfishers in a dinner service; Fitzroy about 3,800 mL of Absolut a night). 62 tests.
- `6f2b26b` Transport deck with scrubber, chapter dots and real rewind (rebuild from seed and replay); right rail with the Playbook panel, the live card and a full-height event feed; first-visit explainer with a help button. Keyboard shortcuts on the deck.

## P5 Polish and production

- `cf95976` Warm-up splash, closing waste beat in The 86 for run of show step 6, README run of show.
- `0a93fa6` Lighter shadows (1024 map, bottles no longer cast), pixel ratio cap 1.5, projector typography at 1600px and up. Measured 60 fps world view and about 52 fps venue view at 1600x900 before the trim.
- Production deployed to https://mcoolio-inventory-sim.vercel.app behind Vercel Authentication.

## P4 Playbooks and the toggle

- `c545688` The 86 keeps the kitchen quiet so the only story at Fitzroy is the pour pool.
- `0564c2e` Camera beats emitted from scenario logic (`world.cameraTo`) so beats fire when things happen; The 86 and the ordering cycle retimed.
- Seven playbooks in `src/scenarios`, Today / Where we're going toggle, scenario picker, roadmap badge, Coming features ghosted with "what it will do" cards.

## P3 Venue diorama and HUD

- `63d7aa0` KPI tiles, five-step PO tracker, event feed, click cards for item, venue, supplier, PO, ticket and feature, hover tips.
- `c5d7b42` Bar (bottles with fill, espresso machine that puffs, bartender who shakes, POS terminal, 86 board, Ngara), cool room (cartons that shrink), kitchen (pot with portion counter and steam, sacks and cases that shrink only at production, KDS, waste bin), dock (cartons on arrival, receiving clipboard, suggested order screen), flying tickets that split one piece per depleted ingredient.

## P2 World view

- `534f6cc` 3D labels projected through a DOM layer instead of drei Html (React 19 conflict).
- `170d6d9` Three islands with heat rings, three supplier depots, dashed routes, trucks on open purchase orders, fly-in camera that faces each island's bar.

## P1 Sim engine and parity

- `5bff107` Pure TypeScript engine in `src/sim`: catalogue with item types, versioned recipes, stock in integer base units with FIFO cost layers and average cost, reservation lifecycle, depletion resolve ported from the Go service, purchasing, production runs, stocktakes, availability, seeded RNG, tick clock, event bus. McOolio seed. Features status registry. Parity tests port all nineteen Go scenario tests by name plus the decideAction table. Debug panel. Vercel project created and linked.

## Decisions carried from the spec's open questions

- Status table as drafted; the sold-out flag is Coming, so Today shows stock at zero with a warning and keeps depleting into a deficit, which is what the real DEFICIT batch does.
- Venue names kept: Newtown, Fortitude Valley, Fitzroy.
- Internal showcase first, so the Coming layer is loud.
- Hook to the real dev API deferred to v2; the model is shaped for it.
