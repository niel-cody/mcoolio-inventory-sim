import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useSim } from '../store';
import { useWorld } from './useWorld';
import type { Zone } from '../sim/types';

const WORLD_POS = new Vector3(0, 30, 30);
const WORLD_LOOK = new Vector3(0, 0, 0);

/** Zone centres relative to an island, matching the diorama layout. */
export const ZONE_OFFSET: Record<Zone, [number, number, number]> = {
  bar: [-1.6, 0.6, 1.4],
  coolroom: [1.7, 0.6, 1.4],
  kitchen: [-1.6, 0.6, -1.4],
  dock: [1.7, 0.4, -1.6],
};

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const controls = useRef<OrbitControlsImpl>(null);
  const beat = useSim((s) => s.camera);
  const world = useWorld();
  const flying = useRef(0);

  const target = useMemo(() => {
    if (beat.view === 'venue' && beat.venueId) {
      const v = world.catalogue.venues.get(beat.venueId);
      const [x, z] = v?.position ?? [0, 0];
      const off = beat.zone ? ZONE_OFFSET[beat.zone] : [0, 0.8, 0];
      const look = new Vector3(x + off[0] * 0.6, off[1], z + off[2] * 0.6);
      const pos = beat.zone ? new Vector3(x + 6.5 + off[0] * 0.4, 5.5, z + 6.5 + off[2] * 0.4) : new Vector3(x + 9, 8, z + 9);
      return { pos, look };
    }
    return { pos: WORLD_POS.clone(), look: WORLD_LOOK.clone() };
  }, [beat, world]);

  useEffect(() => {
    flying.current = 1;
  }, [target]);

  useFrame((_, dt) => {
    if (flying.current <= 0 || !controls.current) return;
    const k = 1 - Math.exp(-dt * 3.2);
    camera.position.lerp(target.pos, k);
    controls.current.target.lerp(target.look, k);
    controls.current.update();
    if (camera.position.distanceTo(target.pos) < 0.05 && controls.current.target.distanceTo(target.look) < 0.05) flying.current = 0;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minDistance={5}
      maxDistance={60}
      maxPolarAngle={Math.PI / 2.15}
      onStart={() => (flying.current = 0)}
    />
  );
}
