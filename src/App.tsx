import { Card } from './hud/Card';
import { CaptionBar } from './hud/CaptionBar';
import { DebugPanel } from './hud/DebugPanel';
import { EventFeed } from './hud/EventFeed';
import { HoverTip } from './hud/HoverTip';
import { KpiTiles } from './hud/KpiTiles';
import { PoTracker } from './hud/PoTracker';
import { TopBar } from './hud/TopBar';
import { LabelLayer } from './scene/LabelLayer';
import { SceneRoot } from './scene/SceneRoot';
import { useSim } from './store';

export default function App() {
  const debugOpen = useSim((s) => s.debugOpen);
  return (
    <div className="app">
      <SceneRoot />
      <LabelLayer />
      <div className="hud">
        <TopBar />
        <div className="hud-mid">
          <div className="hud-left">
            <KpiTiles />
          </div>
          <div className="hud-right">
            <Card />
          </div>
        </div>
        <div className="hud-bottom">
          <PoTracker />
          <CaptionBar />
          <EventFeed />
        </div>
        <div className="footer-line">All prices, costs, volumes and venues are invented demo data.</div>
      </div>
      <HoverTip />
      {debugOpen && (
        <div className="debug-drawer">
          <DebugPanel />
        </div>
      )}
    </div>
  );
}
