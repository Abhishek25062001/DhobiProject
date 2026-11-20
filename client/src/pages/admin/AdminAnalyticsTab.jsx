import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Loader2, Users, Eye, Clock, MousePointerClick, ShoppingCart, CreditCard, TrendingUp, Repeat, Radio, AlertCircle, Search, ArrowRight } from 'lucide-react';
import { adminService } from '../../services/api';

const RANGES = [{ days: 1, label: 'Today' }, { days: 7, label: '7 days' }, { days: 30, label: '30 days' }, { days: 90, label: '90 days' }];
const SECTIONS = [
  { id: 'overview', label: 'Visitors' },
  { id: 'behaviour', label: 'Behaviour' },
  { id: 'cart', label: 'Cart & Conversion' },
  { id: 'journeys', label: 'Journeys' },
  { id: 'retention', label: 'Retention' },
  { id: 'live', label: 'Live' },
];
const TREND_METRICS = [
  { key: 'visitors', label: 'Visitors' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'pageViews', label: 'Page views' },
  { key: 'carts', label: 'Sessions with a bag' },
  { key: 'orders', label: 'Orders' },
  { key: 'revenue', label: 'Revenue (₹)' },
];

const num = value => Number(value || 0).toLocaleString('en-IN');
const rupees = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const duration = seconds => {
  const s = Math.round(seconds || 0);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
};
const label = value => (value ? String(value).replace(/_/g, ' ') : '—');

function Card({ title, subtitle, children, className = '' }) {
  return (
    <section className={`bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs ${className}`}>
      {title && <header className="mb-4"><h3 className="text-sm font-black text-slate-900">{title}</h3>{subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}</header>}
      {children}
    </section>
  );
}

