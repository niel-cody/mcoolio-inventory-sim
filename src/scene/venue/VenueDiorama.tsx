import type { Venue } from '../../sim/types';
import { Mat } from '../Ghost';
import { P } from '../palette';
import { BarZone } from './BarZone';
import { CoolRoomZone } from './CoolRoomZone';
import { DockZone } from './DockZone';
import { KitchenZone } from './KitchenZone';
import { Tickets } from './Tickets';

/** The four zones of a venue, cut away so all are visible at once. */
export function VenueDiorama({ venue, focused }: { venue: Venue; focused: boolean }) {
  return (
    <group>
      <BarZone venueId={venue.id} focused={focused} />
      <CoolRoomZone venueId={venue.id} focused={focused} />
      <KitchenZone venueId={venue.id} focused={focused} />
      <DockZone venueId={venue.id} focused={focused} />
      <Tickets venueId={venue.id} />
      {/* a crooked neon sign so the place feels a bit absurd */}
      <group position={[0.15, 2.3, 0]} rotation-z={0.06}>
        <mesh position={[0, -0.9, 0]}>
          <boxGeometry args={[0.1, 1.8, 0.1]} />
          <Mat colour={P.lilac} />
        </mesh>
        <mesh>
          <boxGeometry args={[2.0, 0.5, 0.1]} />
          <Mat colour={P.purple} emissive={P.purple} emissiveIntensity={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <boxGeometry args={[1.7, 0.18, 0.01]} />
          <Mat colour={P.yellow} emissive={P.yellow} emissiveIntensity={1} />
        </mesh>
      </group>
    </group>
  );
}
