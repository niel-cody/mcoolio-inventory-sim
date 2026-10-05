import { useState } from 'react';
import { useSim } from '../../store';
import type { Supplier } from '../../sim/types';
import { DEPOT_POSITIONS, P } from '../palette';
import { useLabel } from '../useLabel';

export function SupplierDepot({ supplier }: { supplier: Supplier }) {
  const [x, z] = DEPOT_POSITIONS[supplier.id] ?? [0, 0];
  const [hover, setHover] = useState(false);
  const select = useSim((s) => s.select);
  const colour = supplier.colour ?? P.amber;
  useLabel(
    `supplier:${supplier.id}`,
    [x, 2.8, z],
    () => (
      <div className="depot-label" style={{ borderColor: colour }}>
        <div className="island-name">{supplier.name}</div>
        <div className="island-sub">Supplier · {supplier.type.toLowerCase()}</div>
      </div>
    ),
    { maxDistance: 70 },
  );
  return (
    <group position={[x, 0, z]}>
      <group
        onClick={(e) => {
          e.stopPropagation();
          select({ kind: 'supplier', supplierId: supplier.id });
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
        {/* pad */}
        <mesh position={[0, -0.2, 0]} receiveShadow>
          <cylinderGeometry args={[2.6, 2.9, 0.4, 6]} />
          <meshStandardMaterial color={hover ? '#3a2470' : '#24143f'} roughness={0.95} />
        </mesh>
        {/* warehouse */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[2.6, 1.4, 1.8]} />
          <meshStandardMaterial color="#2d1a52" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.55, 0]} rotation-y={Math.PI / 4} castShadow>
          <cylinderGeometry args={[0, 1.95, 0.6, 4]} />
          <meshStandardMaterial color={colour} roughness={0.7} />
        </mesh>
        {/* roller door */}
        <mesh position={[0, 0.5, 0.92]}>
          <boxGeometry args={[1.1, 1.0, 0.05]} />
          <meshStandardMaterial color={P.charcoal} roughness={0.6} />
        </mesh>
        {/* pallets */}
        {[-1.6, 1.6].map((px) => (
          <mesh key={px} position={[px, 0.25, 0.9]} castShadow>
            <boxGeometry args={[0.7, 0.5, 0.7]} />
            <meshStandardMaterial color={colour} roughness={0.9} />
          </mesh>
        ))}
        <pointLight position={[0, 2.4, 1.2]} color={colour} intensity={4} distance={7} decay={2} />
      </group>
    </group>
  );
}
