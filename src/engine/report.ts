/**
 * Turns a completed SEULA response into things the clinic already uses:
 *  - a structured pre-visit anamnesis (copy-paste into any EHR: Apotti, Lifecare, Pegasos, Omni360)
 *  - a referral attachment with G8 + EQ-5D-5L (strategy actions 3.4.2 and 3.3.1)
 *  - an HL7 FHIR R4 QuestionnaireResponse for integration via Kanta / regional integration layers
 */
import { Answers, Assessment, DURATION_LABEL, LEVEL_META, SYMPTOM_LABEL, SymptomKey } from './questionnaire';
import type { VoiceFeatures, SpeechFeatures } from './voice';

const SMOKING: Record<string, string> = { never: 'Never smoked', former: 'Former smoker', current: 'Current smoker' };
const SMOKING_FI: Record<string, string> = { never: 'Ei ole tupakoinut', former: 'Lopettanut tupakoinnin', current: 'Tupakoi' };
const SYMPTOM_FI: Record<SymptomKey, string> = {
  cough: 'yskä', fatigue: 'väsymys', sob: 'hengenahdistus', chestPain: 'rintakipu', weightLoss: 'laihtuminen', appetiteLoss: 'ruokahaluttomuus', haemoptysis: 'veriyskä', chestInfections: 'toistuvat hengitystieinfektiot', hoarseness: 'äänen käheys', neckLump: 'kyhmy kaulalla', dysphagia: 'nielemisvaikeus', rectalBleeding: 'veriuloste', bowelChange: 'suolen toiminnan muutos', abdominalPain: 'vatsakipu',
};
const DUR_FI = { lt3w: 'alle 3 vk', '3to6w': '3–6 vk', gt6w: 'yli 6 vk' } as const;

export function anamnesis(a: Answers, r: Assessment, v?: VoiceFeatures, s?: SpeechFeatures, lang: 'en' | 'fi' = 'en'): string {
  const date = new Date(a.completedAt ?? Date.now()).toLocaleDateString(lang === 'fi' ? 'fi-FI' : 'en-GB');
  const sym = (Object.entries(a.symptoms) as [SymptomKey, keyof typeof DUR_FI][]).map(([k, d]) => (lang === 'fi' ? `${SYMPTOM_FI[k]} (${DUR_FI[d]})` : `${SYMPTOM_LABEL[k].toLowerCase()} (${DURATION_LABEL[d]})`));
  const L: string[] = [];
  if (lang === 'fi') {
    L.push(`ESITIEDOT (potilaan ilmoittamat, SEULA ${date})`);
    L.push(`${a.age ?? '?'}-v ${a.sex === 'f' ? 'nainen' : a.sex === 'm' ? 'mies' : 'potilas'}.${r.scores.bmi ? ` BMI ${r.scores.bmi.toFixed(1)}.` : ''}`);
    L.push(`${SMOKING_FI[a.smoking ?? 'never']}${r.scores.packYears ? `, ${r.scores.packYears.toFixed(0)} askivuotta` : ''}${a.copd ? '. COPD.' : '.'}`);
    L.push(`Oireet: ${sym.length ? sym.join(', ') : 'ei hälytysoireita'}.`);
    if (a.freeText) L.push(`Omin sanoin: "${a.freeText.trim()}"`);
    if (r.scores.plco !== undefined) L.push(`PLCOm2012 6 v keuhkosyöpäriski ${(r.scores.plco * 100).toFixed(1)} % (raja 1,51 %).`);
    if (r.scores.vhi10 !== undefined) L.push(`VHI-10 ${r.scores.vhi10}/40 (poikkeava > 11).`);
    if (r.scores.g8 !== undefined) L.push(`G8 ${r.scores.g8}/17 (≤ 14 → geriatrinen arvio).`);
    if (v) L.push(`Ääni (/a/): CPPS ${v.cpps.toFixed(1)} dB, HNR ${v.hnrMean.toFixed(1)} dB, jitter ${v.jitterLocal.toFixed(2)} %, shimmer ${v.shimmerLocal.toFixed(2)} %, MPT ${v.mpt.toFixed(1)} s.`);
    L.push(`SEULA-luokitus: ${LEVEL_META[r.level].label}. ${r.findings.filter((f) => f.level !== 'info').map((f) => f.action).join('; ')}`);
  } else {
    L.push(`PRE-VISIT HISTORY (patient-reported via SEULA, ${date})`);
    L.push(`${a.age ?? '?'}-year-old ${a.sex === 'f' ? 'woman' : a.sex === 'm' ? 'man' : 'patient'}.${r.scores.bmi ? ` BMI ${r.scores.bmi.toFixed(1)}.` : ''}`);
    L.push(`${SMOKING[a.smoking ?? 'never']}${r.scores.packYears ? `, ${r.scores.packYears.toFixed(0)} pack-years` : ''}${a.copd ? '. Known COPD.' : '.'}${a.familyLungCancer ? ' Family history of lung cancer.' : ''}`);
    L.push(`Symptoms: ${sym.length ? sym.join(', ') : 'no red-flag symptoms'}.`);
    if (a.freeText) L.push(`In own words: "${a.freeText.trim()}"`);
    if (r.scores.plco !== undefined) L.push(`PLCOm2012 6-yr lung cancer risk ${(r.scores.plco * 100).toFixed(1)}% (threshold 1.51%).`);
    if (r.scores.vhi10 !== undefined) L.push(`VHI-10 ${r.scores.vhi10}/40 (abnormal > 11).`);
    if (r.scores.g8 !== undefined) L.push(`G8 ${r.scores.g8}/17 (≤ 14 → geriatric assessment).`);
    if (a.eq5d && Object.keys(a.eq5d).length === 5) L.push(`EQ-5D-5L profile ${['mobility', 'selfcare', 'activities', 'pain', 'anxiety'].map((k) => a.eq5d![k as keyof typeof a.eq5d]).join('')}, VAS ${a.eqVas ?? '–'}.`);
    if (v) L.push(`Voice (/a/): CPPS ${v.cpps.toFixed(1)} dB, HNR ${v.hnrMean.toFixed(1)} dB (SD ${v.hnrSd.toFixed(1)}), jitter ${v.jitterLocal.toFixed(2)}%, shimmer ${v.shimmerLocal.toFixed(2)}%, MPT ${v.mpt.toFixed(1)} s.`);
    if (s) L.push(`Reading: pause ratio ${(s.pauseRatio * 100).toFixed(0)}%, ${s.pausesPer10s.toFixed(1)} pauses / 10 s.`);
    L.push(`SEULA triage: ${LEVEL_META[r.level].label}. ${r.findings.filter((f) => f.level !== 'info').map((f) => f.action).join('; ')}`);
  }
  return L.join('\n');
}