function Stat({ icon: Icon, label: name, value, hint }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}{name}</div>
      <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function Table({ columns, rows, empty = 'No data in this period yet.' }) {
  if (!rows?.length) return <p className="text-sm text-slate-500 py-6 text-center">{empty}</p>;
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
            {columns.map(col => <th key={col.key} className={`py-2 px-2 font-bold ${col.align === 'right' ? 'text-right' : ''}`}>{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-slate-50 last:border-0">
              {columns.map(col => <td key={col.key} className={`py-2 px-2 text-slate-700 ${col.align === 'right' ? 'text-right tabular-nums' : ''}`}>{col.render ? col.render(row) : row[col.key] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Single-series daily bar chart with per-bar hover tooltip.
function TrendChart({ data, metric }) {
  const [hover, setHover] = useState(null);
  const values = data.map(day => Number(day[metric.key]) || 0);
  const max = Math.max(1, ...values);
  const format = metric.key === 'revenue' ? rupees : num;
  if (!data.length) return null;
  return (
    <div>
      <div className="relative h-48 flex items-end gap-[2px] border-b border-slate-200" role="img" aria-label={`${metric.label} per day`} onMouseLeave={() => setHover(null)}>
        {data.map((day, index) => (
          <div key={day.date} className="flex-1 h-full flex items-end cursor-default" onMouseEnter={() => setHover(index)} onFocus={() => setHover(index)} tabIndex={0}>
            <div className={`w-full rounded-t-[4px] transition-colors ${hover === index ? 'bg-primary-700' : 'bg-primary-500'}`} style={{ height: `${(values[index] / max) * 100}%`, minHeight: values[index] ? 2 : 0 }} />
          </div>
        ))}
        {hover !== null && (
          <div className="absolute -top-2 pointer-events-none bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-lg" style={{ left: `clamp(0px, calc(${((hover + 0.5) / data.length) * 100}% - 60px), calc(100% - 120px))` }}>
            <div className="font-bold">{data[hover].date}</div>
            <div>{metric.label}: {format(values[hover])}</div>
          </div>
        )}
      </div>
      <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
        <span>{data[0].date}</span><span>Peak {format(max)}</span><span>{data[data.length - 1].date}</span>
      </div>
    </div>
  );
}

function Funnel({ steps }) {
  const top = Math.max(1, steps[0]?.sessions || 0);
  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div key={step.step} title={`${step.step}: ${num(step.sessions)} sessions (${step.ofTotal}% of visits)`}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-bold text-slate-800">{step.step}</span>
            <span className="text-slate-600 tabular-nums">{num(step.sessions)} · {step.ofTotal}%{index > 0 && <span className="text-slate-400"> ({step.ofPrevious}% of previous)</span>}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-600 rounded-full" style={{ width: `${(step.sessions / top) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RetentionGrid({ cohorts }) {
  const weeks = Math.max(0, ...cohorts.map(row => row.weeks.length));
  if (!cohorts.some(row => row.visitors)) return <p className="text-sm text-slate-500 py-6 text-center">Retention appears once visitors return in later weeks.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full">
        <thead><tr className="text-slate-500"><th className="text-left p-2">First visit week</th><th className="text-right p-2">Visitors</th>{Array.from({ length: weeks }, (_, i) => <th key={i} className="p-2 text-center">Wk {i}</th>)}</tr></thead>
        <tbody>
          {cohorts.map(row => (
            <tr key={row.cohort}>
              <td className="p-2 font-semibold text-slate-700 whitespace-nowrap">{row.cohort}</td>
              <td className="p-2 text-right tabular-nums">{num(row.visitors)}</td>
              {Array.from({ length: weeks }, (_, i) => {
                const value = row.weeks[i];
                if (value === undefined) return <td key={i} />;
                const shade = Math.min(1, value / 100);
                return <td key={i} className="p-0.5"><div title={`${value}% of ${row.cohort} visitors active in week ${i}`} className={`rounded-md py-1.5 text-center tabular-nums ${shade > 0.45 ? 'text-white' : 'text-slate-800'}`} style={{ background: value ? `rgba(37, 99, 235, ${0.08 + shade * 0.85})` : '#f1f5f9' }}>{row.visitors ? `${value}%` : '—'}</div></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAnalyticsTab() {
  const [days, setDays] = useState(30);
  const [section, setSection] = useState('overview');
  const [metric, setMetric] = useState(TREND_METRICS[0]);
  const [report, setReport] = useState(null);
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reportRes, liveRes] = await Promise.all([adminService.getAnalyticsReport({ days }), adminService.getAnalyticsLive()]);
      setReport(reportRes.report);
      setLive(liveRes.live);
    } catch (err) {
      setError(err.response?.data?.message || 'Analytics could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  // Live visitors refresh every 15 seconds while the Live section is open.
  useEffect(() => {
    if (section !== 'live') return undefined;
    const timer = window.setInterval(() => adminService.getAnalyticsLive().then(res => setLive(res.live)).catch(() => {}), 15000);
    return () => window.clearInterval(timer);
  }, [section]);

  const o = report?.overview || {};
  const c = report?.cart || {};
  const orders = report?.orders || {};

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Website Analytics</h2>
          <p className="text-xs text-slate-500">Visitors, behaviour, laundry-bag activity and conversions. First-party data stored in your database; no personal details are collected.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{num(live?.activeVisitors)} online now</span>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden" role="group" aria-label="Date range">
            {RANGES.map(range => <button key={range.days} type="button" aria-pressed={days === range.days} onClick={() => setDays(range.days)} className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${days === range.days ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{range.label}</button>)}
          </div>
          <button type="button" onClick={load} className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer" title="Refresh analytics" data-track-ignore>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Analytics sections">
        {SECTIONS.map(item => <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap cursor-pointer ${section === item.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{item.label}</button>)}
      </nav>

      {error && <div role="alert" className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 text-red-800 text-sm"><AlertCircle className="w-4 h-4" />{error}<button type="button" onClick={load} className="underline font-bold ml-2">Retry</button></div>}
      {!report && loading && <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>}

      {report && section === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={Users} label="Unique visitors" value={num(o.visitors)} hint={`${num(o.newVisitors)} new · ${num(o.returningVisitors)} returning`} />
            <Stat icon={Eye} label="Page views" value={num(o.pageViews)} hint={`${o.pagesPerSession} pages / session`} />
            <Stat icon={Clock} label="Avg. session" value={duration(o.avgSessionSeconds)} hint={`${num(o.sessions)} sessions · bounce ${o.bounceRate}%`} />
            <Stat icon={TrendingUp} label="Visit → order" value={`${c.sessionConversionRate}%`} hint={`${num(orders.orders)} orders · ${rupees(orders.revenue)}`} />
            <Stat icon={Users} label="Signed-in visitors" value={num(o.loggedInVisitors)} hint={`${o.visitors ? Math.round((o.loggedInVisitors / o.visitors) * 100) : 0}% of visitors identified`} />
            <Stat icon={Repeat} label="Daily / monthly active" value={`${num(report.engagement.dau)} / ${num(report.engagement.mau)}`} hint={`Stickiness ${report.engagement.stickiness}% · WAU ${num(report.engagement.wau)}`} />
            <Stat icon={Repeat} label="Sessions per visitor" value={o.sessionsPerVisitor} />
            <Stat icon={CreditCard} label="Avg. order value" value={rupees(orders.avgOrderValue)} hint={`${num(orders.paidOrders)} paid · ${orders.onlineShare}% online`} />
          </div>
          <Card title="Daily trend" subtitle={`Days in ${report.range.timezone}`}>
            <div className="flex gap-1.5 flex-wrap mb-4" role="group" aria-label="Trend metric">
              {TREND_METRICS.map(item => <button key={item.key} type="button" aria-pressed={metric.key === item.key} onClick={() => setMetric(item)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${metric.key === item.key ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-slate-500 border border-transparent hover:bg-slate-50'}`}>{item.label}</button>)}
            </div>
            <TrendChart data={report.trend} metric={metric} />
          </Card>
          <div className="grid lg:grid-cols-2 gap-5">
            <Card title="Traffic sources" subtitle="Referring website of each session">
              <Table rows={report.acquisition.referrers} columns={[{ key: 'key', label: 'Source' }, { key: 'sessions', label: 'Sessions', align: 'right', render: r => num(r.sessions) }, { key: 'conversions', label: 'Orders', align: 'right' }]} />
            </Card>
            <Card title="Campaigns" subtitle="From utm_source / utm_campaign links">
              <Table rows={report.acquisition.campaigns} columns={[{ key: 'key', label: 'Campaign' }, { key: 'sessions', label: 'Sessions', align: 'right', render: r => num(r.sessions) }, { key: 'conversions', label: 'Orders', align: 'right' }]} />
            </Card>
            <Card title="Devices">
              <Table rows={report.acquisition.devices} columns={[{ key: 'key', label: 'Device', render: r => label(r.key) }, { key: 'sessions', label: 'Sessions', align: 'right', render: r => num(r.sessions) }, { key: 'conversions', label: 'Orders', align: 'right' }]} />
            </Card>
            <Card title="Browsers">
              <Table rows={report.acquisition.browsers} columns={[{ key: 'key', label: 'Browser' }, { key: 'sessions', label: 'Sessions', align: 'right', render: r => num(r.sessions) }, { key: 'conversions', label: 'Orders', align: 'right' }]} />
            </Card>
          </div>
        </>
      )}

      {report && section === 'behaviour' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card title="Screens viewed" subtitle="Engaged time counts only while the tab is visible and in use" className="lg:col-span-2">
            <Table rows={report.pages} columns={[{ key: 'path', label: 'Screen' }, { key: 'views', label: 'Views', align: 'right', render: r => num(r.views) }, { key: 'visitors', label: 'Visitors', align: 'right', render: r => num(r.visitors) }, { key: 'avgSeconds', label: 'Avg. time', align: 'right', render: r => duration(r.avgSeconds) }, { key: 'avgScrollDepth', label: 'Avg. scroll', align: 'right', render: r => `${r.avgScrollDepth}%` }, { key: 'totalMinutes', label: 'Total time', align: 'right', render: r => `${num(r.totalMinutes)} min` }]} />
          </Card>
          <Card title="Top searches" subtitle="What customers type in the garment search">
            <Table rows={report.behaviour.searches} columns={[{ key: 'query', label: 'Search' }, { key: 'searches', label: 'Searches', align: 'right' }, { key: 'visitors', label: 'Visitors', align: 'right' }, { key: 'avgResults', label: 'Avg. results', align: 'right' }]} />
          </Card>
          <Card title="Searches with no results" subtitle="Garments customers want but cannot find">
            <Table rows={report.behaviour.zeroResultSearches} empty="Every search returned results." columns={[{ key: 'query', label: 'Search', render: r => <span className="inline-flex items-center gap-1.5"><Search className="w-3 h-3 text-amber-600" aria-hidden="true" />{r.query}</span> }, { key: 'searches', label: 'Searches', align: 'right' }]} />
          </Card>
          <Card title="Most clicked buttons & links" className="lg:col-span-2">
            <Table rows={report.behaviour.clicks} columns={[{ key: 'label', label: 'Button / link', render: r => <span className="inline-flex items-center gap-1.5"><MousePointerClick className="w-3 h-3 text-slate-400" aria-hidden="true" />{r.label}</span> }, { key: 'path', label: 'Screen' }, { key: 'clicks', label: 'Clicks', align: 'right', render: r => num(r.clicks) }, { key: 'visitors', label: 'Visitors', align: 'right', render: r => num(r.visitors) }]} />
          </Card>
          <Card title="Category filters used">
            <Table rows={report.behaviour.filters} columns={[{ key: 'value', label: 'Category' }, { key: 'uses', label: 'Uses', align: 'right' }]} />
          </Card>
          <Card title="Entry & exit screens">
            <Table rows={report.acquisition.entryPages.map((row, index) => ({ entry: row.key, entrySessions: row.sessions, exit: report.acquisition.exitPages[index]?.key, exitSessions: report.acquisition.exitPages[index]?.sessions }))} columns={[{ key: 'entry', label: 'Landed on' }, { key: 'entrySessions', label: 'Sessions', align: 'right' }, { key: 'exit', label: 'Left from' }, { key: 'exitSessions', label: 'Sessions', align: 'right' }]} />
          </Card>
        </div>
      )}

      {report && section === 'cart' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={ShoppingCart} label="Sessions with a bag" value={num(c.sessionsWithCart)} hint={`Avg. ${rupees(c.avgCartValue)} · ${c.avgCartItems} pieces`} />
            <Stat icon={ShoppingCart} label="Bag abandonment" value={`${c.cartAbandonmentRate}%`} hint={`${num(c.abandonedCarts)} bags · ${rupees(c.abandonedCartValue)} left behind`} />
            <Stat icon={CreditCard} label="Checkout abandonment" value={`${c.checkoutAbandonmentRate}%`} hint={`${num(c.abandonedCheckouts)} checkouts not completed`} />
            <Stat icon={TrendingUp} label="Bag → order" value={`${c.cartToOrderRate}%`} hint={`Visit → order ${c.sessionConversionRate}%`} />
            <Stat label="Pieces added / removed" value={`${num(c.events.unitsAdded)} / ${num(c.events.unitsRemoved)}`} hint={`${num(c.events.addEvents)} adds · ${num(c.events.removeEvents)} removals`} />
            <Stat label="Checkouts started" value={num(c.events.checkoutStarts)} hint={`${num(c.events.placeOrderClicks)} "place order" clicks · ${num(c.events.loginWalls)} asked to log in`} />
            <Stat label="Orders placed" value={num(orders.orders)} hint={`${rupees(orders.revenue)} · ${num(orders.cancelledOrders)} cancelled`} />
            <Stat label="Online payments" value={`${num(c.events.paymentOpened)} opened`} hint={`${num(c.events.paymentDismissed)} closed · ${num(orders.paidOrders)} paid · ${num(c.events.orderFailures)} order errors`} />
          </div>
          <div className="grid lg:grid-cols-5 gap-5">
            <Card title="Conversion funnel" subtitle="Share of sessions reaching each step" className="lg:col-span-2">
              <Funnel steps={c.funnel} />
            </Card>
            <Card title="Garments: views, bag adds and removals" className="lg:col-span-3">
              <Table rows={report.products} columns={[{ key: 'name', label: 'Garment' }, { key: 'views', label: 'Views', align: 'right', render: r => num(r.views) }, { key: 'unitsAdded', label: 'Added', align: 'right', render: r => num(r.unitsAdded) }, { key: 'unitsRemoved', label: 'Removed', align: 'right', render: r => num(r.unitsRemoved) }, { key: 'viewToCartRate', label: 'View → bag', align: 'right', render: r => `${r.viewToCartRate}%` }, { key: 'valueAdded', label: 'Value added', align: 'right', render: r => rupees(r.valueAdded) }]} />
            </Card>
          </div>
        </>
      )}

      {report && section === 'journeys' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card title="Most common journeys" subtitle="First five screens of each session" className="lg:col-span-2">
            <Table rows={report.journeys.paths} columns={[{ key: 'steps', label: 'Journey', render: r => <span className="inline-flex flex-wrap items-center gap-1">{r.steps.map((step, i) => <React.Fragment key={i}>{i > 0 && <ArrowRight className="w-3 h-3 text-slate-400" aria-hidden="true" />}<span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-xs font-mono">{step}</span></React.Fragment>)}</span> }, { key: 'sessions', label: 'Sessions', align: 'right', render: r => num(r.sessions) }, { key: 'conversions', label: 'Ordered', align: 'right' }]} />
          </Card>
          <Card title="Screen-to-screen navigation" subtitle="Where visitors go next" className="lg:col-span-2">
            <Table rows={report.journeys.transitions} columns={[{ key: 'from', label: 'From' }, { key: 'to', label: 'To' }, { key: 'count', label: 'Times', align: 'right', render: r => num(r.count) }]} />
          </Card>
        </div>
      )}

      {report && section === 'retention' && (
        <Card title="Weekly retention" subtitle="Share of each week's new visitors who came back in the following weeks">
          <RetentionGrid cohorts={report.retention} />
        </Card>
      )}

      {section === 'live' && live && (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card title="Active in the last 5 minutes">
            <div className="text-4xl font-black text-slate-900 mb-3 tabular-nums">{num(live.activeVisitors)}</div>
            <Table rows={live.activePages} empty="Nobody is on the website right now." columns={[{ key: 'path', label: 'Screen' }, { key: 'visitors', label: 'Visitors', align: 'right' }]} />
          </Card>
          <Card title="Latest events" subtitle="Refreshes every 15 seconds" className="lg:col-span-2">
            <Table rows={live.recentEvents} empty="No events recorded yet." columns={[
              { key: 'ts', label: 'Time', render: r => new Date(r.ts).toLocaleTimeString('en-IN') },
              { key: 'name', label: 'Event', render: r => <span className="inline-flex items-center gap-1.5">{r.source === 'server' && <Radio className="w-3 h-3 text-emerald-600" aria-label="Recorded by server" />}{label(r.name)}</span> },
              { key: 'path', label: 'Screen' },
              { key: 'detail', label: 'Detail', render: r => <span className="text-xs text-slate-500">{r.props?.productName || r.props?.label || r.props?.query || (r.props?.value ? rupees(r.props.value) : '') || r.props?.stepName || ''}</span> },
              { key: 'visitorId', label: 'Visitor', render: r => <span className="font-mono text-xs">{r.visitorId || '—'}{r.userId ? ' · signed in' : ''}</span> },
            ]} />
          </Card>
        </div>
      )}
    </div>
  );
}
