import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BellRing } from 'lucide-react';
import { Cite, Page } from '../components/ui';
import { NATIONAL, REGIONS } from '../data/regions';
import { computeImpact, DEFAULTS } from '../engine/impact';
import { RECS } from './Pilot';

export function Region() {
  const [hover, setHover] = useState<string | null>(null);
  const sorted = useMemo(() => [...REGIONS].sort((a, b) => b.insufficient - a.insufficient), []);
  const max = 36;
  const top3 = sorted.slice(0, 3);
  const pilot = computeImpact({ ...DEFAULTS, questionnaires: 40_000, fixedCost: 150_000 });

  return (
    <Page>
      <div className="mb-12 max-w-3xl">
        <p className="eyebrow mb-3">For wellbeing services counties</p>
        <h1 className="text-4xl md:text-5xl text-deep mb-4">Start where getting a doctor is hardest</h1>
        <p className="text-lg text-muted-foreground">Cancer is caught early only if people get to a doctor. Access is uneven: in some regions nearly 1 in 3 people feel they don’t get enough doctor time.</p>
      </div>

      {/* 1. Where */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mb-20">
        <div className="card p-7">
          <p className="text-lg text-deep mb-1">People who feel they get too little doctor time</p>
          <p className="text-sm text-muted-foreground mb-6">Share of residents, 2024 · <Cite k="terveSuomi" /></p>
          <div className="space-y-[5px]">
            {sorted.map((r) => {
              const isTop = top3.includes(r);
              return (
                <div key={r.short} className="flex items-center gap-3 text-sm" onMouseEnter={() => setHover(r.short)} onMouseLeave={() => setHover(null)}>
                  <span className={`w-[130px] shrink-0 text-right truncate ${isTop ? 'text-deep font-medium' : 'text-muted-foreground'}`}>{r.short}</span>
                  <div className="flex-1 h-[13px] relative">
                    <div className="h-full rounded-full transition-colors" style={{ width: `${(r.insufficient / max) * 100}%`, background: isTop ? 'rgb(var(--primary-rgb))' : hover === r.short ? '#9cbcae' : 'rgb(var(--sage-rgb))' }} />
                    <div className="absolute top-[-3px] bottom-[-3px] w-px bg-deep/40" style={{ left: `${(NATIONAL.insufficient / max) * 100}%` }} />
                  </div>
                  <span className="w-10 tnum text-right text-deep">{r.insufficient.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground mt-5">Vertical line: Finland average {NATIONAL.insufficient}%. These are survey estimates; differences of a few points between mid-table regions are not meaningful.</p>
        </div>

        <div className="card-cream p-7 h-fit">
          <p className="text-lg text-deep mb-5">Where we suggest starting</p>
          <ol className="space-y-5">
            {top3.map((r, i) => (
              <li key={r.short} className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0 font-medium">{i + 1}</span>
                <div><p className="text-deep font-medium">{r.name}</p><p className="text-sm text-muted-foreground">{r.insufficient}% feel underserved</p></div>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground mt-6 leading-relaxed">Pair one of these with a comparison region such as Kanta-Häme (19.3%), so the effect can be measured fairly.</p>
        </div>
      </div>

      {/* 2. What to do */}
      <h2 className="text-3xl md:text-4xl text-deep mb-3">Six steps for the next quarter</h2>
      <p className="text-lg text-muted-foreground mb-8 max-w-2xl">Each step has an owner and a way to measure it. None needs new hardware or new staff.</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-20">
        {RECS.map((r, i) => (
          <div key={r.id} className="card p-6 flex flex-col">
            <span className="w-8 h-8 rounded-full bg-sage text-deep flex items-center justify-center font-medium mb-4">{i + 1}</span>
            <p className="text-deep font-medium leading-snug mb-3">{r.what}</p>
            <p className="text-sm text-muted-foreground mb-1">{r.owner}</p>
            <p className="text-sm text-muted-foreground mb-4">{r.when}</p>
            <p className="text-sm mt-auto pt-3 border-t border-line"><span className="text-muted-foreground">Success:</span> <span className="text-deep">{r.kpi}</span></p>
          </div>
        ))}
      </div>

      {/* 3. What it costs */}
      <div className="band p-8 md:p-12 mb-20">
        <h2 className="text-3xl md:text-4xl mb-3">A pilot region, in numbers</h2>
        <p className="text-white/75 text-lg mb-10 max-w-2xl">40,000 forms a year. Saving doctors 2 minutes per visit on history-taking pays for the system and the extra tests.</p>
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            [Math.round(pilot.physicianHours).toLocaleString('en-US'), 'doctor hours freed each year'],
            [Math.round(pilot.flagged).toLocaleString('en-US'), 'people sent for a test within 2 weeks'],
            [`€${Math.round(pilot.net / 1000)}k`, 'net saving each year, after all costs'],
          ].map(([v, l]) => (
            <div key={l} className="card-cream p-6 text-foreground">
              <p className="font-medium text-5xl text-deep tnum mb-2">{v}</p>
              <p className="text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
        <Link to="/impact" className="btn-light">Adjust the assumptions <ArrowRight size={16} /></Link>
      </div>

      {/* 4. Early warning */}
      <h2 className="text-3xl md:text-4xl text-deep mb-3 flex items-center gap-3"><BellRing className="text-primary" size={28} /> See delays as they happen</h2>
      <p className="text-lg text-muted-foreground mb-8 max-w-2xl">Every form records when symptoms started and when the patient was seen. Each health station’s waiting time becomes visible within weeks, not years.</p>
      <EarlyWarning />
    </Page>
  );
}

function EarlyWarning() {
  const series = [
    { name: 'Station A', color: '#3d79b8', v: [18, 17, 19, 18, 16, 17, 18, 17, 16, 17, 18, 17] },
    { name: 'Station B', color: '#c4843f', v: [21, 22, 20, 21, 22, 21, 20, 22, 21, 20, 21, 22] },
    { name: 'Station C', color: '#1f8a62', v: [19, 20, 19, 21, 22, 24, 27, 29, 31, 33, 34, 36] },
  ];
  const W = 640;
  const H = 230;
  const pad = { l: 36, r: 80, t: 12, b: 28 };
  const x = (w: number) => pad.l + ((w - 1) / 11) * (W - pad.l - pad.r);
  const y = (d: number) => pad.t + (1 - (d - 10) / 30) * (H - pad.t - pad.b);
  const [hw, setHw] = useState<number | null>(null);
  return (
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
      <div className="card p-6 overflow-x-auto">
        <div className="flex justify-between items-start mb-2 gap-3">
          <p className="text-deep">Days from first symptom to doctor, by health station</p>
          <span className="chip bg-cream text-[#8f6420] shrink-0">Example data</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[500px]" onMouseLeave={() => setHw(null)}>
          {[10, 20, 30, 40].map((d) => (
            <g key={d}>
              <line x1={pad.l} x2={W - pad.r} y1={y(d)} y2={y(d)} stroke="#e2e8e4" />
              <text x={pad.l - 6} y={y(d) + 3} fontSize="10" textAnchor="end" fill="#5c6864">{d}</text>
            </g>
          ))}
          <line x1={pad.l} x2={W - pad.r} y1={y(28)} y2={y(28)} stroke="#a8483f" strokeDasharray="4 3" />
          <text x={W - pad.r + 4} y={y(28) + 3} fontSize="10" fill="#a8483f">alert</text>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
            <g key={w}>
              <text x={x(w)} y={H - 8} fontSize="10" textAnchor="middle" fill="#5c6864">wk {w}</text>
              <rect x={x(w) - 20} y={pad.t} width={40} height={H - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHw(w)} />
            </g>
          ))}
          {hw && <line x1={x(hw)} x2={x(hw)} y1={pad.t} y2={H - pad.b} stroke="#212d29" strokeOpacity=".2" />}
          {series.map((s) => (
            <g key={s.name}>
              <polyline fill="none" stroke={s.color} strokeWidth="2" points={s.v.map((d, i) => `${x(i + 1)},${y(d)}`).join(' ')} />
              <text x={W - pad.r + 4} y={y(s.v[11]) + 3} fontSize="11" fill="#212d29">{s.name}</text>
              {hw && <circle cx={x(hw)} cy={y(s.v[hw - 1])} r="4" fill={s.color} stroke="white" strokeWidth="2" />}
            </g>
          ))}
        </svg>
        <p className="text-sm text-muted-foreground h-4">{hw ? `Week ${hw}: ${series.map((s) => `${s.name} ${s.v[hw - 1]} days`).join(' · ')}` : 'Hover to compare stations'}</p>
      </div>
      <div className="card-cream p-7">
        <p className="text-lg text-deep mb-2">Station C needs attention</p>
        <p className="text-muted-foreground mb-5">Since week 7, people with warning signs wait over 4 weeks to see a doctor, and it is getting longer.</p>
        <p className="text-sm font-medium text-deep mb-2">What to do</p>
        <ul className="text-muted-foreground space-y-2 list-disc ml-5">
          <li>Send flagged patients from Station C to a nurse-led test slot.</li>
          <li>Check doctor staffing there for the next month.</li>
          <li>Look again in 2 weeks.</li>
        </ul>
      </div>
    </div>
  );
}
