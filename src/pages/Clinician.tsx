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
import { XrayCard } from '../medgemma/XrayCard';

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

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
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

const STEP: Record<string, { title: string; sub: string; to?: string; within?: string }> = {
  larynx: { title: 'Refer for laryngoscopy', sub: 'Suspected laryngeal cancer pathway', to: 'ENT (otorhinolaryngology)', within: '2 weeks' },
  'lung-haemoptysis': { title: 'Refer on the lung cancer pathway', sub: 'Suspected cancer pathway', to: 'Pulmonology', within: '2 weeks' },
  'lung-cxr': { title: 'Chest X-ray within 2 weeks', sub: 'Urgent direct access', to: 'Radiology: chest X-ray', within: '2 weeks' },
  'lung-infections': { title: 'Consider a chest X-ray', sub: 'Recurrent chest infection' },
  'crc-fit': { title: 'Send a FIT kit home today', sub: 'Refer if ≥ 10 µg Hb/g', to: 'Laboratory: quantitative FIT', within: '2 weeks' },
  dysphagia: { title: 'Refer for endoscopy', sub: 'Suspected upper-GI cancer pathway', to: 'Gastroenterology: endoscopy', within: '2 weeks' },
  'lung-plco': { title: 'Low threshold for imaging', sub: 'High-risk smoker; offer smoking cessation' },
  'larynx-acoustic': { title: 'Ask about voice change', sub: 'Re-record the voice in 3 weeks' },
  vhi: { title: 'Examine the larynx if persistent', sub: 'Voice handicap above normal' },
  g8: { title: 'Geriatric assessment', sub: 'Attach G8 to any referral' },
  text: { title: 'Ask about symptoms they mentioned', sub: 'Written in their own words, not ticked' },
  mpt: { title: 'Spirometry if not recent', sub: 'Short phonation time' },
};
const BASIS: Record<string, string> = { ng12: 'NICE NG12', plco: 'PLCOm2012', murton2020: 'CPPS cut-off (Murton 2020)', arffa2012: 'VHI-10 norms', bellera2012: 'G8 (Bellera 2012)', seula: 'SEULA safety rule' };
const step = (f: Finding) => STEP[f.id] ?? { title: f.action, sub: '' };

/** Turn "Hoarseness (Over 6 weeks)", "VHI-10 = 18 (abnormal > 11)", "Acoustic dysphonia: CPPS 11.1 dB" into label / value pairs. */
function kv(w: string): [string, string] {
  let m = w.match(/^Acoustic dysphonia: CPPS (.+?) \(< ?([\d.]+)\)$/);
  if (m) return ['Voice clarity', `${m[1]}, below ${m[2]} dB`];
  m = w.match(/^(.+?) = (.+)$/); if (m) return [m[1], m[2]];
  m = w.match(/^(.+?): (.+)$/); if (m) return [m[1], m[2]];
  m = w.match(/^(.+?) \((.+)\)$/); if (m) return [m[1], m[2]];
  m = w.match(/^(Hoarseness|Cough|Fatigue) (.+)$/i); if (m) return [m[1], m[2]];
  if (/^Ever smoked$/i.test(w)) return ['Smoking', 'Ever smoked'];
  if (/^Age /.test(w)) return ['Age', w.slice(4)];
  return [w, ''];
}