/** Minimal FHIR R4 QuestionnaireResponse. Codes: LOINC where one exists, otherwise SEULA local codes. */
export function toFhir(a: Answers, r: Assessment, v?: VoiceFeatures) {
  const item = (linkId: string, text: string, answer: unknown) => ({ linkId, text, answer: [answer] });
  const items: unknown[] = [
    item('age', 'Age', { valueInteger: a.age }),
    item('sex', 'Sex', { valueString: a.sex }),
    item('smoking', 'Tobacco smoking status', { valueCoding: { system: 'http://loinc.org', code: '72166-2', display: a.smoking } }),
  ];
  for (const [k, d] of Object.entries(a.symptoms)) items.push(item(`symptom.${k}`, SYMPTOM_LABEL[k as SymptomKey], { valueString: d }));
  if (r.scores.plco !== undefined) items.push(item('score.plcom2012', 'PLCOm2012 6-year risk', { valueDecimal: +r.scores.plco.toFixed(4) }));
  if (r.scores.vhi10 !== undefined) items.push(item('score.vhi10', 'VHI-10 total', { valueInteger: r.scores.vhi10 }));
  if (r.scores.g8 !== undefined) items.push(item('score.g8', 'G8 total', { valueDecimal: r.scores.g8 }));
  if (v) {
    items.push(item('voice.cpps', 'Smoothed cepstral peak prominence (dB)', { valueDecimal: +v.cpps.toFixed(2) }));
    items.push(item('voice.hnr', 'Harmonics-to-noise ratio mean (dB)', { valueDecimal: +v.hnrMean.toFixed(2) }));
    items.push(item('voice.mpt', 'Maximum phonation time (s)', { valueDecimal: +v.mpt.toFixed(1) }));
  }
  items.push(item('triage', 'SEULA triage level', { valueCoding: { system: 'urn:seula:triage', code: r.level, display: LEVEL_META[r.level].label } }));
  return {
    resourceType: 'QuestionnaireResponse',
    status: 'completed',
    questionnaire: 'urn:seula:questionnaire:cancer-previsit:0.1',
    authored: a.completedAt ?? new Date().toISOString(),
    item: items,
  };
}
