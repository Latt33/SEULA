/**
 * SEULA scoring engine. Every rule is a published, standardised instrument or guideline.
 * Nothing here is a black box: each finding carries the rule text and its source key
 * (see src/data/sources.ts), so the clinician sees exactly why a flag appears.
 *
 *  - NICE NG12 suspected-cancer recognition criteria (lung, colorectal, laryngeal)
 *    used as the reference rule set until FICAN publishes Finnish pathway criteria (strategy action 3.1.2)
 *  - PLCOm2012 6-year lung cancer risk (Tammemägi et al. NEJM 2013), threshold 1.51%
 *  - VHI-10 Voice Handicap Index (Rosen et al. 2004), abnormal > 11 (Arffa et al. 2012)
 *  - G8 geriatric screening (Bellera et al. 2012), abnormal ≤ 14  — strategy action 3.4.2
 *  - EQ-5D-5L health profile — strategy action 3.3.1
 */

export type Duration = 'lt3w' | '3to6w' | 'gt6w';
export type SymptomKey =
  | 'cough'
  | 'fatigue'
  | 'sob'
  | 'chestPain'
  | 'weightLoss'
  | 'appetiteLoss'
  | 'haemoptysis'
  | 'chestInfections'
  | 'hoarseness'
  | 'neckLump'
  | 'dysphagia'
  | 'rectalBleeding'
  | 'bowelChange'
  | 'abdominalPain';

export const LUNG_SYMPTOMS: SymptomKey[] = ['cough', 'fatigue', 'sob', 'chestPain', 'weightLoss', 'appetiteLoss'];

export interface Answers {
  age?: number;
  sex?: 'f' | 'm';
  heightCm?: number;
  weightKg?: number;
  smoking?: 'never' | 'former' | 'current';
  cigsPerDay?: number;
  yearsSmoked?: number;
  yearsSinceQuit?: number;
  education?: 1 | 2 | 3 | 4 | 5 | 6; // PLCOm2012 coding
  copd?: boolean;
  cancerHistory?: boolean;
  familyLungCancer?: boolean;
  asbestos?: boolean;
  symptoms: Partial<Record<SymptomKey, Duration>>;
  vhi10?: number[]; // 10 items, 0..4
  g8?: Partial<Record<'food' | 'weight' | 'mobility' | 'neuro' | 'meds' | 'selfHealth', number>>;
  eq5d?: Partial<Record<'mobility' | 'selfcare' | 'activities' | 'pain' | 'anxiety', 1 | 2 | 3 | 4 | 5>>;
  eqVas?: number;
  freeText?: string;
  symptomOnsetWeeks?: number;
  completedAt?: string;
}

export type Level = 'urgent' | 'investigate' | 'review' | 'info';
export type Site = 'lung' | 'colorectal' | 'larynx' | 'general';

export interface Finding {
  id: string;
  site: Site;
  level: Level;
  title: string;
  action: string;
  why: string[];
  rule: string;
  source: string;
}

export interface Scores {
  bmi?: number;
  packYears?: number;
  plco?: number; // 6-year probability, 0..1
  vhi10?: number;
  g8?: number;
  eqIndexProxy?: number; // sum of levels 5..25 (lower = better); EQ-5D value sets require licence
}

export interface Assessment {
  level: Level;
  findings: Finding[];
  scores: Scores;
  textMentions: TextMention[];
}

const LEVEL_RANK: Record<Level, number> = { urgent: 3, investigate: 2, review: 1, info: 0 };

const persistent = (d?: Duration) => d === '3to6w' || d === 'gt6w';
const has = (a: Answers, k: SymptomKey) => a.symptoms[k] !== undefined;

// ───────────── instruments ─────────────

export function bmi(a: Answers): number | undefined {
  if (!a.heightCm || !a.weightKg) return undefined;
  return a.weightKg / (a.heightCm / 100) ** 2;
}

