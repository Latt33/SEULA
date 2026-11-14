import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ClipboardCopy, FileJson, MessageSquareQuote } from 'lucide-react';
import { Cite, LevelBadge, Page } from '../components/ui';
import { VoiceCard } from '../components/VoicePanel';
import { DEMO_PATIENTS, DemoPatient } from '../data/demoPatients';
import { assess, Assessment, Finding, LEVEL_META, PLCO_THRESHOLD, SYMPTOM_LABEL, G8_THRESHOLD, VHI10_THRESHOLD } from '../engine/questionnaire';
import { anamnesis, toFhir } from '../engine/report';
import { VoiceFeatures } from '../engine/voice';
import { useSession } from '../store/session';

type Row = DemoPatient & { r: Assessment; isMe?: boolean };
const RANK = { urgent: 3, investigate: 2, review: 1, info: 0 };

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
      <div className="mb-12 max-w-3xl">
        <p className="eyebrow mb-3">For doctors</p>
        <h1 className="text-5xl md:text-6xl text-deep mb-5">Your morning list, already sorted</h1>
        <p className="text-xl text-muted-foreground">{needTest} of {rows.length} patients need a test within two weeks. The most urgent are at the top.</p>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-8">
        <aside className="card p-2 h-fit lg:sticky lg:top-24">
          {rows.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} className={`w-full text-left px-4 py-3 rounded-2xl flex gap-3 items-center transition-colors ${sel === x.id ? 'bg-mist' : 'hover:bg-mist/60'}`}>
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-deep truncate">{x.name}</span>
                <span className="block text-[15px] text-muted-foreground truncate">{x.appointment} · {x.reason}</span>
              </span>
              <LevelBadge level={x.r.level} />
            </button>
          ))}
        </aside>
        <Packet key={p.id} p={p} />
      </div>
    </Page>
  );
}

function sig(v?: VoiceFeatures) {
  return v ? { cpps: v.cpps, jitter: v.jitterLocal, shimmer: v.shimmerLocal, hnrSd: v.hnrSd, mpt: v.mpt, qualityOk: v.quality.ok } : undefined;
}

