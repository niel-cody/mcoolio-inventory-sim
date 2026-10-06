import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { useSim } from '../store';
import { CameraRig } from './CameraRig';
import { LabelProjector } from './LabelLayer';
import { SkyAndSun } from './SkyAndSun';
import { WorldView } from './world/WorldView';

export function SceneRoot() {
  const select = useSim((s) => s.select);
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 27, 25], fov: 38, near: 0.5, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => select(null)}
      onCreated={(state) => {
        if (import.meta.env.DEV) (window as unknown as { __r3f: unknown }).__r3f = state;
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <SkyAndSun />
      <Suspense fallback={null}>
        <WorldView />
      </Suspense>
      <CameraRig />
      <LabelProjector />
    </Canvas>
  );
}
