import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, MapPin, ChevronDown, ClipboardList, Mic, Minus, QrCode, Stethoscope, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Cite, Footer, Nav } from '../components/ui';
import { SOURCES } from '../data/sources';

const SRC = (k: string) => SOURCES[k]?.url ?? '#';

const COMPARE: [string, string, string, boolean][] = [
  ['Population screening', 'Invites everyone for one cancer type.', 'Misses people who already have symptoms.', false],
  ['Blood tests for many cancers', 'A lab test for every person.', 'Cost per person; benefit on deaths not yet shown.', false],
  ['AI on health records', 'Integration with every record system.', 'Only sees what was already written down.', false],
  ['SEULA', 'A link in the booking text message.', 'Asks the symptom questions before the visit, for every cancer in the guideline.', true],
];
import { DoctorCard, FormScreen, Phone, VoiceScreen } from '../components/Mockups';
import { Ring, SpectrogramCanvas } from '../components/VoicePanel';
import demoVoices from '../data/generated/demo_voices.json';
import type { VoiceFeatures } from '../engine/voice';

const steady = (demoVoices as unknown as Record<string, VoiceFeatures>).p2;
const strained = (demoVoices as unknown as Record<string, VoiceFeatures>).p1;

const TODAY = ['History taken from scratch', 'Warning signs depend on memory', 'Voice changes easy to miss', 'Delays seen years later'];
const WITH = ['History ready before the visit', 'Answers checked against guidelines', 'Voice checked in 3 seconds', 'Delays seen within weeks'];

const FAQ = [
  ['Does it tell me if I have cancer?', 'No. It helps your doctor see what needs checking, and book the right test sooner.'],
  ['Is my voice stored?', 'No. It is analysed on your phone and then deleted. Only a few numbers are shared.'],
  ['No smartphone?', 'A nurse can ask the same questions by phone.'],
  ['Where do the questions come from?', 'Published medical guidelines and validated questionnaires.'],
];

