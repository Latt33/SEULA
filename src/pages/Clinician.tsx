import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarClock, ClipboardCopy, Clock, FileJson, Mic, Paperclip, Stethoscope, Timer, UserRound } from 'lucide-react';
import { Cite, LevelBadge, Page } from '../components/ui';
import { DEMO_PATIENTS, DemoPatient } from '../data/demoPatients';
import { assess, Assessment, DURATION_LABEL, LEVEL_META, PLCO_THRESHOLD, SYMPTOM_LABEL, SymptomKey, G8_THRESHOLD, VHI10_THRESHOLD } from '../engine/questionnaire';
import { anamnesis, toFhir } from '../engine/report';
import { VOICE_REFERENCES, VoiceFeatures } from '../engine/voice';
import { useSession } from '../store/session';

type Row = DemoPatient & { r: Assessment; isMe?: boolean };
const RANK = { urgent: 3, investigate: 2, review: 1, info: 0 };

export function Clinician() {
  const { submission } = useSession();
  const [params] = useSearchParams();
  const rows: Row[] = useMemo(() => {
    const base: Row[] = DEMO_PATIENTS.map((p) => ({ ...p, r: assess(p.answers, sig(p.voice)) }));
    if (submission) {
      base.unshift({ id: 'me', name: 'You (live demo)', appointment: '08:00', reason: 'Submitted from the patient form', answers: submission.answers, voice: submission.voice, symptomOnsetDaysAgo: 0, completedDaysAgo: 0, isMe: true, r: assess(submission.answers, sig(submission.voice)) });
    }
    return base.sort((x, y) => (x.isMe ? -1 : y.isMe ? 1 : RANK[y.r.level] - RANK[x.r.level] || x.appointment.localeCompare(y.appointment)));
  }, [submission]);
  const [sel, setSel] = useState<string>(params.get('p') === 'me' && submission ? 'me' : rows[0].id);
  const p = rows.find((x) => x.id === sel) ?? rows[0];
  const needTest = rows.filter((x) => x.r.level === 'urgent' || x.r.level === 'investigate').length;

  return (
    <Page wide>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-2">Health centre · Dr. view · Monday morning list</p>
          <h1 className="text-3xl md:text-4xl">Every patient arrives pre-triaged.</h1>
        </div>
        <div className="flex gap-6 text-sm">
          <Mini icon={<UserRound size={16} />} v={rows.length} l="appointments with SEULA history" />
          <Mini icon={<CalendarClock size={16} />} v={needTest} l="need a test within 2 weeks" />
          <Mini icon={<Timer size={16} />} v={`~${rows.length * 2} min`} l="history-taking saved (2 min/visit)" />
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-5">
        <aside className="card p-2 h-fit lg:sticky lg:top-20">
          {rows.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} className={`w-full text-left p-3 rounded-lg flex gap-3 items-start transition-colors ${sel === x.id ? 'bg-muted/60' : 'hover:bg-muted/30'}`}>
              <span className="text-xs tnum text-muted-foreground pt-0.5 w-10">{x.appointment}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium truncate">{x.name}{x.isMe && <span className="ml-1 chip bg-primary/10 text-primary">live</span>}</span>
                <span className="block text-xs text-muted-foreground truncate">{x.reason}</span>
              </span>
              <LevelBadge level={x.r.level} />
            </button>
          ))}
        </aside>
        <Packet p={p} />
      </div>
    </Page>
  );
}

function sig(v?: VoiceFeatures) {
  return v ? { cpps: v.cpps, jitter: v.jitterLocal, shimmer: v.shimmerLocal, hnrSd: v.hnrSd, mpt: v.mpt, qualityOk: v.quality.ok } : undefined;
}

function Mini({ icon, v, l }: { icon: React.ReactNode; v: React.ReactNode; l: string }) {
  return (
    <div className="max-w-[150px]">
      <div className="flex items-center gap-1.5 text-lg font-bold tnum">{icon}{v}</div>
      <div className="text-xs text-muted-foreground leading-tight">{l}</div>
    </div>
  );
}

