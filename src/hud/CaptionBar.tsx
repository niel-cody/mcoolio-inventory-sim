import { useMemo } from 'react';
import { useSim } from '../store';
import { useWorld } from '../scene/useWorld';
import { FeaturePill } from './DebugPanel';

export function CaptionBar() {
  const world = useWorld();
  const runner = useSim((s) => s.runner);
  const count = world.events.count;
  const latest = useMemo(() => [...world.events.log].reverse().find((e) => e.type === 'caption'), [world, count]);
  const text = latest?.type === 'caption' ? latest.text : runner.scenario.strap;
  const featureId = latest?.type === 'caption' ? latest.featureId : undefined;
  return (
    <div className="captionbar">
      <div className="captionbar-scenario">
        {runner.scenario.number}. {runner.scenario.title}
      </div>
      <div className="captionbar-text">
        {featureId && <FeaturePill id={featureId} />}
        <span>{text}</span>
      </div>
      <div className="captionbar-progress">
        <div style={{ width: `${Math.round(runner.progress() * 100)}%` }} />
      </div>
    </div>
  );
}
