import { createContext, useContext, type ReactNode } from 'react';
import type { FeatureId } from '../features';
import { useWorld } from './useWorld';
import { useSim } from '../store';

const GhostContext = createContext(false);

/**
 * Wraps an object that belongs to a feature. When the feature does not play in
 * the current mode it renders ghosted (wireframe, translucent) and a click opens
 * the feature's "what it will do" card instead of doing anything.
 */
export function Ghostable({ featureId, children }: { featureId: FeatureId; children: ReactNode }) {
  const world = useWorld();
  const select = useSim((s) => s.select);
  const ghost = !world.featurePlays(featureId);
  return (
    <GhostContext.Provider value={ghost}>
      <group
        onClick={(e) => {
          if (!ghost) return;
          e.stopPropagation();
          select({ kind: 'feature', featureId });
        }}
        onPointerOver={(e) => {
          if (!ghost) return;
          e.stopPropagation();
          document.body.style.cursor = 'help';
        }}
        onPointerOut={() => {
          if (ghost) document.body.style.cursor = 'auto';
        }}
      >
        {children}
      </group>
    </GhostContext.Provider>
  );
}

export function useGhost(): boolean {
  return useContext(GhostContext);
}

/** Standard material that turns into a wireframe ghost inside a ghosted feature. */
export function Mat({ colour, emissive, emissiveIntensity = 0, roughness = 0.8, metalness = 0, opacity = 1 }: { colour: string; emissive?: string; emissiveIntensity?: number; roughness?: number; metalness?: number; opacity?: number }) {
  const ghost = useGhost();
  if (ghost) return <meshBasicMaterial color="#cdb7ff" wireframe transparent opacity={0.45} />;
  return <meshStandardMaterial color={colour} emissive={emissive ?? '#000000'} emissiveIntensity={emissiveIntensity} roughness={roughness} metalness={metalness} transparent={opacity < 1} opacity={opacity} />;
}
