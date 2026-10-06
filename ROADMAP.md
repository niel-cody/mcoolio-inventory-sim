# Roadmap and backlog

This is where ideas for the sim get captured, prioritised and built. Niel suggests and steers; Claude Code prioritises, builds and records. Anyone can add to **Ideas**. No dates anywhere, only order.

## How an idea moves

1. **Ideas.** Write it down in one or two lines. Say who it helps and what it shows.
2. **Triage.** Claude scores it on three things and moves it to Later, Next or Now:
   - **Story value.** Does it make an inventory concept land for a viewer, or make the sim more useful as a rehearsal?
   - **Honesty.** Can it be done without pretending a Coming feature works in Today mode? If it touches a real feature, which status does it carry?
   - **Cost.** Engine change, view change, or both. Engine changes need tests first.
3. **Now** is the next two or three things to build, in order. When one ships it moves to Done in `CHANGELOG.md` with the commit.

Rules of thumb for priority: anything that makes the five-minute run of show clearer beats anything that adds a feature; anything that keeps the engine truthful to the service beats anything visual; a Coming feature shown ghosted beats the same feature faked.

## Now

1. **Bright room mode.** A high-contrast HUD variant for projectors in lit rooms. Night scene stays; panels, deck and rail go light. Sun icon in the rail head. Small, high showcase value.
2. **Dynamic beats as chapters.** Captions that fire on events (Absolut hit zero, truck arrived) are not dots on the scrubber because their minute varies. Record the tick when they fire so the scrubber shows them after the fact and the previous beat button can land on them.
3. **Tune invented prices.** Gross profit runs above eighty percent because prices are generous against costs. Bring it to the seventies so the KPI reads like a real bar.

## Next

- **Change one thing and rerun.** A small panel of knobs on the current playbook: pour size, trading hours, pars, order day, batch size. Rerun from the seed and show the delta on the KPI tiles (sold-outs, stock value, GP). This is the first step towards the rehearsal tool in `VISION.md`.
- **Compare two runs.** Pin a run, change a knob, see both lines on the scrubber and both KPI sets side by side.
- **Playbook authoring without code.** A JSON or form-driven playbook: start hour, duration, which venues trade, scripted events, captions. Scripts stay deterministic.
- **Fourth venue and a supplier with a long lead time.** Shows transfers and par levels better in Roadmap mode.
- **Stocktake count UI.** Let the viewer type the count in the count playbook rather than it being scripted.
- **Transfers with a van.** The Coming transfer currently teleports stock. A van on a route between islands, tagged Coming, makes the idea visible.
- **Waste and loss by type.** Spillage, over-pour, breakage, expiry as distinct reasons with their own feed lines and a small breakdown on the item card. Coming, ghosted in Today.
- **Share a moment.** A URL that encodes playbook, mode and tick, so a link opens the sim at a specific beat.
- **Keyboard help.** A small overlay listing the deck shortcuts.

## Later

- **Adapter to the inventory dev API.** Build the world from a demo organisation: items, recipes and versions, suppliers, UoMs, stock levels. Read only, labelled "live data". The engine's model is already shaped for this.
- **Real orders replayed.** Feed captured POS order events through the depletion engine and watch them deplete, instead of the generated service.
- **Your venue.** Pick an organisation and venue, see your own cool room. Needs the adapter plus access rules.
- **Other POS brands.** Listed in the status registry as Later and not shown in v1.
- **Mobile and tablet layout.** The sim is desktop and projector first. A read-only phone layout with the feed and cards would let people follow along in a meeting.
- **Accessibility pass.** Keyboard reach for every card, reduced-motion mode, contrast check on pills.
- **Sound.** A till chime on commit, a truck horn on arrival, a kitchen bell when a batch lands. Off by default.

## Ideas

Unsorted. Add freely.

- Ngara as a guide: a cameo that narrates the roadmap beats in Where we're going mode.
- Heat map of the whole week: a strip under the scrubber coloured by sold-outs per hour.
- A "what the engine did" panel that shows the demand lines for the last ticket in base units, next to the Go test it corresponds to.
- Export the event log and movements as CSV for a run.
- A recipe change playbook: activate a new martini version mid-service and watch the demands change.
- Supplier price change mid-weekend to show FIFO layers and average cost diverging on the card.
- A quiet Tuesday playbook as a contrast to Friday.

## Done

Shipped items move to `CHANGELOG.md` with their commit.
