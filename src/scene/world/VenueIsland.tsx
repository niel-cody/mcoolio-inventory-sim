import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { Group, Mesh } from 'three';
import { useSim } from '../../store';
import type { Venue } from '../../sim/types';
import { HEAT_COLOUR, P } from '../palette';
import { useWorld } from '../useWorld';
import { VenueDiorama } from '../venue/VenueDiorama';
import { useLabel } from '../useLabel';

export function VenueIsland({ venue, index }: { venue: Venue; index: number }) {
  const world = useWorld();
  const group = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const [hover, setHover] = useState(false);
  const select = useSim((s) => s.select);
  const setCamera = useSim((s) => s.setCamera);
  const beat = useSim((s) => s.camera);
  const focused = beat.view === 'venue' && beat.venueId === venue.id;

  const heat = world.availability.venueHeat(venue.id);
  const soldOut = world.availability.soldOutProducts(venue.id).length;
  const [x, z] = venue.position;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) group.current.position.y = Math.sin(t * 0.6 + index * 2) * 0.08;
    if (ring.current) {
      const pulse = heat === 'soldout' ? 1 + Math.sin(t * 5) * 0.04 : heat === 'warning' ? 1 + Math.sin(t * 2.5) * 0.02 : 1;
      ring.current.scale.setScalar(pulse);
    }
  });

  const rotation = [0, index * 0.35 - 0.3, 0] as [number, number, number];

  useLabel(
    `venue:${venue.id}`,
    [x, 3.4, z],
    () => (
      <div className={`island-label heat-${heat}`}>
        <div className="island-name">{venue.name}</div>
        <div className="island-sub">
          {venue.character}
          {soldOut > 0 && <span className="island-soldout"> · {soldOut} sold out</span>}
        </div>
      </div>
    ),
    { enabled: !focused, maxDistance: 70 },
  );

  return (
    <group position={[x, 0, z]}>
      <group ref={group} rotation={rotation}>
        {/* island slab */}
        <mesh
          position={[0, -0.45, 0]}
          castShadow
          receiveShadow
          onClick={(e) => {
            e.stopPropagation();
            select({ kind: 'venue', venueId: venue.id });
            setCamera({ view: 'venue', venueId: venue.id });
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHover(false);
            document.body.style.cursor = 'auto';
          }}
        >
          <cylinderGeometry args={[4.2, 4.7, 0.9, 9]} />
          <meshStandardMaterial color={hover ? '#4a2a8c' : P.purpleDeep} roughness={0.9} />
        </mesh>
        {/* rock underneath */}
        <mesh position={[0, -1.6, 0]}>
          <coneGeometry args={[4.4, 2.4, 9]} />
          <meshStandardMaterial color="#120a24" roughness={1} />
        </mesh>
        {/* floor */}
        <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2} receiveShadow>
          <circleGeometry args={[4.1, 9]} />
          <meshStandardMaterial color="#2a174f" roughness={0.95} />
        </mesh>
        <VenueDiorama venue={venue} focused={focused} />
        {/* warm venue-at-night light */}
        <pointLight position={[0, 3.5, 0]} color={P.warm} intensity={focused ? 14 : 7} distance={12} decay={2} />
      </group>
      {/* heat ring sits flat on the ground plane, no bob */}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <ringGeometry args={[5.1, 5.6, 64]} />
        <meshBasicMaterial color={HEAT_COLOUR[heat]} transparent opacity={heat === 'healthy' ? 0.55 : 0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[5.6, 7.2, 64]} />
        <meshBasicMaterial color={HEAT_COLOUR[heat]} transparent opacity={heat === 'healthy' ? 0.06 : 0.16} />
      </mesh>
    </group>
  );
}
