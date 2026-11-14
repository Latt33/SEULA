import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BellRing } from 'lucide-react';
import { Cite, Page, PageHeader } from '../components/ui';
import { NATIONAL, PATHWAY, REGIONS } from '../data/regions';

type Metric = 'insufficient' | 'feesHindered';
const META: Record<Metric, { label: string; desc: string }> = {
  insufficient: { label: 'Too few doctor services for need', desc: '% of residents who felt they received insufficient doctor services relative to their need (2024)' },
  feesHindered: { label: 'Client fees hindered use', desc: '% of health-service users for whom client fees hindered use of services (2024)' },
};

export function Region() {
  const [metric, setMetric] = useState<Metric>('insufficient');
  const [hover, setHover] = useState<string | null>(null);
  const sorted = useMemo(() => [...REGIONS].sort((a, b) => b[metric] - a[metric]), [metric]);
  const max = Math.max(...REGIONS.map((r) => r[metric])) * 1.1;
  const nat = NATIONAL[metric];
  const top3 = sorted.slice(0, 3).map((r) => r.short);

  return (
    <Page>
      <PageHeader eyebrow="For the wellbeing services county · decision-maker view" title="Where the gap is, and where to start.">
        Access to a doctor is the first gate on the cancer pathway. It is uneven: the share of residents who feel underserved ranges from {Math.min(...REGIONS.map((r) => r.insufficient))}% to {Math.max(...REGIONS.map((r) => r.insufficient))}% between counties.
      </PageHeader>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 mb-10">
        <div className="card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <p className="font-semibold">{META[metric].label}</p>
            <div className="flex text-xs rounded-lg border border-line overflow-hidden">
              {(Object.keys(META) as Metric[]).map((m) => (
                <button key={m} onClick={() => setMetric(m)} className={`px-3 py-1.5 ${metric === m ? 'bg-muted font-semibold' : 'bg-white'}`}>{m === 'insufficient' ? 'Doctor access' : 'Fee barrier'}</button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{META[metric].desc} · <Cite k="terveSuomi" /></p>
          <div className="relative">
            <div className="absolute top-0 bottom-0 border-l border-dashed border-foreground/40 z-10" style={{ left: `calc(132px + (100% - 132px - 40px) * ${nat / max})` }}>
              <span className="absolute -top-4 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">Finland {nat}%</span>
            </div>
            <div className="space-y-[3px] pt-3">
              {sorted.map((r) => {
                const isTop = top3.includes(r.short);
                return (
                  <div key={r.short} className="flex items-center gap-2 text-xs group" onMouseEnter={() => setHover(r.short)} onMouseLeave={() => setHover(null)}>
                    <span className={`w-[124px] shrink-0 text-right truncate ${isTop ? 'font-semibold' : 'text-muted-foreground'}`}>{r.short}</span>
                    <div className="flex-1 h-[14px] relative">
                      <div className="h-full rounded-r-[4px] transition-colors" style={{ width: `${(r[metric] / max) * 100}%`, background: isTop ? 'var(--primary)' : hover === r.short ? '#2f6fb5' : '#9fb7d6' }} />
                    </div>
                    <span className="w-8 tnum text-right">{r[metric].toFixed(1)}</span>
                    {hover === r.short && (
                      <div className="absolute right-0 -mt-12 card px-3 py-2 text-xs shadow-md z-20 pointer-events-none">
                        <b>{r.name}</b> · doctor access {r.insufficient}% · fees {r.feesHindered}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Transcribed from THL Terve Suomi 2024 appendix table 6 (Sotkanet 4909 and 5208). Survey estimates with confidence intervals of a few points: rank order among mid-table counties is not significant.</p>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <p className="eyebrow mb-3">Recommended pilot counties</p>
            <ol className="space-y-3">
              {[...REGIONS].sort((a, b) => b.insufficient - a.insufficient).slice(0, 3).map((r, i) => (
                <li key={r.short} className="flex items-start gap-3">
                  <span className="font-display text-2xl text-primary leading-none w-5">{i + 1}</span>
                  <div><p className="font-semibold">{r.name}</p><p className="text-xs text-muted-foreground">{r.insufficient}% feel underserved · fees hinder {r.feesHindered}%</p></div>
                </li>
              ))}
            </ol>
            <p className="text-sm text-muted-foreground mt-4">Rationale: the biggest marginal gain comes where the first gate is narrowest. Pair one high-gap county with one comparator (Kanta-Häme 19.3%) to measure the effect.</p>
            <Link to="/pilot" className="text-sm font-semibold text-primary inline-flex items-center gap-1 mt-3">Pilot plan <ArrowRight size={14} /></Link>
          </div>
          <div className="card p-5">
            <p className="eyebrow mb-2">Why access data, not cancer outcomes by county?</p>
            <p className="text-sm text-muted-foreground">Regional stage-at-diagnosis data does not exist at usable quality: stage is recorded for 42% of cancers nationally, 72% in Pirkanmaa and 33–42% elsewhere <Cite k="syopa2024" />. The lung quality-registry report confirms regional differences in diagnosis, but county figures are not public <Cite k="lungReport" />. Closing that data gap is part of what SEULA does.</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl mb-4">Where on the pathway the difference emerges</h2>
      <div className="grid md:grid-cols-5 gap-3 mb-12">
        {PATHWAY.map((s, i) => (
          <div key={s.stage} className={`card p-4 ${i <= 2 ? 'ring-1 ring-primary/40' : ''}`}>
            <p className="text-xs font-semibold text-muted-foreground mb-2">{i + 1}. {s.stage}</p>
            <p className="text-2xl font-bold tnum">{s.metric}</p>
            <p className="text-xs text-muted-foreground mb-2">{s.metricLabel}</p>
            <p className="text-sm mb-2">{s.gap}</p>
            <Cite k={s.source}>source</Cite>
          </div>
        ))}
      </div>

      <h2 className="text-2xl mb-1 flex items-center gap-2"><BellRing size={22} className="text-primary" /> Early warning: what the county sees once SEULA runs</h2>
      <p className="text-muted-foreground mb-4 text-sm">Every completed form carries timestamps. Aggregated per health station, they show emerging delays weeks before registry data would. <span className="chip bg-amber-50 text-amber-800 border border-amber-200 ml-1">Simulated pilot data, for illustration</span></p>
      <EarlyWarning />
    </Page>
  );
}

function EarlyWarning() {
  // Illustrative only: weekly median days from first symptom to GP visit for flagged patients, 4 health stations.
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1);
  const series = [
    { name: 'Station A', color: '#2f6fb5', v: [18, 17, 19, 18, 16, 17, 18, 17, 16, 17, 18, 17] },
    { name: 'Station B', color: '#7a52b3', v: [21, 22, 20, 21, 22, 21, 20, 22, 21, 20, 21, 22] },
    { name: 'Station C', color: '#d97757', v: [19, 20, 19, 21, 22, 24, 27, 29, 31, 33, 34, 36] },
  ];
  const W = 640;
  const H = 220;
  const pad = { l: 36, r: 90, t: 12, b: 28 };
  const x = (w: number) => pad.l + ((w - 1) / 11) * (W - pad.l - pad.r);
  const y = (d: number) => pad.t + (1 - (d - 10) / 30) * (H - pad.t - pad.b);
  const [hw, setHw] = useState<number | null>(null);
  return (
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
      <div className="card p-4 overflow-x-auto">
        <p className="text-sm font-semibold mb-1">Median days, first symptom → GP visit, flagged patients</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" onMouseLeave={() => setHw(null)}>
          {[10, 20, 30, 40].map((d) => (
            <g key={d}>
              <line x1={pad.l} x2={W - pad.r} y1={y(d)} y2={y(d)} stroke="#ece8e2" />
              <text x={pad.l - 6} y={y(d) + 3} fontSize="10" textAnchor="end" fill="#6b6560">{d}</text>
            </g>
          ))}
          <line x1={pad.l} x2={W - pad.r} y1={y(28)} y2={y(28)} stroke="#b42318" strokeDasharray="4 3" />
          <text x={W - pad.r + 4} y={y(28) + 3} fontSize="10" fill="#b42318">alert 28 d</text>
          {weeks.map((w) => (
            <g key={w}>
              <text x={x(w)} y={H - 10} fontSize="10" textAnchor="middle" fill="#6b6560">w{w}</text>
              <rect x={x(w) - 20} y={pad.t} width={40} height={H - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHw(w)} />
            </g>
          ))}
          {hw && <line x1={x(hw)} x2={x(hw)} y1={pad.t} y2={H - pad.b} stroke="#1a1a18" strokeOpacity=".25" />}
          {series.map((s) => (
            <g key={s.name}>
              <polyline fill="none" stroke={s.color} strokeWidth="2" points={s.v.map((d, i) => `${x(i + 1)},${y(d)}`).join(' ')} />
              <text x={W - pad.r + 4} y={y(s.v[11]) + 3} fontSize="11" fill="#1a1a18">{s.name}</text>
              {hw && <circle cx={x(hw)} cy={y(s.v[hw - 1])} r="4" fill={s.color} stroke="white" strokeWidth="2" />}
            </g>
          ))}
        </svg>
        {hw && <p className="text-xs text-muted-foreground">Week {hw}: {series.map((s) => `${s.name} ${s.v[hw - 1]} d`).join(' · ')}</p>}
      </div>
      <div className="card p-5 border-l-4" style={{ borderLeftColor: '#b42318' }}>
        <p className="font-semibold flex items-center gap-2 mb-2"><AlertTriangle size={18} className="text-[#b42318]" /> Alert: Station C, week 7</p>
        <p className="text-sm text-muted-foreground mb-3">Median delay for patients with red-flag symptoms crossed 28 days and is still rising. Two other stations are stable.</p>
        <p className="text-sm font-semibold mb-1">Suggested action</p>
        <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1">
          <li>Route SEULA-flagged patients from Station C to a nurse-led 2-week test slot.</li>
          <li>Check GP staffing at Station C for the coming 4 weeks.</li>
          <li>Review again in 2 weeks; escalate to the county medical director if the median stays above 28 days.</li>
        </ul>
      </div>
    </div>
  );
}
