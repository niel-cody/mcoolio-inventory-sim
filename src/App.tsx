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
  const mode = useSim((s) => s.mode);
  const sceneReady = useSim((s) => s.sceneReady);
  return (
    <div className="app">
      <SceneRoot />
      <LabelLayer />
      <div className="hud">
        <TopBar />
        {mode === 'roadmap' && <div className="mode-badge">Where we're going · roadmap layer on</div>}
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
      {!sceneReady && (
        <div className="splash">
          <div className="splash-title">
            McOolio <span>Inventory Sim</span>
          </div>
          <div className="splash-sub">Warming up the kitchen, chilling the cool room.</div>
        </div>
      )}
      {debugOpen && (
        <div className="debug-drawer">
          <DebugPanel />
        </div>
      )}
    </div>
  );
}
