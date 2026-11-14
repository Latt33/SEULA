/**
 * Evaluates SEULA's on-device symptom extraction (FI + EN, with negation) on a
 * hand-labelled set of patient-style sentences. The set was written by the team to
 * cover common phrasings, negations and look-alikes; it is NOT real patient text.
 * A pilot should re-evaluate on de-identified real responses.
 * Usage: npx tsx analysis/node/text_eval.ts  -> src/data/generated/text_eval.json
 */
import { writeFileSync } from 'node:fs';
import { extractSymptoms, SymptomKey } from '../../src/engine/questionnaire';

type Case = [string, SymptomKey[]];
const CASES: Case[] = [
  ['I have had a cough for six weeks', ['cough']],
  ['Coughing up blood since Monday', ['haemoptysis']],
  ['There was blood in my phlegm this morning', ['haemoptysis']],
  ['No cough, just a sore knee', []],
  ['I get out of breath climbing stairs', ['sob']],
  ['My voice has changed and sounds hoarse', ['hoarseness']],
  ['I lost my voice two months ago and it never came back', ['hoarseness']],
  ['There is a lump in my neck', ['neckLump']],
  ['Food gets stuck when I swallow', ['dysphagia']],
  ['I have noticed blood in my stool', ['rectalBleeding']],
  ['Diarrhoea and constipation alternating for a month', ['bowelChange']],
  ['Stomach pain after eating and I have lost weight', ['abdominalPain', 'weightLoss']],
  ['I am tired all the time and have no appetite', ['fatigue', 'appetiteLoss']],
  ['Chest pain when breathing deeply', ['chestPain']],
  ['I do not have chest pain', []],
  ['Never smoked, no breathlessness', []],
  ['Had pneumonia three times this year again', ['chestInfections']],
  ['My bowel habits changed recently', ['bowelChange']],
  ['Not tired, sleeping well', []],
  ['Weight loss of 5 kg without trying', ['weightLoss']],
  ['Yskä on jatkunut kuukauden', ['cough']],
  ['Olen yskinyt verta pari kertaa', ['haemoptysis']],
  ['Veriyskää ei ole ollut', []],
  ['Hengenahdistusta portaissa', ['sob']],
  ['Ääni on ollut käheä kaksi kuukautta', ['hoarseness']],
  ['Kaulassa on kyhmy', ['neckLump']],
  ['Nieleminen on vaikeaa ja ruoka jää kurkkuun', ['dysphagia']],
  ['Ulosteessa on ollut verta', ['rectalBleeding']],
  ['Verta ulosteessa viime viikolla', ['rectalBleeding']],
  ['Ripuli on vaihdellut ummetuksen kanssa', ['bowelChange']],
  ['Vatsakipua ja laihtumista', ['abdominalPain', 'weightLoss']],
  ['Olen väsynyt eikä ruokahalua ole', ['fatigue', 'appetiteLoss']],
  ['Rintakipua rasituksessa', ['chestPain']],
  ['Ei yskää eikä kuumetta', []],
  ['Polvi on kipeä, ei muita oireita', []],
  ['Paino on pudonnut 6 kiloa', ['weightLoss']],
  ['En ole laihtunut', []],
  ['Uupumusta ja voimattomuutta', ['fatigue']],
  ['Toistuvia keuhkokuumeita tänä vuonna', ['chestInfections']],
  ['Suolen toiminta on muuttunut', ['bowelChange']],
  ['Mainly a blood pressure check, I coughed up some blood twice', ['haemoptysis']],
  ['My husband has a cough but I do not', []],
  ['Mahakipu on jatkunut', ['abdominalPain']],
  ['Tummaa ulostetta ja väsymystä', ['rectalBleeding', 'fatigue']],
  ['Musta uloste ja väsymys', ['rectalBleeding', 'fatigue']],
  ['I feel breathless and my chest hurts', ['sob', 'chestPain']],
];


// Held-out set: written AFTER the lexicon revision, never used for tuning.
const HELDOUT: Case[] = [
  ['Persistent cough and I have been losing weight', ['cough', 'weightLoss']],
  ['Spat out blood when coughing yesterday', ['haemoptysis']],
  ['I am short of breath even when resting', ['sob']],
  ['My voice cracks and people ask what is wrong with it', ['hoarseness']],
  ['A swelling in my neck has grown', ['neckLump']],
  ['It hurts to swallow bread', ['dysphagia']],
  ['Bleeding from my bottom after the toilet', ['rectalBleeding']],
  ['Loose stools for five weeks', ['bowelChange']],
  ['My belly aches every evening', ['abdominalPain']],
  ['No weight loss and no fever', []],
  ['I am exhausted after small tasks', ['fatigue']],
  ['Lost my appetite completely', ['appetiteLoss']],
  ['My daughter has stomach pain, I came for a vaccine', []],
  ['Feeling fine, routine check only', []],
  ['Hoarse voice after the flu, three weeks now', ['hoarseness']],
  ['Yskiessä tulee verta', ['haemoptysis']],
  ['Hengästyn helposti kävellessä', ['sob']],
  ['Äänessä on käheyttä', ['hoarseness']],
  ['Kaulalle on tullut patti', ['neckLump']],
  ['Ruoan nieleminen sattuu', ['dysphagia']],
  ['Veriulostetta kahdesti', ['rectalBleeding']],
  ['Ummetusta useamman viikon ajan', ['bowelChange']],
  ['Kova vatsakipu öisin', ['abdominalPain']],
  ['Ruokahalu on kadonnut', ['appetiteLoss']],
  ['Olen laihtunut huomaamatta', ['weightLoss']],
  ['Ei hengenahdistusta', []],
  ['Väsyttää koko ajan', ['fatigue']],
  ['Rintaan sattuu yskiessä', ['chestPain', 'cough']],
  ['Vaimollani on yskä, minulla ei', []],
  ['Tulin rokotukseen, ei oireita', []],
];

function evaluate(cases: Case[]) {
let tp = 0;
let fp = 0;
let fn = 0;
const errors: { text: string; expected: SymptomKey[]; got: SymptomKey[] }[] = [];
for (const [text, expected] of cases) {
  const got = extractSymptoms(text).filter((m) => !m.negated).map((m) => m.symptom);
  const e = new Set(expected);
  const g = new Set(got);
  let ok = true;
  for (const s of g) {
    if (e.has(s)) tp++;
    else {
      fp++;
      ok = false;
    }
  }
  for (const s of e) if (!g.has(s)) {
    fn++;
    ok = false;
  }
  if (!ok) errors.push({ text, expected, got });
}
const precision = tp / (tp + fp);
const recall = tp / (tp + fn);
return { n: cases.length, labels: tp + fn, tp, fp, fn, precision, recall, f1: (2 * precision * recall) / (precision + recall), errors };
}
const res = { development: evaluate(CASES), heldOut: evaluate(HELDOUT) };
writeFileSync('src/data/generated/text_eval.json', JSON.stringify(res, null, 2));
console.log(JSON.stringify({ dev: { ...res.development, errors: res.development.errors.length }, held: { ...res.heldOut, errors: res.heldOut.errors.length } }), '\n', res.heldOut.errors);
