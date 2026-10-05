import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import { CatmullRomCurve3, Vector3 } from 'three';
import type { PurchaseOrder } from '../../sim/types';
import { DEPOT_POSITIONS, P } from '../palette';
import { useWorld } from '../useWorld';
import { useSim } from '../../store';

function routeCurve(from: [number, number], to: [number, number]): CatmullRomCurve3 {
  const a = new Vector3(from[0], 0.08, from[1]);
  const b = new Vector3(to[0], 0.08, to[1]);
  const mid = a.clone().lerp(b, 0.5);
  // Bend the road a little so it does not look machine straight.
  const dir = b.clone().sub(a).normalize();
  const side = new Vector3(-dir.z, 0, dir.x).multiplyScalar(a.distanceTo(b) * 0.12);
  mid.add(side);
  return new CatmullRomCurve3([a, mid, b]);
}

export function Routes() {
  const world = useWorld();
  const venues = world.catalogue.venueList();
  const suppliers = [...world.catalogue.suppliers.values()];
  const curves = useMemo(() => {
    const out: { key: string; supplierId: string; venueId: string; curve: CatmullRomCurve3; points: Vector3[] }[] = [];
    for (const s of suppliers) {
      for (const v of venues) {
        const curve = routeCurve(DEPOT_POSITIONS[s.id], v.position);
        out.push({ key: `${s.id}>${v.id}`, supplierId: s.id, venueId: v.id, curve, points: curve.getPoints(24) });
      }
    }
    return out;
  }, [suppliers, venues]);

  const pos = world.purchasing.list().filter((po) => po.status !== 'POSTED' && po.status !== 'DRAFT');

  return (
    <group>
      {curves.map((r) => {
        const active = pos.some((po) => po.supplierId === r.supplierId && po.locationId === r.venueId);
        return <Line key={r.key} points={r.points} color={active ? P.yellow : P.glow} lineWidth={active ? 2 : 1} dashed dashSize={0.5} gapSize={0.4} transparent opacity={active ? 0.9 : 0.22} />;
      })}
      {pos.map((po) => {
        const r = curves.find((c) => c.supplierId === po.supplierId && c.venueId === po.locationId);
        if (!r) return null;
        return <Truck key={po.id} po={po} curve={r.curve} />;
      })}
    </group>
  );
}

function Truck({ po, curve }: { po: PurchaseOrder; curve: CatmullRomCurve3 }) {
  const world = useWorld();
  const select = useSim((s) => s.select);
  const supplier = world.catalogue.suppliers.get(po.supplierId);
  const colour = supplier?.colour ?? P.amber;
  const t = po.status === 'SENT' ? 0 : world.purchasing.transitProgress(po);
  const p = curve.getPointAt(Math.min(0.995, Math.max(0.005, t)));
  const ahead = curve.getPointAt(Math.min(1, t + 0.01));
  const angle = Math.atan2(ahead.x - p.x, ahead.z - p.z);
  return (
    <group
      position={[p.x, 0.32, p.z]}
      rotation-y={angle}
      onClick={(e) => {
        e.stopPropagation();
        select({ kind: 'po', poId: po.id });
      }}
    >
      {/* trailer */}
      <mesh position={[0, 0.3, -0.35]} castShadow>
        <boxGeometry args={[0.7, 0.6, 1.1]} />
        <meshStandardMaterial color={colour} roughness={0.7} />
      </mesh>
      {/* cab */}
      <mesh position={[0, 0.22, 0.5]} castShadow>
        <boxGeometry args={[0.66, 0.45, 0.5]} />
        <meshStandardMaterial color="#f7f3ff" roughness={0.6} />
      </mesh>
      {[-0.3, 0.3].map((wx) =>
        [-0.6, 0.1, 0.55].map((wz) => (
          <mesh key={`${wx}${wz}`} position={[wx, -0.1, wz]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.14, 0.14, 0.12, 10]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        )),
      )}
      <pointLight position={[0, 0.3, 0.9]} color={P.yellow} intensity={2} distance={3} />
    </group>
  );
}
