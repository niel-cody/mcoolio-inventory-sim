import type { ExpandedLine, Recipe, RecipeLine, RecipeVersion } from './types';

/**
 * Recipes are versioned, one active version per item. Mirrors
 * /recipes/{id}/versions and /recipes/{id}/versions/{vid}/activate.
 * Expansion returns leaf lines per ONE unit of the parent, which is what
 * ExpandActiveRecipeByItem hands the depletion engine.
 */
export class RecipeBook {
  readonly recipes = new Map<string, Recipe>();
  /** "No X" modifier posId -> ingredient item ids it suppresses. */
  readonly removals = new Map<string, string[]>();
  /**
   * Per-location active version overrides. The real service activates a version
   * for the org; scoping a swap to one venue is the Coming ingredient-swap idea,
   * so this map is only ever written by a Coming feature in Roadmap mode.
   */
  readonly locationOverrides = new Map<string, string>(); // `${itemId}@${locationId}` -> versionId
  private seq = 0;

  define(itemId: string, lines: RecipeLine[], opts: { yieldQty?: number; note?: string } = {}): RecipeVersion {
    const existing = this.recipes.get(itemId);
    const version: RecipeVersion = {
      id: `${itemId}:v${(existing?.versions.length ?? 0) + 1}`,
      version: (existing?.versions.length ?? 0) + 1,
      yieldQty: opts.yieldQty ?? 1,
      lines: lines.map((l) => ({ ...l })),
      note: opts.note,
    };
    if (existing) {
      existing.versions.push(version);
    } else {
      this.recipes.set(itemId, { itemId, versions: [version], activeVersionId: version.id });
    }
    this.seq += 1;
    return version;
  }

  /** Adds a version without activating it (a draft change). */
  addVersion(itemId: string, lines: RecipeLine[], opts: { yieldQty?: number; note?: string } = {}): RecipeVersion {
    if (!this.recipes.has(itemId)) throw new Error(`no recipe for ${itemId}`);
    return this.define(itemId, lines, opts);
  }

  activate(itemId: string, versionId: string): void {
    const r = this.recipes.get(itemId);
    if (!r) throw new Error(`no recipe for ${itemId}`);
    if (!r.versions.some((v) => v.id === versionId)) throw new Error(`no version ${versionId} on ${itemId}`);
    r.activeVersionId = versionId;
  }

  /** Activate a version at one location only (Coming: ingredient swap). */
  activateAt(itemId: string, versionId: string, locationId: string): void {
    const r = this.recipes.get(itemId);
    if (!r) throw new Error(`no recipe for ${itemId}`);
    if (!r.versions.some((v) => v.id === versionId)) throw new Error(`no version ${versionId} on ${itemId}`);
    this.locationOverrides.set(`${itemId}@${locationId}`, versionId);
  }

  active(itemId: string, locationId?: string): RecipeVersion | undefined {
    const r = this.recipes.get(itemId);
    if (!r) return undefined;
    const override = locationId ? this.locationOverrides.get(`${itemId}@${locationId}`) : undefined;
    const id = override ?? r.activeVersionId;
    return r.versions.find((v) => v.id === id);
  }

  /** Leaf lines per one unit of output. Undefined when the item has no recipe. */
  expandActive(itemId: string, locationId?: string): ExpandedLine[] | undefined {
    const v = this.active(itemId, locationId);
    if (!v) return undefined;
    return v.lines.map((l) => ({ ingredientItemId: l.ingredientItemId, effectiveQty: l.qty / v.yieldQty }));
  }

  /** Full-batch lines for a production run of `batches` batches. */
  batchLines(itemId: string, producedQty: number): { ingredientItemId: string; qty: number }[] {
    const v = this.active(itemId);
    if (!v) throw new Error(`no recipe for batch item ${itemId}`);
    const scale = producedQty / v.yieldQty;
    return v.lines.map((l) => ({ ingredientItemId: l.ingredientItemId, qty: l.qty * scale }));
  }

  defineRemoval(modifierPosId: string, ingredientItemIds: string[]): void {
    this.removals.set(modifierPosId, ingredientItemIds);
  }

  resolveRemovals(modifierPosIds: string[]): Set<string> {
    const set = new Set<string>();
    for (const id of modifierPosIds) {
      for (const ing of this.removals.get(id) ?? []) set.add(ing);
    }
    return set;
  }
}
