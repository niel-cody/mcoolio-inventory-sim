import { ITEM } from '../data/mcoolio';
import type { Zone } from '../sim/types';

/** Island-local positions of each zone's centre. */
export const ZONE_CENTRE: Record<Zone, [number, number, number]> = {
  bar: [-1.7, 0, 1.5],
  coolroom: [1.8, 0, 1.5],
  kitchen: [-1.7, 0, -1.5],
  dock: [1.8, 0, -1.7],
};

/** Island-local positions each stock item lives at, where tickets fly to. */
export const ITEM_ANCHOR: Record<string, [number, number, number]> = {
  [ITEM.absolut]: [-2.5, 1.05, 0.65],
  [ITEM.greygoose]: [-1.75, 1.05, 0.65],
  [ITEM.sugar]: [-1.05, 0.95, 0.65],
  [ITEM.espresso]: [-0.75, 1.0, 1.55],
  [ITEM.water]: [-0.3, 0.9, 1.0],
  [ITEM.kingfisher]: [1.8, 0.7, 1.5],
  [ITEM.biryaniPool]: [-1.7, 0.9, -1.4],
  [ITEM.rice]: [-2.75, 0.45, -2.2],
  [ITEM.chicken]: [-2.05, 0.4, -2.45],
  [ITEM.spice]: [-0.75, 0.45, -2.3],
  [ITEM.naan]: [-0.6, 0.5, -1.0],
};

export const POS_TERMINAL: [number, number, number] = [-0.35, 0.95, 2.4];

/** Island rotation per index, kept in one place so routes can find the dock. */
export function islandRotation(index: number): number {
  return index * 0.35 - 0.3;
}

export function rotateLocal(local: [number, number, number], rotationY: number): [number, number, number] {
  const [x, y, z] = local;
  const c = Math.cos(rotationY);
  const s = Math.sin(rotationY);
  return [x * c + z * s, y, -x * s + z * c];
}