/**
 * PLCOm2012 (Tammemägi et al. 2013). Coefficients as implemented in the reference
 * R package (resplab/PLCOm2012). Race term = 0 (reference category).
 * Applies to ever-smokers only.
 */
export function plcom2012(a: Answers): number | undefined {
  if (!a.age || (a.smoking !== 'former' && a.smoking !== 'current')) return undefined;
  const b = bmi(a) ?? 27;
  const cpd = Math.max(1, a.cigsPerDay ?? 10);
  const dur = a.yearsSmoked ?? 0;
  const quit = a.smoking === 'current' ? 0 : a.yearsSinceQuit ?? 0;
  const logit =
    0.0778868 * (a.age - 62) -
    0.0812744 * ((a.education ?? 4) - 4) -
    0.0274194 * (b - 27) +
    0.3553063 * (a.copd ? 1 : 0) +
    0.4589971 * (a.cancerHistory ? 1 : 0) +
    0.587185 * (a.familyLungCancer ? 1 : 0) +
    0.2597431 * (a.smoking === 'current' ? 1 : 0) -
    1.822606 * (1 / (cpd / 10) - 0.4021541613) +
    0.0317321 * (dur - 27) -
    0.0308572 * (quit - 10) -
    4.532506;
  return Math.exp(logit) / (1 + Math.exp(logit));
}
export const PLCO_THRESHOLD = 0.0151;

export function vhi10Score(a: Answers): number | undefined {
  if (!a.vhi10 || a.vhi10.length !== 10 || a.vhi10.some((v) => v === undefined)) return undefined;
  return a.vhi10.reduce((s, v) => s + v, 0);
}
export const VHI10_THRESHOLD = 11;

/** G8: 7 self-reported items + age; BMI item computed. Total 0–17, ≤ 14 = refer for geriatric assessment. */
export function g8Score(a: Answers): number | undefined {
  if (!a.age || a.age < 70 || !a.g8) return undefined;
  const g = a.g8;
  const keys = ['food', 'weight', 'mobility', 'neuro', 'meds', 'selfHealth'] as const;
  if (keys.some((k) => g[k] === undefined)) return undefined;
  const b = bmi(a);
  const bmiPts = b === undefined ? 0 : b < 19 ? 0 : b < 21 ? 1 : b < 23 ? 2 : 3;
  const agePts = a.age > 85 ? 0 : a.age >= 80 ? 1 : 2;
  return keys.reduce((s, k) => s + (g[k] as number), 0) + bmiPts + agePts;
}
export const G8_THRESHOLD = 14;

// ───────────── free text / speech transcript ─────────────

export interface TextMention {
  symptom: SymptomKey;
  phrase: string;
  negated: boolean;
  alsoTicked: boolean;
}

