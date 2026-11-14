import { createContext, useContext, useState, ReactNode } from 'react';
import type { Answers } from '../engine/questionnaire';
import type { VoiceFeatures, SpeechFeatures } from '../engine/voice';

export interface Submission {
  answers: Answers;
  voice?: VoiceFeatures;
  speech?: SpeechFeatures;
  completedAt: string;
}

const KEY = 'seula.submission.v1';
function load(): Submission | null {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

const Ctx = createContext<{ submission: Submission | null; setSubmission: (s: Submission | null) => void }>({ submission: null, setSubmission: () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [submission, set] = useState<Submission | null>(load);
  const setSubmission = (s: Submission | null) => {
    set(s);
    try {
      if (s) localStorage.setItem(KEY, JSON.stringify(s));
      else localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable: keep in memory */
    }
  };
  return <Ctx.Provider value={{ submission, setSubmission }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
