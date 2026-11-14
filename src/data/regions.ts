/**
 * Wellbeing services counties (21 + City of Helsinki).
 * insufficient: % of people who felt they got too few doctor services relative to need (Sotkanet 4909)
 * feesHindered: % of health-service users for whom client fees hindered use (Sotkanet 5208)
 * Source: THL Terve Suomi 2024, appendix table 6 (transcribed; verify against Sotkanet before publication).
 */
export interface Region {
  name: string;
  short: string;
  insufficient: number;
  feesHindered: number;
}

export const NATIONAL = { insufficient: 24.9, feesHindered: 36.9 };

export const REGIONS: Region[] = [
  { name: 'South Karelia', short: 'Etelä-Karjala', insufficient: 24.9, feesHindered: 35.8 },
  { name: 'South Ostrobothnia', short: 'Etelä-Pohjanmaa', insufficient: 24.3, feesHindered: 39.1 },
  { name: 'South Savo', short: 'Etelä-Savo', insufficient: 24.8, feesHindered: 41.3 },
  { name: 'City of Helsinki', short: 'Helsinki', insufficient: 27.3, feesHindered: 28.5 },
  { name: 'East Uusimaa', short: 'Itä-Uusimaa', insufficient: 22.4, feesHindered: 34.1 },
  { name: 'Kainuu', short: 'Kainuu', insufficient: 27.4, feesHindered: 46.5 },
  { name: 'Kanta-Häme', short: 'Kanta-Häme', insufficient: 19.3, feesHindered: 34.5 },
  { name: 'Central Ostrobothnia', short: 'Keski-Pohjanmaa', insufficient: 21.4, feesHindered: 36.6 },
  { name: 'Central Finland', short: 'Keski-Suomi', insufficient: 25.1, feesHindered: 40.6 },
  { name: 'Central Uusimaa', short: 'Keski-Uusimaa', insufficient: 30.8, feesHindered: 34.8 },
  { name: 'Kymenlaakso', short: 'Kymenlaakso', insufficient: 20.7, feesHindered: 39.9 },
  { name: 'Lapland', short: 'Lappi', insufficient: 20.9, feesHindered: 41.2 },
  { name: 'West Uusimaa', short: 'Länsi-Uusimaa', insufficient: 29.4, feesHindered: 33.4 },
  { name: 'Pirkanmaa', short: 'Pirkanmaa', insufficient: 22.4, feesHindered: 38.4 },
  { name: 'Ostrobothnia', short: 'Pohjanmaa', insufficient: 19.8, feesHindered: 33.3 },
  { name: 'North Karelia', short: 'Pohjois-Karjala', insufficient: 32.1, feesHindered: 44.5 },
  { name: 'North Ostrobothnia', short: 'Pohjois-Pohjanmaa', insufficient: 27.5, feesHindered: 38.1 },
  { name: 'North Savo', short: 'Pohjois-Savo', insufficient: 24.5, feesHindered: 38.8 },
  { name: 'Päijät-Häme', short: 'Päijät-Häme', insufficient: 26.0, feesHindered: 41.0 },
  { name: 'Satakunta', short: 'Satakunta', insufficient: 26.3, feesHindered: 44.1 },
  { name: 'Vantaa and Kerava', short: 'Vantaa–Kerava', insufficient: 24.9, feesHindered: 34.0 },
  { name: 'Southwest Finland', short: 'Varsinais-Suomi', insufficient: 19.8, feesHindered: 38.2 },
];

/** Where along the pathway each documented gap sits. All values sourced. */
export const PATHWAY = [
  {
    stage: 'Symptom',
    gap: 'Patients wait or are unsure where to go',
    metric: '1 in 4',
    metricLabel: 'feel they get too few doctor services for their need',
    source: 'terveSuomi',
  },
  {
    stage: 'Primary care contact',
    gap: 'Non-urgent access guarantee loosened from 14 days to 3 months (2025)',
    metric: '3 mo',
    metricLabel: 'legal maximum wait for non-urgent care, adults 23+',
    source: 'hoitotakuu',
  },
  {
    stage: 'GP visit → referral',
    gap: 'Red flags missed or unstructured; functional data absent from referrals',
    metric: '27%',
    metricLabel: 'of lung cancer patients reach curative treatment',
    source: 'lungReport',
  },
  {
    stage: 'Diagnosis',
    gap: 'Stage at diagnosis not recorded, so delays are invisible',
    metric: '42%',
    metricLabel: 'of cancers have stage recorded nationally (Pirkanmaa 72%)',
    source: 'syopa2024',
  },
  {
    stage: 'Outcome',
    gap: 'Finland lags the Nordics in lung cancer survival',
    metric: '16.7%',
    metricLabel: '5-yr survival, Finnish men vs 26.8% Sweden, 28.2% Norway',
    source: 'nordicLung',
  },
];
