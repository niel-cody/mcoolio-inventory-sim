// The status registry. Every interactive feature reads its status from here and
// nothing else. Status words only; no dates anywhere.

export type FeatureStatus = 'live' | 'building' | 'coming' | 'later';

export interface Feature {
  id: FeatureId;
  name: string;
  status: FeatureStatus;
  /** Epic or idea reference for the people in the room who track them. */
  epic: string;
  /** One or two sentences: what it does, or what it will do. */
  summary: string;
  /** Extra note shown on the pill, e.g. "MVP, not started". */
  note?: string;
  /** Shown in v1 at all. Later features are listed here but never rendered. */
  showInV1: boolean;
}

export type FeatureId =
  | 'suppliers'
  | 'catalogue-item-types'
  | 'recipes-variants'
  | 'batch-production-backoffice'
  | 'depletion-engine'
  | 'purchase-orders'
  | 'credit-notes'
  | 'stocktakes'
  | 'sold-out-flag'
  | 'par-levels-suggested-orders'
  | 'transfers'
  | 'ingredient-swap'
  | 'waste-capture'
  | 'batch-production-pos-kds'
  | 'ai-stock-manager'
  | 'other-pos-brands';

export const FEATURES: Record<FeatureId, Feature> = {
  suppliers: {
    id: 'suppliers',
    name: 'Suppliers',
    status: 'live',
    epic: 'STK (Suppliers version)',
    summary: 'Supplier records, supplier types and the saved views that back ordering.',
    showInV1: true,
  },
  'catalogue-item-types': {
    id: 'catalogue-item-types',
    name: 'Catalogue and item types',
    status: 'building',
    epic: 'STK-1, STK-10',
    summary: 'Every inventory item is STOCKED, NON_STOCKED or BATCH. The type decides how a sale depletes it.',
    note: 'MVP',
    showInV1: true,
  },
  'recipes-variants': {
    id: 'recipes-variants',
    name: 'Recipes and variants',
    status: 'building',
    epic: 'STK-10',
    summary: 'Versioned recipes with an active version. Variants like Nip and Double are recipes onto one pour pool.',
    note: 'MVP',
    showInV1: true,
  },
  'batch-production-backoffice': {
    id: 'batch-production-backoffice',
    name: 'Batch production (back office)',
    status: 'building',
    epic: 'STK-10',
    summary: 'A production run consumes raw ingredients and creates portions in the batch pool. Sales deplete the pool, never the raw stock.',
    note: 'MVP',
    showInV1: true,
  },
  'depletion-engine': {
    id: 'depletion-engine',
    name: 'Depletion engine',
    status: 'building',
    epic: 'STK-5',
    summary: 'Oolio POS orders reserve stock when created, commit when complete, release on void and reverse on refund.',
    note: 'MVP, instant channel',
    showInV1: true,
  },
  'purchase-orders': {
    id: 'purchase-orders',
    name: 'Purchase orders',
    status: 'building',
    epic: 'STK-4',
    summary: 'Draft, send, receive and post. Receiving records actual quantity and cost, posting updates stock and average cost.',
    note: 'MVP',
    showInV1: true,
  },
  'credit-notes': {
    id: 'credit-notes',
    name: 'Credit notes',
    status: 'building',
    epic: 'STK-117',
    summary: 'Short deliveries and damaged goods raise a credit note against the supplier.',
    note: 'MVP',
    showInV1: true,
  },
  stocktakes: {
    id: 'stocktakes',
    name: 'Stocktakes',
    status: 'building',
    epic: 'STK-12',
    summary: 'Count what is on the shelf, compare with theoretical, post the variance.',
    note: 'MVP, not started',
    showInV1: true,
  },
  'sold-out-flag': {
    id: 'sold-out-flag',
    name: 'Sold out at one location from stock',
    status: 'coming',
    epic: 'OHSI-990',
    summary: 'When an ingredient hits zero at a venue, every product that needs it switches off on that venue’s POS only. Other venues keep selling.',
    note: 'needs confirming',
    showInV1: true,
  },
  'par-levels-suggested-orders': {
    id: 'par-levels-suggested-orders',
    name: 'Par levels and suggested orders',
    status: 'coming',
    epic: 'with dynamic POs',
    summary: 'Stock below its reorder point drafts a purchase order up to par, ready for the manager to send.',
    showInV1: true,
  },
  transfers: {
    id: 'transfers',
    name: 'Transfers between venues',
    status: 'coming',
    epic: 'STK-11',
    summary: 'Move stock from one venue to another at cost. Simple in v1: one item, one trip.',
    showInV1: true,
  },
  'ingredient-swap': {
    id: 'ingredient-swap',
    name: 'Ingredient swap',
    status: 'coming',
    epic: 'OHSI-989 / OHSI-990',
    summary: 'When Absolut runs out, swap the recipe to Grey Goose at that venue and keep the martini on the menu.',
    showInV1: true,
  },
  'waste-capture': {
    id: 'waste-capture',
    name: 'Waste capture',
    status: 'coming',
    epic: 'STK-141 + surface epics',
    summary: 'Record waste at the POS, the KDS and back of house, with a reason, so theoretical stock stays honest.',
    showInV1: true,
  },
  'batch-production-pos-kds': {
    id: 'batch-production-pos-kds',
    name: 'Batch production at POS and KDS',
    status: 'coming',
    epic: 'surface epics',
    summary: 'The kitchen records the biryani batch on the KDS as it comes off the stove, no back office trip.',
    showInV1: true,
  },
  'ai-stock-manager': {
    id: 'ai-stock-manager',
    name: 'AI Stock Manager and AI Procurement Manager (Ngara)',
    status: 'coming',
    epic: 'INI-193',
    summary: 'Ngara watches stock and sales and suggests the next move: a swap, a transfer, a reorder.',
    showInV1: true,
  },
  'other-pos-brands': {
    id: 'other-pos-brands',
    name: 'Other POS brands (Bepoz, SwiftPOS)',
    status: 'later',
    epic: 'per-brand epics',
    summary: 'Depletion from other POS brands. Not shown in v1.',
    showInV1: false,
  },
};

export type SimMode = 'today' | 'roadmap';

/** In Today mode only Live and Building play. In Roadmap mode everything plays, tagged. */
export function featurePlays(id: FeatureId, mode: SimMode): boolean {
  const f = FEATURES[id];
  if (!f.showInV1) return false;
  if (f.status === 'live' || f.status === 'building') return true;
  return mode === 'roadmap';
}

export function featureStatusLabel(status: FeatureStatus): string {
  switch (status) {
    case 'live':
      return 'Live';
    case 'building':
      return 'Building';
    case 'coming':
      return 'Coming';
    case 'later':
      return 'Later';
  }
}

export const FEATURE_LIST: Feature[] = Object.values(FEATURES);
