import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, Mic, PhoneCall, ShieldCheck } from 'lucide-react';
import { Wordmark } from '../components/ui';
import { Recorder } from '../components/Recorder';
import { Answers, Duration, SymptomKey } from '../engine/questionnaire';
import { analyzeReadSpeech, analyzeSustainedVowel, SpeechFeatures, VoiceFeatures } from '../engine/voice';
import { EQ_DIMS, EQ_LEVELS, G8_ITEMS, Lang, SYMPTOMS_I18N, T, VHI10 } from '../data/i18n';
import { useSession } from '../store/session';

const SYMPTOM_GROUPS: SymptomKey[][] = [
  ['cough', 'haemoptysis', 'sob', 'chestPain', 'chestInfections'],
  ['fatigue', 'weightLoss', 'appetiteLoss'],
  ['hoarseness', 'neckLump', 'dysphagia'],
  ['rectalBleeding', 'bowelChange', 'abdominalPain'],
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
const inputCls = 'w-full rounded-2xl border border-line bg-white px-4 py-3 text-lg tnum focus:outline-none focus:ring-2 focus:ring-primary/30';

function Choice({ options, value, onChange }: { options: { v: string | number; label: string }[]; value: unknown; onChange: (v: never) => void }) {
  return (
    <div className="grid gap-2">
      {options.map((o) => (
        <button key={String(o.v)} type="button" onClick={() => onChange(o.v as never)} className={`text-left px-5 py-3.5 rounded-2xl border transition-colors ${value === o.v ? 'border-primary bg-sage text-deep font-medium' : 'border-line bg-white hover:bg-mist'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Check() {
  const [lang, setLang] = useState<Lang>('fi');
  const t = T[lang];
  const [a, setA] = useState<Answers>({ symptoms: {} });
  const [step, setStep] = useState(0);
  const [voice, setVoice] = useState<VoiceFeatures>();
  const [speech, setSpeech] = useState<SpeechFeatures>();
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recog = useRef<{ stop: () => void } | null>(null);
  const { setSubmission } = useSession();
  const nav = useNavigate();
  const set = (p: Partial<Answers>) => setA((x) => ({ ...x, ...p }));

  const steps = useMemo(() => {
    const s = ['intro', 'about', 'smoking', 'symptoms'];
    if (a.symptoms.hoarseness) s.push('vhi');
    if ((a.age ?? 0) >= 70) s.push('g8');
    s.push('eq', 'voice', 'words', 'done');
    return s;
  }, [a.symptoms.hoarseness, a.age]);
  const cur = steps[step];
  const progress = step / (steps.length - 1);

  const canNext = () => {
    if (cur === 'about') return !!a.age && a.age >= 18 && a.age < 110 && !!a.sex;
    if (cur === 'smoking') return !!a.smoking && (a.smoking === 'never' || (!!a.cigsPerDay && !!a.yearsSmoked && (a.smoking === 'current' || a.yearsSinceQuit !== undefined)));
    if (cur === 'vhi') return a.vhi10?.length === 10 && a.vhi10.every((v) => v !== undefined);
    if (cur === 'g8') return G8_ITEMS.every((i) => a.g8?.[i.key] !== undefined);
    if (cur === 'eq') return EQ_DIMS.every((d) => a.eq5d?.[d.key] !== undefined) && a.eqVas !== undefined;
    return true;
  };

  const finish = () => {
    const completedAt = new Date().toISOString();
    setSubmission({ answers: { ...a, completedAt }, voice, speech, completedAt });
    setStep(steps.indexOf('done'));
  };

  const toggleSymptom = (k: SymptomKey) => {
    const s = { ...a.symptoms };
    if (s[k]) delete s[k];
    else s[k] = '3to6w';
    set({ symptoms: s });
  };

  const dictate = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    type SR = { lang: string; continuous: boolean; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; start: () => void; stop: () => void };
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!C) return;
    if (listening) {
      recog.current?.stop();
      return;
    }
    const r = new C();
    r.lang = lang === 'fi' ? 'fi-FI' : 'en-GB';
    r.continuous = true;
    r.interimResults = false;
    const base = a.freeText ? a.freeText + ' ' : '';
    r.onresult = (e) => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript + ' ';
      set({ freeText: (base + txt).trim() });
    };
    r.onend = () => setListening(false);
    r.start();
    recog.current = r;
    setListening(true);
  };
  const hasDictation = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const redFlag = !!(a.symptoms.haemoptysis || a.symptoms.dysphagia);

  return (
    <div className="min-h-[100dvh] bg-mist flex flex-col">
      <header className="px-5 h-16 flex items-center justify-between border-b border-line bg-white/90 sticky top-0 z-10 backdrop-blur">
        <Link to="/"><Wordmark /></Link>
        <div className="flex items-center gap-1 text-sm">
          {(['fi', 'en'] as Lang[]).map((l) => (
            <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 rounded-full ${lang === l ? 'bg-sage text-deep font-medium' : 'text-muted-foreground'}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>
      <div className="h-1 bg-sage">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress * 100}%` }} />
      </div>

      <main className="flex-1 w-full max-w-lg mx-auto px-5 py-8">
        {cur === 'intro' && (
          <div>
            <p className="eyebrow mb-3">Terveysasema · Health centre</p>
            <h1 className="text-4xl text-deep mb-4">{t.title}</h1>
            <p className="prose-serif text-lg text-muted-foreground leading-relaxed mb-8">{t.intro}</p>
            <div className="card p-4 mb-8 space-y-3 text-sm">
              <div className="flex gap-3 items-start"><Lock size={18} className="text-primary mt-0.5 shrink-0" /><span>{lang === 'fi' ? 'Ääni käsitellään vain tässä laitteessa.' : 'Audio is processed only on this device.'}</span></div>
              <div className="flex gap-3 items-start"><ShieldCheck size={18} className="text-primary mt-0.5 shrink-0" /><span>{lang === 'fi' ? 'Kysymykset perustuvat kansainvälisiin, tutkittuihin mittareihin.' : 'Questions come from validated, international instruments.'}</span></div>
              <div className="flex gap-3 items-start"><PhoneCall size={18} className="text-primary mt-0.5 shrink-0" /><span>{lang === 'fi' ? 'Kiireellisissä asioissa soita 116117 tai hätätilanteessa 112.' : 'If urgent, call 116117, or 112 in an emergency.'}</span></div>
            </div>
          </div>
        )}

        {cur === 'about' && (
          <div>
            <h2 className="text-3xl text-deep mb-6">{t.aboutYou}</h2>
            <Field label={t.age}><input className={inputCls} type="number" inputMode="numeric" value={a.age ?? ''} onChange={(e) => set({ age: e.target.value ? +e.target.value : undefined })} /></Field>
            <Field label={t.sex}><Choice options={[{ v: 'f', label: t.female }, { v: 'm', label: t.male }]} value={a.sex} onChange={(v) => set({ sex: v })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.height}><input className={inputCls} type="number" inputMode="numeric" value={a.heightCm ?? ''} onChange={(e) => set({ heightCm: e.target.value ? +e.target.value : undefined })} /></Field>
              <Field label={t.weight}><input className={inputCls} type="number" inputMode="numeric" value={a.weightKg ?? ''} onChange={(e) => set({ weightKg: e.target.value ? +e.target.value : undefined })} /></Field>
            </div>
          </div>
        )}

        {cur === 'smoking' && (
          <div>
            <h2 className="text-3xl text-deep mb-6">{t.smokingT}</h2>
            <Field label=""><Choice options={[{ v: 'never', label: t.never }, { v: 'former', label: t.former }, { v: 'current', label: t.current }]} value={a.smoking} onChange={(v) => set({ smoking: v })} /></Field>
            {(a.smoking === 'former' || a.smoking === 'current') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t.cpd}><input className={inputCls} type="number" inputMode="numeric" value={a.cigsPerDay ?? ''} onChange={(e) => set({ cigsPerDay: e.target.value ? +e.target.value : undefined })} /></Field>
                  <Field label={t.years}><input className={inputCls} type="number" inputMode="numeric" value={a.yearsSmoked ?? ''} onChange={(e) => set({ yearsSmoked: e.target.value ? +e.target.value : undefined })} /></Field>
                </div>
                {a.smoking === 'former' && <Field label={t.quit}><input className={inputCls} type="number" inputMode="numeric" value={a.yearsSinceQuit ?? ''} onChange={(e) => set({ yearsSinceQuit: e.target.value ? +e.target.value : undefined })} /></Field>}
                <Field label={t.education}>
                  <select className={inputCls} value={a.education ?? ''} onChange={(e) => set({ education: (+e.target.value || undefined) as Answers['education'] })}>
                    <option value="">–</option>
                    {t.eduOpts.map((o, i) => <option key={o} value={i + 1}>{o}</option>)}
                  </select>
                </Field>
              </>
            )}
            <div className="space-y-2 mt-2">
              {([['copd', t.copd], ['cancerHistory', t.cancerHx], ['familyLungCancer', t.famLung], ['asbestos', t.asbestos]] as [keyof Answers, string][]).map(([k, label]) => (
                <label key={k} className="flex gap-3 items-start p-3 rounded-xl bg-white border border-line cursor-pointer">
                  <input type="checkbox" className="mt-1 accent-[var(--primary)] w-4 h-4" checked={!!a[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Answers>)} />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {cur === 'symptoms' && (
          <div>
            <h2 className="text-3xl text-deep mb-2">{t.symptomsT}</h2>
            <p className="text-sm text-muted-foreground mb-5">{t.symptomsHint}</p>
            {SYMPTOM_GROUPS.map((g, gi) => (
              <div key={gi} className="card mb-3 divide-y divide-line">
                {g.map((k) => {
                  const on = a.symptoms[k] !== undefined;
                  return (
                    <div key={k} className="p-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 accent-[var(--primary)]" checked={on} onChange={() => toggleSymptom(k)} />
                        <span className={on ? 'font-medium' : ''}>{SYMPTOMS_I18N[k][lang]}</span>
                      </label>
                      {on && (
                        <div className="grid grid-cols-3 gap-1.5 mt-2 ml-8">
                          {(['lt3w', '3to6w', 'gt6w'] as Duration[]).map((d) => (
                            <button key={d} onClick={() => set({ symptoms: { ...a.symptoms, [k]: d } })} className={`text-xs py-1.5 rounded-lg border ${a.symptoms[k] === d ? 'border-primary bg-sage text-deep font-medium' : 'border-line bg-white'}`}>
                              {t.dur[d]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {redFlag && (
              <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-4 text-sm flex gap-3"><PhoneCall size={18} className="shrink-0 mt-0.5" />{t.redFlag}</div>
            )}
          </div>
        )}

        {cur === 'vhi' && (
          <div>
            <h2 className="text-3xl text-deep mb-2">{t.vhiT}</h2>
            <p className="text-sm text-muted-foreground mb-5">{t.vhiHint}</p>
            {VHI10[lang].map((q, i) => (
              <div key={i} className="mb-4">
                <p className="text-sm mb-2">{i + 1}. {q}</p>
                <div className="grid grid-cols-5 gap-1">
                  {t.vhiScale.map((lab, v) => (
                    <button key={v} title={lab} onClick={() => { const arr = [...(a.vhi10 ?? Array(10).fill(undefined))]; arr[i] = v; set({ vhi10: arr }); }} className={`py-2 rounded-lg border text-sm ${a.vhi10?.[i] === v ? 'border-primary bg-sage text-deep font-medium' : 'border-line bg-white'}`}>{v}</button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">0 = {t.vhiScale[0]} · 4 = {t.vhiScale[4]}</p>
          </div>
        )}

        {cur === 'g8' && (
          <div>
            <h2 className="text-3xl text-deep mb-2">{t.g8T}</h2>
            <p className="text-sm text-muted-foreground mb-5">{t.g8Hint}</p>
            {G8_ITEMS.map((it) => (
              <div key={it.key} className="mb-5">
                <p className="text-sm font-medium mb-2">{it[lang]}</p>
                <Choice options={it.opts.map((o) => ({ v: o.v, label: o[lang] }))} value={a.g8?.[it.key]} onChange={(v) => set({ g8: { ...a.g8, [it.key]: v } })} />
              </div>
            ))}
          </div>
        )}

        {cur === 'eq' && (
          <div>
            <h2 className="text-3xl text-deep mb-2">{t.eqT}</h2>
            <p className="text-sm text-muted-foreground mb-5">{t.eqHint}</p>
            {EQ_DIMS.map((d) => (
              <div key={d.key} className="mb-4">
                <p className="text-sm font-medium mb-2">{d[lang]}</p>
                <div className="grid grid-cols-5 gap-1">
                  {EQ_LEVELS[lang].map((lab, i) => (
                    <button key={i} onClick={() => set({ eq5d: { ...a.eq5d, [d.key]: (i + 1) as 1 } })} className={`py-2 px-1 rounded-lg border text-[11px] leading-tight ${a.eq5d?.[d.key] === i + 1 ? 'border-primary bg-sage text-deep font-medium' : 'border-line bg-white'}`}>{lab}</button>
                  ))}
                </div>
              </div>
            ))}
            <Field label={t.vas}>
              <input type="range" min={0} max={100} value={a.eqVas ?? 50} onChange={(e) => set({ eqVas: +e.target.value })} onClick={(e) => set({ eqVas: +(e.target as HTMLInputElement).value })} className={`w-full ${a.eqVas === undefined ? 'opacity-50' : ''}`} />
              <div className="text-center text-2xl font-bold tnum">{a.eqVas ?? '–'}</div>
            </Field>
          </div>
        )}

        {cur === 'voice' && (
          <div>
            <h2 className="text-3xl text-deep mb-2 flex items-center gap-2"><Mic size={22} className="text-primary" /> {t.voiceT}</h2>
            <div className="card p-5 mb-4">
              <p className="text-sm mb-1 font-semibold">1 / 2</p>
              <p className="prose-serif text-muted-foreground mb-2">{t.vowelHint}</p>
              <Recorder maxSeconds={25} labels={{ start: t.recStart, stop: t.recStop, again: t.recAgain, denied: t.recDenied, done: t.recDone }} onDone={(x, sr) => { setBusy(true); setTimeout(() => { setVoice(analyzeSustainedVowel(x, sr)); setBusy(false); }, 30); }} />
              {voice && <QualityNote q={voice.quality} label={t.quality} />}
            </div>
            <div className="card p-5">
              <p className="text-sm mb-1 font-semibold">2 / 2</p>
              <p className="prose-serif text-muted-foreground mb-3">{t.readHint}</p>
              <blockquote className="prose-serif text-lg leading-relaxed border-l-2 border-primary/40 pl-4 mb-2">{t.passage}</blockquote>
              <Recorder maxSeconds={30} labels={{ start: t.recStart, stop: t.recStop, again: t.recAgain, denied: t.recDenied, done: t.recDone }} onDone={(x, sr) => { setBusy(true); setTimeout(() => { setSpeech(analyzeReadSpeech(x, sr)); setBusy(false); }, 30); }} />
            </div>
            {busy && <p className="text-sm text-center text-muted-foreground mt-3">{t.analysing}</p>}
          </div>
        )}

        {cur === 'words' && (
          <div>
            <h2 className="text-3xl text-deep mb-2">{t.ownWordsT}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t.ownWordsHint}</p>
            <textarea className={`${inputCls} text-base min-h-[160px] prose-serif`} value={a.freeText ?? ''} onChange={(e) => set({ freeText: e.target.value })} />
            {hasDictation && (
              <div className="mt-3 flex items-center gap-3">
                <button onClick={dictate} className={`btn-ghost text-sm py-2 ${listening ? 'border-primary text-primary' : ''}`}><Mic size={16} /> {listening ? '■' : t.dictate}</button>
                <span className="text-xs text-muted-foreground">{t.dictateNote}</span>
              </div>
            )}
          </div>
        )}

        {cur === 'done' && (
          <div className="text-center pt-8">
            <div className="mx-auto w-20 h-20 rounded-full bg-sage flex items-center justify-center mb-6"><ShieldCheck className="text-primary" size={34} /></div>
            <h2 className="text-3xl mb-3">{t.doneT}</h2>
            <p className="prose-serif text-lg text-muted-foreground mb-8">{t.doneText}</p>
            {redFlag && <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-4 text-sm mb-6 text-left">{t.redFlag}</div>}
            <button className="btn-primary" onClick={() => nav('/clinician?p=me')}>{t.seeDoctor} <ArrowRight size={18} /></button>
          </div>
        )}
      </main>

      {cur !== 'done' && (
        <footer className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-line">
          <div className="max-w-lg mx-auto px-5 py-3 flex gap-3">
            {step > 0 && <button className="btn-ghost" onClick={() => setStep(step - 1)} aria-label={t.back}><ArrowLeft size={18} /></button>}
            <button className="btn-primary flex-1 disabled:opacity-40 disabled:shadow-none" disabled={!canNext() || busy} onClick={() => (cur === 'words' ? finish() : setStep(step + 1))}>
              {cur === 'intro' ? t.start : cur === 'voice' && !voice ? t.skip : t.next} <ArrowRight size={18} />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

function QualityNote({ q, label }: { q: VoiceFeatures['quality']; label: string }) {
  return (
    <div className={`text-xs rounded-lg px-3 py-2 ${q.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
      {label}: {q.ok ? 'OK' : q.warnings.join(' ')} · {q.durationS.toFixed(1)} s · SNR {q.snrDb.toFixed(0)} dB
    </div>
  );
}
