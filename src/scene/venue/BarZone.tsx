import { useFrame } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import type { Group } from 'three';
import { ITEM, PRODUCT } from '../../data/mcoolio';
import { toBase } from '../../sim/baseunits';
import { Ghostable, Mat } from '../Ghost';
import { ITEM_ANCHOR, POS_TERMINAL, ZONE_CENTRE } from '../anchors';
import { P } from '../palette';
import { useSimEvents } from '../useSimEvents';
import { useWorld } from '../useWorld';
import { useLabel } from '../useLabel';
import { useSim } from '../../store';
import { useToWorld } from './IslandContext';
import { Bottle } from './Bottle';
import { Clickable } from './Clickable';
import { Puffs, type PuffsHandle } from './Puffs';

const BOTTLE_ML = toBase(700);

export function BarZone({ venueId, focused }: { venueId: string; focused: boolean }) {
  const world = useWorld();
  const toWorld = useToWorld();
  const [cx, , cz] = ZONE_CENTRE.bar;
  const absolut = world.stock.onHand(ITEM.absolut, venueId);
  const goose = world.stock.onHand(ITEM.greygoose, venueId);
  const sugar = world.stock.onHand(ITEM.sugar, venueId);
  const espresso = world.stock.onHand(ITEM.espresso, venueId);
  const machine = useRef<PuffsHandle>(null);
  const bartender = useRef<Group>(null);
  const shake = useRef(0);

  useSimEvents(
    useCallback(
      (e) => {
        if (useSim.getState().runner.seeking) return;
        if (e.type !== 'order' || e.locationId !== venueId || e.action !== 'COMMIT') return;
        if (e.demands.some((d) => d.itemId === ITEM.espresso)) {
          machine.current?.burst(3);
          shake.current = 1;
        }
      },
      [venueId],
    ),
  );

  useFrame((state, dt) => {
    if (!bartender.current) return;
    if (shake.current > 0) {
      shake.current = Math.max(0, shake.current - dt * 1.4);
      const t = state.clock.getElapsedTime();
      bartender.current.rotation.z = Math.sin(t * 28) * 0.25 * shake.current;
      bartender.current.position.y = 0.3 + Math.abs(Math.sin(t * 28)) * 0.08 * shake.current;
    } else {
      bartender.current.rotation.z = 0;
      bartender.current.position.y = 0.3;
    }
  });

  const flagged = [PRODUCT.nip, PRODUCT.double, PRODUCT.martini].filter((p) => world.isFlaggedSoldOut(p, venueId));
  const soldOutHere = [PRODUCT.nip, PRODUCT.double, PRODUCT.martini].filter((p) => world.availability.of(p, venueId).soldOut);

  useLabel(
    `pot:${venueId}:bar`,
    toWorld([cx - 0.4, 2.1, cz - 0.6]),
    () => <div className="zone-label">Bar</div>,
    { enabled: focused, maxDistance: 22, className: 'zone-label-anchor' },
  );

  const absolutName = world.catalogue.item(ITEM.absolut).name;
  const gooseName = world.catalogue.item(ITEM.greygoose).name;

  return (
    <group>
      {/* floor tile */}
      <mesh position={[cx, 0.05, cz]} receiveShadow>
        <boxGeometry args={[3.2, 0.1, 2.6]} />
        <Mat colour="#3d2470" roughness={0.9} />
      </mesh>
      {/* back bar wall and shelf */}
      <mesh position={[cx, 0.85, cz - 1.15]} castShadow>
        <boxGeometry args={[3.2, 1.7, 0.12]} />
        <Mat colour="#2a174f" />
      </mesh>
      <mesh position={[cx, 0.98, cz - 0.9]} castShadow>
        <boxGeometry args={[3.0, 0.06, 0.45]} />
        <Mat colour="#5a3aa6" />
      </mesh>
      <pointLight position={[cx, 1.5, cz - 0.7]} color={P.glow} intensity={2.5} distance={4} />

      {/* Absolut bottles: one per 700 mL, the last one shows the pour pool's fill */}
      <Clickable selection={{ kind: 'item', itemId: ITEM.absolut, venueId }} hover={absolutName}>
        {bottleRow(absolut, 7, ITEM_ANCHOR[ITEM.absolut], '#cfe9ff', '#e8f6ff')}
        {absolut <= 0 && (
          <mesh position={[ITEM_ANCHOR[ITEM.absolut][0] + 0.3, ITEM_ANCHOR[ITEM.absolut][1] + 0.15, ITEM_ANCHOR[ITEM.absolut][2]]}>
            <boxGeometry args={[0.7, 0.25, 0.05]} />
            <Mat colour={P.red} emissive={P.red} emissiveIntensity={0.9} />
          </mesh>
        )}
      </Clickable>
      <Clickable selection={{ kind: 'item', itemId: ITEM.greygoose, venueId }} hover={gooseName}>
        {bottleRow(goose, 4, ITEM_ANCHOR[ITEM.greygoose], '#f3f5f7', '#ffffff')}
      </Clickable>
      {/* sugar syrup */}
      <Clickable selection={{ kind: 'item', itemId: ITEM.sugar, venueId }} hover="Sugar syrup">
        <Bottle position={ITEM_ANCHOR[ITEM.sugar]} fill={Math.min(1, sugar / toBase(1000))} glass="#f7e3a1" liquid="#f2c94c" scale={0.8} />
      </Clickable>

      {/* bar counter */}
      <mesh position={[cx, 0.45, cz + 0.85]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.8, 0.55]} />
        <Mat colour="#4a2a8c" />
      </mesh>
      <mesh position={[cx, 0.87, cz + 0.85]}>
        <boxGeometry args={[3.3, 0.06, 0.65]} />
        <Mat colour="#9b6cf2" roughness={0.3} />
      </mesh>

      {/* espresso machine */}
      <Clickable selection={{ kind: 'item', itemId: ITEM.espresso, venueId }} hover="Espresso (from beans)">
        <group position={ITEM_ANCHOR[ITEM.espresso]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.55, 0.4, 0.4]} />
            <Mat colour="#2b2b2b" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.43, 0]}>
            <boxGeometry args={[0.5, 0.06, 0.36]} />
            <Mat colour="#c9c9d6" roughness={0.2} metalness={0.8} />
          </mesh>
          <mesh position={[-0.12, 0.05, 0.22]}>
            <cylinderGeometry args={[0.03, 0.03, 0.14, 6]} />
            <Mat colour="#c9c9d6" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0.12, 0.05, 0.22]}>
            <cylinderGeometry args={[0.03, 0.03, 0.14, 6]} />
            <Mat colour="#c9c9d6" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* bean hopper shows how much espresso is left */}
          <mesh position={[0.18, 0.55, -0.05]}>
            <cylinderGeometry args={[0.07, 0.05, 0.18, 8]} />
            <Mat colour={espresso > toBase(600) ? '#5b3a29' : P.red} opacity={0.85} />
          </mesh>
          <Puffs ref={machine} position={[0, 0.5, 0.1]} size={0.05} rise={0.6} />
        </group>
      </Clickable>

      {/* bartender */}
      <group ref={bartender} position={[cx + 0.6, 0.3, cz - 0.25]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <capsuleGeometry args={[0.16, 0.4, 4, 8]} />
          <Mat colour={P.purple} />
        </mesh>
        <mesh position={[0, 0.78, 0]} castShadow>
          <sphereGeometry args={[0.15, 10, 10]} />
          <Mat colour="#f0b7a4" />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Mat colour="#222222" />
        </mesh>
        {/* shaker */}
        <mesh position={[0.26, 0.55, 0.1]} rotation-z={-0.4}>
          <cylinderGeometry args={[0.05, 0.06, 0.22, 8]} />
          <Mat colour="#c9c9d6" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* POS terminal: tickets rise from here */}
      <group position={POS_TERMINAL}>
        <mesh position={[0, 0.08, 0]} rotation-x={-0.5} castShadow>
          <boxGeometry args={[0.42, 0.3, 0.04]} />
          <Mat colour="#1a0f33" emissive={P.sky} emissiveIntensity={0.9} />
        </mesh>
        <mesh position={[0, -0.05, 0.05]}>
          <boxGeometry args={[0.3, 0.05, 0.2]} />
          <Mat colour="#222222" />
        </mesh>
      </group>

      {/* 86 board: the Coming sold-out flag. Ghosted in Today. */}
      <Ghostable featureId="sold-out-flag">
        <Clickable selection={{ kind: 'feature', featureId: 'sold-out-flag' }} hover="86 board">
          <mesh position={[cx + 1.1, 1.35, cz - 1.07]}>
            <boxGeometry args={[0.8, 0.45, 0.04]} />
            <Mat colour="#111111" emissive={flagged.length ? P.red : '#000000'} emissiveIntensity={flagged.length ? 0.9 : 0} />
          </mesh>
          {flagged.map((p, i) => (
            <mesh key={p} position={[cx + 1.1, 1.5 - i * 0.12, cz - 1.04]}>
              <boxGeometry args={[0.6, 0.06, 0.01]} />
              <Mat colour={P.red} emissive={P.red} emissiveIntensity={1} />
            </mesh>
          ))}
          {!world.featurePlays('sold-out-flag') && soldOutHere.length > 0 && (
            <mesh position={[cx + 1.1, 1.35, cz - 1.04]}>
              <boxGeometry args={[0.6, 0.1, 0.01]} />
              <Mat colour={P.amber} emissive={P.amber} emissiveIntensity={1} />
            </mesh>
          )}
        </Clickable>
      </Ghostable>

      {/* Ngara: the AI stock manager hovering over the bar. Ghosted in Today. */}
      <Ghostable featureId="ai-stock-manager">
        <Clickable selection={{ kind: 'feature', featureId: 'ai-stock-manager' }} hover="Ngara, AI Stock Manager">
          <Ngara position={[cx - 1.1, 1.9, cz + 0.2]} />
        </Clickable>
      </Ghostable>
    </group>
  );
}

