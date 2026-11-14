/**
 * Builds the demo patients' voice data from synthetic vowels (run analysis/validate_voice.py and
 * analysis/make_demo_vowels.py first; they write analysis/out/synth) so each demo spectrogram matches its numbers.
 * Picks the file whose
 * F0 range and CPPS best match a target, adds 0.3 s of silence with fades for a natural look.
 * Usage: npx tsx analysis/node/demo_voices.ts  -> src/data/generated/demo_voices.json
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { readWav } from './features';
import { analyzeSustainedVowel } from '../../src/engine/voice';

const DIR = 'analysis/out/synth';
const files = readdirSync(DIR).filter((f) => f.endsWith('.wav'));
const all = files.map((f) => {
  const { x, sr } = readWav(`${DIR}/${f}`);
  const pad = new Float32Array(Math.round(0.3 * sr));
  const y = new Float32Array(x.length + 2 * pad.length);
  const fade = Math.round(0.08 * sr);
  for (let i = 0; i < x.length; i++) {
    const g = Math.min(1, i / fade, (x.length - 1 - i) / fade);
    y[pad.length + i] = x[i] * g;
  }
  for (let i = 0; i < y.length; i++) y[i] += (Math.random() - 0.5) * 2e-4;
  return { f, v: analyzeSustainedVowel(y, sr) };
});

const targets: Record<string, { f0: [number, number]; cpps: number; steady?: boolean }> = {
  p1: { f0: [100, 140], cpps: 11.0 }, // Pekka: dysphonic
  p2: { f0: [100, 140], cpps: 17.0, steady: true }, // Matti
  p4: { f0: [180, 230], cpps: 15.5, steady: true }, // Aino
};
// steady voices must also be inside the jitter / shimmer reference ranges
const penalty = (v: { jitterLocal: number; shimmerLocal: number }, steady?: boolean) => (steady && (v.shimmerLocal > 3.5 || v.jitterLocal > 0.9) ? 100 : 0);
const out: Record<string, unknown> = {};
for (const [id, t] of Object.entries(targets)) {
  const c = all.filter((a) => a.v.f0Mean >= t.f0[0] && a.v.f0Mean <= t.f0[1] && a.v.quality.ok !== undefined);
  c.sort((a, b) => Math.abs(a.v.cpps - t.cpps) + penalty(a.v, t.steady) - (Math.abs(b.v.cpps - t.cpps) + penalty(b.v, t.steady)));
  out[id] = c[0].v;
  console.log(id, c[0].f, 'cpps', c[0].v.cpps.toFixed(2), 'f0', c[0].v.f0Mean.toFixed(0), 'hnr', c[0].v.hnrMean.toFixed(1), 'jit', c[0].v.jitterLocal.toFixed(2), 'shim', c[0].v.shimmerLocal.toFixed(2));
}
writeFileSync('src/data/generated/demo_voices.json', JSON.stringify(out));
