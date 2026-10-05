import { Sparkles, Stars } from '@react-three/drei';
import { P } from '../palette';
import { useWorld } from '../useWorld';
import { Routes } from './Routes';
import { SupplierDepot } from './SupplierDepot';
import { VenueIsland } from './VenueIsland';

export function WorldView() {
  const world = useWorld();
  return (
    <group>
      {/* ground plane */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[60, 64]} />
        <meshStandardMaterial color={P.ground} roughness={1} />
      </mesh>
      <Stars radius={120} depth={40} count={1800} factor={3} saturation={0.6} fade speed={0.4} />
      <Sparkles count={60} scale={[50, 6, 50]} size={2} speed={0.2} color={P.lilac} opacity={0.5} />
      {world.catalogue.venueList().map((v, i) => (
        <VenueIsland key={v.id} venue={v} index={i} />
      ))}
      {[...world.catalogue.suppliers.values()].map((s) => (
        <SupplierDepot key={s.id} supplier={s} />
      ))}
      <Routes />
    </group>
  );
}