function Packet({ p }: { p: Row }) {
  const { r, answers: a, voice } = p;
  const [lang, setLang] = useState<'en' | 'fi'>('en');
  const [copied, setCopied] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const text = anamnesis(a, r, voice, undefined, lang);
  const meta = LEVEL_META[r.level];
  const actions = r.findings.filter((f) => f.level !== 'info');
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
    <section className="space-y-4 min-w-0">
      <div className="card p-5 md:p-6" style={{ borderTop: `4px solid ${meta.color}` }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl">{p.name}</h2>
            <p className="text-muted-foreground text-sm">{a.age} y · {a.sex === 'f' ? 'female' : 'male'} · {p.appointment} · “{p.reason}”</p>
          </div>
          <LevelBadge level={r.level} long />
        </div>
        {actions.length ? (
          <div className="rounded-lg p-4 mb-1" style={{ background: meta.bg }}>
            <p className="eyebrow mb-1" style={{ color: meta.color }}>Suggested next step</p>
            <ul className="space-y-1">
              {actions.map((f) => <li key={f.id} className="font-semibold">{f.action}</li>)}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground">No red-flag criteria met. The structured history below is ready for the visit.</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="eyebrow mb-3">Why: rules that fired</p>
          {r.findings.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
          <div className="space-y-4">
            {r.findings.map((f) => (
              <div key={f.id}>
                <div className="flex items-center gap-2 mb-1"><LevelBadge level={f.level} /><span className="font-medium text-sm">{f.title}</span></div>
                <ul className="text-sm text-muted-foreground list-disc ml-5">{f.why.map((w) => <li key={w}>{w}</li>)}</ul>
                <p className="text-xs text-muted-foreground/90 mt-1 italic">{f.rule} <Cite k={f.source}>source</Cite></p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="eyebrow mb-3">Standardised scores</p>
          <div className="space-y-4">
            <Gauge label="PLCOm2012 6-yr lung cancer risk" value={r.scores.plco !== undefined ? r.scores.plco * 100 : undefined} unit="%" threshold={PLCO_THRESHOLD * 100} max={10} dir="above" cite="plco" na="Never smoked" />
            <Gauge label="VHI-10 voice handicap" value={r.scores.vhi10} unit="/40" threshold={VHI10_THRESHOLD} max={40} dir="above" cite="arffa2012" na="Asked only with voice change" />
            <Gauge label="G8 frailty screen" value={r.scores.g8} unit="/17" threshold={G8_THRESHOLD} max={17} dir="below" cite="bellera2012" na="Asked from age 70" />
            <div className="text-sm flex flex-wrap gap-x-6 gap-y-1 pt-1">
              <span><span className="text-muted-foreground">Pack-years</span> <b className="tnum">{r.scores.packYears?.toFixed(0) ?? '–'}</b></span>
              <span><span className="text-muted-foreground">BMI</span> <b className="tnum">{r.scores.bmi?.toFixed(1) ?? '–'}</b></span>
              <span><span className="text-muted-foreground">EQ-5D-5L</span> <b className="tnum">{a.eq5d ? ['mobility', 'selfcare', 'activities', 'pain', 'anxiety'].map((k) => a.eq5d![k as 'pain'] ?? '·').join('') : '–'}</b> <span className="text-muted-foreground">VAS</span> <b className="tnum">{a.eqVas ?? '–'}</b></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="eyebrow mb-3 flex items-center gap-1.5"><Mic size={13} /> Voice, analysed on the patient’s phone</p>
          {voice ? (
            <>
              <div className="space-y-3">
                <Gauge label="CPPS, smoothed cepstral peak prominence" value={voice.cpps} unit=" dB" threshold={VOICE_REFERENCES.cpps.threshold} max={25} dir="below" cite="murton2020" />
                <Gauge label="Jitter (local)" value={voice.jitterLocal} unit="%" threshold={VOICE_REFERENCES.jitterLocal.threshold} max={4} dir="above" cite="teixeira2013" />
                <Gauge label="Shimmer (local)" value={voice.shimmerLocal} unit="%" threshold={VOICE_REFERENCES.shimmerLocal.threshold} max={12} dir="above" cite="teixeira2013" />
              </div>
              <div className="text-sm flex flex-wrap gap-x-5 gap-y-1 mt-3">
                <span><span className="text-muted-foreground">HNR</span> <b className="tnum">{voice.hnrMean.toFixed(1)} dB</b> <span className="text-muted-foreground">(SD {voice.hnrSd.toFixed(1)})</span></span>
                <span><span className="text-muted-foreground">MPT</span> <b className="tnum">{voice.mpt.toFixed(1)} s</b></span>
                <span><span className="text-muted-foreground">F0</span> <b className="tnum">{voice.f0Mean.toFixed(0)} Hz</b></span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Voice measures can prompt a question; they never raise the triage level on their own. Values on the Praat scale (see <Link to="/evidence" className="underline">validation</Link>).</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No recording.</p>
          )}
        </div>

        <div className="card p-5">
          <p className="eyebrow mb-3">In the patient’s own words</p>
          {a.freeText ? <Highlighted text={a.freeText} mentions={r.textMentions.filter((m) => !m.negated).map((m) => ({ phrase: m.phrase, ticked: m.alsoTicked, s: m.symptom }))} /> : <p className="text-sm text-muted-foreground">–</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(a.symptoms).map(([k, d]) => <span key={k} className="chip bg-muted/60">{SYMPTOM_LABEL[k as SymptomKey]} · {DURATION_LABEL[d!]}</span>)}
          </div>
          <div className="mt-5 pt-4 border-t border-line">
            <p className="eyebrow mb-2 flex items-center gap-1.5"><Clock size={13} /> Pathway timestamps (Goal 3.1.2 indicator)</p>
            <Timeline onset={p.symptomOnsetDaysAgo} completed={p.completedDaysAgo} live={!!p.isMe} />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="eyebrow">Structured history, ready for the EHR</p>
          <div className="flex gap-2 flex-wrap">
            <div className="flex text-xs rounded-lg border border-line overflow-hidden">
              {(['en', 'fi'] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={`px-2.5 py-1.5 ${lang === l ? 'bg-muted font-semibold' : 'bg-white'}`}>{l.toUpperCase()}</button>)}
            </div>
            <button onClick={copy} className="btn-ghost py-1.5 px-3 text-sm"><ClipboardCopy size={15} /> {copied ? 'Copied' : 'Copy to EHR'}</button>
            <button onClick={() => setShowRef(!showRef)} className="btn-ghost py-1.5 px-3 text-sm"><Paperclip size={15} /> Referral attachment</button>
            <button onClick={fhir} className="btn-ghost py-1.5 px-3 text-sm"><FileJson size={15} /> FHIR</button>
          </div>
        </div>
        <pre className="whitespace-pre-wrap text-sm bg-background rounded-lg p-4 border border-line font-mono leading-relaxed">{text}</pre>
        {showRef && (
          <div className="mt-3 rounded-lg border border-brand-blue/30 bg-blue-50/50 p-4 text-sm">
            <p className="font-semibold mb-1 flex items-center gap-1.5"><Stethoscope size={15} /> Attached to specialist referral automatically</p>
            <p className="text-muted-foreground">G8 {r.scores.g8 ?? 'n/a (under 70)'} · EQ-5D-5L profile and VAS · voice measures · symptom durations · date of first symptom. This closes strategy action 3.4.2 (functional data in referrals) and 3.3.1 (symptom and quality-of-life data) without extra work for the GP.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Gauge({ label, value, unit, threshold, max, dir, cite, na }: { label: string; value?: number; unit: string; threshold: number; max: number; dir: 'above' | 'below'; cite: string; na?: string }) {
  if (value === undefined || Number.isNaN(value)) return (
    <div><div className="flex justify-between text-sm"><span>{label}</span><span className="text-muted-foreground">{na ?? '–'}</span></div></div>
  );
  const abn = dir === 'above' ? value > threshold : value <= threshold;
  const pos = Math.min(100, Math.max(0, (value / max) * 100));
  const tpos = Math.min(100, (threshold / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label} <Cite k={cite}>ref</Cite></span>
        <b className="tnum" style={{ color: abn ? '#b42318' : undefined }}>{value.toFixed(value < 100 ? 1 : 0)}{unit}{abn ? ' ▲' : ''}</b>
      </div>
      <div className="relative h-2 rounded-full bg-muted">
        <div className="absolute inset-y-0 rounded-full" style={{ left: dir === 'above' ? `${tpos}%` : 0, width: dir === 'above' ? `${100 - tpos}%` : `${tpos}%`, background: '#fde2dc' }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow" style={{ left: `calc(${pos}% - 6px)`, background: abn ? '#b42318' : '#1a1a18' }} />
        <div className="absolute -top-1 bottom-[-4px] w-px bg-foreground/50" style={{ left: `${tpos}%` }} />
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5">cut-off {threshold}{unit} ({dir === 'above' ? 'abnormal above' : 'abnormal at or below'})</div>
    </div>
  );
}

function Highlighted({ text, mentions }: { text: string; mentions: { phrase: string; ticked: boolean; s: SymptomKey }[] }) {
  return (
    <div>
      <p className="prose-serif italic leading-relaxed">“{text}”</p>
      {mentions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mentions.map((m) => (
            <span key={m.s} className={`chip ${m.ticked ? 'bg-muted/60 text-muted-foreground' : 'bg-blue-50 text-[#175cd3] border border-[#175cd3]/30'}`}>
              {SYMPTOM_LABEL[m.s]}{m.ticked ? ' ✓ also ticked' : ' · not ticked, verify'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Timeline({ onset, completed, live }: { onset: number; completed: number; live: boolean }) {
  const pts = live
    ? [{ l: 'Form completed', d: 'today' }, { l: 'Appointment', d: 'today' }]
    : [
        { l: 'First symptom (reported)', d: `${onset} d ago` },
        { l: 'Form completed', d: `${completed} d ago` },
        { l: 'Appointment', d: 'today' },
        { l: 'Test / referral', d: 'target ≤ 14 d' },
      ];
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {pts.map((x, i) => (
        <li key={x.l} className="flex items-center gap-2">
          <span className="rounded-lg border border-line bg-white px-2 py-1"><span className="block text-muted-foreground">{x.l}</span><b className="tnum">{x.d}</b></span>
          {i < pts.length - 1 && <span className="text-muted-foreground">→</span>}
        </li>
      ))}
    </ol>
  );
}
