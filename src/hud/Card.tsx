import { FEATURES, featureStatusLabel, type FeatureId } from '../features';
import { useWorld } from '../scene/useWorld';
import { toDecimal } from '../sim/baseunits';
import { formatDuration, formatTick } from '../sim/clock';
import type { InventoryItem, PurchaseOrder, Supplier, Venue } from '../sim/types';
import { useSim, type Selection } from '../store';
import { FeaturePill } from './DebugPanel';
import { avgCost, baseQty, money, num, purchaseQty } from './format';
import { Tracker } from './PoTracker';

export function Card() {
  const selection = useSim((s) => s.selection);
  const select = useSim((s) => s.select);
  if (!selection) return null;
  return (
    <div className="card hud-card">
      <button className="card-close" onClick={() => select(null)} aria-label="Close">
        ×
      </button>
      <CardBody selection={selection} />
    </div>
  );
}

function CardBody({ selection }: { selection: Selection }) {
  const world = useWorld();
  switch (selection.kind) {
    case 'item':
      return <ItemCard item={world.catalogue.item(selection.itemId)} venue={world.catalogue.venues.get(selection.venueId)!} />;
    case 'venue':
      return <VenueCard venue={world.catalogue.venues.get(selection.venueId)!} />;
    case 'supplier':
      return <SupplierCard supplier={world.catalogue.suppliers.get(selection.supplierId)!} />;
    case 'po':
      return <PoCard po={world.purchasing.get(selection.poId)} />;
    case 'feature':
      return <FeatureCard featureId={selection.featureId as FeatureId} />;
    case 'ticket':
      return <TicketCard orderId={selection.orderId} venueId={selection.venueId} />;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card-row">
      <span className="card-label">{label}</span>
      <span className="card-value">{children}</span>
    </div>
  );
}

