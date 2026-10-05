import type { Scenario } from '../sim/scenario';
import { batchDay } from './batch-day';
import { fridayService } from './friday-service';
import { orderingCycle } from './ordering-cycle';
import { rushModifiers } from './rush-modifiers';
import { the86 } from './the-86';
import { theCount } from './the-count';
import { voidRefund } from './void-refund';

export const SCENARIOS: Scenario[] = [fridayService, the86, orderingCycle, batchDay, rushModifiers, voidRefund, theCount];

export function scenarioById(id: string): Scenario {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown scenario ${id}`);
  return s;
}
