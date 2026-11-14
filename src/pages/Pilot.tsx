import { Link } from 'react-router-dom';
import { ArrowRight, Phone, ShieldCheck, Workflow } from 'lucide-react';
import { Cite, Page, PageHeader } from '../components/ui';

export const RECS = [
  { id: 'R1', what: 'Send the SEULA link with every non-urgent GP booking for adults 40+', owner: 'County primary-care director, digital services', when: 'Month 0–3', kpi: '≥ 60% completion among booked adults 40+', goal: '3.5.3', cost: 'SMS + hosting, ≈ €0.50 / form' },
  { id: 'R2', what: 'Standing order: nurses book the 2-week test (chest X-ray or FIT kit) directly from a SEULA flag', owner: 'County chief physician (local protocol based on NG12)', when: 'Month 1–3', kpi: '≥ 90% of flagged patients tested within 14 days', goal: '3.1.2', cost: 'Tests: see impact model' },
  { id: 'R3', what: 'Reserve fast-track laryngoscopy slots for persistent hoarseness age 45+', owner: 'ENT unit, central hospital', when: 'Month 2–4', kpi: 'Median ≤ 14 days to laryngoscopy', goal: '3.1.2', cost: 'Within existing ENT capacity' },
  { id: 'R4', what: 'Auto-attach G8 and EQ-5D-5L to every cancer referral for patients 70+', owner: 'Referral template owner (EHR)', when: 'Month 1–2', kpi: '≥ 80% of referrals 70+ carry G8', goal: '3.4.2 / 3.3.1', cost: 'Template change only' },
  { id: 'R5', what: 'Report SEULA timestamps monthly to the county dashboard and the FICAN quality registry; alert at 28 days', owner: 'County knowledge management, regional FICAN', when: 'Month 3+', kpi: 'Symptom → test days published per station', goal: '3.1.2 / 3.2.2', cost: 'Analyst 0.2 FTE' },
  { id: 'R6', what: 'Evaluate against a comparator county with Cancer Registry linkage (Findata permit)', owner: 'County + AstraZeneca + university partner', when: 'Month 0–12', kpi: 'Cancers found ≤ 12 months after a flag; stage; days saved', goal: '3.2', cost: 'Research budget' },
];

export function Pilot() {
  return (
    <Page>
      <PageHeader eyebrow="Recommendations · for a wellbeing services county" title="Six actions a county can start next quarter.">
        Each action has an owner, a deadline and a measure. None needs new hardware or new staff. R1 to R4 deliver value from month one; R5 and R6 turn it into evidence and into Goal 3 indicators.
      </PageHeader>

      <div className="md:hidden space-y-4 mb-10">
        {RECS.map((r) => (
          <div key={r.id} className="card p-5">
            <div className="flex gap-3 items-baseline mb-3"><span className="font-display text-primary text-lg">{r.id}</span><p className="font-medium">{r.what}</p></div>
            <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Owner</dt><dd>{r.owner}</dd>
              <dt className="text-muted-foreground">When</dt><dd className="tnum">{r.when}</dd>
              <dt className="text-muted-foreground">Success</dt><dd>{r.kpi}</dd>
              <dt className="text-muted-foreground">Goal 3</dt><dd className="tnum">{r.goal}</dd>
              <dt className="text-muted-foreground">Cost</dt><dd>{r.cost}</dd>
            </dl>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto mb-10 hidden md:block">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-line bg-background/60">
              <th className="p-3 font-medium">#</th><th className="p-3 font-medium">Action</th><th className="p-3 font-medium">Owner</th><th className="p-3 font-medium">When</th><th className="p-3 font-medium">Measure of success</th><th className="p-3 font-medium">Goal 3</th><th className="p-3 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {RECS.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="p-3 font-display text-primary text-lg">{r.id}</td>
                <td className="p-3 font-medium max-w-[280px]">{r.what}</td>
                <td className="p-3 text-muted-foreground">{r.owner}</td>
                <td className="p-3 tnum whitespace-nowrap">{r.when}</td>
                <td className="p-3">{r.kpi}</td>
                <td className="p-3 tnum">{r.goal}</td>
                <td className="p-3 text-muted-foreground">{r.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl mb-4">90-day pilot</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {[
          ['Weeks 0–4 · Set up', ['Choose 2 health stations in North Karelia (32.1% underserved) and a comparator', 'Data protection impact assessment; clinical safety owner named', 'Local NG12-based standing orders signed (R2, R3)', 'Copy-paste mode: no EHR integration needed to start']],
          ['Weeks 5–8 · Live', ['Link added to booking SMS for adults 40+ (R1)', 'GPs see the pre-triaged list; nurses book flagged tests', 'Weekly huddle: false flags, missed flags, GP feedback', 'Phone fallback: a nurse reads the same questions']],
          ['Weeks 9–13 · Decide', ['Completion, flag rate, days to test vs comparator', 'Time-motion sample of 100 visits', 'Go / no-go for county-wide roll-out and FHIR integration', 'Registry linkage started for 12-month outcomes (R6)']],
        ].map(([h, items]) => (
          <div key={h as string} className="card p-5">
            <p className="font-semibold mb-3">{h as string}</p>
            <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1.5">{(items as string[]).map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="card p-5">
          <Workflow className="text-primary mb-2" size={20} />
          <p className="font-semibold mb-2">Integration in three steps</p>
          <ol className="text-sm text-muted-foreground list-decimal ml-5 space-y-1.5">
            <li>Copy-paste history into any EHR (day one).</li>
            <li>FHIR R4 QuestionnaireResponse to the regional integration layer (already exported by the demo).</li>
            <li>Offer nationally through Omaolo so every county gets it without procurement.</li>
          </ol>
        </div>
        <div className="card p-5">
          <ShieldCheck className="text-primary mb-2" size={20} />
          <p className="font-semibold mb-2">Regulation and privacy</p>
          <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1.5">
            <li>Decision-support software is likely MDR class IIa (Rule 11); the hackathon build is a research prototype, not a medical device.</li>
            <li>Audio is analysed on the phone and discarded; only numbers are sent.</li>
            <li>The county is data controller; no new data flows to AstraZeneca.</li>
          </ul>
        </div>
        <div className="card p-5">
          <Phone className="text-primary mb-2" size={20} />
          <p className="font-semibold mb-2">Risks and mitigations</p>
          <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1.5">
            <li>Digital exclusion: a nurse phone call uses the same questions (the PUHELU model); paper form in waiting room.</li>
            <li>Alert fatigue: flags only at NG12 thresholds (≥ 3% PPV) <Cite k="ng12" />.</li>
            <li>False reassurance: the form never shows a risk score to the patient and always gives the 116117 safety-net.</li>
            <li>Test capacity: the impact model shows the extra test volume up front.</li>
          </ul>
        </div>
      </div>

      <div className="card p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div>
          <p className="font-semibold text-lg mb-1">What we ask from AstraZeneca and a partner county</p>
          <p className="text-sm text-muted-foreground max-w-2xl">One county sponsor, two health stations, a named clinical safety owner, and help with the Findata permit for registry linkage. We bring the working software, the evaluation design and the open analysis code.</p>
        </div>
        <Link to="/impact" className="btn-primary shrink-0">Check the numbers <ArrowRight size={18} /></Link>
      </div>
    </Page>
  );
}
