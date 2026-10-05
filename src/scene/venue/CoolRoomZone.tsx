import { ITEM } from '../../data/mcoolio';
import { toBase } from '../../sim/baseunits';
import { Mat } from '../Ghost';
import { ITEM_ANCHOR, ZONE_CENTRE } from '../anchors';
import { P } from '../palette';
import { useWorld } from '../useWorld';
import { useLabel } from '../useLabel';
import { useToWorld } from './IslandContext';
import { Clickable } from './Clickable';

const CARTON = toBase(24);
const SLOTS: [number, number, number][] = [];
for (let y = 0; y < 3; y++) for (let z = 0; z < 2; z++) for (let x = 0; x < 3; x++) SLOTS.push([(x - 1) * 0.62, 0.2 + y * 0.38, (z - 0.5) * 0.5]);

export function CoolRoomZone({ venueId, focused }: { venueId: string; focused: boolean }) {
  const world = useWorld();
  const toWorld = useToWorld();
  const [cx, , cz] = ZONE_CENTRE.coolroom;
  const onHand = world.stock.onHand(ITEM.kingfisher, venueId);
  const full = Math.max(0, Math.floor(onHand / CARTON));
  const partial = onHand > 0 ? (onHand - full * CARTON) / CARTON : 0;
  const shown = Math.min(full, SLOTS.length);
  const heat = world.availability.itemHeat(ITEM.kingfisher, venueId);
  const [ax, ay, az] = ITEM_ANCHOR[ITEM.kingfisher];

  useLabel(`zone:${venueId}:coolroom`, toWorld([cx, 2.0, cz - 0.6]), () => <div className="zone-label">Cool room</div>, { enabled: focused, maxDistance: 22, className: 'zone-label-anchor' });

  return (
    <group>
      <mesh position={[cx, 0.05, cz]} receiveShadow>
        <boxGeometry args={[3.0, 0.1, 2.6]} />
        <Mat colour="#24305e" roughness={0.9} />
      </mesh>
      {/* three translucent walls, open at the front */}
      <mesh position={[cx, 0.85, cz - 1.25]}>
        <boxGeometry args={[3.0, 1.7, 0.08]} />
        <Mat colour={P.ice} opacity={0.22} roughness={0.1} />
      </mesh>
      <mesh position={[cx - 1.46, 0.85, cz]}>
        <boxGeometry args={[0.08, 1.7, 2.6]} />
        <Mat colour={P.ice} opacity={0.22} roughness={0.1} />
      </mesh>
      <mesh position={[cx + 1.46, 0.85, cz]}>
        <boxGeometry args={[0.08, 1.7, 2.6]} />
        <Mat colour={P.ice} opacity={0.22} roughness={0.1} />
      </mesh>
      <mesh position={[cx, 1.72, cz]}>
        <boxGeometry args={[3.0, 0.06, 2.6]} />
        <Mat colour={P.ice} opacity={0.18} roughness={0.1} />
      </mesh>
      <pointLight position={[cx, 1.5, cz]} color={heat === 'soldout' ? P.red : P.sky} intensity={heat === 'soldout' ? 5 : 3} distance={4} />

      <Clickable selection={{ kind: 'item', itemId: ITEM.kingfisher, venueId }} hover="Kingfisher 330 mL">
        <group position={[ax, ay - 0.7, az]}>
          {SLOTS.slice(0, shown).map((p, i) => (
            <Carton key={i} position={p} />
          ))}
          {partial > 0.04 && shown < SLOTS.length && <Carton position={SLOTS[shown]} scaleY={Math.max(0.15, partial)} open />}
          {onHand <= 0 && (
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[1.2, 0.3, 0.05]} />
              <Mat colour={P.red} emissive={P.red} emissiveIntensity={0.9} />
            </mesh>
          )}
        </group>
      </Clickable>
    </group>
  );
}

function Carton({ position, scaleY = 1, open = false }: { position: [number, number, number]; scaleY?: number; open?: boolean }) {
  return (
    <group position={[position[0], position[1] - (0.34 * (1 - scaleY)) / 2, position[2]]} scale={[1, scaleY, 1]}>
      <mesh castShadow>
        <boxGeometry args={[0.56, 0.34, 0.42]} />
        <Mat colour={open ? '#ffd37a' : P.amber} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.215]}>
        <boxGeometry args={[0.4, 0.12, 0.01]} />
        <Mat colour="#1f5fa3" />
      </mesh>
    </group>
  );
}
