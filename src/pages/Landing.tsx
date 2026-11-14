import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, ClipboardList, Mic, QrCode, Stethoscope, Timer, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Cite, Footer, Nav } from '../components/ui';
import { DoctorCard, FormScreen, Phone, VoiceScreen } from '../components/Mockups';

const HELPS = [
  [ClipboardList, 'Answer before your visit', 'A few standard health questions from the booking text message. About 4 minutes.'],
  [Mic, 'Say “aaah”', 'A short voice recording. The phone checks it for signs of a strained voice.'],
  [Stethoscope, 'Your doctor is prepared', 'The doctor opens your visit with your answers already organised.'],
  [Timer, 'The right test, sooner', 'If something needs checking, the test can be booked straight away.'],
];

const COMPARE = [
  ['Health history ready before the visit', true, false],
  ['Warning signs checked against medical guidelines', true, false],
  ['Voice check for a changed voice', true, false],
  ['Everyday function sent with the referral', true, false],
  ['Waiting times measured, region by region', true, false],
];

const FAQ = [
  ['Does SEULA tell me if I have cancer?', 'No. It never shows a diagnosis or a risk score. It helps your doctor notice what needs checking and book the right test sooner.'],
  ['Is my voice recording stored?', 'No. The recording is analysed on your phone and then discarded. Only a few numbers, like how steady your voice is, are shared with your health centre.'],
  ['What if I don’t have a smartphone?', 'A nurse can ask the same questions by phone, or you can fill in a paper form in the waiting room.'],
  ['Where do the questions come from?', 'Only from published, validated sources, such as the UK NICE cancer referral guideline and widely used questionnaires for voice and everyday function.'],
  ['What does it cost a region?', 'It runs on the patient’s own phone, so there is no hardware and almost no server cost. The time doctors save on taking histories covers the running costs.'],
];

