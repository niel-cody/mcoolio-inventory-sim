import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { useSim } from '../store';
import { CameraRig } from './CameraRig';
import { LabelProjector } from './LabelLayer';
import { P } from './palette';
import { WorldView } from './world/WorldView';

export function SceneRoot() {
  const select = useSim((s) => s.select);
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 27, 25], fov: 38, near: 0.5, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => select(null)}
      onCreated={(state) => {
        if (import.meta.env.DEV) (window as unknown as { __r3f: unknown }).__r3f = state;
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[P.night]} />
      <fog attach="fog" args={[P.night, 45, 110]} />
      <ambientLight intensity={0.35} color="#8a6cff" />
      <hemisphereLight args={['#5a3aa6', '#0d0719', 0.5]} />
      <directionalLight
        position={[18, 28, 10]}
        intensity={1.1}
        color="#d9c6ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-bias={-0.0004}
      />
      <Suspense fallback={null}>
        <WorldView />
      </Suspense>
      <CameraRig />
      <LabelProjector />
    </Canvas>
  );
}
