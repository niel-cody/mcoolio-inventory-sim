import { useEffect } from 'react';
import type { SimEvent } from '../sim/events';
import { useSim } from '../store';

/** Subscribe to live sim events. Resubscribes when the world is rebuilt on reset. */
export function useSimEvents(handler: (e: SimEvent) => void): void {
  const runner = useSim((s) => s.runner);
  const version = useSim((s) => s.version);
  const world = runner.world;
  useEffect(() => world.events.on(handler), [world, handler]);
  void version;
}