export function Landing() {
  const [qr, setQr] = useState(false);
  const checkUrl = `${window.location.origin}${window.location.pathname}#/check`;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Nav />

      {/* Hero */}
      <section className="bg-mist">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24 grid md:grid-cols-[1fr_1fr] gap-12 items-center">
          <div>
            <h1 className="text-[2.6rem] md:text-[3.4rem] leading-[1.05] text-deep mb-6">Spot the signs of cancer at the first visit</h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-9 max-w-md">A calm 4-minute check on your own phone before you see the doctor. No app, no login.</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/check" className="btn-primary text-[17px] px-8 py-3.5">Try it yourself</Link>
              <button onClick={() => setQr(true)} className="btn-ghost text-[17px] px-6 py-3.5"><QrCode size={18} /> Open on phone</button>
            </div>
          </div>
          <div className="relative h-[520px] hidden sm:block">
            <Phone className="absolute left-[4%] top-4 -rotate-[4deg]"><FormScreen /></Phone>
            <Phone className="absolute right-[4%] top-0 rotate-[3deg]"><VoiceScreen /></Phone>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 z-20"><DoctorCard /></div>
          </div>
        </div>
      </section>

      {/* How it helps */}
      <section className="py-20 md:py-24 px-5">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl text-deep text-center mb-14">How SEULA helps</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {HELPS.map(([Icon, h, b]) => {
              const I = Icon as typeof Mic;
              return (
                <div key={h as string} className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-sage text-primary flex items-center justify-center mb-5"><I size={26} /></div>
                  <h3 className="text-xl text-deep mb-2">{h as string}</h3>
                  <p className="text-muted-foreground leading-relaxed">{b as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why it matters (band) */}
      <section className="px-3 md:px-5">
        <div className="band py-16 md:py-20 px-5">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl md:text-4xl text-center mb-3">Why it matters</h2>
            <p className="text-center text-white/75 text-lg mb-12 max-w-2xl mx-auto">In Finland, cancer is often found late. The delay begins before anyone is referred.</p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                ['16.7%', 'of Finnish men with lung cancer are alive after 5 years. In Sweden and Norway it is 27–28%.', 'nordicLung'],
                ['1 in 4', 'Finns feel they don’t get enough doctor time for their needs. In some regions, nearly 1 in 3.', 'terveSuomi'],
                ['27%', 'of lung cancer patients reach treatment that aims to cure.', 'lungReport'],
              ].map(([v, l, c]) => (
                <div key={v} className="card-cream p-7 text-foreground">
                  <p className="text-5xl font-medium text-deep tnum mb-3">{v}</p>
                  <p className="text-[15px] leading-relaxed mb-3">{l}</p>
                  <Cite k={c} />
                </div>
              ))}
            </div>
            <div className="text-center mt-10"><Link to="/region" className="btn-light">See where the gaps are</Link></div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 md:py-24 px-5">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl text-deep text-center mb-14">Getting started is easy as…</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              ['1', 'Book a visit', 'Your booking confirmation text message includes a link to SEULA.'],
              ['2', 'Take 4 minutes', 'Answer a few questions and say “aaah” into your phone.'],
              ['3', 'See your doctor', 'Your doctor is prepared, and any test you need is booked sooner.'],
            ].map(([n, h, b]) => (
              <div key={n} className="card-cream p-8">
                <span className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium mb-6">{n}</span>
                <h3 className="text-2xl text-deep mb-2">{h}</h3>
                <p className="text-muted-foreground leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="pb-20 md:pb-24 px-5">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl text-deep text-center mb-10">SEULA vs. a regular visit</h2>
          <div className="grid grid-cols-[1fr_130px_130px] md:grid-cols-[1fr_180px_180px] items-stretch">
            <div />
            <div className="bg-deep text-white rounded-t-2xl text-center py-4 font-medium">seula</div>
            <div className="text-center py-4 text-muted-foreground self-end">Regular visit</div>
            {COMPARE.map(([l, a, b], i) => (
              <div key={l as string} className="contents">
                <div className="border-t border-line py-4 pr-3 text-deep">{l as string}</div>
                <div className={`bg-deep flex items-center justify-center ${i === COMPARE.length - 1 ? 'rounded-b-2xl' : ''}`}>{a ? <Check className="text-[#9fd3bd]" size={22} strokeWidth={3} /> : <X className="text-[#e3a49c]" size={22} />}</div>
                <div className="border-t border-line flex items-center justify-center">{b ? <Check className="text-primary" size={22} strokeWidth={3} /> : <X className="text-[#c9a7a2]" size={22} />}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 px-5 bg-mist">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl text-deep text-center mb-12">Who SEULA is for</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              ['Patients', 'A short, private check from home. Your doctor hears what matters to you.', '/check', 'Try it yourself'],
              ['Doctors', 'Every visit starts with an organised history and a suggested next step.', '/clinician', 'See the doctor’s view'],
              ['Wellbeing services counties', 'Start where access is weakest, and measure waiting times as they happen.', '/region', 'See the plan'],
            ].map(([h, b, to, cta]) => (
              <Link key={h} to={to} className="card p-8 hover:border-primary/40 transition-colors group">
                <h3 className="text-2xl text-deep mb-3">{h}</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">{b}</p>
                <span className="text-primary font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">{cta} <ArrowRight size={16} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-24 px-5">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl text-deep text-center mb-10">Questions? We’re here to help.</h2>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex justify-between items-center cursor-pointer text-lg text-deep">
                  {q}
                  <ChevronDown size={20} className="text-primary transition-transform group-open:rotate-180 shrink-0 ml-4" />
                </summary>
                <p className="text-muted-foreground leading-relaxed mt-3 pr-8">{a}</p>
              </details>
            ))}
          </div>
          <p className="text-center mt-6"><Link to="/evidence" className="text-primary font-medium">Read the evidence →</Link></p>
        </div>
      </section>

      {/* Closing */}
      <section className="px-3 md:px-5 pb-6">
        <div className="bg-sage rounded-4xl py-16 md:py-20 px-5 text-center">
          <div className="relative w-36 h-36 mx-auto mb-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-white/70 breathe" />
            <div className="relative w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center"><Mic size={24} /></div>
          </div>
          <h2 className="text-3xl md:text-4xl text-deep mb-4">If you’ve read this far, take a breath and say “aaah”</h2>
          <p className="text-muted-foreground text-lg mb-8">That’s the whole voice test.</p>
          <Link to="/check" className="btn-primary text-[17px] px-8 py-3.5">Try it yourself</Link>
        </div>
      </section>

      <Footer />

      {qr && (
        <div className="fixed inset-0 z-50 bg-deep/40 flex items-center justify-center p-6" onClick={() => setQr(false)}>
          <div className="bg-white rounded-3xl p-8 text-center max-w-sm" onClick={(e) => e.stopPropagation()}>
            <button className="float-right text-muted-foreground" onClick={() => setQr(false)} aria-label="Close"><X size={18} /></button>
            <p className="text-lg text-deep mb-4">Scan with your phone camera</p>
            <div className="inline-block p-4 bg-white rounded-2xl border border-line"><QRCodeSVG value={checkUrl} size={210} fgColor="#2c5248" /></div>
            <p className="text-sm text-muted-foreground mt-4">No app or login needed.</p>
          </div>
        </div>
      )}
    </div>
  );
}
