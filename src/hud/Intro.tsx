import { useSim } from '../store';

export function Intro() {
  const open = useSim((s) => s.introOpen);
  const { setIntro, play } = useSim.getState();
  if (!open) return null;
  return (
    <div className="intro" onClick={() => setIntro(false)}>
      <div className="intro-card" onClick={(e) => e.stopPropagation()}>
        <div className="intro-kicker">A five-minute tour of Oolio Inventory</div>
        <h1>
          McOolio <span>Inventory Sim</span>
        </h1>
        <p className="intro-lead">
          Three fictional venues, four products, one inventory. Pick a playbook, press play, and watch sales deplete stock, venues sell out, orders travel and batches cook.
        </p>
        <ol className="intro-steps">
          <li>
            <strong>Pick a playbook</strong> in the right rail. Each one is a scripted night with captions.
          </li>
          <li>
            <strong>Drive it</strong> with the deck at the bottom: play, pause, back and forward 10 minutes, skip to the next beat, 1x, 4x or 16x. Drag the scrubber to any minute; rewinding replays from the seed, so it is always the same.
          </li>
          <li>
            <strong>Click anything</strong> on an island for its live card: on hand, reorder point, average cost, open order.
          </li>
          <li>
            <strong>Flip Today / Where we're going.</strong> Ghosted objects are features still to come; in Today mode they never pretend to work.
          </li>
        </ol>
        <div className="intro-actions">
          <button
            className="btn"
            onClick={() => {
              setIntro(false);
              play();
            }}
          >
            Start the Friday service
          </button>
          <button className="btn ghost" onClick={() => setIntro(false)}>
            Just look around
          </button>
        </div>
        <div className="muted small">All prices, costs, volumes and venues are invented demo data.</div>
      </div>
    </div>
  );
}
