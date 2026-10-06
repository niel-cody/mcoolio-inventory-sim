import { Sparkles } from '@react-three/drei';
import { P } from '../palette';
import { useWorld } from '../useWorld';
import { Routes } from './Routes';
import { SupplierDepot } from './SupplierDepot';
import { VenueIsland } from './VenueIsland';

export function WorldView() {
  const world = useWorld();
  const daylight = world.daylight();
  return (
    <group>
      {/* ground plane */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[60, 64]} />
        <meshStandardMaterial color={daylight > 0.5 ? '#4a3f7a' : P.ground} roughness={1} />
      </mesh>
      {daylight < 0.5 && <Sparkles count={60} scale={[50, 6, 50]} size={2} speed={0.2} color={P.lilac} opacity={0.5} />}
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
