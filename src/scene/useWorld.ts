import { useSim } from '../store';
import type { SimWorld } from '../sim/world';

/** The live world. Re-renders the caller whenever the sim ticks. */
export function useWorld(): SimWorld {
  useSim((s) => s.version);
  return useSim((s) => s.runner).world;
}
