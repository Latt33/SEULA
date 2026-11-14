# SEULA

**The appointment form that finds cancer earlier.**
Junction 2026 · AstraZeneca challenge: *equitable and effective cancer care in Finland*. Built on [PUHELU](https://github.com/Latt33/PUHELU).

SEULA (Finnish for *sieve*) is a 4-minute pre-visit questionnaire with a 30-second voice test. The patient completes it on their own phone from the link in the booking SMS they already receive. The GP gets:

- a pre-triaged list,
- a structured history ready to paste into the EHR,
- a suggested next step (chest X-ray, FIT, laryngoscopy),
- a referral attachment carrying G8 and EQ-5D-5L.

## The gap SEULA targets

| Where on the pathway | Evidence |
|---|---|
| Primary-care access | 19.3–32.1% of residents per county feel they get too few doctor services (THL Terve Suomi 2024) |
| Detection → referral | Only 27% of lung cancer patients reach curative treatment (quality registry report 2019–2023) |
| Diagnosis | Stage recorded for 42% of cancers nationally (Finnish Cancer Registry, Syöpä 2024) |
| Outcome | 5-yr lung cancer survival 16.7% in Finnish men vs 26.8% Sweden, 28.2% Norway (Acta Oncol 2025) |

Every number in the app links to its source (`src/data/sources.ts`).

## What is in the box

| Path | What |
|---|---|
| `src/engine/questionnaire.ts` | NICE NG12 red-flag rules (lung, colorectal, larynx, upper GI), PLCOm2012, VHI-10, G8, EQ-5D-5L profile, FI/EN free-text symptom extraction |
| `src/engine/voice.ts` | On-device acoustic analysis: F0, jitter, shimmer, HNR mean/SD, CPPS, MPT, pause ratio |
| `src/engine/report.ts` | EHR-ready history (EN/FI) and an HL7 FHIR R4 QuestionnaireResponse |
| `src/engine/impact.ts` | Transparent impact model plus a closed-form combined-AUC explorer |
| `src/pages/` | Landing (2-minute brief), patient form, clinician view, regional gap and early warning, impact, evidence, recommendations |
| `analysis/validate_voice.py` | Validates the browser voice engine against Praat 6.1 and fits a calibration |
| `analysis/node/text_eval.ts` | Development and held-out evaluation of the symptom extractor |

## Results (reproducible)

**Voice engine vs Praat (240 synthetic sustained vowels, calibrated measures on a held-out half):**

| Measure | Pearson r |
|---|---|
| HNR | 1.00 |
| Shimmer | 0.96 |
| CPPS | 0.95 |
| Jitter | 0.94 |
| F0 | 0.95 |

**Text extraction (FI/EN, held-out set):** precision 0.87, recall 0.77.

**What voice can and cannot do:** CPPS separates dysphonic from normal voices with AUC 0.93 (Murton 2020), which makes it useful for deciding who needs a laryngoscopy. Voice does not distinguish cancer from benign lesions (Jenkins 2025). The questionnaire carries lung and colorectal cancer.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173  (use --host to open on a phone in the same Wi-Fi)
npm run build        # static site in dist/, runs from any static host
```

The microphone needs HTTPS or localhost. For the live demo, deploy to GitHub Pages: push to `main` and enable Pages → "GitHub Actions" (workflow included).

Reproduce the evidence:

```bash
pip install -r analysis/requirements.txt
python3 analysis/validate_voice.py --n 240                  # synthetic validation vs Praat
python3 analysis/validate_voice.py --voiced path/to/voiced  # optional: PhysioNet VOICED database
npx tsx analysis/node/text_eval.ts
```

## Design rules

1. Only validated instruments and published guideline rules. Every flag shows its rule and source.
2. Voice and free text never raise the triage level on their own. They surface questions for the clinician.
3. Audio never leaves the phone. Only numbers are stored.
4. The patient never sees a risk score. They always get the 116117 safety-net.

## Limitations

- NG12 is a UK guideline, used as a stand-in until FICAN publishes Finnish pathway criteria (roadmap action 3.1.2).
- Voice validation is against Praat on synthetic voices, not on patients. Clinical accuracy needs the pilot.
- Finnish VHI-10, G8 and EQ-5D wording in the demo are unofficial translations. Production needs the validated versions and a EuroQol licence.
- Regional figures were transcribed from the THL Terve Suomi 2024 appendix; verify against Sotkanet before publication.
- This is a research prototype, not a medical device. Decision support of this kind is likely MDR class IIa.

Team: Atte Laakso, Nikolas Juhava, Konsta Kiirikki, Qilun Li.
