import { ITEM } from '../../data/mcoolio';
import { toBase, toDecimal } from '../../sim/baseunits';
import { Ghostable, Mat } from '../Ghost';
import { ITEM_ANCHOR, ZONE_CENTRE } from '../anchors';
import { P } from '../palette';
import { useWorld } from '../useWorld';
import { useLabel } from '../useLabel';
import { Clickable } from './Clickable';
import { Puffs } from './Puffs';

export function KitchenZone({ venueId, focused }: { venueId: string; focused: boolean }) {
  const world = useWorld();
  const [cx, , cz] = ZONE_CENTRE.kitchen;
  const portions = toDecimal(world.stock.onHand(ITEM.biryaniPool, venueId));
  const rice = world.stock.onHand(ITEM.rice, venueId);
  const chicken = world.stock.onHand(ITEM.chicken, venueId);
  const spice = world.stock.onHand(ITEM.spice, venueId);
  const naan = world.stock.onHand(ITEM.naan, venueId);
  const run = world.production.active(venueId);
  const cooking = Boolean(run);
  const pot = ITEM_ANCHOR[ITEM.biryaniPool];

  useLabel(`zone:${venueId}:kitchen`, [cx, 2.0, cz - 0.6], () => <div className="zone-label">Kitchen</div>, { enabled: focused, maxDistance: 22, className: 'zone-label-anchor' });
  useLabel(
    `pot:${venueId}`,
    [pot[0], pot[1] + 0.55, pot[2]],
    () => (
      <div className={`pot-label ${portions <= 0 ? 'heat-soldout' : ''}`}>
        {cooking ? `Cooking · ${run?.plannedQty} portions in ${Math.max(1, Math.ceil((1 - world.production.progress(run!)) * ((run!.completeTick ?? 0) - (run!.startedTick ?? 0))))} min` : `${Math.max(0, Math.floor(portions))} portions`}
      </div>
    ),
    { maxDistance: 24 },
  );

  return (
    <group>
      <mesh position={[cx, 0.05, cz]} receiveShadow>
        <boxGeometry args={[3.2, 0.1, 2.6]} />
        <Mat colour="#5a2d1f" roughness={0.9} />
      </mesh>
      {/* back wall with tiles */}
      <mesh position={[cx, 0.85, cz - 1.25]} castShadow>
        <boxGeometry args={[3.2, 1.7, 0.1]} />
        <Mat colour="#7a3f2a" />
      </mesh>
      <mesh position={[cx, 0.7, cz - 1.19]}>
        <boxGeometry args={[3.0, 0.9, 0.01]} />
        <Mat colour="#f3ead5" roughness={0.6} />
      </mesh>
      <pointLight position={[cx, 1.6, cz]} color={P.warm} intensity={cooking ? 6 : 3} distance={4.5} />

      {/* stove and the biryani pot */}
      <mesh position={[pot[0], 0.35, pot[2]]} castShadow>
        <boxGeometry args={[1.1, 0.6, 0.9]} />
        <Mat colour="#2b2b2b" metalness={0.4} roughness={0.5} />
      </mesh>
      <Clickable selection={{ kind: 'item', itemId: ITEM.biryaniPool, venueId }} hover="Biryani (batch pool)">
        <group position={[pot[0], 0.66, pot[2]]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.38, 0.4, 14]} />
            <Mat colour="#3a3a3a" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.41, 0]}>
            <cylinderGeometry args={[0.36, 0.36, 0.06, 14]} />
            <Mat colour={portions > 0 ? '#e8a33d' : '#4a4a4a'} emissive={portions > 0 ? '#e8a33d' : '#000000'} emissiveIntensity={cooking ? 0.6 : 0.2} />
          </mesh>
          <mesh position={[0, 0.5, 0]} rotation-x={cooking ? 0.5 : 0} castShadow>
            <cylinderGeometry args={[0.44, 0.44, 0.06, 14]} />
            <Mat colour="#5a5a5a" metalness={0.6} roughness={0.35} />
          </mesh>
          {/* fire under the pot while a run is on */}
          {cooking && <pointLight position={[0, -0.3, 0.3]} color={P.orange} intensity={5} distance={2} />}
          <Puffs position={[0, 0.55, 0]} size={0.07} rise={0.8} continuous={cooking} />
        </group>
      </Clickable>

      {/* rice sacks: one per 10 kg bag, the last one scaled to what is left */}
      <Clickable selection={{ kind: 'item', itemId: ITEM.rice, venueId }} hover="Basmati rice">
        <Stack position={ITEM_ANCHOR[ITEM.rice]} count={rice / toBase(10_000)} max={4} size={[0.5, 0.36, 0.34]} colour="#f3ead5" stripe="#c0392b" dx={0.03} dy={0.36} />
      </Clickable>
      <Clickable selection={{ kind: 'item', itemId: ITEM.chicken, venueId }} hover="Chicken thigh">
        <Stack position={ITEM_ANCHOR[ITEM.chicken]} count={chicken / toBase(5_000)} max={3} size={[0.5, 0.28, 0.36]} colour="#f0b7a4" stripe="#8f3c2a" dx={0.02} dy={0.28} />
      </Clickable>
      <Clickable selection={{ kind: 'item', itemId: ITEM.spice, venueId }} hover="Biryani spice mix">
        <Stack position={ITEM_ANCHOR[ITEM.spice]} count={spice / toBase(1_000)} max={2} size={[0.3, 0.3, 0.3]} colour="#d9742b" stripe="#8a3d0f" dx={0} dy={0.3} round />
      </Clickable>
      <Clickable selection={{ kind: 'item', itemId: ITEM.naan, venueId }} hover="Naan">
        <Stack position={ITEM_ANCHOR[ITEM.naan]} count={naan / toBase(10)} max={6} size={[0.42, 0.08, 0.42]} colour="#f1d9a6" stripe="#d2a86a" dx={0.01} dy={0.08} round />
      </Clickable>

      {/* KDS screen: Coming, batch production recorded at the pass */}
      <Ghostable featureId="batch-production-pos-kds">
        <Clickable selection={{ kind: 'feature', featureId: 'batch-production-pos-kds' }} hover="KDS screen">
          <mesh position={[cx + 1.1, 1.35, cz - 1.17]}>
            <boxGeometry args={[0.7, 0.42, 0.05]} />
            <Mat colour="#111111" emissive={P.green} emissiveIntensity={0.5} />
          </mesh>
        </Clickable>
      </Ghostable>
      {/* Waste bin: Coming, waste capture */}
      <Ghostable featureId="waste-capture">
        <Clickable selection={{ kind: 'feature', featureId: 'waste-capture' }} hover="Waste bin">
          <mesh position={[cx + 1.25, 0.32, cz + 0.9]} castShadow>
            <cylinderGeometry args={[0.2, 0.17, 0.45, 10]} />
            <Mat colour={P.green} roughness={0.8} />
          </mesh>
          <mesh position={[cx + 1.25, 0.57, cz + 0.9]}>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 10]} />
            <Mat colour="#2e7d32" />
          </mesh>
        </Clickable>
      </Ghostable>
    </group>
  );
}

