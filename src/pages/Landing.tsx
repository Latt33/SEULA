import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Cpu, MessageSquareText, QrCode, ServerOff, Smartphone, Stethoscope, Timer, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Cite, Footer, Logo, Nav, Stat } from '../components/ui';
import { PATHWAY, REGIONS } from '../data/regions';
import { computeImpact, DEFAULTS } from '../engine/impact';

export function Landing() {
  const [qr, setQr] = useState(false);
  const checkUrl = `${window.location.origin}${window.location.pathname}#/check`;
  const lo = Math.min(...REGIONS.map((r) => r.insufficient));
  const hi = Math.max(...REGIONS.map((r) => r.insufficient));
  const imp = computeImpact(DEFAULTS);

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Nav />
      <section className="pt-16 md:pt-24 pb-14 px-6 relative">
        <div className="hero-breath" aria-hidden="true" />
        <div className="mx-auto max-w-[760px] text-center relative z-10">
          <div className="flex items-center justify-center gap-3 mb-7">
            <Logo size={52} />
            <span className="text-3xl font-bold tracking-tight">SEULA</span>
          </div>
          <h1 className="mb-6 text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.08]">The appointment form that<br className="hidden sm:block" /> finds cancer earlier.</h1>
          <p className="mb-9 text-lg md:text-xl text-muted-foreground max-w-[600px] mx-auto leading-relaxed prose-serif">
            A 4-minute questionnaire and a 30-second voice test the patient does on their own phone before a routine GP visit. The doctor gets a structured history and a clear next step. Cancer red flags are caught at the first contact, not the third.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => setQr(true)} className="btn-primary text-lg px-7 py-4"><QrCode size={20} /> Try it on your phone</button>
            <Link to="/clinician" className="btn-ghost text-lg px-7 py-4"><Stethoscope size={20} /> See what the doctor sees</Link>
          </div>
          <p className="text-xs text-muted-foreground mt-5">National Cancer Strategy Goal 3 · indicators 3.1.2, 3.3.1, 3.4.2, 3.5.3 · <Link to="/evidence" className="underline">evidence</Link></p>
        </div>
      </section>

      {qr && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={() => setQr(false)}>
          <div className="card p-8 text-center max-w-sm" onClick={(e) => e.stopPropagation()}>
            <button className="float-right text-muted-foreground" onClick={() => setQr(false)}><X size={18} /></button>
            <p className="eyebrow mb-3">Scan with your phone camera</p>
            <div className="inline-block p-3 bg-white rounded-xl border border-line"><QRCodeSVG value={checkUrl} size={220} fgColor="#1a1a18" /></div>
            <p className="text-sm text-muted-foreground mt-4 mb-4">Anyone can do it: no app, no login, no hardware. The voice is analysed on the phone itself.</p>
            <Link to="/check" className="btn-primary w-full">Or open here <ArrowRight size={18} /></Link>
          </div>
        </div>
      )}

      <section className="py-16 px-6">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow mb-4">1 · The gap</p>
          <h2 className="text-2xl md:text-3xl font-bold mb-3 max-w-3xl">Finland finds cancer late, and the delay starts before the referral.</h2>
          <p className="text-muted-foreground prose-serif text-lg mb-10 max-w-3xl">The Cancer Society of Finland now calls primary-care access the bottleneck for early detection and equal care <Cite k="bottleneck" />. Access varies by region, and the data that would show the delay (stage, timestamps) is mostly missing.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <Stat value="16.7%" label="5-year lung cancer survival in Finnish men, vs 26.8% in Sweden and 28.2% in Norway" cite="nordicLung" accent />
            <Stat value="27%" label="of lung cancer patients reach curative treatment (2019–2023)" cite="lungReport" />
            <Stat value="42%" label="of cancers have stage at diagnosis recorded, so delays stay invisible" cite="syopa2024" />
            <Stat value={`${lo}–${hi}%`} label="of residents per county feel they get too few doctor services" cite="terveSuomi" />
          </div>

          <div className="card p-5 md:p-6 overflow-x-auto">
            <p className="eyebrow mb-4">Where on the pathway the gap emerges</p>
            <div className="grid grid-cols-5 min-w-[760px] gap-2">
              {PATHWAY.map((s, i) => (
                <div key={s.stage} className={`rounded-lg p-3 ${i <= 2 ? 'bg-primary/10 border border-primary/30' : 'bg-background border border-line'}`}>
                  <p className="text-xs font-semibold mb-1">{i + 1}. {s.stage}</p>
                  <p className="text-2xl font-bold tnum">{s.metric}</p>
                  <p className="text-xs text-muted-foreground leading-snug mb-1">{s.metricLabel}</p>
                  <p className="text-xs leading-snug mb-1">{s.gap}</p>
                  <Cite k={s.source}>source</Cite>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 min-w-[760px] gap-2 mt-2">
              <div className="col-span-3 text-center text-xs font-semibold text-primary border-t-2 border-primary pt-1">SEULA acts here: detection and referral</div>
              <div className="col-span-2 text-center text-xs text-muted-foreground border-t-2 border-line pt-1">SEULA makes this measurable: timestamps and stage linkage</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white/60 border-y border-line">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow mb-4">2 · What SEULA does</p>
          <h2 className="text-2xl md:text-3xl font-bold mb-10 max-w-3xl">It rides on the booking SMS every patient already gets.</h2>
          <div className="grid md:grid-cols-4 gap-5 mb-10">
            {[
              ['Booking SMS carries a link', 'Adults 40+ booking a non-urgent GP visit get the form. No app, no login.'],
              ['4 minutes, validated questions', 'NICE NG12 red flags, PLCOm2012, VHI-10, G8, EQ-5D-5L, plus a 30-s voice test and free text.'],
              ['Transparent rules', 'Every flag shows the guideline it comes from. Voice and text can prompt a question; they never escalate alone.'],
              ['Doctor gets a pre-triaged list', 'Next step (chest X-ray, FIT, laryngoscopy), copy-to-EHR history, FHIR export, referral attachment.'],
            ].map(([h, b], i) => (
              <div key={h} className="flex gap-3 md:flex-col md:gap-2">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">{i + 1}</div>
                <div><p className="font-semibold mb-1">{h}</p><p className="text-sm text-muted-foreground leading-snug">{b}</p></div>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              [Smartphone, 'Anyone can do it', 'Runs in any phone browser, in Finnish or English, in 4 minutes.'],
              [ServerOff, 'No server compute', 'Voice analysis runs on the phone. Audio never leaves it. Cost per extra user is close to zero.'],
              [Cpu, 'No new workflow', 'Copy-paste history into Apotti, Lifecare or Pegasos, or integrate via FHIR.'],
              [Timer, 'Pays off even if it finds nothing', `${imp.fte.toFixed(1)} physician FTE of history-taking saved per 300k forms at 2 min per visit.`],
            ].map(([Icon, h, b]) => {
              const I = Icon as typeof Smartphone;
              return (
                <div key={h as string} className="card p-5">
                  <I size={22} className="text-primary mb-3" />
                  <p className="font-semibold mb-1">{h as string}</p>
                  <p className="text-sm text-muted-foreground leading-snug">{b as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-[1.2fr_1fr] gap-10">
          <div>
            <p className="eyebrow mb-4">3 · What a county should do</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Three actions, starting next quarter.</h2>
            <ol className="space-y-4">
              {[
                ['Send SEULA with every non-urgent GP booking for adults 40+', 'Start in one county where access is weakest (North Karelia 32.1%, Central Uusimaa 30.8%, West Uusimaa 29.4%).'],
                ['Let nurses order the 2-week test directly from a SEULA flag', 'Chest X-ray or FIT home kit within 14 days, as NG12 recommends, so flagged patients do not wait for a GP slot.'],
                ['Report SEULA timestamps and G8 to the quality registry monthly', 'Symptom-to-visit and visit-to-referral days per county become a Goal 3.1.2 indicator nobody measures today.'],
              ].map(([h, b], i) => (
                <li key={h} className="flex gap-4">
                  <span className="text-3xl font-display text-primary leading-none w-8">{i + 1}</span>
                  <div><p className="font-semibold">{h}</p><p className="text-sm text-muted-foreground">{b}</p></div>
                </li>
              ))}
            </ol>
            <Link to="/pilot" className="btn-primary mt-8">Full recommendations and pilot plan <ArrowRight size={18} /></Link>
          </div>
          <div className="card p-6">
            <p className="eyebrow mb-4">Goal 3 indicators SEULA produces</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {[
                  ['3.1.2', 'Treatment within target times', 'Symptom → visit → test → referral timestamps'],
                  ['3.3.1', 'Patients with symptom & QoL data', 'EQ-5D-5L + symptoms for every respondent'],
                  ['3.4.2', 'Functional data in referrals', 'G8 auto-attached for everyone 70+'],
                  ['3.5.3', 'Use of digital pathways & AI', 'Completion and flag rates per unit'],
                ].map(([c, i, s]) => (
                  <tr key={c}><td className="py-2.5 pr-3 font-semibold tnum align-top">{c}</td><td className="py-2.5 pr-3 align-top">{i}</td><td className="py-2.5 text-muted-foreground align-top">{s}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3"><Cite k="roadmap" /></div>
            <div className="mt-6 pt-5 border-t border-line grid grid-cols-2 gap-4">
              <Link to="/impact" className="text-sm font-semibold hover:text-primary flex items-center gap-1">Impact model <ArrowRight size={14} /></Link>
              <Link to="/evidence" className="text-sm font-semibold hover:text-primary flex items-center gap-1">Does voice work? <ArrowRight size={14} /></Link>
              <Link to="/region" className="text-sm font-semibold hover:text-primary flex items-center gap-1">Regional gap <ArrowRight size={14} /></Link>
              <Link to="/check" className="text-sm font-semibold hover:text-primary flex items-center gap-1"><MessageSquareText size={14} /> Patient form</Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
