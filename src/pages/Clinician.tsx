import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCopy, FileJson } from 'lucide-react';
import { VoicePanel } from '../components/VoicePanel';
import { Cite, LevelBadge, Page } from '../components/ui';
import { DEMO_PATIENTS, DemoPatient } from '../data/demoPatients';
import { assess, Assessment, DURATION_LABEL, LEVEL_META, PLCO_THRESHOLD, SYMPTOM_LABEL, SymptomKey, G8_THRESHOLD, VHI10_THRESHOLD } from '../engine/questionnaire';
import { anamnesis, toFhir } from '../engine/report';
import { VoiceFeatures } from '../engine/voice';
import { useSession } from '../store/session';

type Row = DemoPatient & { r: Assessment; isMe?: boolean };
const RANK = { urgent: 3, investigate: 2, review: 1, info: 0 };
type Tab = 'why' | 'scores' | 'notes';

export function Clinician() {
  const { submission } = useSession();
  const [params] = useSearchParams();
  const rows: Row[] = useMemo(() => {
    const base: Row[] = DEMO_PATIENTS.map((p) => ({ ...p, r: assess(p.answers, sig(p.voice)) }));
    if (submission) {
      base.unshift({ id: 'me', name: 'You', appointment: 'Now', reason: 'Your answers from the form', answers: submission.answers, voice: submission.voice, symptomOnsetDaysAgo: 0, completedDaysAgo: 0, isMe: true, r: assess(submission.answers, sig(submission.voice)) });
    }
    return base.sort((x, y) => (x.isMe ? -1 : y.isMe ? 1 : RANK[y.r.level] - RANK[x.r.level] || x.appointment.localeCompare(y.appointment)));
  }, [submission]);
  const [sel, setSel] = useState<string>(params.get('p') === 'me' && submission ? 'me' : rows[0].id);
  const p = rows.find((x) => x.id === sel) ?? rows[0];
  const needTest = rows.filter((x) => x.r.level === 'urgent' || x.r.level === 'investigate').length;

  return (
    <Page wide tint>
      <div className="mb-10 max-w-3xl">
        <p className="eyebrow mb-3">For doctors</p>
        <h1 className="text-5xl md:text-6xl text-deep mb-5">Your morning list, already sorted</h1>
        <p className="text-xl text-muted-foreground">{needTest} of {rows.length} patients need a test within two weeks.</p>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        <aside className="card p-2 h-fit lg:sticky lg:top-24">
          {rows.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} className={`w-full text-left px-4 py-3 rounded-xl flex gap-3 items-center transition-colors ${sel === x.id ? 'bg-mist' : 'hover:bg-mist/60'}`}>
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-deep truncate">{x.name}</span>
                <span className="block text-sm text-muted-foreground truncate">{x.appointment} · {x.reason}</span>
              </span>
              <LevelBadge level={x.r.level} />
            </button>
          ))}
        </aside>
        <Packet key={p.id} p={p} reference={p.id === 'p2' ? rows.find((x) => x.id === 'p1') : rows.find((x) => x.id === 'p2')} />
      </div>
    </Page>
  );
}

function sig(v?: VoiceFeatures) {
  return v ? { cpps: v.cpps, jitter: v.jitterLocal, shimmer: v.shimmerLocal, hnrSd: v.hnrSd, mpt: v.mpt, qualityOk: v.quality.ok } : undefined;
}