function Stack({ position, count, max, size, colour, stripe, dx, dy, round = false }: { position: [number, number, number]; count: number; max: number; size: [number, number, number]; colour: string; stripe: string; dx: number; dy: number; round?: boolean }) {
  const full = Math.max(0, Math.floor(count));
  const partial = count > 0 ? count - full : 0;
  const shown = Math.min(full, max);
  const items: { y: number; scale: number }[] = [];
  for (let i = 0; i < shown; i++) items.push({ y: i * dy, scale: 1 });
  if (partial > 0.05 && shown < max) items.push({ y: shown * dy, scale: Math.max(0.2, partial) });
  return (
    <group position={[position[0], position[1] - size[1] / 2, position[2]]}>
      {items.map((it, i) => (
        <group key={i} position={[i * dx, it.y - (size[1] * (1 - it.scale)) / 2, 0]} scale={[1, it.scale, 1]}>
          <mesh castShadow>
            {round ? <cylinderGeometry args={[size[0] / 2, size[0] / 2, size[1], 12]} /> : <boxGeometry args={size} />}
            <Mat colour={colour} roughness={0.9} />
          </mesh>
          {!round && (
            <mesh position={[0, 0, size[2] / 2 + 0.005]}>
              <boxGeometry args={[size[0] * 0.6, size[1] * 0.3, 0.01]} />
              <Mat colour={stripe} />
            </mesh>
          )}
        </group>
      ))}
      {items.length === 0 && (
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[size[0], 0.12, 0.05]} />
          <Mat colour={P.red} emissive={P.red} emissiveIntensity={0.9} />
        </mesh>
      )}
    </group>
  );
}
