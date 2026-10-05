import { useSim } from '../store';

export function HoverTip() {
  const hover = useSim((s) => s.hover);
  if (!hover) return null;
  return (
    <div className="hovertip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
      {hover.text}
    </div>
  );
}
