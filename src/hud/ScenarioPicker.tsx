import { useEffect, useRef, useState } from 'react';
import { SCENARIOS } from '../scenarios';
import { useSim } from '../store';
import { FeaturePill } from './DebugPanel';

/** The scenario picker: seven scripts, each with its strap and the features it touches. */
export function ScenarioPicker() {
  const scenarioId = useSim((s) => s.scenarioId);
  const setScenario = useSim((s) => s.setScenario);
  const play = useSim((s) => s.play);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SCENARIOS.find((s) => s.id === scenarioId)!;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="picker" ref={ref}>
      <button className="btn ghost picker-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="picker-num">{current.number}</span> {current.title} <span className="picker-caret">▾</span>
      </button>
      {open && (
        <div className="picker-menu" role="listbox">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              role="option"
              aria-selected={s.id === scenarioId}
              className={`picker-item ${s.id === scenarioId ? 'on' : ''}`}
              onClick={() => {
                setScenario(s.id);
                setOpen(false);
                play();
              }}
            >
              <div className="picker-item-head">
                <span className="picker-num">{s.number}</span>
                <span className="picker-title">{s.title}</span>
                <span className="muted small">{s.suggestedSpeed}x</span>
              </div>
              <div className="picker-strap">{s.strap}</div>
              <div className="picker-pills">
                {s.featureIds.map((f) => (
                  <FeaturePill key={f} id={f} />
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
