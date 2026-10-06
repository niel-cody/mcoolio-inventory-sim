import { useSim } from '../store';
import { Card } from './Card';
import { EventFeed } from './EventFeed';
import { PlaybookPanel } from './PlaybookPanel';

export function RightRail() {
  const mode = useSim((s) => s.mode);
  const selection = useSim((s) => s.selection);
  const { setMode, setIntro, toggleDebug } = useSim.getState();
  return (
    <aside className="rail">
      <div className="rail-head">
        <div className="mode-toggle">
          <button className={mode === 'today' ? 'on' : ''} onClick={() => setMode('today')}>
            Today
          </button>
          <button className={mode === 'roadmap' ? 'on' : ''} onClick={() => setMode('roadmap')}>
            Where we're going
          </button>
        </div>
        <div className="rail-head-btns">
          <button className="btn ghost small" onClick={() => setIntro(true)} title="How this works">
            ?
          </button>
          <button className="btn ghost small" onClick={toggleDebug} title="Raw sim tables">
            Tables
          </button>
        </div>
      </div>
      <div className="rail-mode-note muted small">
        {mode === 'today' ? 'Only Live and Building features play. Coming features are ghosted; click one to read what it will do.' : 'Everything plays. Coming features are tagged on screen while they run.'}
      </div>
      {selection ? <Card /> : <PlaybookPanel />}
      <EventFeed />
    </aside>
  );
}
