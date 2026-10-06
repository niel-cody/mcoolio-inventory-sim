import { useState } from 'react';
import { SCENARIOS } from '../scenarios';
import { useSim } from '../store';
import { FeaturePill } from './DebugPanel';

/** What this playbook shows, what to try, and the list to change playbook. */
export function PlaybookPanel() {
  const runner = useSim((s) => s.runner);
  const scenarioId = useSim((s) => s.scenarioId);
  const playing = useSim((s) => s.playing);
  const { setScenario, play } = useSim.getState();
  const [choosing, setChoosing] = useState(false);
  const s = runner.scenario;

  if (choosing) {
    return (
      <div className="panel playbook">
        <div className="panel-title">
          <span>Choose a playbook</span>
          <button className="btn ghost small" onClick={() => setChoosing(false)}>
            Back
          </button>
        </div>
        <div className="playbook-list">
          {SCENARIOS.map((p) => (
            <button
              key={p.id}
              className={`picker-item ${p.id === scenarioId ? 'on' : ''}`}
              onClick={() => {
                setScenario(p.id);
                setChoosing(false);
                play();
              }}
            >
              <div className="picker-item-head">
                <span className="picker-num">{p.number}</span>
                <span className="picker-title">{p.title}</span>
                <span className="muted small">{p.suggestedSpeed}x</span>
              </div>
              <div className="picker-strap">{p.strap}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="panel playbook">
      <div className="panel-title">
        <span className="playbook-kicker">Playbook {s.number} of {SCENARIOS.length}</span>
        <button className="btn ghost small" onClick={() => setChoosing(true)}>
          Change
        </button>
      </div>
      <div className="playbook-title">{s.title}</div>
      <div className="playbook-strap">{s.strap}</div>
      <div className="playbook-section">
        <div className="card-label">You will see</div>
        <ol className="playbook-steps">
          {s.youWillSee.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </div>
      <div className="playbook-section">
        <div className="card-label">Try this</div>
        <p>{s.tryThis}</p>
      </div>
      <div className="playbook-pills">
        {s.featureIds.map((f) => (
          <FeaturePill key={f} id={f} />
        ))}
      </div>
      {!playing && !runner.done && (
        <button className="btn playbook-play" onClick={play}>
          Play at {s.suggestedSpeed}x
        </button>
      )}
      {runner.done && (
        <button className="btn playbook-play" onClick={() => useSim.getState().restart()}>
          Replay from the start
        </button>
      )}
    </div>
  );
}
