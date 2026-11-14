import { useCallback, useEffect, useState } from 'react';
import type { SymptomKey } from '../engine/questionnaire';

export const GEMMA_LABEL = 'Gemma 3 1B (open weights, Google)';
export const SYMPTOM_KEYS: SymptomKey[] = ['cough', 'haemoptysis', 'sob', 'chestPain', 'chestInfections', 'fatigue', 'weightLoss', 'appetiteLoss', 'hoarseness', 'neckLump', 'dysphagia', 'rectalBleeding', 'bowelChange', 'abdominalPain'];

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };
export type Status = 'idle' | 'loading' | 'ready' | 'running' | 'error';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: { text: string; ms?: number }) => void; reject: (e: Error) => void }>();
const listeners = new Set<(e: any) => void>();
let lastState: { status: Status; progress: number; device?: string } = { status: 'idle', progress: 0 };

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const d = e.data;
    if (d.type === 'progress') lastState = { ...lastState, status: 'loading', progress: d.total ? d.loaded / d.total : 0 };
    if (d.type === 'ready') lastState = { status: 'ready', progress: 1, device: d.device };
    if (d.id !== undefined && pending.has(d.id)) {
      const p = pending.get(d.id)!; pending.delete(d.id);
      if (d.type === 'error') { lastState = { ...lastState, status: 'error' }; p.reject(new Error(d.error)); } else p.resolve({ text: d.text, ms: d.ms });
    }
    listeners.forEach((l) => l(lastState));
  };
  return worker;
}

function call(kind: string, messages?: Msg[], maxTokens?: number) {
  const id = seq++;
  return new Promise<{ text: string; ms?: number }>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, kind, messages, maxTokens });
  });
}

export function useGemma() {
  const [state, setState] = useState(lastState);
  useEffect(() => {
    const l = (s: typeof lastState) => setState({ ...s });
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  const ensure = useCallback(async () => {
    if (lastState.status === 'ready') return;
    lastState = { ...lastState, status: 'loading' }; setState({ ...lastState });
    await call('load');
  }, []);
  return { ...state, ensure };
}

export const webgpuAvailable = () => typeof navigator !== 'undefined' && 'gpu' in navigator;

// ───────── tasks ─────────

export interface GemmaReading {
  language: string;
  symptoms: { key: SymptomKey; quote: string; duration?: string; present: boolean }[];
  summary_fi: string;
  summary_en: string;
  raw: string;
  ms?: number;
}

const READ_SYSTEM = `You are a clinical intake assistant in a Finnish primary-care health centre. You read what a patient wrote before their appointment, in any language, and extract symptoms. You never diagnose and never give advice.
Allowed symptom keys: ${SYMPTOM_KEYS.join(', ')}.
Meanings: haemoptysis = coughing up blood; sob = shortness of breath; chestInfections = repeated chest infections; dysphagia = difficulty swallowing; rectalBleeding = blood in stool; bowelChange = change in bowel habit; hoarseness = hoarse or changed voice; neckLump = lump in the neck.
Answer with JSON only, no prose, in exactly this shape:
{"language":"<language of the text>","symptoms":[{"key":"<allowed key>","present":true,"duration":"<as stated, or empty>","quote":"<exact words from the text>"}],"summary_fi":"<one sentence in Finnish for the doctor>","summary_en":"<one sentence in English>"}
Set present to false when the patient says they do NOT have it. Use only allowed keys. Copy quotes exactly from the text.`;

const EXAMPLE_IN = 'Kurkussa tuntuu palaa ja nieleminen on vaikeaa noin kuukauden ajan. Verta en ole yskinyt.';
const EXAMPLE_OUT = '{"language":"Finnish","symptoms":[{"key":"dysphagia","present":true,"duration":"noin kuukauden","quote":"nieleminen on vaikeaa noin kuukauden ajan"},{"key":"haemoptysis","present":false,"duration":"","quote":"Verta en ole yskinyt"}],"summary_fi":"Nielemisvaikeus noin kuukauden ajan, ei veriyskää.","summary_en":"Difficulty swallowing for about a month; no coughing up blood."}';

function parseJson(raw: string) {
  const s = raw.indexOf('{'); const e = raw.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(raw.slice(s, e + 1)); } catch { return null; }
}

export async function readPatientWords(text: string): Promise<GemmaReading> {
  const { text: raw, ms } = await call('generate', [
    { role: 'system', content: READ_SYSTEM },
    { role: 'user', content: EXAMPLE_IN },
    { role: 'assistant', content: EXAMPLE_OUT },
    { role: 'user', content: text },
  ], 360);
  const j = parseJson(raw) ?? {};
  const symptoms = (Array.isArray(j.symptoms) ? j.symptoms : [])
    .filter((s: any) => SYMPTOM_KEYS.includes(s?.key))
    .map((s: any) => ({ key: s.key as SymptomKey, quote: String(s.quote ?? ''), duration: s.duration ? String(s.duration) : undefined, present: s.present !== false }));
  return { language: String(j.language ?? ''), symptoms, summary_fi: String(j.summary_fi ?? ''), summary_en: String(j.summary_en ?? ''), raw, ms };
}

export async function draftReferralLetter(structured: string): Promise<{ text: string; ms?: number }> {
  return call('generate', [
    { role: 'system', content: 'You write referral letters (lähete) for Finnish primary care. Write in Finnish, in the concise style of a Finnish GP. Use only the facts given; never add findings, diagnoses or numbers that are not in the input. 6 to 9 sentences, no headings, no greeting.' },
    { role: 'user', content: `Write the referral letter text from these structured facts:\n\n${structured}` },
  ], 420);
}
