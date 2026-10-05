import { formatTick } from '../sim/clock';
import { useSim, type Speed } from '../store';
import { useWorld } from '../scene/useWorld';
import { ScenarioPicker } from './ScenarioPicker';

export function TopBar() {
  const world = useWorld();
  const runner = useSim((s) => s.runner);
  const playing = useSim((s) => s.playing);
  const speed = useSim((s) => s.speed);
  const mode = useSim((s) => s.mode);
  const camera = useSim((s) => s.camera);
  const { setMode, togglePlay, setSpeed, reset, setCamera, toggleDebug } = useSim.getState();
  const venue = camera.view === 'venue' && camera.venueId ? world.catalogue.venues.get(camera.venueId) : undefined;

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="brand">
          McOolio <span>Inventory Sim</span>
        </div>
        <select className="select" value="group" onChange={() => undefined} aria-label="Group">
          <option value="group">McOolio Group</option>
        </select>
        <div className="crumbs">
          <button className="crumb" onClick={() => setCamera({ view: 'world' })}>
            World
          </button>
          {venue && (
            <>
              <span className="crumb-sep">›</span>
              <button className="crumb on" onClick={() => setCamera({ view: 'venue', venueId: venue.id })}>
                {venue.shortName}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="topbar-mid">
        <span className="clock">{formatTick(world.tick)}</span>
        <button className="btn" onClick={togglePlay} disabled={runner.done}>
          {playing ? 'Pause' : runner.done ? 'Done' : 'Play'}
        </button>
        {([1, 4, 16] as Speed[]).map((s) => (
          <button key={s} className={`btn ghost ${speed === s ? 'on' : ''}`} onClick={() => setSpeed(s)}>
            {s}x
          </button>
        ))}
        <button className="btn ghost" onClick={reset} title="Replay from the start, same seed">
          Reset
        </button>
      </div>
      <div className="topbar-right">
        <div className="mode-toggle">
          <button className={mode === 'today' ? 'on' : ''} onClick={() => setMode('today')}>
            Today
          </button>
          <button className={mode === 'roadmap' ? 'on' : ''} onClick={() => setMode('roadmap')}>
            Where we're going
          </button>
        </div>
        <ScenarioPicker />
        <button className="btn ghost small" onClick={toggleDebug} title="Raw sim tables">
          Tables
        </button>
      </div>
    </div>
  );
}
