/**
 * SEULA impact model. Deliberately simple and fully visible: every parameter is a slider
 * on the Impact page, tagged either SOURCED (with citation) or ASSUMPTION (to be replaced
 * with pilot data). Outputs are per year.
 */
export interface ImpactParams {
  questionnaires: number; // completed per year
  minutesSaved: number; // physician minutes saved per visit with a pre-filled history
  costPerMinute: number; // € of physician time
  flagRate: number; // share meeting an NG12 investigate/urgent criterion
  ppv: number; // cancers per flagged patient
  earlierShare: number; // share of flagged cancers moved to an earlier stage
  survivalGain: number; // absolute 5-yr survival gain per stage-shifted case
  testCost: number; // € per extra direct-access test (CXR / FIT)
  costPerQuestionnaire: number; // € SMS + hosting + support
  fixedCost: number; // € per year (integration, governance, clinical safety officer)
}

export interface ParamMeta {
  key: keyof ImpactParams;
  label: string;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  kind: 'sourced' | 'assumption';
  note: string;
  source?: string;
}

const pct = (v: number) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;
const eur = (v: number) => `€${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export const DEFAULTS: ImpactParams = {
  questionnaires: 300_000,
  minutesSaved: 2,
  costPerMinute: 84 / 20,
  flagRate: 0.04,
  ppv: 0.03,
  earlierShare: 0.15,
  survivalGain: 0.67,
  testCost: 60,
  costPerQuestionnaire: 0.5,
  fixedCost: 250_000,
};

export const PARAMS: ParamMeta[] = [
  { key: 'questionnaires', label: 'Completed questionnaires / year', min: 20_000, max: 1_500_000, step: 10_000, fmt: (v) => v.toLocaleString('en-US'), kind: 'assumption', note: 'Pilot county ≈ 20–60k; national roll-out to adults 40+ booking non-urgent GP visits ≈ 1M+.' },
  { key: 'minutesSaved', label: 'Physician minutes saved / visit', min: 0, max: 7, step: 0.5, fmt: (v) => `${v} min`, kind: 'sourced', note: 'Evidence spans −6.8 min (questionnaire raised more concerns, RCT) to +7 min saved (pre-consultation form). Default is conservative.', source: 'stockport' },
  { key: 'costPerMinute', label: 'Value of physician minute', min: 2, max: 8, step: 0.1, fmt: eur, kind: 'sourced', note: 'Proxy: median GP visit price €84 (2023) ÷ 20-minute visit.', source: 'gpPrice' },
  { key: 'flagRate', label: 'Share flagged for a 2-week test', min: 0.01, max: 0.12, step: 0.005, fmt: pct, kind: 'assumption', note: 'Replace with pilot data. Depends on the age mix of respondents.' },
  { key: 'ppv', label: 'Cancer yield per flagged patient', min: 0.01, max: 0.08, step: 0.005, fmt: pct, kind: 'sourced', note: 'NG12 criteria are set at a ≥ 3% positive predictive value threshold.', source: 'ng12' },
  { key: 'earlierShare', label: 'Flagged cancers found at an earlier stage', min: 0, max: 0.4, step: 0.01, fmt: pct, kind: 'assumption', note: 'The key unknown. A pilot with registry linkage measures it directly.' },
  { key: 'survivalGain', label: '5-yr survival gain per earlier-stage case', min: 0.2, max: 0.8, step: 0.01, fmt: pct, kind: 'sourced', note: 'Localised vs distant 5-yr survival: NSCLC 67% vs 12% (Δ55), colorectal 91% vs 13% (Δ78); weighted by Finnish incidence (lung 3,068, CRC 4,020).', source: 'acsCrc' },
  { key: 'testCost', label: 'Cost per extra test (CXR / FIT)', min: 10, max: 150, step: 5, fmt: eur, kind: 'assumption', note: 'Replace with the county price list.' },
  { key: 'costPerQuestionnaire', label: 'Variable cost / questionnaire', min: 0.1, max: 3, step: 0.1, fmt: eur, kind: 'assumption', note: 'SMS link + hosting + support. Voice analysis runs on the phone: no server compute.' },
  { key: 'fixedCost', label: 'Fixed cost / year', min: 50_000, max: 1_000_000, step: 25_000, fmt: eur, kind: 'assumption', note: 'EHR integration, MDR documentation, clinical safety officer.' },
];

export function computeImpact(p: ImpactParams) {
  const physicianHours = (p.questionnaires * p.minutesSaved) / 60;
  const timeValue = p.questionnaires * p.minutesSaved * p.costPerMinute;
  const fte = physicianHours / 1600; // ~1,600 clinical hours per physician FTE per year
  const flagged = p.questionnaires * p.flagRate;
  const cancersFlagged = flagged * p.ppv;
  const earlier = cancersFlagged * p.earlierShare;
  const survivors = earlier * p.survivalGain;
  const testCost = flagged * p.testCost;
  const runCost = p.questionnaires * p.costPerQuestionnaire + p.fixedCost;
  const net = timeValue - testCost - runCost;
  return { physicianHours, timeValue, fte, flagged, cancersFlagged, earlier, survivors, testCost, runCost, net, costPerSurvivor: survivors > 0 ? Math.max(0, -net) / survivors : Infinity };
}

/** Optimal combination of two Gaussian signals (questionnaire + voice). AUC = Φ(D/√2). */
export function combinedAuc(dQuest: number, dVoice: number, rho: number) {
  const D2 = (dQuest ** 2 + dVoice ** 2 - 2 * rho * dQuest * dVoice) / (1 - rho ** 2);
  return phi(Math.sqrt(Math.max(0, D2)) / Math.SQRT2);
}
export const aucFromD = (d: number) => phi(d / Math.SQRT2);
export const dFromAuc = (auc: number) => Math.SQRT2 * phiInv(auc);

export function phi(x: number) {
  // Abramowitz–Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(x / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-((x / Math.SQRT2) ** 2));
  return 0.5 * (1 + Math.sign(x) * y);
}
export function phiInv(p: number) {
  let lo = -8;
  let hi = 8;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    if (phi(m) < p) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