function Packet({ p, reference }: { p: Row; reference?: Row }) {
  const { r, answers: a, voice } = p;
  const [tab, setTab] = useState<Tab>('why');
  const meta = LEVEL_META[r.level];
  const actions = r.findings.filter((f) => f.level !== 'info');
  const symptoms = Object.entries(a.symptoms) as [SymptomKey, string][];

  return (
    <section className="space-y-5 min-w-0">
      <div className="card p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
          <h2 className="text-4xl text-deep">{p.name}{a.age ? `, ${a.age}` : ''}</h2>
          <LevelBadge level={r.level} long />
        </div>
        <p className="text-muted-foreground mb-6">“{p.reason}”{symptoms.length > 0 && ` · ${symptoms.map(([k, d]) => `${SYMPTOM_LABEL[k].toLowerCase()} ${DURATION_LABEL[d as 'lt3w'].replace(' weeks', ' wk')}`).join(', ')}`}</p>

        <div className="rounded-2xl p-6" style={{ background: meta.bg }}>
          <p className="text-sm font-medium mb-2" style={{ color: meta.color }}>Suggested next step</p>
          {actions.length ? (
            <ul className="space-y-1.5">
              {actions.map((f) => <li key={f.id} className="text-xl text-deep">{f.action}</li>)}
            </ul>
          ) : (
            <p className="text-xl text-deep">No warning signs. Use the visit as planned.</p>
          )}
        </div>
      </div>

      {voice && <VoicePanel voice={voice} reference={reference?.voice} referenceLabel={reference?.id === 'p1' ? 'a strained voice' : 'a steady voice'} />}

      <div className="card">
        <div className="flex gap-1 p-2 border-b border-line">
          {([['why', 'Why'], ['scores', 'Scores'], ['notes', 'Notes for the record']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full text-[15px] transition-colors ${tab === k ? 'bg-deep text-cream' : 'text-muted-foreground hover:text-deep'}`}>{l}</button>
          ))}
        </div>
        <div className="p-7">
          {tab === 'why' && <Why p={p} />}
          {tab === 'scores' && <Scores p={p} />}
          {tab === 'notes' && <Notes p={p} />}
        </div>
      </div>
    </section>
  );
}

function Why({ p }: { p: Row }) {
  const { r, answers: a } = p;
  const mentions = r.textMentions.filter((m) => !m.negated);
  return (
    <div className="space-y-6">
      {r.findings.length === 0 && <p className="text-muted-foreground">No guideline rule matched this patient’s answers.</p>}
      {r.findings.map((f) => (
        <div key={f.id} className="flex gap-4">
          <div className="pt-0.5"><LevelBadge level={f.level} /></div>
          <div>
            <p className="text-lg font-medium text-deep">{f.title}</p>
            <p className="text-muted-foreground">{f.why.join(' · ')}</p>
            <details className="mt-1 text-[15px] text-muted-foreground">
              <summary className="cursor-pointer text-primary">Show guideline</summary>
              <p className="mt-1">{f.rule} <Cite k={f.source}>source</Cite></p>
            </details>
          </div>
        </div>
      ))}
      {a.freeText && (
        <div className="card-cream p-5">
          <p className="text-sm text-muted-foreground mb-1">In their own words</p>
          <p className="text-deep italic">“{a.freeText}”</p>
          {mentions.some((m) => !m.alsoTicked) && (
            <p className="text-sm mt-2" style={{ color: '#3e6a93' }}>Mentioned but not ticked: {mentions.filter((m) => !m.alsoTicked).map((m) => SYMPTOM_LABEL[m.symptom].toLowerCase()).join(', ')}. Worth asking.</p>
          )}
        </div>
      )}
      {!p.isMe && (
        <p className="text-muted-foreground">First symptom {p.symptomOnsetDaysAgo} days ago.</p>
      )}
    </div>
  );
}

function Scores({ p }: { p: Row }) {
  const { r, answers: a } = p;
  return (
    <div className="grid md:grid-cols-2 gap-x-10 gap-y-7">
      <Gauge label="Lung cancer risk, 6 years (PLCOm2012)" value={r.scores.plco !== undefined ? r.scores.plco * 100 : undefined} unit="%" threshold={PLCO_THRESHOLD * 100} max={10} dir="above" cite="plco" na="Not a smoker" />
      <Gauge label="Voice handicap (VHI-10)" value={r.scores.vhi10} unit="/40" threshold={VHI10_THRESHOLD} max={40} dir="above" cite="arffa2012" na="No voice change reported" />
      <Gauge label="Frailty screen (G8)" value={r.scores.g8} unit="/17" threshold={G8_THRESHOLD} max={17} dir="below" cite="bellera2012" na="Under 70" />
      <div className="flex justify-between text-[15px]"><span>Quality of life (EQ-5D-5L)</span><span className="tnum text-deep">{a.eq5d ? ['mobility', 'selfcare', 'activities', 'pain', 'anxiety'].map((k) => a.eq5d![k as 'pain'] ?? '·').join('') : '–'} · {a.eqVas ?? '–'}/100</span></div>
    </div>
  );
}

function Notes({ p }: { p: Row }) {
  const { r, answers: a, voice } = p;
  const [lang, setLang] = useState<'en' | 'fi'>('en');
  const [copied, setCopied] = useState(false);
  const text = anamnesis(a, r, voice, undefined, lang);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  const fhir = () => {
    const blob = new Blob([JSON.stringify(toFhir(a, r, voice), null, 2)], { type: 'application/fhir+json' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url;
    el.download = `seula-${p.id}-QuestionnaireResponse.json`;
    el.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={copy} className="btn-primary py-2 px-5 text-[15px]"><ClipboardCopy size={16} /> {copied ? 'Copied' : 'Copy to patient record'}</button>
        <button onClick={fhir} className="btn-ghost py-2 px-5 text-[15px]"><FileJson size={16} /> Download FHIR</button>
        <div className="flex rounded-full border border-line overflow-hidden text-sm ml-auto">
          {(['en', 'fi'] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={`px-4 ${lang === l ? 'bg-sage text-deep font-medium' : 'bg-white text-muted-foreground'}`}>{l === 'en' ? 'English' : 'Suomi'}</button>)}
        </div>
      </div>
      <pre className="whitespace-pre-wrap text-sm bg-mist rounded-2xl p-5 font-mono leading-relaxed text-deep">{text}</pre>
      <p className="text-sm text-muted-foreground mt-3">For patients 70 or older, the frailty score and quality-of-life answers go into the specialist referral automatically.</p>
    </div>
  );
}

function Gauge({ label, value, unit, threshold, max, dir, cite, na }: { label: string; value?: number; unit: string; threshold: number; max: number; dir: 'above' | 'below'; cite: string; na?: string }) {
  if (value === undefined || Number.isNaN(value))
    return (
      <div className="flex justify-between text-[15px]"><span>{label}</span><span className="text-muted-foreground">{na ?? '–'}</span></div>
    );
  const abn = dir === 'above' ? value > threshold : value <= threshold;
  const pos = Math.min(100, Math.max(0, (value / max) * 100));
  const tpos = Math.min(100, (threshold / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-[15px] mb-2">
        <span>{label}</span>
        <span className="tnum font-medium" style={{ color: abn ? '#a8483f' : 'rgb(var(--deep-rgb))' }}>{value.toFixed(value < 100 ? 1 : 0)}{unit}</span>
      </div>
      <div className="relative h-2 rounded-full bg-sage">
        <div className="absolute inset-y-0 rounded-full" style={{ left: dir === 'above' ? `${tpos}%` : 0, width: dir === 'above' ? `${100 - tpos}%` : `${tpos}%`, background: '#efd9d5' }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow" style={{ left: `calc(${pos}% - 7px)`, background: abn ? '#a8483f' : 'rgb(var(--primary-rgb))' }} />
      </div>
      <div className="text-sm text-muted-foreground mt-1">{abn ? 'Outside' : 'Within'} the usual range (cut-off {threshold}{unit}) · <Cite k={cite}>reference</Cite></div>
    </div>
  );
}
