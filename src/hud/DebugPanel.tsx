import { useMemo } from 'react';
import { FEATURES, featureStatusLabel, type FeatureId } from '../features';
import { SCENARIOS } from '../scenarios';
import { formatTick } from '../sim/clock';
import type { SimEvent } from '../sim/events';
import type { PurchaseOrderStatus, Venue } from '../sim/types';
import { useSim, type Speed } from '../store';
import { avgCost, baseQty, money, num, pct, purchaseQty } from './format';

const PO_STEPS: { key: PurchaseOrderStatus; label: string }[] = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'SENT', label: 'Sent' },
  { key: 'IN_TRANSIT', label: 'In transit' },
  { key: 'RECEIVED', label: 'Received' },
  { key: 'POSTED', label: 'Posted' },
];

export function DebugPanel() {
  const runner = useSim((s) => s.runner);
  const version = useSim((s) => s.version);
  const playing = useSim((s) => s.playing);
  const speed = useSim((s) => s.speed);
  const mode = useSim((s) => s.mode);
  const scenarioId = useSim((s) => s.scenarioId);
  const { setScenario, setMode, togglePlay, setSpeed, reset, stepTicks } = useSim.getState();
  const world = runner.world;
  void version;

  const latestCaption = useMemo(() => [...world.events.log].reverse().find((e) => e.type === 'caption'), [world, version]);
  const soldOut = world.soldOutCountByVenue();

  return (
    <div className="debug">
      <div className="debug-top">
        <h1>
          McOolio <span>Inventory Sim</span>
        </h1>
        <span className="clock">{formatTick(world.tick)}</span>
        <button className="btn" onClick={togglePlay}>
          {playing ? 'Pause' : runner.done ? 'Done' : 'Play'}
        </button>
        {([1, 4, 16] as Speed[]).map((s) => (
          <button key={s} className={`btn ghost ${speed === s ? 'on' : ''}`} onClick={() => setSpeed(s)}>
            {s}x
          </button>
        ))}
        <button className="btn ghost" onClick={() => stepTicks(1)}>
          +1 min
        </button>
        <button className="btn ghost" onClick={reset}>
          Reset
        </button>
        <select className="select" value={scenarioId} onChange={(e) => setScenario(e.target.value)}>
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.number}. {s.title}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className={`btn ghost ${mode === 'today' ? 'on' : ''}`} onClick={() => setMode('today')}>
            Today
          </button>
          <button className={`btn ghost ${mode === 'roadmap' ? 'on' : ''}`} onClick={() => setMode('roadmap')}>
            Where we're going
          </button>
        </div>
      </div>

      <div className="caption">
        {latestCaption?.type === 'caption' && latestCaption.featureId && <FeaturePill id={latestCaption.featureId} />}
        <span>{latestCaption?.type === 'caption' ? latestCaption.text : runner.scenario.strap}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 12 }}>{Math.round(runner.progress() * 100)}%</span>
      </div>

      <div className="grid">
        {world.catalogue.venueList().map((v) => (
          <VenueTable key={v.id} venue={v} />
        ))}
        <div className="card">
          <div className="kpis" style={{ marginBottom: 10 }}>
            <div className="kpi">
              <div className="label">Sold out</div>
              <div className="value">{soldOut.map((s) => `${world.catalogue.venues.get(s.locationId)?.shortName.slice(0, 1)}${s.count}`).join(' ')}</div>
            </div>
            <div className="kpi">
              <div className="label">Stock value</div>
              <div className="value">{money(world.stock.onHandValueMinor(), { compact: true })}</div>
            </div>
            <div className="kpi">
              <div className="label">GP % (demo)</div>
              <div className="value">{pct(world.grossProfitPct())}</div>
            </div>
            <div className="kpi">
              <div className="label">Open POs</div>
              <div className="value">{world.purchasing.open().length}</div>
            </div>
          </div>
          <h2>Purchase orders</h2>
          {world.purchasing.list().length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12 }}>None yet.</div>}
          {world.purchasing.list().map((po) => (
            <div key={po.id} style={{ marginBottom: 8, fontSize: 12 }}>
              <div>
                <strong>{po.number}</strong> {world.catalogue.suppliers.get(po.supplierId)?.name} to {world.catalogue.venues.get(po.locationId)?.shortName}{' '}
                {po.suggested && <FeaturePill id="par-levels-suggested-orders" />}
              </div>
              <div className="tracker">
                {PO_STEPS.map((s, i) => {
                  const idx = PO_STEPS.findIndex((x) => x.key === po.status);
                  return (
                    <span key={s.key} className={i < idx ? 'done' : i === idx ? 'now' : ''}>
                      {s.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          <h2 style={{ marginTop: 10 }}>Event feed</h2>
          <Feed events={world.events.log} />
        </div>
      </div>

      <div className="footer">
        <span>All prices, costs, volumes and venues are invented demo data.</span>
        <span>
          Seed {world.seed} · {world.events.count} events · {world.stock.movements.length} movements
        </span>
      </div>
    </div>
  );
}

function VenueTable({ venue }: { venue: Venue }) {
  const runner = useSim((s) => s.runner);
  const world = runner.world;
  const items = [...world.catalogue.items.values()].filter((i) => i.itemType !== 'NON_STOCKED' && world.stock.levels.has(`${i.id}@${venue.id}`));
  const heat = world.availability.venueHeat(venue.id);
  const soldOut = world.availability.soldOutProducts(venue.id);
  return (
    <div className="card">
      <h2>
        <span>
          {venue.name} <span className={`heat-${heat}`}>●</span>
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>{venue.character}</span>
      </h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Type</th>
            <th style={{ textAlign: 'right' }}>On hand</th>
            <th style={{ textAlign: 'right' }}>Avg cost</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const qty = world.stock.onHand(item.id, venue.id);
            const h = world.availability.itemHeat(item.id, venue.id);
            const pq = purchaseQty(qty, item);
            return (
              <tr key={item.id}>
                <td className={`heat-${h}`}>{item.name}</td>
                <td style={{ color: 'var(--muted)' }}>{item.itemType}</td>
                <td className="num">
                  {baseQty(qty, item)}
                  {pq && <div style={{ color: 'var(--muted)', fontSize: 11 }}>{pq}</div>}
                </td>
                <td className="num" style={{ fontSize: 11 }}>
                  {avgCost(world.stock.averageCostMinorPerUnit(item.id, venue.id), item)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 8, fontSize: 12 }}>
        <strong>Products:</strong>{' '}
        {[...world.catalogue.products.values()]
          .filter((p) => !p.isModifier)
          .map((p) => {
            const a = world.availability.of(p.posId, venue.id);
            const flagged = world.isFlaggedSoldOut(p.posId, venue.id);
            return (
              <span key={p.posId} className={a.soldOut ? 'heat-soldout' : ''} style={{ marginRight: 8 }}>
                {p.name} {num(a.servingsLeft)}
                {flagged ? ' 86' : ''}
              </span>
            );
          })}
        {soldOut.length > 0 && (
          <span style={{ color: 'var(--muted)' }}>
            {' '}
            · {soldOut.length} sold out {world.featurePlays('sold-out-flag') ? '(flagged on POS)' : '(warning only)'}
          </span>
        )}
      </div>
    </div>
  );
}

function Feed({ events }: { events: SimEvent[] }) {
  const runner = useSim((s) => s.runner);
  const world = runner.world;
  const name = (itemId: string) => world.catalogue.items.get(itemId)?.name ?? itemId;
  const venue = (id: string) => world.catalogue.venues.get(id)?.shortName ?? id;
  const rows = [...events].reverse().slice(0, 60);
  return (
    <div className="feed">
      {rows.map((e, i) => {
        const t = formatTick(e.tick).slice(4);
        switch (e.type) {
          case 'order':
            return (
              <div key={i} className={`feed-row ${e.action.toLowerCase()}`}>
                <span className="t">{t}</span>
                <span>
                  {venue(e.locationId)} {e.orderId} {e.action} {e.lines.join(' · ')} {e.action === 'COMMIT' ? money(e.revenueMinor) : ''}
                </span>
              </div>
            );
          case 'stock.hit_zero':
            return <Row key={i} t={t} cls="zero" text={`${venue(e.locationId)}: ${name(e.itemId)} hit zero`} />;
          case 'stock.deficit':
            return <Row key={i} t={t} cls="deficit" text={`${venue(e.locationId)}: ${name(e.itemId)} oversold, deficit recorded`} />;
          case 'stock.below_reorder':
            return <Row key={i} t={t} cls="reorder" text={`${venue(e.locationId)}: ${name(e.itemId)} below reorder point`} />;
          case 'po':
            return <Row key={i} t={t} cls="po" text={`${venue(e.locationId)} PO ${e.status.replace('_', ' ').toLowerCase()}${e.note ? `: ${e.note}` : ''}`} />;
          case 'production':
            return <Row key={i} t={t} cls="production" text={`${venue(e.locationId)}: production run ${e.phase}, ${e.qty} ${name(e.batchItemId)}`} />;
          case 'stocktake':
            return <Row key={i} t={t} cls="po" text={`${venue(e.locationId)}: stocktake ${e.phase}${e.varianceLines.length ? `, ${e.varianceLines.filter((v) => v.variance !== 0).length} variance` : ''}`} />;
          case 'waste':
            return <Row key={i} t={t} cls="ghost" text={`${venue(e.locationId)}: waste ${name(e.itemId)} (${e.reason})`} />;
          case 'transfer':
            return <Row key={i} t={t} cls="ghost" text={`Transfer ${name(e.itemId)} ${venue(e.fromLocationId)} to ${venue(e.toLocationId)}`} />;
          case 'recipe.activated':
            return <Row key={i} t={t} cls="ghost" text={`Recipe version activated: ${e.note ?? e.versionId}`} />;
          case 'sold_out':
            return <Row key={i} t={t} cls={e.on ? 'zero' : 'commit'} text={`${venue(e.locationId)}: ${world.catalogue.products.get(e.posId)?.name} ${e.on ? '86, off the POS' : 'back on'}`} />;
          case 'suggestion':
            return <Row key={i} t={t} cls="ghost" text={e.text} />;
          case 'caption':
            return <Row key={i} t={t} cls="caption" text={e.text} />;
        }
      })}
    </div>
  );
}

function Row({ t, cls, text }: { t: string; cls: string; text: string }) {
  return (
    <div className={`feed-row ${cls}`}>
      <span className="t">{t}</span>
      <span>{text}</span>
    </div>
  );
}

export function FeaturePill({ id }: { id: FeatureId }) {
  const f = FEATURES[id];
  return (
    <span className={`pill ${f.status}`} title={f.summary}>
      {featureStatusLabel(f.status)}
      {f.note ? ` · ${f.note}` : ''}
    </span>
  );
}
