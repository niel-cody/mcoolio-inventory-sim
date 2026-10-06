import { useFrame } from '@react-three/fiber';
import { useCallback, useRef, useState } from 'react';
import { Group, Vector3 } from 'three';
import { Mat } from '../Ghost';
import { ITEM_ANCHOR, POS_TERMINAL, ZONE_CENTRE } from '../anchors';
import { P } from '../palette';
import { useSimEvents } from '../useSimEvents';
import { useWorld } from '../useWorld';
import { useSim } from '../../store';
import type { Zone } from '../../sim/types';

interface Piece {
  id: string;
  orderId: string;
  itemId: string;
  start: number;
  from: Vector3;
  to: Vector3;
  colour: string;
}

const FLIGHT = 1.3;
const FADE = 0.35;
const MAX_PIECES = 48;

/** Dev counter so a test harness can confirm tickets are spawning. */
export const ticketStats = { spawned: 0 };

const ZONE_COLOUR: Record<Zone, string> = { bar: P.lilac, coolroom: P.sky, kitchen: P.orange, dock: P.yellow };

/** Order tickets rise from the POS terminal and split towards the zones they deplete. */
export function Tickets({ venueId }: { venueId: string }) {
  const world = useWorld();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const clock = useRef(0);
  const select = useSim((s) => s.select);

  useSimEvents(
    useCallback(
      (e) => {
        if (useSim.getState().runner.seeking) return;
        if (e.type !== 'order' || e.locationId !== venueId) return;
        if (e.action !== 'COMMIT' && e.action !== 'RELEASE' && e.action !== 'REVERSE') return;
        const now = clock.current;
        const from = new Vector3(...POS_TERMINAL);
        const next: Piece[] = [];
        if (e.action === 'COMMIT') {
          e.demands.forEach((d, i) => {
            const item = world.catalogue.items.get(d.itemId);
            const anchor = ITEM_ANCHOR[d.itemId] ?? ZONE_CENTRE[item?.zone ?? 'bar'];
            next.push({ id: `${e.orderId}:${i}`, orderId: e.orderId, itemId: d.itemId, start: now, from, to: new Vector3(...anchor), colour: ZONE_COLOUR[item?.zone ?? 'bar'] });
          });
        } else {
          // A void or refund: one ticket, red, rising straight up and fading.
          next.push({ id: `${e.orderId}:${e.action}`, orderId: e.orderId, itemId: '', start: now, from, to: from.clone().add(new Vector3(0, 1.4, 0)), colour: e.action === 'RELEASE' ? P.sky : P.red });
        }
        ticketStats.spawned += next.length;
        setPieces((prev) => [...prev, ...next].slice(-MAX_PIECES));
      },
      [venueId, world],
    ),
  );

  useFrame((_, dt) => {
    clock.current += dt;
    const now = clock.current;
    if (pieces.length && pieces.some((p) => now - p.start > FLIGHT + FADE)) {
      setPieces((prev) => prev.filter((p) => now - p.start <= FLIGHT + FADE));
    }
  });

  return (
    <group>
      {pieces.map((p) => (
        <TicketPiece key={p.id} piece={p} clock={clock} onClick={() => select({ kind: 'ticket', orderId: p.orderId, venueId })} />
      ))}
    </group>
  );
}

function TicketPiece({ piece, clock, onClick }: { piece: Piece; clock: React.MutableRefObject<number>; onClick: () => void }) {
  const ref = useRef<Group>(null);
  const tmp = useRef(new Vector3());
  useFrame(() => {
    if (!ref.current) return;
    const age = clock.current - piece.start;
    const k = Math.min(1, age / FLIGHT);
    const ease = 1 - Math.pow(1 - k, 3);
    tmp.current.lerpVectors(piece.from, piece.to, ease);
    // Arc up and over.
    tmp.current.y += Math.sin(k * Math.PI) * 1.1;
    ref.current.position.copy(tmp.current);
    ref.current.rotation.y = age * 2.5;
    const fade = age > FLIGHT ? 1 - (age - FLIGHT) / FADE : 1;
    ref.current.scale.setScalar(0.9 * Math.max(0.01, fade));
  });
  return (
    <group
      ref={ref}
      position={piece.from}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh>
        <boxGeometry args={[0.26, 0.17, 0.02]} />
        <Mat colour={piece.colour} emissive={piece.colour} emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, 0.03, 0.012]}>
        <boxGeometry args={[0.18, 0.02, 0.005]} />
        <Mat colour="#1a0f33" />
      </mesh>
      <mesh position={[0, -0.02, 0.012]}>
        <boxGeometry args={[0.14, 0.02, 0.005]} />
        <Mat colour="#1a0f33" />
      </mesh>
    </group>
  );
}
