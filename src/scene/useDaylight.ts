import { useWorld } from './useWorld';

/** 0 at night, 1 in full day, following the sim clock. */
export function useDaylight(): number {
  return useWorld().daylight();
}
