import { useState } from 'react';
import { Cpu, Sparkles } from 'lucide-react';
import type { Answers } from '../engine/questionnaire';
import { SYMPTOM_LABEL } from '../engine/questionnaire';
import { draftReferralLetter, GEMMA_LABEL, GemmaReading, readPatientWords, useGemma, webgpuAvailable } from './gemma';

function Loader({ progress }: { progress: number }) {
  return (
    <div className="mt-4">
      <div className="h-2 rounded-full bg-mist overflow-hidden"><div className="h-2 bg-primary transition-all" style={{ width: `${Math.max(3, progress * 100)}%` }} /></div>
      <p className="text-sm text-muted-foreground mt-2">Downloading Gemma to this computer, once: {Math.round(progress * 100)}% of about 1 GB. Next time it starts instantly.</p>
    </div>
  );
}

export function GemmaBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-sage rounded-full px-2.5 py-1">
      <Cpu size={13} /> Runs on this computer · nothing leaves it
    </span>
  );
}

export function GemmaReader({ answers }: { answers: Answers }) {
  const g = useGemma();
  const [res, setRes] = useState<GemmaReading | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!answers.freeText) return null;

  const run = async () => {
    setErr(null); setBusy(true);
    try { await g.ensure(); setRes(await readPatientWords(answers.freeText!)); }
    catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  };
  const ticked = answers.symptoms ?? {};

  return (
    <div className="card p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-lg text-deep flex items-center gap-2"><Sparkles size={18} className="text-primary" /> Gemma reads the patient’s own words</p>
          <p className="text-[15px] text-muted-foreground">Any language. Finds symptoms the patient wrote but did not tick.</p>
        </div>
        <GemmaBadge />
      </div>
      <p className="text-deep italic mb-4">“{answers.freeText}”</p>
      {!res && (
        <button onClick={run} disabled={busy} className="btn-primary py-2 px-4 text-[15px] disabled:opacity-60">
          {busy ? (g.status === 'loading' ? 'Loading Gemma…' : 'Reading…') : 'Read with Gemma'}
        </button>
      )}
      {!res && !webgpuAvailable() && <p className="text-sm text-muted-foreground mt-2">No WebGPU in this browser: Gemma runs on the processor, more slowly. Chrome or Edge is fastest.</p>}
      {busy && g.status === 'loading' && <Loader progress={g.progress} />}
      {err && <p className="text-sm text-[#a8483f] mt-3">Gemma could not run here: {err}</p>}
      {res && (
        <div className="space-y-4">
          {(res.summary_fi || res.summary_en) && (
            <div className="rounded-2xl bg-mist px-5 py-4">
              {res.language && <p className="text-sm text-muted-foreground mb-1">Written in {res.language}</p>}
              {res.summary_fi && <p className="text-deep">{res.summary_fi}</p>}
              {res.summary_en && <p className="text-muted-foreground text-[15px]">{res.summary_en}</p>}
            </div>
          )}
          {res.symptoms.length > 0 ? (
            <ul className="space-y-2">
              {res.symptoms.map((s, i) => {
                const isTicked = !!ticked[s.key];
                const tag = !s.present ? ['Says no', 'text-muted-foreground bg-mist'] : isTicked ? ['Also ticked', 'text-primary bg-sage'] : ['Not ticked: ask', 'text-[#3e6a93] bg-[#eaf1f7]'];
                return (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${tag[1]}`}>{tag[0]}</span>
                    <span className="text-deep">{SYMPTOM_LABEL[s.key]}{s.duration ? `, ${s.duration}` : ''}</span>
                    {s.quote && <span className="text-sm text-muted-foreground italic">“{s.quote}”</span>}
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-muted-foreground">No symptoms found in the text.</p>}
          <p className="text-sm text-muted-foreground">{GEMMA_LABEL} · {g.device === 'webgpu' ? 'graphics card' : 'processor'}{res.ms ? ` · ${(res.ms / 1000).toFixed(1)} s` : ''}. Suggestions only: urgency is always set by the guideline rules.</p>
        </div>
      )}
    </div>
  );
}

export function GemmaLetter({ structured }: { structured: string }) {
  const g = useGemma();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setErr(null);
    try { await g.ensure(); setText((await draftReferralLetter(structured)).text.trim()); }
    catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  };
  return (
    <div className="mt-4">
      {!text && (
        <button onClick={run} disabled={busy} className="btn-ghost py-2 px-4 text-[15px] inline-flex items-center gap-2 disabled:opacity-60">
          <Sparkles size={15} className="text-primary" /> {busy ? (g.status === 'loading' ? 'Loading Gemma…' : 'Writing…') : 'Write as a Finnish letter with Gemma'}
        </button>
      )}
      {busy && g.status === 'loading' && <Loader progress={g.progress} />}
      {err && <p className="text-sm text-[#a8483f] mt-2">Gemma could not run here: {err}</p>}
      {text && (
        <div>
          <div className="flex items-center justify-between mb-2"><p className="text-sm text-muted-foreground">Lähete, drafted by Gemma from the facts above. Edit before sending.</p><GemmaBadge /></div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} className="w-full rounded-2xl bg-mist p-4 text-[15px] leading-relaxed text-deep border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      )}
    </div>
  );
}