function ItemCard({ item, venue }: { item: InventoryItem; venue: Venue }) {
  const world = useWorld();
  const lvl = world.stock.level(item.id, venue.id);
  const heat = world.availability.itemHeat(item.id, venue.id);
  const supplier = item.supplierId ? world.catalogue.suppliers.get(item.supplierId) : undefined;
  const lastIn = [...world.stock.movements].reverse().find((m) => m.itemId === item.id && m.locationId === venue.id && m.qtyDelta > 0 && m.type !== 'OPENING' && m.type !== 'REVERSAL');
  const openPo = world.purchasing.open(venue.id).find((po) => po.lines.some((l) => l.itemId === item.id));
  const products = world.catalogue.productsUsing(item.id, (id) => world.recipes.expandActive(id, venue.id));
  const recent = [...world.stock.movements].reverse().filter((m) => m.itemId === item.id && m.locationId === venue.id && m.type !== 'OPENING').slice(0, 5);
  const pq = purchaseQty(lvl.qtyOnHand, item);
  const flagged = products.filter((p) => world.isFlaggedSoldOut(p.posId, venue.id));
  return (
    <>
      <div className="card-head">
        <div>
          <div className="card-title">{item.name}</div>
          <div className="muted small">{venue.name}</div>
        </div>
        <span className={`pill type-${item.itemType.toLowerCase()}`}>{item.itemType}</span>
      </div>
      <div className="card-pills">
        <FeaturePill id="catalogue-item-types" />
        <span className={`pill heat heat-${heat}`}>{heat === 'soldout' ? (lvl.qtyOnHand < 0 ? 'Oversold' : 'Sold out') : heat === 'warning' ? 'Below reorder point' : 'Healthy'}</span>
      </div>
      <Row label="On hand">
        <strong>{baseQty(lvl.qtyOnHand, item)}</strong>
        {pq && <div className="muted small">{pq}</div>}
      </Row>
      {lvl.reorderPoint !== undefined && <Row label="Reorder point">{baseQty(lvl.reorderPoint, item)}</Row>}
      {lvl.parLevel !== undefined && (
        <Row label="Par level">
          {baseQty(lvl.parLevel, item)} <FeaturePill id="par-levels-suggested-orders" />
        </Row>
      )}
      <Row label="Average cost">{avgCost(world.stock.averageCostMinorPerUnit(item.id, venue.id), item)}</Row>
      <Row label="Last received">{lastIn ? `${formatTick(lastIn.tick)} · ${lastIn.type.replace('_', ' ').toLowerCase()}` : 'Opening stock'}</Row>
      <Row label="Open PO">{openPo ? `${openPo.number} · ${openPo.status.replace('_', ' ').toLowerCase()}` : 'None'}</Row>
      {supplier && <Row label="Supplier">{supplier.name}</Row>}
      {item.itemType === 'BATCH' && (
        <Row label="Made by">
          Production run <FeaturePill id="batch-production-backoffice" />
        </Row>
      )}
      {products.length > 0 && (
        <Row label="Sells as">
          {products.map((p) => {
            const a = world.availability.of(p.posId, venue.id);
            return (
              <div key={p.posId} className={a.soldOut ? 'heat-soldout' : ''}>
                {p.name} · {a.servingsLeft < 0 ? 'oversold' : `${num(a.servingsLeft)} left`}
                {flagged.includes(p) ? ' · 86' : ''}
              </div>
            );
          })}
        </Row>
      )}
      {recent.length > 0 && (
        <div className="card-section">
          <div className="card-label">Recent movements</div>
          {recent.map((m) => (
            <div key={m.id} className="mono small">
              {formatTick(m.tick).slice(4)} {m.qtyDelta > 0 ? '+' : ''}
              {num(toDecimal(m.qtyDelta), 1)} {m.type.replace('_', ' ').toLowerCase()}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function VenueCard({ venue }: { venue: Venue }) {
  const world = useWorld();
  const setCamera = useSim((s) => s.setCamera);
  const heat = world.availability.venueHeat(venue.id);
  const soldOut = world.availability.soldOutProducts(venue.id);
  return (
    <>
      <div className="card-head">
        <div>
          <div className="card-title">{venue.name}</div>
          <div className="muted small">{venue.character}</div>
        </div>
        <span className={`pill heat heat-${heat}`}>{heat === 'soldout' ? 'Sold out' : heat === 'warning' ? 'Reorder' : 'Healthy'}</span>
      </div>
      <Row label="Stock on hand">{money(world.stock.onHandValueMinor(venue.id))}</Row>
      <Row label="Open POs">{world.purchasing.open(venue.id).length}</Row>
      <Row label="Sold out">
        {soldOut.length === 0
          ? 'Nothing'
          : soldOut.map((a) => (
              <div key={a.posId} className="heat-soldout">
                {world.catalogue.product(a.posId).name}
                {world.isFlaggedSoldOut(a.posId, venue.id) ? ' · off the POS' : ' · warning only'}
              </div>
            ))}
      </Row>
      <button className="btn" onClick={() => setCamera({ view: 'venue', venueId: venue.id })}>
        Fly in
      </button>
    </>
  );
}

function SupplierCard({ supplier }: { supplier: Supplier }) {
  const world = useWorld();
  const items = [...world.catalogue.items.values()].filter((i) => i.supplierId === supplier.id);
  const open = world.purchasing.open().filter((p) => p.supplierId === supplier.id);
  return (
    <>
      <div className="card-head">
        <div>
          <div className="card-title">{supplier.name}</div>
          <div className="muted small">Supplier · {supplier.type.toLowerCase()}</div>
        </div>
        <FeaturePill id="suppliers" />
      </div>
      <Row label="Lead time">{formatDuration(supplier.leadTimeTicks)}</Row>
      <Row label="Supplies">{items.map((i) => i.name).join(', ')}</Row>
      <Row label="Open POs">{open.length ? open.map((p) => `${p.number} (${p.status.replace('_', ' ').toLowerCase()})`).join(', ') : 'None'}</Row>
    </>
  );
}

function PoCard({ po }: { po: PurchaseOrder }) {
  const world = useWorld();
  const supplier = world.catalogue.suppliers.get(po.supplierId);
  const venue = world.catalogue.venues.get(po.locationId);
  const short = po.lines.some((l) => l.receivedUnits !== undefined && l.receivedUnits < l.orderedUnits);
  return (
    <>
      <div className="card-head">
        <div>
          <div className="card-title">{po.number}</div>
          <div className="muted small">
            {supplier?.name} to {venue?.name}
          </div>
        </div>
        <FeaturePill id="purchase-orders" />
      </div>
      {po.suggested && (
        <div className="card-pills">
          <FeaturePill id="par-levels-suggested-orders" /> <span className="muted small">Drafted from par levels</span>
        </div>
      )}
      <Tracker po={po} />
      <div className="card-section">
        <table className="card-table">
          <thead>
            <tr>
              <th>Line</th>
              <th>Ordered</th>
              <th>Received</th>
              <th>Unit cost</th>
            </tr>
          </thead>
          <tbody>
            {po.lines.map((l) => (
              <tr key={l.itemId}>
                <td>{world.catalogue.item(l.itemId).name}</td>
                <td className="num">{l.orderedUnits}</td>
                <td className={`num ${l.receivedUnits !== undefined && l.receivedUnits < l.orderedUnits ? 'heat-warning' : ''}`}>{l.receivedUnits ?? '–'}</td>
                <td className="num">{money(l.receivedUnitCostMinor ?? l.unitCostMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Row label="Ordered">{money(world.purchasing.totalMinor(po))}</Row>
      {(po.status === 'RECEIVED' || po.status === 'POSTED') && <Row label="Received">{money(world.purchasing.totalMinor(po, true))}</Row>}
      {short && (
        <Row label="Short delivery">
          Credit note raised <FeaturePill id="credit-notes" />
        </Row>
      )}
      {po.etaTick !== undefined && po.status === 'IN_TRANSIT' && <Row label="Due">{formatTick(po.etaTick)}</Row>}
    </>
  );
}

function FeatureCard({ featureId }: { featureId: FeatureId }) {
  const f = FEATURES[featureId];
  const mode = useSim((s) => s.mode);
  const setMode = useSim((s) => s.setMode);
  const plays = f.status === 'live' || f.status === 'building' || mode === 'roadmap';
  return (
    <>
      <div className="card-head">
        <div>
          <div className="card-title">{f.name}</div>
          <div className="muted small">{f.epic}</div>
        </div>
        <FeaturePill id={featureId} />
      </div>
      <div className="card-section">
        <div className="card-label">{f.status === 'coming' || f.status === 'later' ? 'What it will do' : 'What it does'}</div>
        <p>{f.summary}</p>
      </div>
      <Row label="Status">{featureStatusLabel(f.status)}{f.note ? `, ${f.note}` : ''}</Row>
      {!plays && (
        <div className="card-section">
          <p className="muted small">In Today mode this stays ghosted and never pretends to work.</p>
          <button className="btn" onClick={() => setMode('roadmap')}>
            Show in Where we're going
          </button>
        </div>
      )}
    </>
  );
}

function TicketCard({ orderId, venueId }: { orderId: string; venueId: string }) {
  const world = useWorld();
  const events = world.events.log.filter((e) => e.type === 'order' && e.orderId === orderId);
  const latest = events.at(-1);
  const venue = world.catalogue.venues.get(venueId);
  if (!latest || latest.type !== 'order') return <div className="muted">Ticket gone.</div>;
  const commit = events.find((e) => e.type === 'order' && e.action === 'COMMIT');
  const demands = commit?.type === 'order' ? commit.demands : latest.demands;
  const rows = world.stock.reservationsFor(orderId);
  return (
    <>
      <div className="card-head">
        <div>
          <div className="card-title">Order {orderId}</div>
          <div className="muted small">
            {venue?.name} · {formatTick(latest.tick)}
          </div>
        </div>
        <FeaturePill id="depletion-engine" />
      </div>
      <Row label="Lines">
        {latest.lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </Row>
      <Row label="Lifecycle">
        {events.map((e) => (e.type === 'order' ? `${e.status} → ${e.action}` : '')).join(', ')}
      </Row>
      <div className="card-section">
        <div className="card-label">Depletes</div>
        {demands.map((d) => {
          const item = world.catalogue.item(d.itemId);
          const row = rows.find((r) => r.itemId === d.itemId);
          return (
            <div key={d.itemId} className="card-row">
              <span>{item.name}</span>
              <span className="mono">
                {baseQty(d.qty, item)} {row ? <span className="pill demo">{row.status}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
      {latest.revenueMinor !== 0 && <Row label="Revenue">{money(Math.abs(latest.revenueMinor))}</Row>}
    </>
  );
}
