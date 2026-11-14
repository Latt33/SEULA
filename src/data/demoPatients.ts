/** Fictional patients for the clinician demo. Voice values are illustrative, on the Praat scale. */
import type { Answers } from '../engine/questionnaire';
import type { VoiceFeatures } from '../engine/voice';

export interface DemoPatient {
  id: string;
  name: string;
  appointment: string; // HH:MM today
  reason: string;
  answers: Answers;
  voice?: VoiceFeatures;
  symptomOnsetDaysAgo: number;
  completedDaysAgo: number;
}

const q = { durationS: 6, clippedFraction: 0, snrDb: 38, voicedFraction: 0.86, ok: true, warnings: [] };
const v = (p: Partial<VoiceFeatures>): VoiceFeatures => ({ f0Mean: 120, f0Sd: 3, jitterLocal: 0.4, shimmerLocal: 2.6, hnrMean: 21, hnrSd: 1.8, cpps: 17.5, cppsRaw: 14.5, jitterRaw: 0.4, shimmerRaw: 2.6, mpt: 18, nPeriods: 700, quality: q, ...p });

export const DEMO_PATIENTS: DemoPatient[] = [
  {
    id: 'p1',
    name: 'Pekka V.',
    appointment: '08:20',
    reason: 'Sore throat, voice changed',
    symptomOnsetDaysAgo: 58,
    completedDaysAgo: 2,
    answers: { age: 67, sex: 'm', heightCm: 178, weightKg: 81, smoking: 'former', cigsPerDay: 20, yearsSmoked: 35, yearsSinceQuit: 6, education: 2, symptoms: { hoarseness: 'gt6w', cough: '3to6w' }, vhi10: [2, 2, 1, 1, 0, 3, 3, 2, 1, 3], eq5d: { mobility: 1, selfcare: 1, activities: 2, pain: 2, anxiety: 2 }, eqVas: 70, freeText: 'Ääni on ollut käheä jo pari kuukautta eikä parane. Joskus kurkkuun sattuu nielaistessa.' },
    voice: v({ f0Mean: 118, cpps: 11.2, hnrMean: 12.4, hnrSd: 4.6, jitterLocal: 1.62, shimmerLocal: 6.1, mpt: 11.5 }),
  },
  {
    id: 'p2',
    name: 'Matti K.',
    appointment: '08:40',
    reason: 'Prolonged cough',
    symptomOnsetDaysAgo: 49,
    completedDaysAgo: 1,
    answers: { age: 64, sex: 'm', heightCm: 175, weightKg: 70, smoking: 'current', cigsPerDay: 20, yearsSmoked: 45, education: 2, copd: true, symptoms: { cough: 'gt6w', fatigue: '3to6w', weightLoss: '3to6w', sob: '3to6w' }, eq5d: { mobility: 2, selfcare: 1, activities: 2, pain: 1, anxiety: 2 }, eqVas: 60, freeText: 'Yskä ei ole mennyt ohi flunssan jälkeen ja paino on pudonnut noin 4 kiloa.' },
    voice: v({ f0Mean: 112, cpps: 15.6, hnrMean: 18.2, mpt: 8.4 }),
  },
  {
    id: 'p3',
    name: 'Leena H.',
    appointment: '09:00',
    reason: 'Stomach problems',
    symptomOnsetDaysAgo: 35,
    completedDaysAgo: 3,
    answers: { age: 58, sex: 'f', heightCm: 166, weightKg: 64, smoking: 'never', symptoms: { rectalBleeding: '3to6w', bowelChange: '3to6w', fatigue: 'gt6w' }, eq5d: { mobility: 1, selfcare: 1, activities: 1, pain: 2, anxiety: 3 }, eqVas: 75, freeText: 'Vatsa on toiminut eri tavalla kuin ennen ja ulosteessa on ollut verta.' },
  },
  {
    id: 'p4',
    name: 'Aino S.',
    appointment: '09:20',
    reason: 'Tiredness',
    symptomOnsetDaysAgo: 70,
    completedDaysAgo: 4,
    answers: { age: 78, sex: 'f', heightCm: 160, weightKg: 49, smoking: 'never', symptoms: { fatigue: 'gt6w', appetiteLoss: '3to6w' }, g8: { food: 1, weight: 2, mobility: 2, neuro: 2, meds: 0, selfHealth: 0.5 }, eq5d: { mobility: 2, selfcare: 2, activities: 3, pain: 2, anxiety: 2 }, eqVas: 55, freeText: 'I just feel tired all the time and food does not taste like before.' },
    voice: v({ f0Mean: 196, cpps: 15.1, hnrMean: 19.5, mpt: 12.1 }),
  },
  {
    id: 'p5',
    name: 'Sanna L.',
    appointment: '09:40',
    reason: 'Follow-up, blood pressure',
    symptomOnsetDaysAgo: 21,
    completedDaysAgo: 1,
    answers: { age: 52, sex: 'f', heightCm: 170, weightKg: 77, smoking: 'current', cigsPerDay: 10, yearsSmoked: 30, symptoms: {}, eq5d: { mobility: 1, selfcare: 1, activities: 1, pain: 1, anxiety: 2 }, eqVas: 80, freeText: 'Mainly the blood pressure check. I have coughed up some blood a couple of times this month, probably from the flu.' },
  },
  {
    id: 'p6',
    name: 'Jari N.',
    appointment: '10:00',
    reason: 'Knee pain',
    symptomOnsetDaysAgo: 30,
    completedDaysAgo: 2,
    answers: { age: 45, sex: 'm', heightCm: 182, weightKg: 92, smoking: 'never', symptoms: {}, eq5d: { mobility: 2, selfcare: 1, activities: 2, pain: 3, anxiety: 1 }, eqVas: 78, freeText: 'Polvi kipeytyi juoksulenkillä. Ei muita oireita, ei yskää.' },
  },
];
