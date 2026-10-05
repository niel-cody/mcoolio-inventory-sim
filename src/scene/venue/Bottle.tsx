import { Mat } from '../Ghost';

/** A low-poly spirit bottle with a visible fill level. */
export function Bottle({ position, fill, glass, liquid, scale = 1 }: { position: [number, number, number]; fill: number; glass: string; liquid: string; scale?: number }) {
  const f = Math.max(0, Math.min(1, fill));
  const h = 0.5;
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.09, 0.1, h, 10]} />
        <Mat colour={glass} roughness={0.25} metalness={0.1} opacity={0.55} />
      </mesh>
      {f > 0.02 && (
        <mesh position={[0, (h * f) / 2 + 0.005, 0]}>
          <cylinderGeometry args={[0.075, 0.085, h * f, 10]} />
          <Mat colour={liquid} roughness={0.4} emissive={liquid} emissiveIntensity={0.15} />
        </mesh>
      )}
      <mesh position={[0, h + 0.09, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.18, 8]} />
        <Mat colour={glass} roughness={0.3} opacity={0.7} />
      </mesh>
      <mesh position={[0, h + 0.2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.05, 8]} />
        <Mat colour="#222222" />
      </mesh>
    </group>
  );
}
