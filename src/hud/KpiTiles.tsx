import { useWorld } from '../scene/useWorld';
import { money, pct } from './format';

export function KpiTiles() {
  const world = useWorld();
  const soldOut = world.soldOutCountByVenue();
  const totalSoldOut = soldOut.reduce((s, x) => s + x.count, 0);
  return (
    <div className="kpis kpis-hud">
      <div className={`kpi ${totalSoldOut > 0 ? 'kpi-alert' : ''}`}>
        <div className="label">Items sold out</div>
        <div className="value">{totalSoldOut}</div>
        <div className="sub">
          {soldOut.map((s) => (
            <span key={s.locationId} className={s.count > 0 ? 'heat-soldout' : ''}>
              {world.catalogue.venues.get(s.locationId)?.shortName} {s.count}
            </span>
          ))}
        </div>
      </div>
      <div className="kpi">
        <div className="label">Stock on hand</div>
        <div className="value">{money(world.stock.onHandValueMinor(), { compact: true })}</div>
        <div className="sub">at average cost</div>
      </div>
      <div className="kpi">
        <div className="label">Gross profit</div>
        <div className="value">{pct(world.grossProfitPct())}</div>
        <div className="sub">
          <span className="pill demo">demo</span> {money(world.revenueMinor, { compact: true })} sold
        </div>
      </div>
      <div className="kpi">
        <div className="label">Open POs</div>
        <div className="value">{world.purchasing.open().length}</div>
        <div className="sub">{world.purchasing.list().filter((p) => p.status === 'POSTED').length} posted</div>
      </div>
    </div>
  );
}
