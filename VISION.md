# Vision: McOolio Inventory Sim

## The end state

A tool any Oolio employee, and later any Oolio customer, can open to run an inventory scenario and watch what would happen. Not a report, a rehearsal. You pick a situation (a big Friday, a late delivery, a recipe change, a new venue), press play, and see stock, sales, orders and cost move in a world you can read at a glance. Then you change one thing and run it again.

It is two tools in one:

- **Training.** New starters, sales, go-to-market and support learn how Oolio Inventory thinks by watching it work: item types, recipes, the batch boundary, reservations, the ordering cycle, stocktakes, cost. Five minutes with the sim should beat an hour with the back office.
- **Education and rehearsal for operators.** A venue manager asks "what if I move Absolut to a 45 mL pour", "what if the Valley opens an hour later", "what if I order on Thursdays instead of Fridays", and sees the impact on sell-outs, stock value and gross profit before doing it for real.

## Why McOolio

A fictional group lets us be loud and a bit absurd without touching anyone's real numbers. Three venues with different characters mean "sold out at one location" has somewhere to happen. The pseudo business stays the default world even once real data can be loaded.

## Principles

1. **The model is the product.** The sim engine mirrors the real inventory service's rules and is tested against the service's own scenario tests. The 3D view is a layer on top and never computes stock. Everything we add must keep that split.
2. **Honest by construction.** Every feature carries its status from `src/features.ts`. In Today mode a Coming feature never pretends to work. The demo must not sell what we have not built.
3. **Deterministic and replayable.** Seeded, tick based, rewindable. The same playbook gives the same result every time, so people can compare runs and trust what they see.
4. **Readable in five minutes, deep in fifty.** The world view tells the story to a room; the cards, feed and tables let someone who cares go all the way down to a movement row.
5. **Playful, not generic.** Oolio purple, venues at night, a crooked neon sign. No stock SaaS look.
6. **Invented data until it is not.** The seed is demo data and says so. Real data arrives only through an explicit adapter, read only, and is labelled.

## Horizons

No dates. Order of travel only.

- **Now.** A showcase-ready sim of McOolio: eight playbooks, the Today / Where we're going toggle, the transport deck, day and night, next-day deliveries. Shared internally.
- **Next.** The sim as a sandbox: change a thing and rerun. Pour sizes, trading hours, pars, order days, recipe versions, a fourth venue. Compare two runs side by side. Playbooks people can author without code.
- **Later.** Your venue in the sim. An adapter reads a demo or real organisation from the inventory service and builds the world from it, so the rehearsal uses your products, recipes, suppliers and stock. Then the same thing inside the product for customers.

## What it is not

Not connected to production data in v1. Not an editing surface for the real catalogue. Not a replacement for the back office. Not a forecasting engine that claims accuracy; it shows the mechanics and the direction of impact, with invented demand.