const LEXICON: Record<SymptomKey, RegExp[]> = {
  haemoptysis: [/cough\w*( up)?( some| a little| a bit of)? blood/, /ysk\w* verta/, /verta\w* ysk/, /blood in (my )?(sputum|phlegm|spit)/, /ha?emoptysis/, /veriys/, /verta (yskö|ysk)/, /verist\w* (yskö|limaa)/],
  cough: [/\bcough/, /yski/, /yskä/, /yskin/],
  sob: [/short(ness)? of breath/, /breathless/, /out of breath/, /hengenahdist/, /hengästy/, /henke\w* ahdist/],
  chestPain: [/chest pain/, /chest (hurts|aches|is sore)/, /rinta\w* (sattuu|kipe|kivist)/, /pain in (my )?chest/, /rintakip/, /kipu\w* rinna/, /rintaan sattuu/],
  fatigue: [/\btired/, /fatigue/, /exhausted/, /no energy/, /väsy/, /uupu/, /voimaton/],
  weightLoss: [/(lost|losing|lose) (some )?weight/, /weight loss/, /laihtu/, /paino\w* (on )?(pudon|laske|vähen)/],
  appetiteLoss: [/(no|lost|poor|loss of) appetite/, /not hungry/, /ruokahalu/, /ei maistu/],
  chestInfections: [/(chest infection|pneumonia)s?.{0,20}(again|repeated|recurr|several|times)/, /(toistuv|uusiutuv)\w* (keuhkokuum|keuhkoputken)/, /keuhkokuume.{0,20}(taas|uudestaan|monta)/],
  hoarseness: [/hoarse/, /husky/, /raspy/, /voice (has )?(chang|crack|gone)/, /lost (my )?voice/, /käheä/, /käheys/, /ääni\w* (on )?(muuttu|katkei|painu|käh)/],
  neckLump: [/lump in (my )?neck/, /neck lump/, /swelling in (my )?neck/, /kaula\w* (on )?(kyhmy|patti|turvotus|möhkäle)/, /(kyhmy|patti) kaula/],
  dysphagia: [/(difficult\w*|trouble|hard|pain\w*) (with )?swallow/, /food (gets )?stuck/, /nielemi/, /nieleminen/, /jää kurkkuun/],
  rectalBleeding: [/blood in (my )?(stool|poo|faeces|feces)/, /ulostee\w*.{0,15}verta/, /(musta|tumma)\w* ulost/, /rectal bleeding/, /bleeding from (my )?(bottom|rectum|back passage)/, /black (tarry )?stool/, /verta ulostee/, /veriulost/, /peräaukosta\w* (vuotaa )?verta/, /(musta|tumma) uloste/],
  bowelChange: [/change\w* in (my )?bowel/, /bowel (habit|movement)s? (have |has )?(chang|been different)/, /diarrh/, /constipat/, /loose stool/, /ripuli/, /ummetu/, /suol\w* toimin\w* (on )?muuttu/, /vatsa toimii (eri|huono|oudo)/],
  abdominalPain: [/(stomach|abdominal|belly|tummy) (pain|ache)/, /pain in (my )?(stomach|abdomen|belly)/, /vatsakip/, /mahakip/, /vatsaan sattuu/, /kipu\w* vatsa/],
};
const NEGATION = /\b(no|not|never|don't|dont|without|haven't|havent|no longer|ei|en|eikä|ilman)\b/;
const POST_NEGATION = /^\w*\s*(ei ole|ei ollut|ei ole ollut|ei esiinny|ei ilmennyt)/;
const OTHER_PERSON = /\b(husband|wife|partner|son|daughter|mother|father|friend|mieheni|vaimoni|poikani|tyttäreni|äitini|isäni|puolisoni)\b/;

/** Rule-based FI/EN symptom extraction with clause-level negation. Runs on device. */
export function extractSymptoms(text: string, ticked: Partial<Record<SymptomKey, Duration>> = {}): TextMention[] {
  const out: TextMention[] = [];
  const seen = new Set<SymptomKey>();
  const clauses = text
    .toLowerCase()
    .split(/[.;!?\n]|,| but | mutta | and then | ja sitten /)
    .map((c) => c.trim())
    .filter(Boolean);
  for (const clause of clauses) {
    for (const [sym, pats] of Object.entries(LEXICON) as [SymptomKey, RegExp[]][]) {
      // "cough" must not fire when the clause is about coughing blood
      if (sym === 'cough' && LEXICON.haemoptysis.some((p) => p.test(clause))) continue;
      for (const p of pats) {
        const m = clause.match(p);
        if (m && m.index !== undefined) {
          const before = clause.slice(Math.max(0, m.index - 28), m.index);
          const after = clause.slice(m.index + m[0].length, m.index + m[0].length + 20);
          const negated = NEGATION.test(before) || POST_NEGATION.test(after) || OTHER_PERSON.test(clause);
          if (!seen.has(sym) || !negated) {
            const existing = out.findIndex((o) => o.symptom === sym);
            const mention = { symptom: sym, phrase: clause.slice(Math.max(0, m.index - 20), m.index + m[0].length + 20).trim(), negated, alsoTicked: ticked[sym] !== undefined };
            if (existing >= 0) {
              if (out[existing].negated && !negated) out[existing] = mention;
            } else out.push(mention);
            seen.add(sym);
          }
          break;
        }
      }
    }
  }
  return out;
}

