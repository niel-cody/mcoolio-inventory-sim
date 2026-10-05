import { useWorld } from '../scene/useWorld';
import { formatTick } from '../sim/clock';
import type { PurchaseOrder, PurchaseOrderStatus } from '../sim/types';
import { useSim } from '../store';
import { FeaturePill } from './DebugPanel';
import { money } from './format';

export const PO_STEPS: { key: PurchaseOrderStatus; label: string; tick: (po: PurchaseOrder) => number | undefined }[] = [
  { key: 'DRAFT', label: 'Draft', tick: (po) => po.createdTick },
  { key: 'SENT', label: 'Sent', tick: (po) => po.sentTick },
  { key: 'IN_TRANSIT', label: 'In transit', tick: (po) => po.inTransitTick },
  { key: 'RECEIVED', label: 'Received', tick: (po) => po.receivedTick },
  { key: 'POSTED', label: 'Posted', tick: (po) => po.postedTick },
];

export function Tracker({ po }: { po: PurchaseOrder }) {
  const world = useWorld();
  const idx = PO_STEPS.findIndex((s) => s.key === po.status);
  const arrived = world.purchasing.hasArrived(po);
  return (
    <div className="tracker big">
      {PO_STEPS.map((s, i) => {
        const cls = i < idx ? 'done' : i === idx ? 'now' : '';
        const t = s.tick(po);
        return (
          <div key={s.key} className={`tracker-step ${cls}`}>
            <div className="tracker-dot" />
            <div className="tracker-label">
              {s.label}
              {s.key === 'IN_TRANSIT' && i === idx && arrived ? ' · at the dock' : ''}
            </div>
            <div className="tracker-time">{t !== undefined && (i <= idx || s.key === 'IN_TRANSIT') ? formatTick(t).slice(4) : ''}</div>
          </div>
        );
      })}
    </div>
  );
}

export function PoTracker() {
  const world = useWorld();
  const selection = useSim((s) => s.selection);
  const select = useSim((s) => s.select);
  const all = world.purchasing.list();
  const selected = selection?.kind === 'po' ? world.purchasing.orders.get(selection.poId) : undefined;
  const po = selected ?? world.purchasing.open().at(-1) ?? all.at(-1);
  if (!po) {
    return (
      <div className="panel po-panel">
        <div className="panel-title">
          Ordering cycle <FeaturePill id="purchase-orders" />
        </div>
        <div className="muted">No purchase orders yet. Draft, sent, in transit, received, posted.</div>
      </div>
    );
  }
  const supplier = world.catalogue.suppliers.get(po.supplierId);
  const venue = world.catalogue.venues.get(po.locationId);
  return (
    <div className="panel po-panel" onClick={() => select({ kind: 'po', poId: po.id })}>
      <div className="panel-title">
        <span>
          {po.number} · {supplier?.name} to {venue?.shortName}
        </span>
        <span>
          {po.suggested && <FeaturePill id="par-levels-suggested-orders" />} <FeaturePill id="purchase-orders" />
        </span>
      </div>
      <Tracker po={po} />
      <div className="muted small">
        {po.lines.map((l) => `${l.orderedUnits} × ${world.catalogue.item(l.itemId).name}`).join(', ')} · {money(world.purchasing.totalMinor(po))}
        {po.status === 'RECEIVED' || po.status === 'POSTED' ? ` · received ${money(world.purchasing.totalMinor(po, true))}` : ''}
      </div>
    </div>
  );
}