function bottleRow(onHand: number, max: number, anchor: [number, number, number], glass: string, liquid: string) {
  const full = Math.max(0, Math.floor(onHand / BOTTLE_ML));
  const partial = onHand > 0 ? (onHand - full * BOTTLE_ML) / BOTTLE_ML : 0;
  const bottles: React.ReactElement[] = [];
  const shown = Math.min(full, max);
  for (let i = 0; i < shown; i++) {
    bottles.push(<Bottle key={i} position={[anchor[0] + i * 0.2, anchor[1] - 0.5, anchor[2]]} fill={1} glass={glass} liquid={liquid} scale={0.85} />);
  }
  if (partial > 0.02 && shown < max) {
    bottles.push(<Bottle key="partial" position={[anchor[0] + shown * 0.2, anchor[1] - 0.5, anchor[2]]} fill={partial} glass={glass} liquid={liquid} scale={0.85} />);
  }
  return bottles;
}

function Ngara({ position }: { position: [number, number, number] }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.getElapsedTime();
    g.current.position.y = position[1] + Math.sin(t * 1.6) * 0.08;
    g.current.rotation.y = t * 0.8;
  });
  return (
    <group ref={g} position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.2, 12, 12]} />
        <Mat colour={P.yellow} emissive={P.yellow} emissiveIntensity={0.5} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.32, 0.03, 8, 24]} />
        <Mat colour={P.lilac} emissive={P.glow} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.08, 0.05, 0.17]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <Mat colour="#222222" />
      </mesh>
      <mesh position={[-0.08, 0.05, 0.17]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <Mat colour="#222222" />
      </mesh>
    </group>
  );
}
