import { useFrame } from '@react-three/fiber';
import { useImperativeHandle, useRef, forwardRef } from 'react';
import type { Group, Mesh, MeshStandardMaterial } from 'three';

export interface PuffsHandle {
  burst: (n?: number) => void;
}

const MAX = 12;

/** A small pool of rising, fading spheres: steam from a pot, a puff from the espresso machine. */
export const Puffs = forwardRef<PuffsHandle, { position: [number, number, number]; colour?: string; size?: number; rise?: number; continuous?: boolean }>(function Puffs({ position, colour = '#f3eefc', size = 0.08, rise = 0.9, continuous = false }, ref) {
  const group = useRef<Group>(null);
  const ages = useRef<number[]>(Array.from({ length: MAX }, () => -1));
  const seeds = useRef<number[]>(Array.from({ length: MAX }, (_, i) => (i * 0.618) % 1));
  const lastSpawn = useRef(0);

  useImperativeHandle(ref, () => ({
    burst: (n = 3) => {
      let spawned = 0;
      for (let i = 0; i < MAX && spawned < n; i++) {
        if (ages.current[i] < 0) {
          ages.current[i] = 0.0001 + spawned * 0.08;
          spawned += 1;
        }
      }
    },
  }));

  useFrame((state, dt) => {
    if (!group.current) return;
    if (continuous) {
      lastSpawn.current += dt;
      if (lastSpawn.current > 0.35) {
        lastSpawn.current = 0;
        const i = ages.current.findIndex((a) => a < 0);
        if (i >= 0) ages.current[i] = 0.0001;
      }
    }
    const t = state.clock.getElapsedTime();
    group.current.children.forEach((child, i) => {
      const m = child as Mesh;
      const age = ages.current[i];
      if (age < 0) {
        m.visible = false;
        return;
      }
      const next = age + dt;
      if (next > 1.4) {
        ages.current[i] = -1;
        m.visible = false;
        return;
      }
      ages.current[i] = next;
      m.visible = true;
      const k = next / 1.4;
      const wobble = Math.sin(t * 3 + seeds.current[i] * 10) * 0.08;
      m.position.set(wobble + (seeds.current[i] - 0.5) * 0.15, k * rise, (seeds.current[i] * 0.3 - 0.15) * k);
      const s = size * (0.6 + k * 1.4);
      m.scale.setScalar(s);
      (m.material as MeshStandardMaterial).opacity = (1 - k) * 0.75;
    });
  });

  return (
    <group ref={group} position={position}>
      {Array.from({ length: MAX }, (_, i) => (
        <mesh key={i} visible={false}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color={colour} transparent opacity={0.7} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
});
