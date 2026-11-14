<div align="center">

<img src="docs/hero.png" alt="SEULA: a 4-minute pre-visit check on the patient's phone" width="860">

# SEULA

**Spot the signs of cancer at the first visit.**

A 4-minute pre-visit check on the patient's own phone: symptom questions plus a 3-second voice test.<br>
The GP gets a sorted list, a ready-written history and a suggested next step.

### [Open the live demo &rarr;](https://latt33.github.io/SEULA/)

[Try it yourself](https://latt33.github.io/SEULA/#/check) · [Doctor's view](https://latt33.github.io/SEULA/#/clinician) · [For regions](https://latt33.github.io/SEULA/#/region) · [Evidence](https://latt33.github.io/SEULA/#/evidence)

Junction 2026 · AstraZeneca challenge: *equitable and effective cancer care in Finland*<br>
Built on [PUHELU](https://github.com/Latt33/PUHELU). *Seula* is Finnish for *sieve*.

</div>

---

> **Ready to use as it is.** SEULA is a static web page. A county puts the link in the booking text message it already sends, and the GP pastes the finished history into any patient record system. No app to install, no new hardware, no integration needed on day one. When the county wants integration, the FHIR R4 output is already there.

---

## The problem

In Finland, cancer is often found late, and how late depends on where you live.

| | |
|---|---|
| **16.7%** | of Finnish men with lung cancer are alive after 5 years. Sweden: 26.8% (Acta Oncol 2025) |
| **27%** | of lung cancer patients get treatment that aims to cure (quality registry 2019–2023) |
| **19.3–32.1%** | of residents, depending on the region, feel they get too little doctor time (THL Terve Suomi 2024) |
| **61%** | of lung cancer delay happens before the patient even sees a GP (Kotecha, BJGP Open 2021) |

The warning signs are there at the first visit. They get lost because the visit is short, the history is taken from scratch and the signs depend on what the patient remembers to mention.

## What SEULA does

1. **At home.** The patient opens the link from their booking SMS and answers short, validated symptom questions in Finnish or English.
2. **Three seconds of "aaah".** The phone measures how steady the voice is. The audio is analysed on the phone and never uploaded.
3. **At the visit.** The GP sees a list sorted by urgency, the reasons behind each flag with the guideline that triggered it, a suggested next step (chest X-ray, FIT, laryngoscopy) and a history to paste straight into the record.

The region gets a dashboard of days from first symptom to doctor, per health station, so a growing delay shows up within weeks instead of in next year's statistics.

## What is new

- **Voice before the first visit.** Hoarseness is often the first sign of glottic cancer, the most common laryngeal cancer. Voice clarity (CPPS) is the best-validated acoustic measure of it, but today it is measured in voice labs after referral. SEULA takes the same measurement on the patient's own phone before the GP has seen them.
- **Lab-grade measurement in a browser.** The voice engine is our own TypeScript implementation, calibrated against Praat, the clinical reference tool. It runs fully on the device.
- **Free text that catches what checkboxes miss.** "My voice has been hoarse for two months" in a comment box becomes an "ask about this" note for the doctor, with negation handling in Finnish and English.
- **Screening and workflow in one.** The same form that finds red flags also saves the doctor history-taking time, so the visit pays for the screening.

## How it scales

| | |
|---|---|
| **Delivery** | A link in an SMS the county already sends. Works on any smartphone browser. |
| **Cost** | About €0.50 per form (SMS and hosting). No devices, no new staff. |
| **Integration** | Day one: copy-paste into any record system. Later: HL7 FHIR R4 `QuestionnaireResponse`, already exported by the demo. |
| **National roll-out** | One static site; could be offered through Omaolo so every county gets it without its own procurement. |
| **Fallback** | No smartphone? A nurse asks the same questions by phone, the PUHELU model. |
| **Example region** | 40,000 forms a year: about 1,333 doctor hours freed, 1,600 people sent for a test within two weeks, about €70k net saving after all costs (adjustable model on the [impact page](https://latt33.github.io/SEULA/#/impact)). |

Six concrete actions for a county, each with an owner, timeline and success measure, are on the [recommendations page](https://latt33.github.io/SEULA/#/pilot).

## What it is built on

Only published guidelines and validated instruments. Every flag in the app shows its rule and links to its source.

| Instrument | Used for |
|---|---|
| NICE NG12 suspected-cancer rules | Lung, colorectal, laryngeal and upper-GI red flags |
| PLCOm2012 (threshold 1.51%) | 6-year lung cancer risk in people who have ever smoked |
| VHI-10 | Self-rated voice handicap |
| G8 | Frailty screen for patients 70+ |
| EQ-5D-5L | Health-related quality of life profile for referrals |
| CPPS, HNR, jitter, shimmer, F0 | Acoustic voice measures |

Supporting research includes Maryn et al. 2009 (CPPS the most valid single voice measure), Murton et al. 2020 (CPPS cut-off, AUC 0.93), Jannetts et al. 2019 and Uloza et al. 2023 (phone microphones match studio microphones), Kim et al. 2024 and Paterson et al. 2025 (voice and laryngeal disease) and the UK QCancer tools running in 4,000+ practices. The full list is on the [evidence page](https://latt33.github.io/SEULA/#/evidence) and in `src/data/sources.ts`.

## How it performs

**Voice engine vs Praat 6.1** (240 synthetic sustained vowels, calibrated on one half, tested on the held-out half):

<div align="center">

| HNR | Shimmer | CPPS | F0 | Jitter |
|:-:|:-:|:-:|:-:|:-:|
| r = 1.00 | r = 0.96 | r = 0.95 | r = 0.95 | r = 0.94 |

</div>

**Free-text symptom extraction** (Finnish and English, held-out set): precision 0.87, recall 0.77.

**What voice can and cannot do.** CPPS separates dysphonic from normal voices (AUC 0.93), so it is useful for deciding who needs a laryngoscopy. It does not tell cancer from a benign lesion; the laryngoscopy does. Voice and free text therefore never raise the urgency on their own. The questionnaire carries lung and colorectal cancer.

## How to use it

**Try the demo:** open [latt33.github.io/SEULA](https://latt33.github.io/SEULA/), press *Try it yourself* (or *Open on phone* for a QR code), then see the result in the *For doctors* view.

**Run it locally:**

```bash
npm install
npm run dev      # http://localhost:5173 (add --host to open it on a phone on the same Wi-Fi)
npm run build    # static site in dist/, runs on any static host
```

The microphone needs HTTPS or localhost. Pushing to `main` deploys to GitHub Pages through the included workflow.

**Reproduce the evidence:**

```bash
pip install -r analysis/requirements.txt
python3 analysis/validate_voice.py --n 240                  # voice engine vs Praat
python3 analysis/validate_voice.py --voiced path/to/voiced  # optional: PhysioNet VOICED database
npx tsx analysis/node/text_eval.ts                          # symptom extraction
```

<details>
<summary><b>Code map</b></summary>

| Path | What |
|---|---|
| `src/engine/questionnaire.ts` | NG12 rules, PLCOm2012, VHI-10, G8, EQ-5D-5L, free-text symptom extraction |
| `src/engine/voice.ts` | On-device voice analysis and spectrogram |
| `src/engine/report.ts` | Patient-record history (EN/FI) and FHIR R4 output |
| `src/engine/impact.ts` | Impact model and combined-AUC explorer |
| `src/pages/` | Home, patient form, doctor's view, regions, impact, evidence, recommendations |
| `analysis/` | Voice validation against Praat and text extraction evaluation |

</details>

## Design rules

1. Only validated instruments and published guideline rules.
2. Voice and free text never raise the urgency on their own; they give the doctor questions to ask.
3. Audio never leaves the phone. Only numbers are stored.
4. The patient never sees a risk score and always gets the 116117 safety-net number.

## Limitations

- NG12 is a UK guideline, used until FICAN publishes Finnish pathway criteria (roadmap action 3.1.2).
- The voice engine is validated against Praat on synthetic voices. Clinical accuracy is what the pilot measures.
- Finnish VHI-10, G8 and EQ-5D wording in the demo are unofficial; production needs the validated versions and a EuroQol licence.
- Research prototype, not a medical device. Decision support like this is likely MDR class IIa.

---

<div align="center">

**Team:** Atte Laakso · Nikolas Juhava · Konsta Kiirikki · Qilun Li

</div>
