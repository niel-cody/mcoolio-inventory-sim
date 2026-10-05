import { create } from 'zustand';
import { createMcOolioWorld } from './data/mcoolio';
import { SCENARIOS, scenarioById } from './scenarios';
import type { CameraBeat } from './sim/scenario';
import { ScenarioRunner } from './sim/scenario';
import type { SimMode } from './features';

export type Speed = 1 | 4 | 16;

export type Selection =
  | { kind: 'item'; itemId: string; venueId: string }
  | { kind: 'venue'; venueId: string }
  | { kind: 'supplier'; supplierId: string }
  | { kind: 'po'; poId: string }
  | { kind: 'feature'; featureId: string }
  | { kind: 'ticket'; orderId: string; venueId: string };

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
  debugOpen: boolean;

  setScenario: (id: string) => void;
  setMode: (mode: SimMode) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: Speed) => void;
  reset: () => void;
  stepTicks: (n: number) => void;
  setCamera: (beat: CameraBeat) => void;
  select: (s: Selection | null) => void;
  toggleDebug: () => void;
}

const build = (seed: number, mode: SimMode) => createMcOolioWorld(seed, mode);

export const useSim = create<SimStore>((set, get) => {
  const listeners = {
    onCamera: (beat: CameraBeat) => set({ camera: beat }),
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
    debugOpen: false,

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
    setCamera: (beat) => set({ camera: beat }),
    select: (selection) => set({ selection }),
    toggleDebug: () => set((s) => ({ debugOpen: !s.debugOpen })),
  };
});

/** Drives the sim from requestAnimationFrame. 1x = one sim minute per real second. */
export function startLoop(): () => void {
  let last = performance.now();
  let carry = 0;
  let frame = 0;
  const tickLoop = (now: number) => {
    const { playing, speed, runner } = useSim.getState();
    // Cap at one second so a throttled background tab catches up instead of crawling.
    const dt = Math.min(1, (now - last) / 1000);
    last = now;
    if (playing && !runner.done) {
      carry += dt * speed;
      const ticks = Math.floor(carry);
      if (ticks > 0) {
        carry -= ticks;
        runner.advance(ticks);
        useSim.setState((s) => ({ version: s.version + 1 }));
      }
    } else {
      carry = 0;
    }
    frame = requestAnimationFrame(tickLoop);
  };
  frame = requestAnimationFrame(tickLoop);
  return () => cancelAnimationFrame(frame);
}
