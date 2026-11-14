import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, CircleAlert, FlaskConical } from 'lucide-react';
import { Cite, Page, PageHeader } from '../components/ui';
import validation from '../data/generated/voice_validation.json';
import textEval from '../data/generated/text_eval.json';
import { aucFromD, combinedAuc, dFromAuc } from '../engine/impact';

type Feat = { n: number; r: number; bias: number; mae: number; points: number[][]; heldOut?: boolean };
const V = validation as unknown as { praatVersion: string; synthetic: { n: number; features: Record<string, Feat>; severityTracking: Record<string, number> } };
const TE = textEval as unknown as { development: { precision: number; recall: number; f1: number; n: number }; heldOut: { precision: number; recall: number; f1: number; n: number; errors: { text: string; expected: string[]; got: string[] }[] } };

const FEAT_LABEL: Record<string, [string, string]> = {
  cpps: ['CPPS', 'dB'],
  hnrMean: ['HNR mean', 'dB'],
  hnrSd: ['HNR SD', 'dB'],
  jitterLocal: ['Jitter (local)', '%'],
  shimmerLocal: ['Shimmer (local)', '%'],
  f0Mean: ['F0 mean', 'Hz'],
};

export function Evidence() {
  return (
    <Page tint>
      <PageHeader eyebrow="Evidence" title="Does it work?">
        SEULA finds the people who need a closer look, using rules and measures already validated in clinics. It does not diagnose cancer. Here is what we tested, and what a pilot still has to show.
      </PageHeader>

      <Claim n={1} title="The questionnaire uses only validated instruments" ok>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="text-left text-muted-foreground border-b border-line"><th className="py-2 pr-3 font-medium">Instrument</th><th className="pr-3 font-medium">Detects</th><th className="pr-3 font-medium">Cut-off</th><th className="pr-3 font-medium">Strategy link</th><th className="font-medium">Source</th></tr></thead>
            <tbody className="divide-y divide-line">
              {[
                ['NICE NG12 red flags', 'Lung, colorectal, laryngeal, upper-GI suspicion', 'Guideline rules, ≥ 3% PPV design threshold', '3.1.2 pathways', 'ng12'],
                ['PLCOm2012', '6-year lung cancer risk in ever-smokers', '≥ 1.51%', 'Goal 2 risk groups', 'plcoThreshold'],
                ['VHI-10', 'Self-rated voice handicap', '> 11', 'Larynx', 'arffa2012'],
                ['G8', 'Frailty in patients 70+', '≤ 14', '3.4.2 functional data in referrals', 'bellera2012'],
                ['EQ-5D-5L profile', 'Health-related quality of life', 'Profile + VAS', '3.3.1 QoL data', 'roadmap'],
                ['CPPS (voice)', 'Dysphonia', '< 14.45 dB (Praat)', 'Larynx adjunct', 'murton2020'],
              ].map(([i, d, c, s, k]) => (
                <tr key={i}><td className="py-2 pr-3 font-medium">{i}</td><td className="pr-3">{d}</td><td className="pr-3 tnum">{c}</td><td className="pr-3 text-muted-foreground">{s}</td><td><Cite k={k}>link</Cite></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-3">The same approach is already routine in the UK: QCancer runs inside EMIS Web in over 4,000 practices <Cite k="qcancer" />. NG12 is a stand-in until FICAN publishes Finnish pathway criteria (roadmap action 3.1.2, 2026–28).</p>
      </Claim>

      <Claim n={2} title="The phone measures voice the way the clinical reference tool does" ok>
        <p className="text-sm text-muted-foreground mb-4">We synthesised {V.synthetic.n} sustained /a/ vowels with controlled jitter, shimmer and breath noise (a source-filter model), then measured each with Praat {V.praatVersion} and with SEULA’s browser engine (the identical TypeScript that runs on the phone). Calibrated measures are reported on a held-out half.</p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-5">
          <table className="w-full text-sm h-fit">
            <thead><tr className="text-left text-muted-foreground border-b border-line"><th className="py-2 font-medium">Measure</th><th className="font-medium text-right">r</th><th className="font-medium text-right hidden sm:table-cell">bias</th><th className="font-medium text-right">MAE</th></tr></thead>
            <tbody className="divide-y divide-line">
              {Object.entries(V.synthetic.features).map(([k, f]) => (
                <tr key={k}><td className="py-2">{FEAT_LABEL[k]?.[0] ?? k}{f.heldOut && <span className="chip bg-muted/60 ml-1">held-out</span>}</td><td className="text-right tnum font-semibold">{f.r.toFixed(3)}</td><td className="text-right tnum hidden sm:table-cell">{f.bias.toFixed(2)}</td><td className="text-right tnum whitespace-nowrap">{f.mae.toFixed(2)} {FEAT_LABEL[k]?.[1]}</td></tr>
              ))}
            </tbody>
          </table>
          <div>
            <p className="text-sm font-semibold mb-1">CPPS: Praat vs SEULA (held-out)</p>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart margin={{ top: 8, right: 8, bottom: 20, left: 0 }}>
                <CartesianGrid stroke="#e2e8e4" />
                <XAxis type="number" dataKey="x" name="Praat" unit=" dB" domain={['auto', 'auto']} tick={{ fontSize: 11 }} label={{ value: 'Praat CPPS (dB)', position: 'insideBottom', offset: -10, fontSize: 11 }} />
                <YAxis type="number" dataKey="y" name="SEULA" unit=" dB" domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={50} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v) => Number(v).toFixed(2)} />
                <ReferenceLine x={14.45} stroke="#a8483f" strokeDasharray="4 3" />
                <Scatter data={V.synthetic.features.cpps.points.map(([x, y]) => ({ x, y }))} fill="#3d79b8" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-sm text-muted-foreground">Dashed line: published dysphonia cut-off 14.45 dB <Cite k="murton2020" />. Both tools put nearly every voice on the same side of it.</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">Limitation: synthetic voices prove measurement agreement, not clinical accuracy. <code>analysis/validate_voice.py --voiced DIR</code> reruns everything on the open VOICED database (PhysioNet) once downloaded; it was not reachable from our build environment.</p>
      </Claim>

      <Claim n={3} title="Voice adds signal where the larynx is the question, and little elsewhere" ok={false}>
        <AucExplorer />
      </Claim>

      <Claim n={4} title="Free text and dictation surface red flags patients forget to tick" ok>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Metric v={TE.heldOut.precision} l="precision, held-out" />
          <Metric v={TE.heldOut.recall} l="recall, held-out" />
          <Metric v={TE.development.f1} l="F1 on development set" muted />
        </div>
        <p className="text-sm text-muted-foreground mb-3">On-device Finnish and English lexicon with negation handling (“ei veriyskää”, “my husband has a cough”). Development set: {TE.development.n} sentences used for one revision. Held-out set: {TE.heldOut.n} sentences written afterwards and never tuned on. Both were written by the team, not taken from real patients.</p>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Held-out errors ({TE.heldOut.errors.length})</summary>
          <ul className="mt-2 space-y-1">
            {TE.heldOut.errors.map((e) => <li key={e.text} className="font-mono text-sm">“{e.text}” expected [{e.expected.join(', ')}] got [{e.got.join(', ')}]</li>)}
          </ul>
        </details>
        <p className="text-sm text-muted-foreground mt-3">Design choice: text never changes the triage level. It only shows “mentioned but not ticked” so the doctor asks. A missed mention costs nothing extra; a false one costs a question.</p>
      </Claim>

      <div className="card-cream p-7 mt-8">
        <p className="font-semibold mb-2 flex items-center gap-2"><FlaskConical size={18} className="text-primary" /> What a 6-month pilot must prove</p>
        <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1">
          <li>Completion rate by age group and language (target ≥ 60% of booked adults 40+).</li>
          <li>Flag rate and yield: cancers diagnosed within 12 months among flagged vs unflagged respondents (Cancer Registry linkage).</li>
          <li>Days from first symptom to test, before vs after, against a comparator county.</li>
          <li>Voice: AUC of CPPS for laryngoscopy-confirmed lesions in patients referred to ENT.</li>
          <li>Physician minutes per visit (time-motion sample) and GP acceptance.</li>
        </ul>
      </div>
    </Page>
  );
}

function Claim({ n, title, ok, children }: { n: number; title: string; ok: boolean; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-7 mb-6">
      <h2 className="text-xl sm:text-2xl text-deep mb-5 flex items-start sm:items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-sage text-deep flex items-center justify-center text-base font-medium shrink-0">{n}</span>
        <span className="flex-1">{title}</span>
        {ok ? <CheckCircle2 className="text-primary shrink-0" size={20} /> : <CircleAlert className="text-[#c4843f] shrink-0" size={20} />}
      </h2>
      {children}
    </section>
  );
}

function Metric({ v, l, muted }: { v: number; l: string; muted?: boolean }) {
  return (
    <div>
      <div className={`text-3xl font-bold tnum ${muted ? 'text-muted-foreground' : ''}`}>{v.toFixed(2)}</div>
      <div className="text-sm text-muted-foreground">{l}</div>
    </div>
  );
}

function AucExplorer() {
  const [qAuc, setQAuc] = useState(0.75);
  const [rho, setRho] = useState(0);
  const dQ = dFromAuc(qAuc);
  const data = useMemo(
    () => Array.from({ length: 26 }, (_, i) => {
      const d = i * 0.1;
      return { d: +d.toFixed(1), Questionnaire: +qAuc.toFixed(3), Voice: +aucFromD(d).toFixed(3), Combined: +combinedAuc(dQ, d, rho).toFixed(3) };
    }),
    [qAuc, rho, dQ],
  );
  const dDys = dFromAuc(0.93);
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">If questionnaire and voice each separate cases from non-cases, how much does combining them help? With both signals Gaussian, the best linear combination has a closed form: AUC = Φ(D/√2), where D is the Mahalanobis distance between groups. The x-axis is how strongly voice differs between groups (effect size d). Published anchors are marked.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm">
        <label>Questionnaire alone, AUC <b className="tnum">{qAuc.toFixed(2)}</b><input type="range" min={0.55} max={0.95} step={0.01} value={qAuc} onChange={(e) => setQAuc(+e.target.value)} className="w-full" /></label>
        <label>Correlation between the two signals within each group <b className="tnum">{rho.toFixed(2)}</b><input type="range" min={0} max={0.9} step={0.05} value={rho} onChange={(e) => setRho(+e.target.value)} className="w-full" /></label>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 22, right: 16, bottom: 20, left: 0 }}>
          <CartesianGrid stroke="#e2e8e4" />
          <XAxis dataKey="d" type="number" domain={[0, 2.5]} ticks={[0, 0.5, 1, 1.5, 2, 2.5]} tick={{ fontSize: 11 }} label={{ value: 'Voice effect size d', position: 'insideBottom', offset: -10, fontSize: 11 }} />
          <YAxis domain={[0.5, 1]} ticks={[0.5, 0.6, 0.7, 0.8, 0.9, 1]} tick={{ fontSize: 11 }} width={40} />
          <Tooltip formatter={(v) => Number(v).toFixed(3)} labelFormatter={(d) => `d = ${d}`} />
          <Legend verticalAlign="bottom" height={36} iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
          <ReferenceLine x={0} stroke="#5c6864" strokeDasharray="4 3" label={{ value: 'cancer vs benign', position: 'top', fontSize: 10, fill: '#6b6560' }} />
          <ReferenceLine x={+dDys.toFixed(2)} stroke="#5c6864" strokeDasharray="4 3" label={{ value: 'dysphonia', position: 'top', fontSize: 10, fill: '#6b6560' }} />
          <Line dataKey="Questionnaire" stroke="#c4843f" strokeWidth={2} dot={false} />
          <Line dataKey="Voice" stroke="#3d79b8" strokeWidth={2} dot={false} />
          <Line dataKey="Combined" stroke="#1f8a62" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
        <div className="rounded-2xl bg-mist p-5">
          <p className="font-semibold mb-1">Abnormal vs normal larynx: d ≈ {dDys.toFixed(1)}</p>
          <p className="text-muted-foreground">CPPS separates dysphonic from normal voices with AUC 0.93 <Cite k="murton2020" />. Combined with the questionnaire, AUC reaches {combinedAuc(dQ, dDys, rho).toFixed(2)}. That is the job SEULA gives voice: who needs a laryngoscopy.</p>
        </div>
        <div className="rounded-2xl bg-mist p-5">
          <p className="font-semibold mb-1">Cancer vs benign lesion: d ≈ 0</p>
          <p className="text-muted-foreground">Mean HNR and F0 did not differ between laryngeal cancer and benign lesions, and HNR variability differed only in men <Cite k="jenkins2025" />. Voice cannot tell cancer from a polyp; the laryngoscopy does.</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-3">For lung and colorectal cancer there is no validated voice marker, so the questionnaire carries those cancers. Voice there only adds phonation time (respiratory reserve) as information.</p>
    </div>
  );
}
