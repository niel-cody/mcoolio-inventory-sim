import { useWorld } from '../scene/useWorld';
import { Feed } from './DebugPanel';

export function EventFeed() {
  const world = useWorld();
  const events = world.events.log.filter((e) => e.type !== 'caption' && e.type !== 'camera').slice(-14);
  return (
    <div className="panel feed-panel">
      <div className="panel-title">Event feed</div>
      {events.length === 0 ? <div className="muted">Press play.</div> : <Feed events={events} />}
    </div>
  );
}
