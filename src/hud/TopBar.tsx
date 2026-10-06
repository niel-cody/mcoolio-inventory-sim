import { formatTick } from '../sim/clock';
import { useSim } from '../store';
import { useWorld } from '../scene/useWorld';

export function TopBar() {
  const world = useWorld();
  const camera = useSim((s) => s.camera);
  const mode = useSim((s) => s.mode);
  const { setCamera } = useSim.getState();
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
        {mode === 'roadmap' && <span className="mode-badge inline">Where we're going · roadmap layer on</span>}
        <span className="clock">{formatTick(world.tick)}</span>
      </div>
    </div>
  );
}
