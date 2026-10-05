import type { BaseUnits } from './baseunits';

// ─── Catalogue ────────────────────────────────────────────────────────────────

/** Mirrors catalogue.inventory_items.subtype in the real service. */
export type ItemType = 'STOCKED' | 'NON_STOCKED' | 'BATCH';

export type Zone = 'bar' | 'coolroom' | 'kitchen' | 'dock';

export type BaseUom = 'mL' | 'g' | 'each' | 'portion';

export interface PurchaseUnit {
  /** e.g. "Carton of 24", "700 mL bottle" */
  name: string;
  /** Whole base units per purchase unit (24 each, 700 mL, 10,000 g). */
  factor: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  itemType: ItemType;
  baseUom: BaseUom;
  zone: Zone;
  purchaseUnit?: PurchaseUnit;
  supplierId?: string;
  /** Demo colour hint for the 3D view. The sim never reads it. */
  colour?: string;
}

/** A sellable POS product. posId is what the depletion engine resolves. */
export interface Product {
  posId: string;
  name: string;
  /** Inventory item this product resolves to (its type drives resolve). */
  itemId: string;
  priceMinor: number;
  /** Modifier products are sold as option variants, not lines. */
  isModifier?: boolean;
}

// ─── Recipes ──────────────────────────────────────────────────────────────────

export interface RecipeLine {
  ingredientItemId: string;
  /** Decimal quantity in the ingredient's base UOM, per `yieldQty` of output. */
  qty: number;
}

export interface RecipeVersion {
  id: string;
  version: number;
  yieldQty: number;
  lines: RecipeLine[];
  note?: string;
}

export interface Recipe {
  itemId: string;
  versions: RecipeVersion[];
  activeVersionId: string;
}

export interface ExpandedLine {
  ingredientItemId: string;
  /** Decimal quantity per ONE unit of the parent item. */
  effectiveQty: number;
}

// ─── Stock ────────────────────────────────────────────────────────────────────

export type LayerSource = 'GOODS_RECEIPT' | 'PRODUCTION_RUN' | 'OPENING' | 'REVERSAL' | 'TRANSFER_IN' | 'STOCK_TAKE';

export interface CostLayer {
  id: string;
  itemId: string;
  locationId: string;
  qtyReceived: BaseUnits;
  qtyRemaining: BaseUnits;
  /** Cost (minor currency) still attached to qtyRemaining. */
  costRemainingMinor: number;
  source: LayerSource;
  sourceRef: string;
  receivedTick: number;
}

export type MovementType =
  | 'GOODS_RECEIPT'
  | 'PRODUCTION_RUN'
  | 'RECIPE_DEDUCTION'
  | 'MANUAL_ADJUSTMENT'
  | 'REVERSAL'
  | 'WASTE'
  | 'STOCK_TAKE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'OPENING';

export interface StockMovement {
  id: string;
  tick: number;
  itemId: string;
  locationId: string;
  qtyDelta: BaseUnits;
  costDeltaMinor: number;
  type: MovementType;
  sourceRef: string;
  reason?: string;
}

export interface StockLevel {
  itemId: string;
  locationId: string;
  qtyOnHand: BaseUnits;
  reorderPoint?: BaseUnits;
  parLevel?: BaseUnits;
}

export type ReservationStatus = 'RESERVED' | 'COMMITTED' | 'RELEASED' | 'REVERSED';

export interface Reservation {
  id: string;
  orderId: string;
  itemId: string;
  locationId: string;
  qty: BaseUnits;
  status: ReservationStatus;
  /** Cost pulled from layers at commit, so a reversal can restock at cost. */
  committedCostMinor: number;
  createdTick: number;
  updatedTick: number;
}

// ─── Orders (mirrors OOMOrder wire shape) ─────────────────────────────────────

export type OrderStatus =
  | 'draft'
  | 'scheduled'
  | 'created'
  | 'accepted'
  | 'complete'
  | 'cancelled'
  | 'venue_cancelled'
  | 'rejected'
  | 'refunded';

export interface OrderVariant {
  posId: string;
  quantity?: number;
}

export interface OrderOption {
  variants: OrderVariant[];
}

export interface OrderIncludedItem {
  posId: string;
  quantity: number;
  options?: OrderOption[];
}

export interface OrderBundledItem {
  posId?: string;
  includedItems: OrderIncludedItem[];
}

export interface OrderItem {
  posId: string;
  quantity: number;
  options?: OrderOption[];
  includedItems?: OrderIncludedItem[];
  bundledItems?: OrderBundledItem[];
}

export interface OrderEvent {
  id: string;
  locationId: string;
  status: OrderStatus;
  version: number;
  isTraining?: boolean;
  refundOf?: string;
  items: OrderItem[];
}

export interface Demand {
  itemId: string;
  locationId: string;
  qty: BaseUnits;
  sourceRef: string;
}

export type DepletionAction = 'RESERVE' | 'COMMIT' | 'RELEASE' | 'REVERSE' | 'IGNORE';

export type DepletionStateName = 'RESERVED' | 'COMMITTED' | 'RELEASED' | 'REVERSED';

export interface DepletionState {
  state: DepletionStateName;
  lastEventVersion: number;
}

// ─── Purchasing ───────────────────────────────────────────────────────────────

export type SupplierType = 'LIQUOR' | 'FOOD' | 'COFFEE';

export interface Supplier {
  id: string;
  name: string;
  type: SupplierType;
  /** Ticks from send to arrival at the dock. */
  leadTimeTicks: number;
  /** Demo colour hint. */
  colour?: string;
}

/** Draft → Sent → In transit → Received → Posted. In transit is a demo state; the real API has DRAFT, SENT, RECEIVED, POSTED. */
export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'IN_TRANSIT' | 'RECEIVED' | 'POSTED';

export interface PurchaseOrderLine {
  itemId: string;
  /** Purchase units ordered (cartons, bottles, bags). */
  orderedUnits: number;
  unitCostMinor: number;
  receivedUnits?: number;
  receivedUnitCostMinor?: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  locationId: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  createdTick: number;
  sentTick?: number;
  inTransitTick?: number;
  etaTick?: number;
  arrivedTick?: number;
  receivedTick?: number;
  postedTick?: number;
  /** Set when drafted by a par-level suggestion (Coming feature). */
  suggested?: boolean;
}

// ─── Production ───────────────────────────────────────────────────────────────

export type ProductionRunStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETE';

export interface ProductionRun {
  id: string;
  batchItemId: string;
  locationId: string;
  plannedQty: number;
  producedQty?: number;
  status: ProductionRunStatus;
  startedTick?: number;
  completeTick?: number;
  consumed: { itemId: string; qty: BaseUnits; costMinor: number }[];
  costMinor: number;
}

// ─── Stocktake ────────────────────────────────────────────────────────────────

export interface StocktakeLine {
  itemId: string;
  theoretical: BaseUnits;
  counted?: BaseUnits;
}

export interface Stocktake {
  id: string;
  locationId: string;
  status: 'OPEN' | 'POSTED';
  lines: StocktakeLine[];
  startedTick: number;
  postedTick?: number;
}

// ─── Venues ───────────────────────────────────────────────────────────────────

export interface Venue {
  id: string;
  name: string;
  shortName: string;
  character: string;
  /** World-view placement hint. The sim never reads it. */
  position: [number, number];
}
