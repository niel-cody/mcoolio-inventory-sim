import type { Venue } from '../../sim/types';
import { ZONE_OFFSET } from '../CameraRig';
import { P } from '../palette';

/**
 * The four zones of a venue. P2 lays them out as footprints; P3 fills them
 * with the bar, cool room, kitchen and dock objects.
 */
export function VenueDiorama({ venue, focused }: { venue: Venue; focused: boolean }) {
  void venue;
  void focused;
  const zones: { key: keyof typeof ZONE_OFFSET; colour: string; label: string }[] = [
    { key: 'bar', colour: P.purple, label: 'Bar' },
    { key: 'coolroom', colour: P.sky, label: 'Cool room' },
    { key: 'kitchen', colour: P.orange, label: 'Kitchen' },
    { key: 'dock', colour: P.charcoal, label: 'Dock' },
  ];
  return (
    <group>
      {zones.map((z) => {
        const [x, , zz] = ZONE_OFFSET[z.key];
        return (
          <mesh key={z.key} position={[x, 0.3, zz]} castShadow receiveShadow>
            <boxGeometry args={[2.6, 0.6, 2.2]} />
            <meshStandardMaterial color={z.colour} roughness={0.85} />
          </mesh>
        );
      })}
      {/* sign post */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.12, 2.4, 0.12]} />
        <meshStandardMaterial color={P.lilac} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[1.8, 0.5, 0.1]} />
        <meshStandardMaterial color={P.yellow} emissive={P.yellow} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}
