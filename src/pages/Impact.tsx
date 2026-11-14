import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Cite, Page, PageHeader } from '../components/ui';
import { computeImpact, DEFAULTS, ImpactParams, PARAMS } from '../engine/impact';

const fmt = (v: number, d = 0) => v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const eur = (v: number) => `${v < 0 ? '−' : ''}€${Math.abs(v) >= 1e6 ? fmt(Math.abs(v) / 1e6, 2) + 'M' : fmt(Math.abs(v) / 1e3, 0) + 'k'}`;

const PRESETS: { name: string; p: Partial<ImpactParams> }[] = [
  { name: 'Pilot county', p: { questionnaires: 40_000, fixedCost: 150_000 } },
  { name: 'National', p: { questionnaires: 1_000_000, fixedCost: 600_000 } },
  { name: 'Pessimistic', p: { minutesSaved: 0, earlierShare: 0.05, flagRate: 0.06 } },
];

export function Impact() {
  const [p, setP] = useState<ImpactParams>(DEFAULTS);
  const r = useMemo(() => computeImpact(p), [p]);
  const breakEvenMin = (r.testCost + r.runCost) / (p.questionnaires * p.costPerMinute);

  return (
    <Page>
      <PageHeader eyebrow="Economics · every assumption is a slider" title="Two streams of value, one of them certain.">
        Doctor time saved on history-taking pays for the system on its own. Earlier detection is the upside, and its size is the main thing a pilot must measure. Assumptions are marked, sourced values are linked.
      </PageHeader>

      <div className="flex flex-wrap gap-2 mb-6">
        {PRESETS.map((x) => <button key={x.name} onClick={() => setP({ ...DEFAULTS, ...x.p })} className="btn-ghost py-1.5 px-3 text-sm">{x.name}</button>)}
        <button onClick={() => setP(DEFAULTS)} className="btn-ghost py-1.5 px-3 text-sm"><RotateCcw size={14} /> Base case</button>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
        <div className="card p-5 space-y-5 h-fit">
          {PARAMS.map((m) => (
            <div key={m.key}>
              <div className="flex justify-between items-baseline gap-2">
                <label className="text-sm font-medium">{m.label}</label>
                <span className="tnum font-semibold">{m.fmt(p[m.key])}</span>
              </div>
              <input type="range" className="w-full" min={m.min} max={m.max} step={m.step} value={p[m.key]} onChange={(e) => setP({ ...p, [m.key]: +e.target.value })} />
              <p className="text-xs text-muted-foreground leading-snug">
                <span className={`chip mr-1 ${m.kind === 'sourced' ? 'bg-blue-50 text-[#175cd3]' : 'bg-amber-50 text-amber-800'}`}>{m.kind}</span>
                {m.note} {m.source && <Cite k={m.source} />}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-5">
          <div className="card p-6">
            <p className="eyebrow mb-4">Stream 1 · Workflow (certain)</p>
            <div className="grid grid-cols-3 gap-4">
              <Tile v={fmt(r.physicianHours)} l="physician hours freed / year" />
              <Tile v={fmt(r.fte, 1)} l="physician FTE equivalent" />
              <Tile v={eur(r.timeValue)} l="value of time freed" accent />
            </div>
            <p className="text-xs text-muted-foreground mt-4">Break-even: SEULA covers all its own costs and the extra tests at <b className="tnum">{breakEvenMin.toFixed(2)} min</b> saved per visit.</p>
          </div>

          <div className="card p-6">
            <p className="eyebrow mb-4">Stream 2 · Earlier detection (to be measured)</p>
            <div className="grid grid-cols-3 gap-4">
              <Tile v={fmt(r.flagged)} l="patients sent for a 2-week test" />
              <Tile v={fmt(r.cancersFlagged)} l="cancers among them" />
              <Tile v={fmt(r.earlier, 0)} l="found at an earlier stage" />
            </div>
            <div className="mt-5 rounded-lg bg-primary/10 p-4 flex items-baseline gap-3">
              <span className="text-4xl font-bold text-primary tnum">{fmt(r.survivors, 0)}</span>
              <span className="text-sm">additional people alive at 5 years, per year of operation</span>
            </div>
          </div>

          <div className="card p-6">
            <p className="eyebrow mb-4">Budget, per year</p>
            <Bars rows={[
              { l: 'Physician time freed', v: r.timeValue, c: '#2f6fb5' },
              { l: 'Extra 2-week tests', v: -r.testCost, c: '#d97757' },
              { l: 'Running SEULA', v: -r.runCost, c: '#d97757' },
            ]} />
            <div className="flex justify-between items-baseline border-t border-line pt-3 mt-3">
              <span className="font-semibold">Net</span>
              <span className={`text-2xl font-bold tnum ${r.net >= 0 ? 'text-emerald-700' : 'text-[#b42318]'}`}>{eur(r.net)}</span>
            </div>
            {r.net < 0 && <p className="text-xs text-muted-foreground mt-1">Net cost per additional 5-year survivor: <b className="tnum">€{fmt(r.costPerSurvivor)}</b></p>}
          </div>

          <div className="card p-5 text-xs text-muted-foreground space-y-1 font-mono">
            <p>hours = forms × minutes ÷ 60 · value = forms × minutes × €/min</p>
            <p>flagged = forms × flag rate · cancers = flagged × yield</p>
            <p>survivors = cancers × earlier share × survival gain</p>
            <p>net = value − flagged × test cost − (forms × €/form + fixed)</p>
          </div>
        </div>
      </div>

      <div className="card p-5 mt-6 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">What this model does not claim</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Time saving is contested: one randomised trial found a previsit questionnaire lengthened visits by 6.8 minutes because more concerns were raised <Cite k="hornberger" />; a specialty clinic saved 7 minutes per consultation <Cite k="stockport" />. Set the slider to 0 to see the case without it.</li>
          <li>The stage-shift share is unknown for Finland. The ERICA trial (530 UK practices) is testing exactly this for electronic risk tools <Cite k="erica" />.</li>
          <li>Survival gains use US stage-specific survival (SEER) because Finnish stage-specific survival is not public at usable completeness.</li>
          <li>Treatment-cost differences by stage are excluded, which makes the result conservative if early-stage treatment is cheaper.</li>
        </ul>
      </div>
    </Page>
  );
}

function Tile({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-2xl md:text-3xl font-bold tnum ${accent ? 'text-[#2f6fb5]' : ''}`}>{v}</div>
      <div className="text-xs text-muted-foreground leading-tight mt-1">{l}</div>
    </div>
  );
}

function Bars({ rows }: { rows: { l: string; v: number; c: string }[] }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.v)), 1);
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.l} className="grid grid-cols-[150px_1fr_70px] items-center gap-2 text-sm" title={`${r.l}: ${eur(r.v)}`}>
          <span className="text-muted-foreground">{r.l}</span>
          <div className="h-3 bg-muted/50 rounded-r-[4px]"><div className="h-full rounded-r-[4px]" style={{ width: `${(Math.abs(r.v) / max) * 100}%`, background: r.c }} /></div>
          <span className="tnum text-right">{eur(r.v)}</span>
        </div>
      ))}
    </div>
  );
}