// ───────────── NG12 rules + adjunct signals ─────────────

export interface VoiceSignal {
  cpps?: number;
  jitter?: number;
  shimmer?: number;
  hnrSd?: number;
  mpt?: number;
  qualityOk?: boolean;
}

export function assess(a: Answers, voice?: VoiceSignal): Assessment {
  const f: Finding[] = [];
  const age = a.age ?? 0;
  const ever = a.smoking === 'former' || a.smoking === 'current';
  const lungCount = LUNG_SYMPTOMS.filter((k) => has(a, k)).length;
  const lungList = LUNG_SYMPTOMS.filter((k) => has(a, k));

  // Lung — NG12 1.1.1 / 1.1.2
  if (age >= 40 && has(a, 'haemoptysis')) {
    f.push({ id: 'lung-haemoptysis', site: 'lung', level: 'urgent', title: 'Unexplained haemoptysis, age ≥ 40', action: 'Suspected lung cancer pathway referral', why: ['Coughing up blood reported', `Age ${age}`], rule: 'Refer using a suspected cancer pathway if aged 40 and over with unexplained haemoptysis.', source: 'ng12' });
  }
  if (age >= 40 && (lungCount >= 2 || ((ever || a.asbestos) && lungCount >= 1))) {
    f.push({
      id: 'lung-cxr',
      site: 'lung',
      level: 'investigate',
      title: `${lungCount} lung symptom${lungCount > 1 ? 's' : ''}${ever ? ', ever smoked' : ''}`,
      action: 'Urgent direct-access chest X-ray (within 2 weeks)',
      why: [...lungList.map((k) => `${SYMPTOM_LABEL[k]} (${DURATION_LABEL[a.symptoms[k]!]})`), ...(ever ? ['Ever smoked'] : []), ...(a.asbestos ? ['Asbestos exposure'] : [])],
      rule: 'Offer urgent chest X-ray to people aged 40+ with 2 or more unexplained symptoms, or 1 or more if they have ever smoked: cough, fatigue, shortness of breath, chest pain, weight loss, appetite loss.',
      source: 'ng12',
    });
  }
  if (age >= 40 && has(a, 'chestInfections')) {
    f.push({ id: 'lung-infections', site: 'lung', level: 'review', title: 'Persistent or recurrent chest infection', action: 'Consider urgent chest X-ray', why: ['Recurrent chest infections reported'], rule: 'Consider an urgent chest X-ray in people aged 40+ with persistent or recurrent chest infection.', source: 'ng12' });
  }
  const plco = plcom2012(a);
  if (plco !== undefined && plco >= PLCO_THRESHOLD) {
    f.push({ id: 'lung-plco', site: 'lung', level: 'review', title: `PLCOm2012 6-year lung cancer risk ${(plco * 100).toFixed(1)}%`, action: 'High-risk smoker: low threshold for imaging, offer smoking cessation', why: [`Above the 1.51% threshold used in lung screening trials`], rule: 'PLCOm2012 ≥ 1.51% over 6 years identifies high-risk ever-smokers.', source: 'plco' });
  }

  // Colorectal — NG12 FIT criteria (2023)
  const crcWhy: string[] = [];
  if (has(a, 'bowelChange')) crcWhy.push('Change in bowel habit');
  if (age >= 40 && has(a, 'weightLoss') && has(a, 'abdominalPain')) crcWhy.push('Age ≥ 40 with weight loss and abdominal pain');
  if (age < 50 && has(a, 'rectalBleeding') && (has(a, 'abdominalPain') || has(a, 'weightLoss'))) crcWhy.push('Under 50 with rectal bleeding plus abdominal pain or weight loss');
  if (age >= 50 && (has(a, 'rectalBleeding') || has(a, 'abdominalPain') || has(a, 'weightLoss'))) crcWhy.push(`Age ≥ 50 with ${(['rectalBleeding', 'abdominalPain', 'weightLoss'] as SymptomKey[]).filter((k) => has(a, k)).map((k) => SYMPTOM_LABEL[k].toLowerCase()).join(', ')}`);
  if (crcWhy.length) {
    f.push({ id: 'crc-fit', site: 'colorectal', level: 'investigate', title: 'Meets FIT criteria for colorectal cancer', action: 'Send quantitative FIT home kit now; refer if ≥ 10 µg Hb/g', why: crcWhy, rule: 'Offer FIT to adults with change in bowel habit; 40+ with weight loss and abdominal pain; under 50 with rectal bleeding and pain or weight loss; 50+ with rectal bleeding, abdominal pain or weight loss.', source: 'ng12' });
  }

  // Larynx — NG12 (2015)
  const vhi = vhi10Score(a);
  const dysphonicVoice = voice?.qualityOk !== false && voice?.cpps !== undefined && voice.cpps < 14.45;
  if (age >= 45 && (persistent(a.symptoms.hoarseness) || has(a, 'neckLump'))) {
    const why = [...(persistent(a.symptoms.hoarseness) ? [`Hoarseness ${DURATION_LABEL[a.symptoms.hoarseness!]}`] : []), ...(has(a, 'neckLump') ? ['Lump in the neck'] : [])];
    if (vhi !== undefined && vhi > VHI10_THRESHOLD) why.push(`VHI-10 = ${vhi} (abnormal > 11)`);
    if (dysphonicVoice) why.push(`Acoustic dysphonia: CPPS ${voice!.cpps!.toFixed(1)} dB (< 14.45)`);
    if (ever) why.push('Ever smoked');
    f.push({ id: 'larynx', site: 'larynx', level: 'urgent', title: 'Persistent hoarseness or neck lump, age ≥ 45', action: 'Consider suspected laryngeal cancer pathway (ENT laryngoscopy)', why, rule: 'Consider a suspected cancer pathway referral for laryngeal cancer in people aged 45+ with persistent unexplained hoarseness or an unexplained lump in the neck.', source: 'ng12' });
  } else if (dysphonicVoice && age >= 45 && ever) {
    f.push({ id: 'larynx-acoustic', site: 'larynx', level: 'review', title: 'Acoustic signs of dysphonia without reported hoarseness', action: 'Ask about voice change at the visit; re-record in 3 weeks', why: [`CPPS ${voice!.cpps!.toFixed(1)} dB (dysphonia cut-off 14.45 dB)`, 'Age ≥ 45, ever smoked'], rule: 'Voice measures never escalate on their own; they prompt a question the clinician would otherwise not ask.', source: 'murton2020' });
  }
  if (vhi !== undefined && vhi > VHI10_THRESHOLD && !f.some((x) => x.site === 'larynx')) {
    f.push({ id: 'vhi', site: 'larynx', level: 'review', title: `VHI-10 = ${vhi}`, action: 'Voice handicap above normal range: examine larynx if persistent', why: ['Score above the 11-point normative cut-off'], rule: 'VHI-10 > 11 is abnormal.', source: 'arffa2012' });
  }

  // Dysphagia — NG12 oesophageal: any age dysphagia -> suspected cancer pathway (upper GI)
  if (has(a, 'dysphagia')) {
    f.push({ id: 'dysphagia', site: 'general', level: 'urgent', title: 'Dysphagia', action: 'Suspected upper-GI cancer pathway (endoscopy)', why: ['Difficulty swallowing reported'], rule: 'Refer using a suspected cancer pathway for oesophageal cancer if they have dysphagia.', source: 'ng12' });
  }

  // Functional status for older patients — Strategy 3.4.2
  const g8 = g8Score(a);
  if (g8 !== undefined) {
    f.push({ id: 'g8', site: 'general', level: g8 <= G8_THRESHOLD ? 'review' : 'info', title: `G8 = ${g8} / 17`, action: g8 <= G8_THRESHOLD ? 'Attach to any referral; geriatric assessment advised' : 'Attach to any referral', why: [g8 <= G8_THRESHOLD ? 'At or below 14: frailty risk' : 'Above 14'], rule: 'G8 ≤ 14 identifies older cancer patients who need comprehensive geriatric assessment.', source: 'bellera2012' });
  }

  // Free-text discrepancies — never escalate, only surface
  const textMentions = a.freeText ? extractSymptoms(a.freeText, a.symptoms) : [];
  const untickedRedFlags = textMentions.filter((m) => !m.negated && !m.alsoTicked);
  if (untickedRedFlags.length) {
    f.push({ id: 'text', site: 'general', level: 'review', title: 'Mentioned in own words but not ticked', action: 'Verify at the visit', why: untickedRedFlags.map((m) => `${SYMPTOM_LABEL[m.symptom]}: “…${m.phrase}…”`), rule: 'Free-text and speech never change the triage level; they surface discrepancies for the clinician.', source: 'seula' });
  }

  if (voice?.mpt !== undefined && voice.qualityOk !== false && voice.mpt < 10 && (has(a, 'sob') || a.copd)) {
    f.push({ id: 'mpt', site: 'lung', level: 'info', title: `Short phonation time ${voice.mpt.toFixed(1)} s`, action: 'Consistent with reduced respiratory reserve; spirometry if not recent', why: ['Breathlessness or COPD reported'], rule: 'Heuristic adjunct (MPT < 10 s); informational only.', source: 'seula' });
  }

  const level = f.reduce<Level>((acc, x) => (LEVEL_RANK[x.level] > LEVEL_RANK[acc] ? x.level : acc), 'info');
  const eqKeys = a.eq5d ? Object.values(a.eq5d) : [];
  return {
    level,
    findings: f.sort((x, y) => LEVEL_RANK[y.level] - LEVEL_RANK[x.level]),
    scores: {
      bmi: bmi(a),
      packYears: ever && a.cigsPerDay && a.yearsSmoked ? (a.cigsPerDay / 20) * a.yearsSmoked : undefined,
      plco,
      vhi10: vhi,
      g8,
      eqIndexProxy: eqKeys.length === 5 ? eqKeys.reduce((s, v) => s + (v as number), 0) : undefined,
    },
    textMentions,
  };
}

