import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { registerLabel, updateLabel, type LabelAnchor } from './labels';

/** Registers a screen-space label anchored at a world position. */
export function useLabel(id: string, position: [number, number, number], render: () => React.ReactNode, opts: { className?: string; maxDistance?: number; enabled?: boolean } = {}): void {
  const pos = useRef(new Vector3(...position));
  pos.current.set(...position);
  const enabled = opts.enabled ?? true;
  useEffect(() => {
    if (!enabled) return;
    const anchor: LabelAnchor = { id, position: pos.current, render, className: opts.className, maxDistance: opts.maxDistance };
    return registerLabel(anchor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, enabled]);
  useEffect(() => {
    if (enabled) updateLabel(id, { render, className: opts.className, maxDistance: opts.maxDistance });
  });
}
