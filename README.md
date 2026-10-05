# McOolio Inventory Sim

A game-like 3D demo of Oolio Inventory, told through McOolio: a fictional three-venue group that is an Indian kitchen, a beer hall and a cocktail bar under one roof. Four products (Kingfisher, Absolut, Espresso Martini, Biryani) flow through sale, depletion, sold out, reorder, receive and batch production, and a Today / Where we're going toggle keeps the demo honest about what is live, building and coming.

All prices, costs, volumes and venues are invented demo data.

## Run it

```bash
npm install
npm run dev
```

`npm test` runs the Vitest suite, including the parity tests ported from the real inventory service's Go scenario tests. `npm run build` produces a static site in `dist` for Vercel.

## Layout

- `src/sim` is the engine: pure TypeScript, no React, no three. Catalogue with item types (STOCKED, NON_STOCKED, BATCH), versioned recipes, stock in integer base units (x10,000) with FIFO cost layers behind and average cost in front, reservations (RESERVED to COMMITTED, RELEASED on void, REVERSED on refund), depletion resolve ported from the Go service, purchase orders, production runs, stocktakes, a seeded RNG and a tick clock (1 tick = 1 sim minute).
- `src/data/mcoolio.ts` is the seed.
- `src/scenarios` holds the seven scenario scripts and the venue service profiles.
- `src/features.ts` is the status registry. Every interactive feature reads its status from here.
- `src/scene` is the React Three Fiber view. It only reads sim state.
- `src/hud` is the cards, KPIs, trackers and feed.

## What mirrors the real engine, what is demo only

Mirrors the engine: item types and resolve by type, recipe expansion to leaf lines, the batch boundary, base units and rounding, the reservation lifecycle and the decideAction matrix, FIFO layers with average cost shown, goods receipts creating layers, production runs consuming at production, stocktake variance movements, oversell into a deficit.

Demo only: the "In transit" purchase order state (the real service has DRAFT, SENT, RECEIVED, POSTED), lead times, the order generator and venue profiles, prices and costs, per-venue recipe overrides (the Coming ingredient swap), and everything in Roadmap mode.
