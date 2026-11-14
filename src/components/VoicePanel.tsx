import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { fromBase64, Spectrogram as Spec, VOICE_REFERENCES, VoiceFeatures } from '../engine/voice';
import { Cite } from './ui';

/** Single-hue sage ramp on a dark ground: dark = quiet, bright = loud. */
const STOPS: [number, [number, number, number]][] = [
  [0, [29, 28, 26]],
  [0.35, [36, 64, 55]],
  [0.6, [63, 117, 101]],
  [0.82, [143, 196, 173]],
  [1, [236, 247, 240]],
];
function colour(v: number): [number, number, number] {
  for (let i = 1; i < STOPS.length; i++) {
    if (v <= STOPS[i][0]) {
      const [a, ca] = STOPS[i - 1];
      const [b, cb] = STOPS[i];
      const t = (v - a) / (b - a);
      return [0, 1, 2].map((k) => Math.round(ca[k] + (cb[k] - ca[k]) * t)) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export function SpectrogramCanvas({ spec, height = 180 }: { spec: Spec; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const data = fromBase64(spec.data);
    c.width = spec.w;
    c.height = spec.h;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(spec.w, spec.h);
    for (let t = 0; t < spec.w; t++) {
      for (let f = 0; f < spec.h; f++) {
        const v = data[t * spec.h + f] / 255;
        const [r, g, b] = colour(v * v); // gamma for contrast
        const o = ((spec.h - 1 - f) * spec.w + t) * 4;
        img.data[o] = r;
        img.data[o + 1] = g;
        img.data[o + 2] = b;
        img.data[o + 3] = Math.round(255 * Math.min(1, v * 3)); // silence fades into the panel
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [spec]);
  const kHz = Array.from({ length: Math.floor(spec.maxHz / 500) + 1 }, (_, i) => i * 0.5);
  const secs = Array.from({ length: Math.floor(spec.durationS) + 1 }, (_, i) => i);
  return (
    <div className="flex gap-2">
      <div className="relative w-8 text-xs text-cream/50 tnum" style={{ height }}>
        {kHz.map((k) => (
          <span key={k} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - (k * 1000) / spec.maxHz) * 100}%` }}>{k}k</span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <canvas ref={ref} className="w-full rounded-xl" style={{ height, imageRendering: 'auto' }} aria-label="Voice spectrogram" />
        <div className="relative h-4 text-xs text-cream/50 tnum mt-1">
          {secs.map((s) => (
            <span key={s} className="absolute -translate-x-1/2" style={{ left: `${(s / spec.durationS) * 100}%` }}>{s}s</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Ring({ value, label, frac, ok }: { value: string; label: string; unit?: string; frac: number; ok: boolean }) {
  const r = 30;
  const C = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center text-center">
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,252,247,.12)" strokeWidth="4" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={ok ? '#8fc4ad' : '#e3a49c'} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${Math.max(0.02, Math.min(1, frac)) * C} ${C}`} transform="rotate(-90 38 38)" />
        <text x="38" y="42" textAnchor="middle" fontSize="17" fill="#fffcf7" style={{ fontFamily: "'DM Sans', sans-serif" }}>{value}</text>
      </svg>
      <span className="text-base text-cream mt-1">{label}</span>
      <span className={`text-sm ${ok ? 'text-cream/55' : 'text-[#e3a49c]'}`}>{ok ? 'Typical' : 'Check'}</span>
    </div>
  );
}

export function VoicePanel({ voice, reference, referenceLabel }: { voice: VoiceFeatures; reference?: VoiceFeatures; referenceLabel?: string }) {
  const cppsOk = voice.cpps > VOICE_REFERENCES.cpps.threshold;
  const jitOk = voice.jitterLocal <= VOICE_REFERENCES.jitterLocal.threshold;
  const shimOk = voice.shimmerLocal <= VOICE_REFERENCES.shimmerLocal.threshold;
  return (
    <div className="panel-dark p-7">
      <div className="flex items-center justify-between mb-6">
        <p className="text-base text-cream/75 flex items-center gap-2"><Mic size={16} /> Voice check</p>
        <span className="text-sm text-cream/50">“aaah”, {voice.quality.durationS.toFixed(1)} s</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-7">
        <Ring value={voice.cpps.toFixed(1)} unit="dB" label="Clarity" frac={voice.cpps / 22} ok={cppsOk} />
        <Ring value={voice.jitterLocal.toFixed(1)} unit="% jitter" label="Pitch steadiness" frac={1 - Math.min(1, voice.jitterLocal / 3)} ok={jitOk} />
        <Ring value={voice.shimmerLocal.toFixed(1)} unit="% shimmer" label="Loudness steadiness" frac={1 - Math.min(1, voice.shimmerLocal / 15)} ok={shimOk} />
        <Ring value={voice.mpt.toFixed(0)} unit="s" label="Breath" frac={Math.min(1, voice.mpt / 20)} ok={voice.mpt >= 10} />
      </div>
      {voice.spectrogram ? (
        <>
          <p className="font-medium text-2xl mb-3">{cppsOk ? 'Clear, steady voice' : 'Signs of a strained or breathy voice'}</p>
          <SpectrogramCanvas spec={voice.spectrogram} />
          <p className="text-base text-cream/70 mt-3">Sharp lines mean a steady voice. Haze means strain.</p>
          {reference?.spectrogram && (
            <div className="mt-6 pt-5 border-t border-cream/10">
              <p className="text-sm text-cream/55 mb-3">For comparison: {referenceLabel}</p>
              <SpectrogramCanvas spec={reference.spectrogram} height={90} />
            </div>
          )}
        </>
      ) : (
        <p className="text-cream/60">No spectrogram for this recording.</p>
      )}
      <p className="text-sm text-cream/50 mt-5">Voice never raises urgency on its own. <Cite k="murton2020"><span className="text-cream/60">Reference</span></Cite> · <Link to="/evidence" className="underline">How we checked it</Link></p>
    </div>
  );
}