export function Landing() {
  const [qr, setQr] = useState(false);
  const checkUrl = `${window.location.origin}${window.location.pathname}#/check`;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Nav />
      <WhyToast />

      {/* Hero */}
      <section className="bg-mist">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24 grid md:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div>
            <h1 className="text-[2.8rem] md:text-[4rem] leading-[1.05] text-deep mb-7">Spot the signs of cancer at the first visit</h1>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-10 max-w-md">A calm 4-minute check on your phone before you see the doctor.</p>
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

      {/* Why */}
      <section className="py-28 md:py-36 px-5">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-4xl md:text-5xl text-deep mb-16">In Finland, cancer is often found late</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {[
              ['16.7%', 'of men with lung cancer alive after 5 years. Sweden: 26.8%.', 'nordicLung'],
              ['1 in 4', 'feel they don’t get enough doctor time.', 'terveSuomi'],
              ['27%', 'of lung cancer patients get treatment aiming to cure.', 'lungReport'],
            ].map(([v, l, c]) => (
              <div key={v}>
                <p className="text-6xl md:text-7xl font-medium text-deep tnum mb-4">{v}</p>
                <p className="text-lg text-muted-foreground leading-snug max-w-[16rem] mx-auto mb-2">{l}</p>
                <Cite k={c}>source</Cite>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Why this is the simplest screening */}
      <section className="pb-28 md:pb-32 px-5">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl mb-12">
            <p className="eyebrow mb-3">Why this works</p>
            <h2 className="text-4xl md:text-5xl text-deep mb-5">The simplest screening is the visit people already book</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">Most of the delay happens before and at the first doctor visit. SEULA works exactly there, without a new programme, device or appointment.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {[
              ['61%', 'of the delay in lung cancer is before the patient sees a GP.', 'kotecha2021', 'Asks about symptoms people tend to wait out.'],
              ['35%', 'of symptomatic patients in English primary care got the recommended chest X-ray within 14 days.', 'cxrDelay', 'Turns guideline rules into a ready next step.'],
              ['4,000+', 'UK practices already run symptom-based cancer risk tools inside routine care.', 'qcancer', 'The same idea, moved to before the visit.'],
            ].map(([v, l, c, so]) => (
              <div key={v} className="card p-7 flex flex-col">
                <p className="text-5xl font-medium text-deep tnum mb-3">{v}</p>
                <p className="text-muted-foreground leading-snug mb-2">{l} <Cite k={c}>source</Cite></p>
                <p className="mt-auto pt-4 border-t border-line text-deep">{so}</p>
              </div>
            ))}
          </div>
          <div className="card-cream p-6 md:p-8">
            <p className="text-lg font-medium text-deep mb-5">Compared with other ways to find cancer earlier</p>
            <div className="divide-y divide-line">
              {COMPARE.map(([name, need, gap, us]) => (
                <div key={name} className={`grid grid-cols-1 md:grid-cols-[200px_1fr_1fr] gap-1 md:gap-6 py-4 ${us ? 'text-deep' : ''}`}>
                  <p className={`font-medium ${us ? 'text-primary' : 'text-deep'}`}>{name}</p>
                  <p className={us ? '' : 'text-muted-foreground'}>{need}</p>
                  <p className={us ? '' : 'text-muted-foreground'}>{gap}</p>
                </div>
              ))}
            </div>
            <Link to="/region" className="inline-flex items-center gap-1.5 mt-6 text-primary font-medium hover:underline">See where in Finland it matters most <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* Three moments */}
      <section className="pb-24 px-5">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl text-deep text-center mb-16">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Moment pill="At home" icon={<ClipboardList size={14} />} title="Answer a few questions" text="Linked from your booking text message.">
              <div className="scale-[0.82] origin-top"><Phone><FormScreen /></Phone></div>
            </Moment>
            <Moment pill="Three seconds" icon={<Mic size={14} />} title="Say “aaah”" text="Your phone checks how steady your voice is." dark>
              <div className="w-full px-6 pt-10">
                <div className="grid grid-cols-3 gap-1 mb-6">
                  <Ring value={steady.cpps.toFixed(1)} unit="dB" label="Clarity" frac={steady.cpps / 22} ok />
                  <Ring value={steady.jitterLocal.toFixed(1)} unit="% jitter" label="Pitch" frac={0.85} ok />
                  <Ring value={steady.shimmerLocal.toFixed(1)} unit="% shimmer" label="Loudness" frac={0.45} ok={steady.shimmerLocal < 3.81} />
                </div>
                {steady.spectrogram && <SpectrogramCanvas spec={steady.spectrogram} height={120} />}
              </div>
            </Moment>
            <Moment pill="At the visit" icon={<Stethoscope size={14} />} title="Your doctor is prepared" text="With a suggested next step.">
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
              <h2 className="text-4xl md:text-5xl mb-6">One “aaah”, read like a lab result</h2>
              <p className="text-xl text-cream/75 leading-relaxed mb-8">A steady voice shows sharp lines. A strained voice blurs them.</p>
              <p className="text-sm font-medium text-cream mb-4">Why voice is new here</p>
              <ol className="space-y-4 mb-10">
                {[
                  ['Hoarseness is often the first sign.', 'Glottic cancer, the most common laryngeal cancer, shows up in the voice early. Over 80% survive 5 years when it is found early; 36–55% when advanced.', 'dysphoniaSurvival'],
                  ['Until now, measured only in voice labs.', 'Voice clarity (CPPS) is the best-validated acoustic measure, but it is usually taken after referral. Phone microphones now match studio microphones for it.', 'jannetts2019'],
                  ['SEULA measures it before the first visit.', 'Research groups use voice after referral. SEULA puts the same measure on the patient’s own phone, before the GP has even seen them.', 'paterson2025'],
                ].map(([t, d, c], i) => (
                  <li key={t} className="flex gap-4">
                    <span className="w-7 h-7 rounded-full border border-cream/30 text-cream/80 flex items-center justify-center text-sm shrink-0">{i + 1}</span>
                    <div><p className="text-cream">{t}</p><p className="text-cream/65 text-[15px] leading-relaxed">{d} <a href={SRC(c)} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 text-cream/50 hover:text-cream">source</a></p></div>
                  </li>
                ))}
              </ol>
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
          <h2 className="text-4xl md:text-5xl text-deep text-center mb-14">The same visit, better prepared</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card-cream p-8">
              <p className="text-xl font-medium mb-6 text-muted-foreground">Today</p>
              <ul className="space-y-4">{TODAY.map((t) => <li key={t} className="flex gap-3 text-lg text-muted-foreground"><Minus size={18} className="shrink-0 mt-0.5" />{t}</li>)}</ul>
            </div>
            <div className="card p-8 border-primary/30">
              <p className="text-xl font-medium mb-6 text-primary">With SEULA</p>
              <ul className="space-y-4">{WITH.map((t) => <li key={t} className="flex gap-3 text-lg text-deep"><Check size={18} className="shrink-0 mt-0.5 text-primary" strokeWidth={2.5} />{t}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      {/* Good to know */}
      <section className="py-24 px-5">
        <div className="mx-auto max-w-6xl grid md:grid-cols-[1fr_1.6fr] gap-10">
          <div>
            <h2 className="text-4xl md:text-5xl text-deep">Questions</h2>
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
            <h2 className="text-4xl md:text-5xl text-deep mb-4">Try it now</h2>
            <p className="text-xl text-muted-foreground mb-8">Scan with your phone camera.</p>
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


function WhyToast() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('seula-why') === '1'; } catch { /* storage unavailable */ }
    if (seen) return;
    const t = window.setTimeout(() => setShow(true), 1400);
    return () => window.clearTimeout(t);
  }, []);
  const close = () => {
    setShow(false);
    try { sessionStorage.setItem('seula-why', '1'); } catch { /* storage unavailable */ }
  };
  if (!show) return null;
  return (
    <div role="status" className="fixed z-50 bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm card p-5 shadow-[0_12px_40px_-12px_rgba(29,28,26,0.35)] animate-[fadeUp_.4s_ease-out]">
      <button onClick={close} aria-label="Close" className="absolute top-3 right-3 text-muted-foreground hover:text-deep"><X size={18} /></button>
      <div className="flex gap-3 pr-6">
        <span className="w-9 h-9 rounded-full bg-sage text-primary flex items-center justify-center shrink-0"><MapPin size={17} /></span>
        <div>
          <p className="font-medium text-deep mb-1">New here? Start with why it matters</p>
          <p className="text-[15px] text-muted-foreground leading-snug mb-3">In parts of Finland nearly 1 in 3 people feel they cannot get enough doctor time. See where SEULA helps first.</p>
          <Link to="/region" onClick={close} className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline">Why it matters <ArrowRight size={15} /></Link>
        </div>
      </div>
    </div>
  );
}

function Moment({ pill, icon, title, text, dark = false, children }: { pill: string; icon: React.ReactNode; title: string; text: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className={`relative h-[400px] rounded-3xl overflow-hidden flex justify-center ${dark ? 'panel-dark' : 'bg-mist'}`}>
        <span className={`absolute top-5 left-5 z-10 chip px-3.5 py-1.5 text-sm ${dark ? 'bg-cream/10 text-cream backdrop-blur' : 'bg-deep/80 text-cream'}`}>{icon} {pill}</span>
        <div className={dark ? 'w-full' : 'pt-14'}>{children}</div>
      </div>
      <h3 className="text-xl text-deep mt-5 mb-1">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
