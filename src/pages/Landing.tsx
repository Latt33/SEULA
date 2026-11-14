import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, ClipboardList, Mic, Minus, QrCode, Stethoscope, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Cite, Footer, Nav } from '../components/ui';
import { DoctorCard, FormScreen, Phone, VoiceScreen } from '../components/Mockups';
import { Ring, SpectrogramCanvas } from '../components/VoicePanel';
import demoVoices from '../data/generated/demo_voices.json';
import type { VoiceFeatures } from '../engine/voice';

const steady = (demoVoices as unknown as Record<string, VoiceFeatures>).p2;
const strained = (demoVoices as unknown as Record<string, VoiceFeatures>).p1;

const TODAY = ['History taken from scratch in the visit', 'Warning signs depend on what the patient remembers', 'Voice changes noticed only if mentioned', 'Referral leaves out everyday function', 'Delays become visible years later, if at all'];
const WITH = ['History arrives organised, before the visit', 'Every answer checked against referral guidelines', 'A 3-second voice check flags a strained voice', 'Frailty score attached for patients over 70', 'Waiting times visible per health station within weeks'];

const FAQ = [
  ['Does SEULA tell me if I have cancer?', 'No. It never shows a diagnosis or a risk score. It helps your doctor notice what needs checking and book the right test sooner.'],
  ['Is my voice recording stored?', 'No. The recording is analysed on your phone and then discarded. Only a few numbers, like how steady your voice is, go to your health centre.'],
  ['What if I don’t have a smartphone?', 'A nurse can ask the same questions by phone, or you can fill in a paper form in the waiting room.'],
  ['Where do the questions come from?', 'Only from published, validated sources: the UK NICE cancer referral guideline and widely used questionnaires for voice and everyday function.'],
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
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24 grid md:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div>
            <p className="eyebrow mb-6">Before your doctor’s visit</p>
            <h1 className="text-[3.2rem] md:text-[4.6rem] leading-[1] text-deep mb-7">Spot the signs of cancer at the first visit</h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-md">A calm 4-minute check on your own phone. A few questions and one “aaah”. No app, no login.</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/check" className="btn-primary text-[17px] px-8 py-3.5">Try it yourself</Link>
              <button onClick={() => setQr(true)} className="btn-ghost text-[17px] px-6 py-3.5"><QrCode size={18} /> Open on phone</button>
            </div>
          </div>
          <div className="relative h-[520px] hidden sm:block">
            <Phone className="absolute left-[2%] top-6 -rotate-[4deg]"><FormScreen /></Phone>
            <Phone className="absolute right-[2%] top-0 rotate-[3deg]"><VoiceScreen /></Phone>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 z-20"><DoctorCard /></div>
          </div>
        </div>
      </section>

      {/* Statement */}
      <section className="py-24 md:py-32 px-5">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-[2.4rem] md:text-[3.6rem] leading-[1.05] text-deep mb-8">
            16.7% of Finnish men with lung cancer are alive five years later. In Sweden, 26.8%.
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">The gap starts before anyone is referred: one in four Finns feel they don’t get enough doctor time, and only 27% of lung cancer patients reach treatment that aims to cure.</p>
          <p className="text-sm space-x-3"><Cite k="nordicLung" /> <Cite k="terveSuomi" /> <Cite k="lungReport" /></p>
          <Link to="/region" className="btn-ghost mt-10">See where the gaps are <ArrowRight size={16} /></Link>
        </div>
      </section>

      {/* Three moments */}
      <section className="pb-24 px-5">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow mb-4">How it works</p>
          <h2 className="text-4xl md:text-5xl text-deep mb-12 max-w-2xl">Three moments, four minutes</h2>
          <div className="grid md:grid-cols-3 gap-5">
            <Moment pill="At home" icon={<ClipboardList size={14} />} title="Answer a few questions" text="The booking text message brings a short, standard health questionnaire.">
              <div className="scale-[0.82] origin-top"><Phone><FormScreen /></Phone></div>
            </Moment>
            <Moment pill="Three seconds" icon={<Mic size={14} />} title="Say “aaah”" text="The phone measures how clear and steady the voice is. Nothing is uploaded." dark>
              <div className="w-full px-6 pt-10">
                <div className="grid grid-cols-3 gap-1 mb-6">
                  <Ring value={steady.cpps.toFixed(1)} unit="dB" label="Clarity" frac={steady.cpps / 22} ok />
                  <Ring value={steady.jitterLocal.toFixed(1)} unit="% jitter" label="Pitch" frac={0.85} ok />
                  <Ring value={steady.shimmerLocal.toFixed(1)} unit="% shimmer" label="Loudness" frac={0.45} ok={steady.shimmerLocal < 3.81} />
                </div>
                {steady.spectrogram && <SpectrogramCanvas spec={steady.spectrogram} height={120} />}
              </div>
            </Moment>
            <Moment pill="In the doctor’s room" icon={<Stethoscope size={14} />} title="Start with what matters" text="The doctor sees the answers sorted, with a suggested next step and the guideline behind it.">
              <div className="pt-16 px-4 flex justify-center"><DoctorCard /></div>
            </Moment>
          </div>
        </div>
      </section>

      {/* Voice feature (dark) */}
      <section className="px-3 md:px-5">
        <div className="band px-6 md:px-14 py-16 md:py-20">
          <div className="mx-auto max-w-6xl grid lg:grid-cols-[1fr_1.3fr] gap-12 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-cream/60 mb-5">The voice check</p>
              <h2 className="text-4xl md:text-5xl mb-6">One “aaah”, read like a lab result</h2>
              <p className="text-lg text-cream/75 leading-relaxed mb-8">A healthy voice shows sharp, evenly spaced harmonics. A strained or breathy voice blurs them into haze. SEULA measures the same things a voice clinic does, on the patient’s phone, and agrees with the clinical reference software with correlations of 0.93 to 1.00.</p>
              <Link to="/evidence" className="btn-light">How we checked it <ArrowRight size={16} /></Link>
            </div>
            <div className="space-y-6">
              {[['Steady voice', steady], ['Strained voice', strained]].map(([l, v]) => {
                const vf = v as VoiceFeatures;
                return (
                  <div key={l as string} className="panel-dark p-5 border border-cream/10">
                    <div className="flex justify-between text-sm mb-3"><span className="text-cream">{l as string}</span><span className="text-cream/60 tnum">clarity {vf.cpps.toFixed(1)} dB</span></div>
                    {vf.spectrogram && <SpectrogramCanvas spec={vf.spectrogram} height={110} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Today vs with SEULA */}
      <section className="py-24 md:py-28 px-5">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl md:text-5xl text-deep text-center mb-12">The same visit, better prepared</h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="card-cream p-8">
              <p className="eyebrow mb-6 text-muted-foreground">Today</p>
              <ul className="space-y-4">{TODAY.map((t) => <li key={t} className="flex gap-3 text-muted-foreground"><Minus size={18} className="shrink-0 mt-0.5" />{t}</li>)}</ul>
            </div>
            <div className="card p-8 border-primary/30">
              <p className="eyebrow mb-6 text-primary">With SEULA</p>
              <ul className="space-y-4">{WITH.map((t) => <li key={t} className="flex gap-3 text-deep"><Check size={18} className="shrink-0 mt-0.5 text-primary" strokeWidth={2.5} />{t}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      {/* Who */}
      <section className="py-20 px-5 bg-mist">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow mb-4">Who it’s for</p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              ['Patients', 'A short, private check from home. Your doctor hears what matters to you.', '/check', 'Try it yourself'],
              ['Doctors', 'Every visit starts with an organised history and a suggested next step.', '/clinician', 'See the doctor’s view'],
              ['Regions', 'Start where access is weakest, and see waiting times as they happen.', '/region', 'See the plan'],
            ].map(([h, b, to, cta]) => (
              <Link key={h} to={to} className="card p-8 hover:border-deep/30 transition-colors group">
                <h3 className="font-serif font-light text-4xl text-deep mb-4">{h}</h3>
                <p className="text-muted-foreground leading-relaxed mb-8">{b}</p>
                <span className="text-deep font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">{cta} <ArrowRight size={16} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Good to know */}
      <section className="py-24 px-5">
        <div className="mx-auto max-w-6xl grid md:grid-cols-[1fr_1.6fr] gap-10">
          <div>
            <p className="eyebrow mb-4">Good to know</p>
            <h2 className="text-4xl md:text-5xl text-deep">Common questions</h2>
            <Link to="/evidence" className="inline-flex items-center gap-1 text-deep font-medium mt-6">Read the evidence <ArrowRight size={16} /></Link>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex justify-between items-center cursor-pointer text-lg text-deep">
                  {q}
                  <ChevronDown size={20} className="transition-transform group-open:rotate-180 shrink-0 ml-4" />
                </summary>
                <p className="text-muted-foreground leading-relaxed mt-3 pr-8">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing with QR on the page */}
      <section className="px-3 md:px-5 pb-6">
        <div className="bg-sage rounded-4xl px-6 md:px-14 py-14 md:py-16 grid md:grid-cols-[1fr_auto] gap-10 items-center max-w-6xl mx-auto">
          <div>
            <h2 className="text-4xl md:text-5xl text-deep mb-4">Try it now. It takes four minutes.</h2>
            <p className="text-lg text-muted-foreground mb-8">Scan the code with your phone camera, or open it here.</p>
            <Link to="/check" className="btn-primary text-[17px] px-8 py-3.5">Try it yourself</Link>
          </div>
          <div className="bg-cream rounded-3xl p-5 justify-self-center"><QRCodeSVG value={checkUrl} size={170} fgColor="#3a3732" bgColor="#fffcf7" /></div>
        </div>
      </section>

      <Footer />

      {qr && (
        <div className="fixed inset-0 z-50 bg-night/50 flex items-center justify-center p-6" onClick={() => setQr(false)}>
          <div className="bg-cream rounded-3xl p-8 text-center max-w-sm" onClick={(e) => e.stopPropagation()}>
            <button className="float-right text-muted-foreground" onClick={() => setQr(false)} aria-label="Close"><X size={18} /></button>
            <p className="font-serif text-2xl text-deep mb-4">Scan with your phone</p>
            <div className="inline-block p-4 bg-white rounded-2xl"><QRCodeSVG value={checkUrl} size={210} fgColor="#3a3732" /></div>
            <p className="text-sm text-muted-foreground mt-4">No app or login needed.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Moment({ pill, icon, title, text, dark = false, children }: { pill: string; icon: React.ReactNode; title: string; text: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className={`relative h-[400px] rounded-3xl overflow-hidden flex justify-center ${dark ? 'panel-dark' : 'bg-mist'}`}>
        <span className={`absolute top-5 left-5 z-10 chip px-3 py-1.5 text-[13px] ${dark ? 'bg-cream/10 text-cream backdrop-blur' : 'bg-deep/80 text-cream'}`}>{icon} {pill}</span>
        <div className={dark ? 'w-full' : 'pt-14'}>{children}</div>
      </div>
      <h3 className="text-xl text-deep mt-5 mb-1">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