function Packet({ p }: { p: Row }) {
  const { r, answers: a, voice } = p;
  const meta = LEVEL_META[r.level];
  const actions = r.findings.filter((f) => f.level !== 'info');
  const [main, ...others] = actions;
  const unticked = r.textMentions.filter((m) => !m.negated && !m.alsoTicked);
  const [more, setMore] = useState(false);
  const ms = main ? step(main) : undefined;

  return (
    <section className="space-y-6 min-w-0">
      <div className="card overflow-hidden">
        <div className="px-6 md:px-8 pt-6 pb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-2xl md:text-3xl text-deep">{p.name}{a.age ? `, ${a.age}` : ''}</h2>
          <span className="text-[15px] text-muted-foreground">{p.appointment} · “{p.reason}”</span>
        </div>

        {/* Next step */}
        <div className="px-6 md:px-8 py-6" style={{ background: meta.bg }}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <LevelBadge level={r.level} long />
            {main && <span className="text-sm text-muted-foreground">Based on {BASIS[main.source] ?? main.source}</span>}
          </div>
          {main && ms ? (
            <>
              <p className="text-2xl md:text-3xl leading-tight text-deep font-medium">{ms.title}</p>
              {ms.sub && <p className="text-lg text-deep/70 mt-1">{ms.sub}</p>}
              {others.length > 0 && (
                <div className="mt-5 pt-4 border-t border-deep/10">
                  <p className="text-sm text-muted-foreground mb-2">Also</p>
                  <ul className="space-y-1.5">
                    {others.map((f) => (
                      <li key={f.id} className="flex gap-2.5 items-baseline text-deep">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 translate-y-[-2px]" style={{ background: LEVEL_META[f.level].color }} />
                        <span>{step(f).title}{step(f).sub && <span className="text-muted-foreground"> · {step(f).sub}</span>}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-2xl md:text-3xl text-deep font-medium">No warning signs. Use the visit as planned.</p>
          )}
        </div>

        {/* Why */}
        {actions.length > 0 && (
          <div className="px-6 md:px-8 py-6">
            <h3 className="text-sm text-muted-foreground mb-4">Why</h3>
            <div className="space-y-6">
              {actions.map((f) => <Reason key={f.id} f={f} />)}
            </div>
            {unticked.length > 0 && (
              <p className="mt-6 rounded-2xl bg-[#eaf1f7] text-[#3e6a93] px-5 py-3">
                <b className="font-medium">Ask about:</b> {unticked.map((m) => SYMPTOM_LABEL[m.symptom].toLowerCase()).join(', ')}. Mentioned in their own words but not ticked.
              </p>
            )}
          </div>
        )}
      </div>

      {main && ms?.to && <Handoff p={p} main={main} />}

      {p.cxr && <XrayCard p={p} context={`Age ${a.age ?? 'unknown'}. ${main ? main.title + '. ' : ''}${r.findings.filter((f) => f.level !== 'info').flatMap((f) => f.why).join('; ')}.`} />}

      <Notes p={p} />

      <button onClick={() => setMore(!more)} className="w-full card px-6 py-4 flex items-center justify-between text-deep hover:bg-mist/40 transition-colors">
        <span>Voice, scores and the patient’s own words</span>
        <ChevronDown size={18} className={`transition-transform ${more ? 'rotate-180' : ''}`} />
      </button>
      {more && (
        <div className="space-y-6">
          <div className={`grid grid-cols-1 gap-6 ${voice ? 'xl:grid-cols-[1.15fr_1fr]' : ''}`}>
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
        </div>
      )}
    </section>
  );
}

function Reason({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false);
  const rows = f.why.map(kv);
  return (
    <div>
      <div className="flex items-start gap-3 mb-2">
        <span className="mt-2.5 w-2 h-2 rounded-full shrink-0" style={{ background: LEVEL_META[f.level].color }} />
        <p className="text-lg text-deep leading-snug">{f.title}</p>
      </div>
      <dl className="ml-5 grid grid-cols-[minmax(96px,max-content)_minmax(0,1fr)] gap-x-5 gap-y-1 text-[15px]">
        {rows.map(([k, v]) => (
          v ? (
            <div key={k + v} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-deep min-w-0">{v}</dd>
            </div>
          ) : (
            <dd key={k} className="col-span-2 text-deep min-w-0">{k}</dd>
          )
        ))}
      </dl>
      <button onClick={() => setOpen(!open)} className="ml-5 mt-2 text-sm text-primary">{open ? 'Hide rule' : `Rule: ${BASIS[f.source] ?? f.source}`}</button>
      {open && <p className="ml-5 text-[15px] text-muted-foreground mt-1 max-w-2xl">{f.rule} <Cite k={f.source}>source</Cite></p>}
    </div>
  );
}

function referralText(p: Row, main: Finding) {
  const { r, answers: a, voice } = p;
  const s = STEP[main.id];
  const lines = [
    `REFERRAL: ${s?.to}`,
    `Urgency: ${LEVEL_META[main.level].label}, within ${s?.within ?? '2 weeks'}`,
    `Patient: ${p.name}${a.age ? `, ${a.age} y` : ''}`,
    '',
    `Question: ${s?.sub}. ${main.title}.`,
    `Basis: ${BASIS[main.source] ?? main.source}. ${main.rule}`,
    '',
    'Findings:',
    ...main.why.map((w) => `- ${w}`),
    ...r.findings.filter((f) => f.id !== main.id && f.level !== 'info' && f.id !== 'lung-plco').map((f) => `- Also: ${f.title}`),
    '',
    'Scores:',
    ...(r.scores.plco !== undefined ? [`- PLCOm2012 6-year lung cancer risk ${(r.scores.plco * 100).toFixed(1)}%`] : []),
    ...(r.scores.vhi10 !== undefined ? [`- VHI-10 ${r.scores.vhi10}/40`] : []),
    ...(voice?.cpps !== undefined ? [`- Voice clarity (CPPS) ${voice.cpps.toFixed(1)} dB`] : []),
    ...(r.scores.g8 !== undefined ? [`- G8 ${r.scores.g8}/17`] : []),
    ...(a.freeText ? ['', `Patient's own words: "${a.freeText}"`] : []),
    '',
    'Attached: structured history, EQ-5D-5L profile' + (r.scores.g8 !== undefined ? ', G8' : '') + ', FHIR QuestionnaireResponse.',
  ];
  return lines.join('\n');
}

function Handoff({ p, main }: { p: Row; main: Finding }) {
  const s = STEP[main.id]!;
  const [view, setView] = useState(false);
  const [sent, setSent] = useState(false);
  const text = referralText(p, main);
  const stages = [
    ['Flagged', 'Today', true],
    ['Referral sent', sent ? 'Today' : 'Waiting', sent],
    [s.to!.split(':')[0].split(' (')[0], `Target within ${s.within}`, false],
  ] as const;
  return (
    <div className="card p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-lg text-deep">Referral draft is ready</p>
          <p className="text-[15px] text-muted-foreground">To {s.to}. Filled from the answers, scores and guideline rule. Review before sending.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setView(!view)} className="btn-ghost py-2 px-4 text-[15px]">{view ? 'Hide draft' : 'Review draft'}</button>
          <button onClick={() => setSent(true)} disabled={sent} className="btn-primary py-2 px-4 text-[15px] disabled:opacity-60">{sent ? 'Sent' : 'Send referral'}</button>
        </div>
      </div>
      {view && <pre className="whitespace-pre-wrap text-[14px] bg-mist rounded-2xl p-5 font-mono leading-relaxed text-deep mb-5">{text}</pre>}
      <ol className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2">
        {stages.map(([l, d, done]) => (
          <li key={l} className="min-w-0 break-words">
            <div className={`h-1.5 rounded-full mb-2 ${done ? 'bg-primary' : 'bg-mist'}`} />
            <p className={`text-[15px] ${done ? 'text-deep' : 'text-muted-foreground'}`}>{l}</p>
            <p className="text-sm text-muted-foreground">{d}</p>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted-foreground mt-4">SEULA follows the patient until the specialist visit and alerts the health station if nothing is booked within {s.within}.</p>
    </div>
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
        <button onClick={copy} className="btn-primary py-2.5 px-5"><ClipboardCopy size={17} /> {copied ? 'Copied' : <><span className="sm:hidden">Copy to record</span><span className="hidden sm:inline">Copy history to patient record</span></>}</button>
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
