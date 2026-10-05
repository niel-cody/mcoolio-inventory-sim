import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';
import { bindLabelElement, labelAnchors, labelElements, useLabelAnchors } from './labels';
import { useSim } from '../store';

/** Renders the label divs. Lives outside the Canvas. */
export function LabelLayer() {
  const anchors = useLabelAnchors();
  return (
    <div className="label-layer">
      {anchors.map((a) => (
        <div key={a.id} ref={(el) => bindLabelElement(a.id, el)} className={`label-anchor ${a.className ?? ''}`} style={{ display: 'none' }}>
          {a.render()}
        </div>
      ))}
    </div>
  );
}

/** Projects anchors to the screen every frame. Lives inside the Canvas. */
export function LabelProjector() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useRef(new Vector3());
  const ready = useRef(false);
  useFrame(() => {
    if (!ready.current) {
      ready.current = true;
      // Second frame: the first one is the warm-up, so wait a tick before lifting the splash.
      window.setTimeout(() => useSim.getState().markSceneReady(), 400);
    }
    const els = labelElements();
    for (const [id, a] of labelAnchors()) {
      const el = els.get(id);
      if (!el) continue;
      const p = v.current.copy(a.position).project(camera);
      const dist = camera.position.distanceTo(a.position);
      const behind = p.z > 1;
      const tooFar = a.maxDistance !== undefined && dist > a.maxDistance;
      if (behind || tooFar) {
        if (el.style.display !== 'none') el.style.display = 'none';
        continue;
      }
      const x = (p.x * 0.5 + 0.5) * size.width;
      const y = (-p.y * 0.5 + 0.5) * size.height;
      const scale = Math.min(1.15, Math.max(0.55, 26 / dist));
      el.style.display = 'block';
      el.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      el.style.opacity = String(Math.min(1, Math.max(0, (a.maxDistance ?? 80) - dist) / 10));
    }
  });
  return null;
}
