import { Vector3 } from 'three';
import { useSyncExternalStore } from 'react';

/**
 * A tiny registry of 3D-anchored DOM labels. The scene registers anchors; the
 * LabelLayer renders one div per anchor outside the Canvas; the LabelProjector
 * projects anchors to screen space every frame and moves the divs without a
 * React render. Replaces drei's Html, whose portal roots fight React 19.
 */
export interface LabelAnchor {
  id: string;
  position: Vector3;
  /** Called with a div the layer owns; the anchor fills it. */
  render: () => React.ReactNode;
  className?: string;
  /** Hide beyond this camera distance. */
  maxDistance?: number;
}

type Listener = () => void;
const anchors = new Map<string, LabelAnchor>();
const elements = new Map<string, HTMLDivElement>();
const listeners = new Set<Listener>();
let snapshot: LabelAnchor[] = [];

function notify(): void {
  snapshot = [...anchors.values()];
  for (const l of listeners) l();
}

export function registerLabel(anchor: LabelAnchor): () => void {
  anchors.set(anchor.id, anchor);
  notify();
  return () => {
    anchors.delete(anchor.id);
    elements.delete(anchor.id);
    notify();
  };
}

export function updateLabel(id: string, patch: Partial<LabelAnchor>): void {
  const a = anchors.get(id);
  if (!a) return;
  Object.assign(a, patch);
  notify();
}

export function bindLabelElement(id: string, el: HTMLDivElement | null): void {
  if (el) elements.set(id, el);
  else elements.delete(id);
}

export function useLabelAnchors(): LabelAnchor[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
  );
}

export function labelElements(): Map<string, HTMLDivElement> {
  return elements;
}

export function labelAnchors(): Map<string, LabelAnchor> {
  return anchors;
}
