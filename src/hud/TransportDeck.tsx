import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../scene/useWorld';
import { formatTick } from '../sim/clock';
import { useSim, type Speed } from '../store';
import { FeaturePill } from './DebugPanel';

/** Play, pause, rewind, fast forward and a scrubber with chapter dots. The iPod of inventory. */
export function TransportDeck() {
  const world = useWorld();
  const runner = useSim((s) => s.runner);
  const playing = useSim((s) => s.playing);
  const speed = useSim((s) => s.speed);
  const { togglePlay, setSpeed, seek, seekBy, nextBeat, prevBeat, restart } = useSim.getState();
  const beats = runner.beats();
  const duration = runner.scenario.durationTicks;
  const tick = world.tick;
  const [scrub, setScrub] = useState<number | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const latest = [...world.events.log].reverse().find((e) => e.type === 'caption');
  const captionText = latest?.type === 'caption' ? latest.text : runner.scenario.strap;
  const captionFeature = latest?.type === 'caption' ? latest.featureId : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT' || (e.target as HTMLElement | null)?.tagName === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') seekBy(e.shiftKey ? -60 : -10);
      else if (e.key === 'ArrowRight') seekBy(e.shiftKey ? 60 : 10);
      else if (e.key === 'ArrowUp') setSpeed(speed === 1 ? 4 : 16);
      else if (e.key === 'ArrowDown') setSpeed(speed === 16 ? 4 : 1);
      else if (e.key === 'Home') restart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, seekBy, setSpeed, restart, speed]);

  const tickFromEvent = (clientX: number): number => {
    const rect = bar.current!.getBoundingClientRect();
    const k = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(k * duration);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setScrub(tickFromEvent(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (scrub !== null) setScrub(tickFromEvent(e.clientX));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (scrub !== null) seek(tickFromEvent(e.clientX));
    setScrub(null);
  };

  const shown = scrub ?? tick;
  const pct = (shown / duration) * 100;

  return (
    <div className="deck">
      <div className="deck-caption">
        {captionFeature && <FeaturePill id={captionFeature} />}
        <span>{captionText}</span>
      </div>
      <div className="deck-scrub" ref={bar} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <div className="deck-track">
          <div className="deck-fill" style={{ width: `${pct}%` }} />
          {beats.map((b) => (
            <button
              key={b.at}
              className={`deck-beat ${b.at <= tick ? 'done' : ''} ${b.featureId ? 'tagged' : ''}`}
              style={{ left: `${(b.at / duration) * 100}%` }}
              title={`${formatTick(b.at).slice(4)} · ${b.caption}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                seek(b.at);
              }}
            />
          ))}
          <div className="deck-head" style={{ left: `${pct}%` }} />
        </div>
        <div className="deck-times">
          <span>{formatTick(0)}</span>
          <span className="deck-now">{formatTick(shown)}</span>
          <span>{formatTick(duration)}</span>
        </div>
      </div>
      <div className="deck-controls">
        <button className="deck-btn" onClick={restart} title="Restart (Home)" aria-label="Restart">
          ⏮
        </button>
        <button className="deck-btn" onClick={prevBeat} title="Previous beat" aria-label="Previous beat">
          ⏪
        </button>
        <button className="deck-btn" onClick={() => seekBy(-10)} title="Back 10 minutes (←)" aria-label="Back 10 minutes">
          −10
        </button>
        <button className={`deck-play ${playing ? 'on' : ''}`} onClick={togglePlay} title="Play or pause (space)" aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : runner.done ? '↻' : '▶'}
        </button>
        <button className="deck-btn" onClick={() => seekBy(10)} title="Forward 10 minutes (→)" aria-label="Forward 10 minutes">
          +10
        </button>
        <button className="deck-btn" onClick={nextBeat} title="Next beat" aria-label="Next beat">
          ⏩
        </button>
        <div className="deck-speed" title="Speed (↑ ↓)">
          {([1, 4, 16] as Speed[]).map((s) => (
            <button key={s} className={speed === s ? 'on' : ''} onClick={() => setSpeed(s)}>
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