function Packet({ p }: { p: Row }) {
  const { r, answers: a, voice } = p;
  const meta = LEVEL_META[r.level];
  const actions = r.findings.filter((f) => f.level !== 'info');
  const [main, ...others] = actions;
  const unticked = r.textMentions.filter((m) => !m.negated && !m.alsoTicked);

  return (
    <section className="space-y-6 min-w-0">
      {/* 1 + 2: what to do, and why */}
      <div className="card overflow-hidden">
        <div className="px-8 pt-7 pb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-3xl text-deep">{p.name}{a.age ? `, ${a.age}` : ''}</h2>
            <span className="text-[15px] text-muted-foreground">{p.appointment} · “{p.reason}”</span>
          </div>
        </div>

        <div className="px-8 py-7" style={{ background: meta.bg }}>
          <div className="flex items-center gap-3 mb-3">
            <LevelBadge level={r.level} long />
          </div>
          {main ? (
            <>
              <p className="text-3xl md:text-[2rem] leading-tight text-deep font-medium mb-2">{main.action}</p>
              {others.length > 0 && (
                <ul className="text-lg text-deep/80 space-y-1">
                  {others.map((f) => <li key={f.id}>Also: {f.action.charAt(0).toLowerCase() + f.action.slice(1)}</li>)}
                </ul>
              )}
            </>
          ) : (
            <p className="text-3xl text-deep font-medium">No warning signs. Use the visit as planned.</p>
          )}
        </div>

        {actions.length > 0 && (
          <div className="px-8 py-7">
            <h3 className="text-lg text-deep mb-4">Why</h3>
            <ul className="space-y-4">
              {actions.map((f) => <Reason key={f.id} f={f} />)}
            </ul>
            {unticked.length > 0 && (
              <p className="mt-5 rounded-2xl bg-[#eaf1f7] text-[#3e6a93] px-5 py-3">
                <b className="font-medium">Ask about:</b> {unticked.map((m) => SYMPTOM_LABEL[m.symptom].toLowerCase()).join(', ')}. Mentioned in their own words but not ticked.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 3: supporting evidence */}
      <div className={`grid gap-6 ${voice ? 'xl:grid-cols-[1.15fr_1fr]' : ''}`}>
        {voice && <VoiceCard voice={voice} />}
        <div className="card p-6 space-y-6">
          <h3 className="text-lg text-deep">Scores</h3>
          <Gauge label="Lung cancer risk, 6 years" value={r.scores.plco !== undefined ? r.scores.plco * 100 : undefined} unit="%" threshold={PLCO_THRESHOLD * 100} max={10} dir="above" cite="plco" na="Not a smoker" />
          <Gauge label="Voice handicap (VHI-10)" value={r.scores.vhi10} unit="/40" threshold={VHI10_THRESHOLD} max={40} dir="above" cite="arffa2012" na="No voice change" />
          <Gauge label="Frailty (G8)" value={r.scores.g8} unit="/17" threshold={G8_THRESHOLD} max={17} dir="below" cite="bellera2012" na="Under 70" />
          {!p.isMe && <p className="text-[15px] text-muted-foreground">First symptom {p.symptomOnsetDaysAgo} days ago.</p>}
        </div>
      </div>

      {a.freeText && (
        <div className="card p-6 flex gap-4">
          <MessageSquareQuote className="text-primary shrink-0 mt-1" size={20} />
          <p className="text-lg text-deep italic">“{a.freeText}”</p>
        </div>
      )}

      {/* 4: on request */}
      <Notes p={p} />
    </section>
  );
}

function Reason({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="flex gap-4">
      <span className="mt-2 w-2 h-2 rounded-full shrink-0" style={{ background: LEVEL_META[f.level].color }} />
      <div>
        <p className="text-lg text-deep">{f.title}</p>
        <p className="text-muted-foreground">{f.why.join(' · ')}</p>
        <button onClick={() => setOpen(!open)} className="text-[15px] text-primary">{open ? 'Hide guideline' : 'Show guideline'}</button>
        {open && <p className="text-[15px] text-muted-foreground mt-1">{f.rule} <Cite k={f.source}>source</Cite></p>}
      </div>
    </li>
  );
}

function Notes({ p }: { p: Row }) {
  const { r, answers: a, voice } = p;
  const [open, setOpen] = useState(false);
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
    <div className="card">
      <div className="flex flex-wrap items-center gap-3 p-5">
        <button onClick={copy} className="btn-primary py-2.5 px-5"><ClipboardCopy size={17} /> {copied ? 'Copied' : 'Copy history to patient record'}</button>
        <button onClick={() => setOpen(!open)} className="btn-ghost py-2.5 px-5">{open ? 'Hide' : 'Preview'} <ChevronDown size={16} className={open ? 'rotate-180' : ''} /></button>
        <button onClick={fhir} className="text-[15px] text-muted-foreground hover:text-deep inline-flex items-center gap-1.5 ml-auto"><FileJson size={16} /> FHIR</button>
      </div>
      {open && (
        <div className="px-5 pb-5">
          <div className="flex rounded-full border border-line overflow-hidden text-[15px] w-fit mb-3">
            {(['en', 'fi'] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={`px-4 py-1 ${lang === l ? 'bg-deep text-cream' : 'text-muted-foreground'}`}>{l === 'en' ? 'English' : 'Suomi'}</button>)}
          </div>
          <pre className="whitespace-pre-wrap text-[15px] bg-mist rounded-2xl p-5 font-mono leading-relaxed text-deep">{text}</pre>
        </div>
      )}
    </div>
  );
}

function Gauge({ label, value, unit, threshold, max, dir, cite, na }: { label: string; value?: number; unit: string; threshold: number; max: number; dir: 'above' | 'below'; cite: string; na?: string }) {
  if (value === undefined || Number.isNaN(value))
    return (
      <div className="flex justify-between"><span className="text-deep">{label}</span><span className="text-muted-foreground">{na ?? '–'}</span></div>
    );
  const abn = dir === 'above' ? value > threshold : value <= threshold;
  const pos = Math.min(100, Math.max(0, (value / max) * 100));
  const tpos = Math.min(100, (threshold / max) * 100);
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-deep">{label} <Cite k={cite}>ref</Cite></span>
        <span className="tnum font-medium" style={{ color: abn ? '#a8483f' : 'rgb(var(--deep-rgb))' }}>{Number.isInteger(value) ? value : value.toFixed(1)}{unit}</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted">
        <div className="absolute inset-y-0 rounded-full" style={{ left: dir === 'above' ? `${tpos}%` : 0, width: dir === 'above' ? `${100 - tpos}%` : `${tpos}%`, background: '#efd9d5' }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow" style={{ left: `calc(${pos}% - 7px)`, background: abn ? '#a8483f' : 'rgb(var(--primary-rgb))' }} />
      </div>
    </div>
  );
}
