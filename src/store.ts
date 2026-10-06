import { create } from 'zustand';
import { createMcOolioWorld } from './data/mcoolio';
import { SCENARIOS, scenarioById } from './scenarios';
import type { CameraBeat } from './sim/scenario';
import { ScenarioRunner } from './sim/scenario';
import type { SimMode } from './features';

export type Speed = 1 | 4 | 16 | 64;

export type Selection =
  | { kind: 'item'; itemId: string; venueId: string }
  | { kind: 'venue'; venueId: string }
  | { kind: 'supplier'; supplierId: string }
  | { kind: 'po'; poId: string }
  | { kind: 'feature'; featureId: string }
  | { kind: 'ticket'; orderId: string; venueId: string };

export interface HoverTip {
  text: string;
  x: number;
  y: number;
}

export interface SimStore {
  runner: ScenarioRunner;
  /** Bumps whenever the world changes; components subscribe to this. */
  version: number;
  playing: boolean;
  speed: Speed;
  mode: SimMode;
  scenarioId: string;
  camera: CameraBeat;
  selection: Selection | null;
  hover: HoverTip | null;
  debugOpen: boolean;
  /** True once the 3D scene has drawn its first frame. */
  sceneReady: boolean;
  introOpen: boolean;

  setScenario: (id: string) => void;
  setMode: (mode: SimMode) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: Speed) => void;
  reset: () => void;
  stepTicks: (n: number) => void;
  seek: (tick: number) => void;
  seekBy: (delta: number) => void;
  nextBeat: () => void;
  prevBeat: () => void;
  /** Seek to the next 09:00 (morning) or 17:00 (evening) within the playbook. */
  nextMorning: () => void;
  nextEvening: () => void;
  restart: () => void;
  setIntro: (open: boolean) => void;
  setCamera: (beat: CameraBeat) => void;
  select: (s: Selection | null) => void;
  setHover: (h: HoverTip | null) => void;
  markSceneReady: () => void;
  toggleDebug: () => void;
}

const build = (seed: number, mode: SimMode) => createMcOolioWorld(seed, mode);

export const useSim = create<SimStore>((set, get) => {
  const listeners = {
    onCamera: (beat: CameraBeat) => set({ camera: beat }),
    onSpeed: (speed: Speed) => set({ speed }),
    onDone: () => set({ playing: false }),
  };
  const first = SCENARIOS[0];
  const runner = new ScenarioRunner(build, first, 'today', listeners);
  return {
    runner,
    version: 0,
    playing: false,
    speed: first.suggestedSpeed,
    mode: 'today',
    scenarioId: first.id,
    camera: { view: 'world' },
    selection: null,
    hover: null,
    debugOpen: false,
    sceneReady: false,
    introOpen: (() => {
      try {
        return localStorage.getItem('mcoolio.intro.seen') !== '1';
      } catch {
        return true;
      }
    })(),

    setScenario: (id) => {
      const scenario = scenarioById(id);
      const r = get().runner;
      r.switchScenario(scenario);
      set({ scenarioId: id, speed: scenario.suggestedSpeed, playing: false, selection: null, version: get().version + 1 });
    },
    setMode: (mode) => {
      const r = get().runner;
      r.switchMode(mode);
      set({ mode, playing: false, selection: null, version: get().version + 1 });
    },
    play: () => set({ playing: true }),
    pause: () => set({ playing: false }),
    togglePlay: () => set((s) => ({ playing: !s.playing })),
    setSpeed: (speed) => set({ speed }),
    reset: () => {
      get().runner.reset();
      set({ playing: false, selection: null, version: get().version + 1 });
    },
    stepTicks: (n) => {
      get().runner.advance(n);
      set({ version: get().version + 1 });
    },
    seek: (tick) => {
      get().runner.seekTo(tick);
      set({ version: get().version + 1, selection: get().selection?.kind === 'ticket' ? null : get().selection });
    },
    seekBy: (delta) => get().seek(get().runner.world.tick + delta),
    nextBeat: () => {
      const r = get().runner;
      const next = r.beats().find((b) => b.at > r.world.tick);
      get().seek(next ? next.at : r.scenario.durationTicks);
    },
    prevBeat: () => {
      const r = get().runner;
      const prev = [...r.beats()].reverse().find((b) => b.at < r.world.tick - 2);
      get().seek(prev ? prev.at : 0);
    },
    nextMorning: () => {
      const r = get().runner;
      get().seek(Math.min(r.scenario.durationTicks, r.world.nextTickAtHour(9)));
    },
    nextEvening: () => {
      const r = get().runner;
      get().seek(Math.min(r.scenario.durationTicks, r.world.nextTickAtHour(17)));
    },
    restart: () => {
      get().runner.reset();
      set({ version: get().version + 1, selection: null });
    },
    setIntro: (open) => {
      set({ introOpen: open });
      if (!open) {
        try {
          localStorage.setItem('mcoolio.intro.seen', '1');
        } catch {
          /* private window */
        }
      }
    },
    setCamera: (beat) => set({ camera: beat }),
    select: (selection) => set({ selection }),
    setHover: (hover) => set({ hover }),
    markSceneReady: () => set({ sceneReady: true }),
    toggleDebug: () => set((s) => ({ debugOpen: !s.debugOpen })),
  };
});

/**
 * Drives the sim from a timer, not requestAnimationFrame, so a throttled or
 * background tab keeps sim time honest. 1x = one sim minute per real second.
 */
export function startLoop(): () => void {
  let last = performance.now();
  let carry = 0;
  const id = window.setInterval(() => {
    const now = performance.now();
    const { playing, speed, runner } = useSim.getState();
    // Cap at one second so a long stall catches up instead of lurching.
    const dt = Math.min(1, (now - last) / 1000);
    last = now;
    if (!playing || runner.done) {
      carry = 0;
      return;
    }
    carry += dt * speed;
    const ticks = Math.floor(carry);
    if (ticks > 0) {
      carry -= ticks;
      runner.advance(ticks);
      useSim.setState((s) => ({ version: s.version + 1 }));
    }
  }, 50);
  return () => window.clearInterval(id);
}