export const SYMPTOM_LABEL: Record<SymptomKey, string> = {
  cough: 'Cough',
  fatigue: 'Fatigue',
  sob: 'Shortness of breath',
  chestPain: 'Chest pain',
  weightLoss: 'Weight loss',
  appetiteLoss: 'Appetite loss',
  haemoptysis: 'Coughing up blood',
  chestInfections: 'Recurrent chest infections',
  hoarseness: 'Hoarseness',
  neckLump: 'Lump in the neck',
  dysphagia: 'Difficulty swallowing',
  rectalBleeding: 'Rectal bleeding',
  bowelChange: 'Change in bowel habit',
  abdominalPain: 'Abdominal pain',
};

export const DURATION_LABEL: Record<Duration, string> = { lt3w: '< 3 weeks', '3to6w': '3–6 weeks', gt6w: '> 6 weeks' };

export const LEVEL_META: Record<Level, { label: string; short: string; color: string; bg: string }> = {
  urgent: { label: 'Suspected-cancer pathway', short: 'Urgent', color: '#a8483f', bg: '#f9ece9' },
  investigate: { label: 'Test within 2 weeks', short: 'Test', color: '#8f6420', bg: '#f8f1e3' },
  review: { label: 'Ask at the visit', short: 'Ask', color: '#3e6a93', bg: '#eaf1f7' },
  info: { label: 'Routine', short: 'Routine', color: '#5c6864', bg: '#eef1ef' },
};
