import { DebugPanel } from './hud/DebugPanel';
import { HoverTip } from './hud/HoverTip';
import { Intro } from './hud/Intro';
import { KpiTiles } from './hud/KpiTiles';
import { PoTracker } from './hud/PoTracker';
import { RightRail } from './hud/RightRail';
import { TopBar } from './hud/TopBar';
import { TransportDeck } from './hud/TransportDeck';
import { LabelLayer } from './scene/LabelLayer';
import { SceneRoot } from './scene/SceneRoot';
import { useSim } from './store';

export default function App() {
  const debugOpen = useSim((s) => s.debugOpen);
  const sceneReady = useSim((s) => s.sceneReady);
  return (
    <div className="app">
      <main className="main">
        <SceneRoot />
        <LabelLayer />
        <div className="hud">
          <TopBar />
          <div className="hud-mid">
            <div className="hud-left">
              <KpiTiles />
            </div>
          </div>
          <div className="hud-bottom">
            <PoTracker />
            <TransportDeck />
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
      </main>
      <RightRail />
      <Intro />
      {debugOpen && (
        <div className="debug-drawer">
          <DebugPanel />
        </div>
      )}
    </div>
  );
}
