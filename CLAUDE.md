# CLAUDE.md

Working notes for anyone (person or Claude Code) building the McOolio Inventory Sim. Read this first, then `VISION.md` for where we are going, `ROADMAP.md` for what to build next, and `CHANGELOG.md` for what has shipped.

## What this is

A game-like 3D web app that explains Oolio Inventory through McOolio, a fictional three-venue group. The sim engine mirrors the real inventory service's rules; the 3D scene only reads sim state. The end goal in `VISION.md` is a training and rehearsal tool for any Oolio employee and, later, customers.

The product spec that started it lives outside the repo at `~/my_brain/10 Projects/Oolio/McOolio Inventory Sim/McOolio Inventory Sim Spec.md`. Where this file and the spec disagree, the spec wins; where the spec is silent, `VISION.md` and `ROADMAP.md` decide.

## How we work together

- Niel suggests ideas in chat or adds them to the Ideas section of `ROADMAP.md`. Claude triages them into Later, Next or Now using the scoring in that file, builds the top of Now, and records the result in `CHANGELOG.md` with the commit.
- Every piece of work ends with: tests green, typecheck clean, a commit on `main` with a plain message, a push (which deploys production), and a line in `CHANGELOG.md`. Big items also update `ROADMAP.md`.
- When something is ambiguous or would change the model's truthfulness, ask rather than guess.

## Where we are

Showcase ready. Eight playbooks, Today / Where we're going toggle, transport deck with rewind, right rail with the Playbook panel and feed, day and night following the clock, trading hours, next-day deliveries, the long weekend. Production at https://mcoolio-inventory-sim.vercel.app (behind Vercel Authentication; flip Deployment Protection to previews only to open it up). Shared with the inventory team and go-to-market for a play. Next up is the top of Now in `ROADMAP.md`.

## Non-negotiables

- `src/sim` is pure TypeScript. No React, no three. The scene reads state and never computes stock.
- Mirror the engine: item types STOCKED, NON_STOCKED, BATCH resolved by type; the batch boundary; integer base units x10,000; reservations RESERVED to COMMITTED, RELEASED on void, REVERSED on refund; FIFO cost behind, average cost shown. `src/sim/parity.test.ts` ports the service's Go scenario tests by name and must stay green.
- Every interactive feature reads its status from `src/features.ts`. In Today mode a Coming feature renders ghosted and opens a "what it will do" card. It never behaves as if it works.
- Deterministic: seeded RNG, tick based (1 tick = 1 sim minute), every playbook replays identically and can be reset or sought to any minute.
- Copy: British English, no em dashes, no buzzwords, no dates on roadmap items. Status words only (Live, Building, Coming, Later). The footer says the data is invented.
- Look: Oolio purple dominant, venue at night, playful. No stock SaaS look.
- The real engine at `~/Documents/GitHub/inventory` is read only. Never edit, branch or commit there.

## Layout

- `src/sim` engine: `baseunits`, `catalogue`, `recipe`, `stock`, `depletion`, `purchasing`, `production`, `stocktake`, `availability`, `service` (order generator with trading hours), `scenario` (runner with seek and beats), `clock`, `events`, `world`.
- `src/data/mcoolio.ts` the seed: venues, suppliers, items, products, recipes, opening stock, pars and reorder points.
- `src/scenarios` one file per playbook plus `profiles.ts` (per-venue order rates, weights, hours) and `helpers.ts`.
- `src/features.ts` the status registry.
- `src/scene` React Three Fiber: `SceneRoot`, `SkyAndSun`, `CameraRig`, `LabelLayer` (DOM labels, not drei Html), `world/` islands, depots, routes and trucks, `venue/` the four zones, tickets, puffs, bottles, `Ghost.tsx` for ghosted Coming features.
- `src/hud` React: `TopBar`, `KpiTiles`, `PoTracker`, `TransportDeck`, `RightRail`, `PlaybookPanel`, `Card`, `EventFeed`, `Intro`, `DebugPanel` (the Tables drawer), `format.ts`.
- `src/store.ts` zustand store and the timer-driven loop (1x = one sim minute per second).

## Commands

```bash
npm install
npm run dev
npm test
npm run build
```

Deploy happens on push to `main` through the git-linked Vercel project. For an ad hoc preview without pushing: `npx vercel@62 deploy --yes --target=preview`. Never plain `vercel deploy` on main; it lands on production.

## Things that are easy to get wrong

- Service profiles are calibrated for whole nights. Measured consumption: Newtown about 147 Kingfishers per dinner service, Fitzroy about 3,800 mL of Absolut a night. Opening stock and pars are sized for roughly two nights. If you change a rate or a weight, run `npm test` and the long weekend test will tell you if a venue now sells out.
- Each playbook pushes its own story item with a local profile in its file. Change those, not the shared baselines in `profiles.ts`, unless every playbook should change.
- Scenario steps with a static `at` and a caption become chapter dots on the scrubber. Beats that depend on events use `onceWhen` from `helpers.ts` and `world.cameraTo` / `world.requestSpeed`; they are not dots (see Roadmap Now item 2).
- Seeking backwards rebuilds the world from the seed and replays. Anything that animates on events must ignore events while `runner.seeking` is true (see `Tickets.tsx`).
- `stock.level()` creates a level if missing. Use `stock.levels.has()` before reading an item a venue may not stock, or the heat ring will read an empty level as sold out.
- drei's `Html` fights React 19. Use `useLabel` and the `LabelLayer`.
- In dev the page exposes `window.__mcoolio` (store, ticket counter) and `window.__r3f`. Drive the sim from a browser console with `useSim.getState().stepTicks(n)` or `seek(tick)` and read `gl.info` for draw calls.

## What mirrors the engine and what is demo only

Mirrors: item types and resolve by type, recipe expansion, batch boundary, base units and rounding, the reservation lifecycle and decideAction matrix, FIFO layers with average cost shown, receipts and production runs as layers, stocktake variance movements, oversell into a deficit.

Demo only: the In transit state (the service has DRAFT, SENT, RECEIVED, POSTED), next-day dispatch and transit times, trading hours, the order generator and venue profiles, prices and costs, per-venue recipe overrides for the Coming swap, everything in Where we're going mode.
