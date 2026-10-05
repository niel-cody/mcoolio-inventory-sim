import type { ReactNode } from 'react';
import { useSim, type Selection } from '../../store';

/** Group that selects something on click and shows a pointer on hover. */
export function Clickable({ selection, hover, children, position, rotation }: { selection: Selection; hover?: string; children: ReactNode; position?: [number, number, number]; rotation?: [number, number, number] }) {
  const select = useSim((s) => s.select);
  const setHover = useSim((s) => s.setHover);
  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        select(selection);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        if (hover) setHover({ text: hover, x: e.clientX, y: e.clientY });
      }}
      onPointerMove={(e) => {
        if (hover) setHover({ text: hover, x: e.clientX, y: e.clientY });
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
        setHover(null);
      }}
    >
      {children}
    </group>
  );
}
