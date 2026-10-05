import { CaptionBar } from './hud/CaptionBar';
import { DebugPanel } from './hud/DebugPanel';
import { TopBar } from './hud/TopBar';
import { SceneRoot } from './scene/SceneRoot';
import { useSim } from './store';

export default function App() {
  const debugOpen = useSim((s) => s.debugOpen);
  return (
    <div className="app">
      <SceneRoot />
      <div className="hud">
        <TopBar />
        <CaptionBar />
        <div className="footer-line">All prices, costs, volumes and venues are invented demo data.</div>
      </div>
      {debugOpen && (
        <div className="debug-drawer">
          <DebugPanel />
        </div>
      )}
    </div>
  );
}
