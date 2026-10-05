import { toBase } from './baseunits';
import type { Catalogue } from './catalogue';
import type { EventBus } from './events';
import type { RecipeBook } from './recipe';
import type { Stock } from './stock';
import type { ProductionRun } from './types';

/**
 * Production runs (POST /production-runs). Raw ingredients are consumed when the
 * run starts; the finished portions land in the batch pool when it completes.
 * This is the batch boundary: sales later deplete the pool and never the rice.
 */
export class Production {
  readonly runs = new Map<string, ProductionRun>();
  private seq = 0;
  private now = () => 0;

  constructor(
    private readonly catalogue: Catalogue,
    private readonly recipes: RecipeBook,
    private readonly stock: Stock,
    private readonly events: EventBus,
  ) {}

  bindClock(now: () => number): void {
    this.now = now;
  }

  list(locationId?: string): ProductionRun[] {
    const all = [...this.runs.values()];
    return locationId ? all.filter((r) => r.locationId === locationId) : all;
  }

  active(locationId: string): ProductionRun | undefined {
    return this.list(locationId).find((r) => r.status === 'IN_PROGRESS');
  }

  /** Start a run: consume the recipe's raw ingredients now, scaled to plannedQty. */
  start(batchItemId: string, locationId: string, plannedQty: number, durationTicks: number): ProductionRun {
    const item = this.catalogue.item(batchItemId);
    if (item.itemType !== 'BATCH') throw new Error(`${item.name} is ${item.itemType}, not BATCH`);
    this.seq += 1;
    const run: ProductionRun = {
      id: `run_${this.seq}`,
      batchItemId,
      locationId,
      plannedQty,
      status: 'IN_PROGRESS',
      startedTick: this.now(),
      completeTick: this.now() + durationTicks,
      consumed: [],
      costMinor: 0,
    };
    for (const line of this.recipes.batchLines(batchItemId, plannedQty)) {
      const qty = toBase(line.qty);
      const { costMinor } = this.stock.deplete(line.ingredientItemId, locationId, qty, 'PRODUCTION_RUN', `run:${run.id}`);
      run.consumed.push({ itemId: line.ingredientItemId, qty, costMinor });
      run.costMinor += costMinor;
    }
    this.runs.set(run.id, run);
    this.events.emit({ type: 'production', tick: this.now(), runId: run.id, locationId, phase: 'started', batchItemId, qty: plannedQty });
    return run;
  }

  /** Called every tick: completes runs whose time is up and fills the batch pool. */
  tick(): void {
    const now = this.now();
    for (const run of this.runs.values()) {
      if (run.status === 'IN_PROGRESS' && run.completeTick !== undefined && now >= run.completeTick) this.complete(run.id);
    }
  }

  complete(runId: string, producedQty?: number): ProductionRun {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`unknown run ${runId}`);
    if (run.status !== 'IN_PROGRESS') return run;
    run.producedQty = producedQty ?? run.plannedQty;
    run.status = 'COMPLETE';
    run.completeTick = this.now();
    this.stock.receive(run.batchItemId, run.locationId, toBase(run.producedQty), run.costMinor, 'PRODUCTION_RUN', `run:${run.id}`);
    this.events.emit({ type: 'production', tick: this.now(), runId: run.id, locationId: run.locationId, phase: 'completed', batchItemId: run.batchItemId, qty: run.producedQty });
    return run;
  }

  progress(run: ProductionRun): number {
    if (run.status === 'COMPLETE') return 1;
    const start = run.startedTick ?? 0;
    const end = run.completeTick ?? start + 1;
    return Math.min(1, Math.max(0, (this.now() - start) / Math.max(1, end - start)));
  }
}
