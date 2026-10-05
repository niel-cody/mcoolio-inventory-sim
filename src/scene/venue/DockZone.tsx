import { Ghostable, Mat } from '../Ghost';
import { ZONE_CENTRE } from '../anchors';
import { P } from '../palette';
import { useWorld } from '../useWorld';
import { useLabel } from '../useLabel';
import { useToWorld } from './IslandContext';
import { Clickable } from './Clickable';

export function DockZone({ venueId, focused }: { venueId: string; focused: boolean }) {
  const world = useWorld();
  const toWorld = useToWorld();
  const [cx, , cz] = ZONE_CENTRE.dock;
  const pos = world.purchasing.list(venueId);
  const onDock = pos.find((po) => (po.status === 'IN_TRANSIT' && world.purchasing.hasArrived(po)) || po.status === 'RECEIVED');
  const supplier = onDock ? world.catalogue.suppliers.get(onDock.supplierId) : undefined;
  const ordered = onDock ? onDock.lines.reduce((s, l) => s + l.orderedUnits, 0) : 0;
  const received = onDock ? onDock.lines.reduce((s, l) => s + (l.receivedUnits ?? 0), 0) : 0;
  const cartons = Math.min(8, onDock?.status === 'RECEIVED' ? received : ordered);
  const suggested = pos.find((po) => po.suggested && po.status === 'DRAFT');

  useLabel(`zone:${venueId}:dock`, toWorld([cx, 2.0, cz - 0.6]), () => <div className="zone-label">Dock and store room</div>, { enabled: focused, maxDistance: 22, className: 'zone-label-anchor' });
  useLabel(
    `clipboard:${venueId}`,
    toWorld([cx + 1.0, 1.5, cz + 0.6]),
    () => (
      <div className="pot-label">
        {onDock?.status === 'RECEIVED' ? `Ordered ${ordered} · received ${received}${received < ordered ? ' · short' : ''}` : 'Checking the delivery'}
      </div>
    ),
    { enabled: Boolean(onDock), maxDistance: 24 },
  );

  return (
    <group>
      <mesh position={[cx, 0.05, cz]} receiveShadow>
        <boxGeometry args={[3.0, 0.1, 2.6]} />
        <Mat colour="#2a2a35" roughness={0.95} />
      </mesh>
      {/* raised dock edge with hazard stripe */}
      <mesh position={[cx, 0.2, cz - 1.15]} castShadow>
        <boxGeometry args={[3.0, 0.4, 0.3]} />
        <Mat colour="#3a3a48" />
      </mesh>
      <mesh position={[cx, 0.41, cz - 1.15]}>
        <boxGeometry args={[3.0, 0.02, 0.32]} />
        <Mat colour={P.yellow} emissive={P.yellow} emissiveIntensity={0.3} />
      </mesh>
      {/* store room shelving */}
      <mesh position={[cx - 1.2, 0.8, cz + 0.6]} castShadow>
        <boxGeometry args={[0.5, 1.5, 1.2]} />
        <Mat colour="#4a4a5a" />
      </mesh>
      {[0.35, 0.8, 1.25].map((y) => (
        <mesh key={y} position={[cx - 1.2, y, cz + 0.6]}>
          <boxGeometry args={[0.56, 0.04, 1.26]} />
          <Mat colour="#8a8aa0" />
        </mesh>
      ))}
      <pointLight position={[cx, 1.6, cz]} color="#ffd9a0" intensity={2.5} distance={4} />

      {/* cartons on the dock while a delivery is being checked */}
      {onDock && (
        <Clickable selection={{ kind: 'po', poId: onDock.id }} hover={`${onDock.number} from ${supplier?.name ?? 'supplier'}`}>
          {Array.from({ length: cartons }, (_, i) => (
            <mesh key={i} position={[cx - 0.6 + (i % 4) * 0.45, 0.28 + Math.floor(i / 4) * 0.36, cz - 0.4 + Math.floor(i / 4) * 0.1]} castShadow>
              <boxGeometry args={[0.4, 0.34, 0.4]} />
              <Mat colour={supplier?.colour ?? P.amber} roughness={0.9} />
            </mesh>
          ))}
          {/* clipboard */}
          <mesh position={[cx + 1.0, 0.95, cz + 0.6]} rotation-x={-0.4}>
            <boxGeometry args={[0.3, 0.4, 0.03]} />
            <Mat colour="#f3ead5" />
          </mesh>
        </Clickable>
      )}

      {/* Suggested order screen: Coming, par levels and suggested orders */}
      <Ghostable featureId="par-levels-suggested-orders">
        <Clickable selection={suggested ? { kind: 'po', poId: suggested.id } : { kind: 'feature', featureId: 'par-levels-suggested-orders' }} hover="Suggested orders">
          <mesh position={[cx + 1.3, 1.3, cz - 0.9]} rotation-y={-0.6}>
            <boxGeometry args={[0.55, 0.4, 0.05]} />
            <Mat colour="#111111" emissive={suggested ? P.yellow : P.sky} emissiveIntensity={suggested ? 0.9 : 0.3} />
          </mesh>
        </Clickable>
      </Ghostable>
    </group>
  );
}
