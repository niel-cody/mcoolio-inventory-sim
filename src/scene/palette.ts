// Oolio brand pulled from brand.oolio.com: purple dominant, with the extended palette as accents.
export const P = {
  purple: '#673ab6',
  purpleDeep: '#3b1f73',
  purpleInk: '#1a0f33',
  night: '#0d0719',
  ground: '#170d2e',
  glow: '#9b6cf2',
  lilac: '#cdb7ff',
  sky: '#03a9f4',
  yellow: '#ffeb3b',
  amber: '#ffc008',
  red: '#f44336',
  green: '#4caf50',
  orange: '#ff9800',
  warm: '#ffb366',
  cream: '#f3ead5',
  charcoal: '#222222',
  ice: '#bfe6ff',
} as const;

export const HEAT_COLOUR = { healthy: P.green, warning: P.amber, soldout: P.red } as const;

/** Where the three supplier depots sit on the world plane. */
export const DEPOT_POSITIONS: Record<string, [number, number]> = {
  sup_harbour: [15, -9],
  sup_nightowl: [-16, -9],
  sup_spiceroute: [-19, 7],
};
