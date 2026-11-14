/** Every number on every page links back to one of these. */
export interface Source {
  label: string;
  url: string;
  note?: string;
}

export const SOURCES: Record<string, Source> = {
  strategy: { label: 'National Cancer Strategy 2026–2035', url: 'https://files.hackjunction.app/resources/Kansallinen_syopastrategia_2026_2035_FINAL.pdf' },
  roadmap: { label: 'Implementation roadmap 2026–2031', url: 'https://files.hackjunction.app/resources/Kansallinen_syopastrategia_toimeenpanon_tiekartta_2026_2031.pdf' },
  ng12: { label: 'NICE NG12 Suspected cancer: recognition and referral', url: 'https://www.nice.org.uk/guidance/ng12/chapter/recommendations-organised-by-site-of-cancer' },
  plco: { label: 'Tammemägi et al., NEJM 2013 (PLCOm2012)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3929969' },
  plcoCode: { label: 'PLCOm2012 reference implementation (resplab)', url: 'https://rdrr.io/github/resplab/PLCOm2012/src/R/plcom2012.R' },
  plcoThreshold: { label: 'Tammemägi et al., PLOS Med 2014 (1.51% threshold)', url: 'https://www.prolekare.cz/casopisy/plos-medicine/2014-12/evaluation-of-the-lung-cancer-risks-at-which-to-screen-ever-and-never-smokers-screening-rules-applied-to-the-plco-and-nlst-cohorts-54368' },
  arffa2012: { label: 'Arffa et al., J Voice 2012 (VHI-10 norms)', url: 'https://vufind.katalog.k.utb.cz/SummonRecord/FETCH-LOGICAL-c536t-ec704edd8c82b86b06227890828bd01ea4fd90e68f9a0e56a1c9edd75f04bfd33' },
  bellera2012: { label: 'Bellera et al., Ann Oncol 2012 (G8)', url: 'https://clinicaltrials.gov/study/NCT00963911' },
  murton2020: { label: 'Murton et al., AJSLP 2020 (CPPS cut-offs)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7893528' },
  teixeira2013: { label: 'Teixeira et al., Procedia Technology 2013 (MDVP jitter/shimmer thresholds)', url: 'https://doi.org/10.1016/j.protcy.2013.12.124' },
  jenkins2025: { label: 'Jenkins et al., Front Digit Health 2025 (voice and vocal fold lesions)', url: 'https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2025.1609811/full' },
  terveSuomi: { label: 'THL Terve Suomi 2024, appendix table 6 (Sotkanet 4909, 5208)', url: 'https://www.keusote.fi/wp-content/uploads/2025/05/Tilastoraportti_Terve_Suomi_2024.pdf' },
  lungReport: { label: 'Cancer quality registry lung report 2019–2023 (Syöpäjärjestöt)', url: 'https://www.verkkouutiset.fi/a/keuhkosyopa-todetaan-usein-liian-myohaan-vain-joka-neljas-saa-parantavaa-hoitoa/' },
  syopa2024: { label: 'Finnish Cancer Registry, Syöpä 2024 (stage coverage)', url: 'https://www.verkkouutiset.fi/a/syopatiedoissa-isot-alueelliset-erot-yksi-seutu-erottuu/' },
  nordicLung: { label: 'Acta Oncologica 2025: Finnish lung cancer surgery and survival', url: 'https://medicaljournalssweden.se/actaoncologica/article/download/43398/50813' },
  bottleneck: { label: 'Cancer Society of Finland: primary-care access is the bottleneck (2026)', url: 'https://www.sttinfo.fi/tiedote/72173590/kolme-aluetta-erottuu-edukseen-syopaseulonnoissa-helsingissa-osallistuminen-jaa-selvasti-jalkeen?lang=fi' },
  hoitotakuu: { label: 'STM: care guarantee extended to 3 months from 2025', url: 'https://stm.fi/-/miten-hoitotakuuta-koskevia-saannoksia-sovelletaan-stm-julkaisi-ohjeet-hyvinvointialueille' },
  screening2024: { label: 'Finnish Cancer Registry screening reports 2024', url: 'https://www.sttinfo.fi/tiedote/72173590/kolme-aluetta-erottuu-edukseen-syopaseulonnoissa-helsingissa-osallistuminen-jaa-selvasti-jalkeen?lang=fi' },
  globocan: { label: 'GLOBOCAN 2022 Finland fact sheet', url: 'https://gco.iarc.who.int/media/globocan/factsheets/populations/246-finland-fact-sheet.pdf' },
  acsLung: { label: 'American Cancer Society / SEER: NSCLC survival by stage', url: 'https://www.cancer.org/cancer/types/small-cell-lung-cancer/detection-diagnosis-staging/survival-rates.html' },
  acsCrc: { label: 'American Cancer Society / SEER: colorectal survival by stage', url: 'https://www.cancer.org/cancer/types/colon-rectal-cancer/detection-diagnosis-staging/survival-rates.html' },
  hornberger: { label: 'Hornberger et al., JGIM 1997 (previsit questionnaire RCT: +6.8 min)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1497170' },
  stockport: { label: 'Pre-consultation questionnaire: 22 → 15 min per consultation', url: 'https://biomed.reviewer.ly/app/publication/1490fa56-a232-413c-86f6-d56e79dbe8ad' },
  hauber2024: { label: 'Hauber et al., BMC Health Serv Res 2024 (computer-assisted history taking)', url: 'https://doaj.org/article/9f93b532861b4fe0b7bdf671581e79f0' },
  gpPrice: { label: 'Kela: median GP visit price €84 (2023)', url: 'https://www.verkkouutiset.fi/a/yksityiset-laakaripalvelut-kallistuneet-alueelliset-erot-merkittavia/' },
  qcancer: { label: 'QCancer in EMIS Web, 4,000+ UK practices', url: 'https://pulsetoday.co.uk/?p=24757' },
  erica: { label: 'ERICA trial (ISRCTN22560297), 530 practices', url: 'https://www.isrctn.com/pdf/22560297' },
  syopa2022: { label: 'Syöpä 2022 report: 11.6 life-years lost per lung cancer', url: 'https://www.sttinfo.fi/files/69820264/70275300/98389/fi' },
  praat: { label: 'Praat 6.1.38 via parselmouth (reference implementation)', url: 'https://parselmouth.readthedocs.io' },
  seula: { label: 'SEULA design rule', url: '#/evidence' },
};
