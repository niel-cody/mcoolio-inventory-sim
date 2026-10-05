import type { FeatureId, SimMode } from '../features';
import type { SimWorld } from './world';
import type { Zone } from './types';

export interface CameraBeat {
  view: 'world' | 'venue';
  venueId?: string;
  zone?: Zone;
}

export interface ScenarioStep {
  /** Sim tick at which the step applies. 0 applies at load. */
  at: number;
  caption?: string;
  /** Tags the caption and gates `run`: a Coming feature only runs in Roadmap mode. */
  featureId?: FeatureId;
  /** Shown in Today mode instead of running a Coming feature. */
  ghostCaption?: string;
  camera?: CameraBeat;
  run?: (world: SimWorld) => void;
}

export interface Scenario {
  id: string;
  number: number;
  title: string;
  strap: string;
  /** Features this scenario touches, for the picker. */
  featureIds: FeatureId[];
  /** Ticks the scenario runs before it reports done. */
  durationTicks: number;
  /** Speed the picker starts at. */
  suggestedSpeed: 1 | 4 | 16;
  /** Adjusts the freshly seeded world before any step runs (opening counts and the like). */
  setup?: (world: SimWorld) => void;
  steps: ScenarioStep[];
}

export interface RunnerListeners {
  onCamera?: (beat: CameraBeat) => void;
  onDone?: () => void;
}

/**
 * Plays a scenario against a freshly seeded world. Steps apply in tick order,
 * before that tick's simulation step. Reset rebuilds the world from the same
 * seed, so a replay is identical.
 */
export class ScenarioRunner {
  world: SimWorld;
  scenario: Scenario;
  mode: SimMode;
  done = false;
  private applied = 0;
  private steps: ScenarioStep[] = [];

  constructor(
    private readonly build: (seed: number, mode: SimMode) => SimWorld,
    scenario: Scenario,
    mode: SimMode,
    private readonly listeners: RunnerListeners = {},
  ) {
    this.scenario = scenario;
    this.mode = mode;
    this.world = this.load();
  }

  private load(): SimWorld {
    const world = this.build(seedFor(this.scenario), this.mode);
    world.events.on((e) => {
      if (e.type === 'camera') this.listeners.onCamera?.({ view: e.view, venueId: e.venueId, zone: e.zone });
    });
    if (this.scenario.setup) {
      this.scenario.setup(world);
      world.events.clear();
    }
    this.steps = [...this.scenario.steps].sort((a, b) => a.at - b.at);
    this.applied = 0;
    this.done = false;
    this.applyDue(world);
    return world;
  }

  reset(): void {
    this.world = this.load();
  }

  switchScenario(scenario: Scenario): void {
    this.scenario = scenario;
    this.reset();
  }

  switchMode(mode: SimMode): void {
    this.mode = mode;
    this.reset();
  }

  private applyDue(world: SimWorld): void {
    while (this.applied < this.steps.length && this.steps[this.applied].at <= world.tick) {
      const step = this.steps[this.applied];
      this.applied += 1;
      this.apply(world, step);
    }
  }

  private apply(world: SimWorld, step: ScenarioStep): void {
    if (step.camera) this.listeners.onCamera?.(step.camera);
    const plays = step.featureId ? world.featurePlays(step.featureId) : true;
    if (plays) {
      if (step.caption) world.caption(step.caption, step.featureId);
      step.run?.(world);
    } else if (step.ghostCaption) {
      world.caption(step.ghostCaption, step.featureId);
    }
  }

  /** Advance one tick: apply due steps, then step the world. */
  step(): void {
    if (this.done) return;
    this.world.step();
    this.applyDue(this.world);
    if (this.world.tick >= this.scenario.durationTicks && this.applied >= this.steps.length) {
      this.done = true;
      this.listeners.onDone?.();
    }
  }

  advance(ticks: number): void {
    for (let i = 0; i < ticks && !this.done; i++) this.step();
  }

  progress(): number {
    return Math.min(1, this.world.tick / this.scenario.durationTicks);
  }
}

export function seedFor(scenario: Scenario): number {
  return 0x4f4f4c49 ^ (scenario.number * 2654435761 >>> 0);
}
