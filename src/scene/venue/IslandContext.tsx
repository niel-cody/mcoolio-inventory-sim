import { createContext, useContext } from 'react';
import { rotateLocal } from '../anchors';

export interface IslandFrame {
  x: number;
  z: number;
  rotation: number;
}

export const IslandContext = createContext<IslandFrame>({ x: 0, z: 0, rotation: 0 });

/** Converts island-local positions to world positions for screen labels. */
export function useToWorld(): (local: [number, number, number]) => [number, number, number] {
  const f = useContext(IslandContext);
  return (local) => {
    const [x, y, z] = rotateLocal(local, f.rotation);
    return [x + f.x, y, z + f.z];
  };
}
