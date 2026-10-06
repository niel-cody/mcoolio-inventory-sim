import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useRef } from 'react';
import { AmbientLight, Color, DirectionalLight, Fog, HemisphereLight } from 'three';
import { P } from './palette';
import { useWorld } from './useWorld';

const NIGHT_SKY = new Color(P.night);
const DAY_SKY = new Color('#7d8fe0');
const DUSK_SKY = new Color('#5b3a9e');
const NIGHT_SUN = new Color('#d9c6ff');
const DAY_SUN = new Color('#fff1d6');
const DUSK_SUN = new Color('#ffb36b');

/**
 * Lighting follows the sim clock. Night is the Oolio venue-at-night look; day is
 * a cool lavender sky with a real sun; dawn and dusk warm everything up.
 * Values are damped per frame so a seek does not snap.
 */
export function SkyAndSun() {
  const world = useWorld();
  const scene = useThree((s) => s.scene);
  const ambient = useRef<AmbientLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const sun = useRef<DirectionalLight>(null);
  const current = useRef({ d: world.daylight() });
  const sky = useRef(new Color());
  const sunColour = useRef(new Color());
  const hour = world.hour();
  const target = world.daylight();
  const night = current.current.d < 0.55;

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 2.5);
    current.current.d += (target - current.current.d) * k;
    const d = current.current.d;
    // Dusk/dawn tint peaks when d is around 0.5.
    const twilight = 1 - Math.abs(d - 0.5) * 2;
    sky.current.copy(NIGHT_SKY).lerp(DAY_SKY, d).lerp(DUSK_SKY, twilight * 0.6);
    sunColour.current.copy(NIGHT_SUN).lerp(DAY_SUN, d).lerp(DUSK_SUN, twilight * 0.7);
    scene.background = sky.current;
    const fog = scene.fog as Fog | null;
    if (fog) {
      fog.color.copy(sky.current);
      fog.near = 45 + d * 20;
      fog.far = 110 + d * 60;
    }
    if (ambient.current) {
      ambient.current.intensity = 0.35 + d * 0.75;
      ambient.current.color.set(d > 0.5 ? '#ffffff' : '#8a6cff');
    }
    if (hemi.current) hemi.current.intensity = 0.5 + d * 0.6;
    if (sun.current) {
      sun.current.intensity = 1.1 + d * 1.6;
      sun.current.color.copy(sunColour.current);
      // The sun arcs with the hour; the moonlight angle stays fixed.
      const h = ((hour - 6) / 12) * Math.PI; // 06:00 rise, 18:00 set
      const elevation = d > 0.02 ? Math.max(0.25, Math.sin(h)) : 0.75;
      const azimuth = d > 0.02 ? Math.cos(h) : 0.55;
      sun.current.position.set(azimuth * 30, 10 + elevation * 28, 10 + (1 - d) * 4);
    }
  });

  return (
    <>
      <fog attach="fog" args={[P.night, 45, 110]} />
      <ambientLight ref={ambient} intensity={0.35} color="#8a6cff" />
      <hemisphereLight ref={hemi} args={['#5a3aa6', '#0d0719', 0.5]} />
      <directionalLight
        ref={sun}
        position={[18, 28, 10]}
        intensity={1.1}
        color="#d9c6ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-bias={-0.0004}
      />
      {night && <Stars radius={120} depth={40} count={1800} factor={3} saturation={0.6} fade speed={0.4} />}
    </>
  );
}
