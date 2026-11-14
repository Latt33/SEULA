/**
 * SEULA voice engine — runs entirely on the patient's device (browser or Node).
 *
 * Implements the standard clinical acoustic measures used in voice assessment,
 * following the published Praat algorithms as closely as is practical:
 *   - F0 contour: normalised autocorrelation with window correction (Boersma 1993)
 *   - Jitter (local, %) and shimmer (local, %): waveform-matched glottal periods
 *   - HNR mean and SD (dB): autocorrelation method (Boersma 1993), 4.5 periods/window
 *   - CPPS (dB): smoothed cepstral peak prominence (Hillenbrand 1994; Murton et al. 2020)
 *   - MPT (s): longest continuous phonation in the sustained-vowel task
 *   - Pause ratio: share of silent time in a read passage (respiratory adjunct)
 *
 * Absolute CPPS values differ between implementations (Praat vs ADSV vs ours), so
 * a linear calibration to Praat is applied. Coefficients come from
 * analysis/validate_voice.py and are documented on the Evidence page.
 */

import calibration from '../data/generated/voice_calibration.json';

export interface VoiceQuality {
  durationS: number;
  clippedFraction: number;
  snrDb: number;
  voicedFraction: number;
  ok: boolean;
  warnings: string[];
}

export interface VoiceFeatures {
  f0Mean: number;
  f0Sd: number;
  jitterLocal: number; // %
  shimmerLocal: number; // %
  hnrMean: number; // dB
  hnrSd: number; // dB
  cpps: number; // dB, calibrated to Praat scale
  cppsRaw: number; // dB, uncalibrated
  jitterRaw: number;
  shimmerRaw: number;
  mpt: number; // s
  nPeriods: number;
  quality: VoiceQuality;
}

export interface SpeechFeatures {
  durationS: number;
  speechS: number;
  pauseRatio: number; // pauses / total span
  pausesPer10s: number;
  meanPauseS: number;
  cpps: number;
  quality: VoiceQuality;
}

const MIN_PITCH = 75;
const MAX_PITCH = 600;

// ───────────────────────── utilities ─────────────────────────

function mean(a: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return a.length ? s / a.length : NaN;
}
function sd(a: ArrayLike<number>): number {
  const m = mean(a);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - m) ** 2;
  return a.length > 1 ? Math.sqrt(s / (a.length - 1)) : 0;
}
function percentile(a: number[], p: number): number {
  if (!a.length) return NaN;
  const b = [...a].sort((x, y) => x - y);
  const idx = Math.min(b.length - 1, Math.max(0, Math.round((p / 100) * (b.length - 1))));
  return b[idx];
}
function nextPow2(n: number) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** In-place iterative radix-2 FFT. re/im length must be a power of two. */
export function fft(re: Float64Array, im: Float64Array, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k + len / 2] = re[i + k] - ar;
        im[i + k + len / 2] = im[i + k] - ai;
        re[i + k] += ar;
        im[i + k] += ai;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

/** Praat-style Gaussian window (physical length = 2 × effective length). */
function gaussWin(n: number): Float64Array {
  const w = new Float64Array(n);
  const e12 = Math.exp(-12);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n - 0.5;
    w[i] = (Math.exp(-48 * u * u) - e12) / (1 - e12);
  }
  return w;
}

function hann(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i + 0.5)) / n);
  return w;
}

/** Windowed-sinc low-pass + integer/fractional resampling (linear on filtered signal). */
export function resample(x: Float32Array, srIn: number, srOut: number): Float32Array {
  if (srIn === srOut) return x;
  let y: Float32Array = x;
  if (srOut < srIn) {
    const fc = (0.45 * srOut) / srIn; // normalised cutoff
    const taps = 101;
    const h = new Float64Array(taps);
    const m = (taps - 1) / 2;
    let hs = 0;
    for (let i = 0; i < taps; i++) {
      const t = i - m;
      const sinc = t === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * t) / (Math.PI * t);
      const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (taps - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (taps - 1));
      h[i] = sinc * w;
      hs += h[i];
    }
    for (let i = 0; i < taps; i++) h[i] /= hs;
    const f = new Float32Array(x.length);
    for (let n = 0; n < x.length; n++) {
      let acc = 0;
      for (let k = 0; k < taps; k++) {
        const idx = n + k - m;
        if (idx >= 0 && idx < x.length) acc += h[k] * x[idx];
      }
      f[n] = acc;
    }
    y = f;
  }
  const ratio = srIn / srOut;
  const outLen = Math.floor(x.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const p = i * ratio;
    const i0 = Math.floor(p);
    const fr = p - i0;
    out[i] = (y[i0] ?? 0) * (1 - fr) + (y[i0 + 1] ?? 0) * fr;
  }
  return out;
}

// ───────────────────────── pitch / HNR (Boersma 1993) ─────────────────────────

interface Frame {
  t: number;
  f0: number; // 0 = unvoiced
  r: number; // normalised autocorrelation at chosen lag
}

/**
 * Short-term autocorrelation analysis. Returns per-frame best lag strength.
 * periodsPerWindow = 3 for pitch, 4.5 for HNR (Praat defaults).
 */
function acAnalysis(x: Float32Array, sr: number, periodsPerWindow: number, timeStep: number, silenceThreshold: number, voicingThreshold: number, octaveCost: number): Frame[] {
  const winLen = Math.round((periodsPerWindow / MIN_PITCH) * sr);
  const nfft = nextPow2(winLen * 2);
  const w = hann(winLen);
  // autocorrelation of the window, for correction
  const wr = new Float64Array(nfft);
  const wi = new Float64Array(nfft);
  for (let i = 0; i < winLen; i++) wr[i] = w[i];
  fft(wr, wi);
  for (let i = 0; i < nfft; i++) {
    wr[i] = wr[i] * wr[i] + wi[i] * wi[i];
    wi[i] = 0;
  }
  fft(wr, wi, true);
  const rw0 = wr[0];
  const rWin = new Float64Array(nfft);
  for (let i = 0; i < nfft; i++) rWin[i] = wr[i] / rw0;

  let globalPeak = 0;
  for (let i = 0; i < x.length; i++) globalPeak = Math.max(globalPeak, Math.abs(x[i]));

  const minLag = Math.max(2, Math.floor(sr / MAX_PITCH));
  const maxLag = Math.min(Math.floor(sr / MIN_PITCH), winLen - 2);
  const hop = Math.round(timeStep * sr);
  const frames: Frame[] = [];
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  for (let start = 0; start + winLen <= x.length; start += hop) {
    let m = 0;
    let localPeak = 0;
    for (let i = 0; i < winLen; i++) m += x[start + i];
    m /= winLen;
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < winLen; i++) {
      const v = x[start + i] - m;
      localPeak = Math.max(localPeak, Math.abs(v));
      re[i] = v * w[i];
    }
    const t = (start + winLen / 2) / sr;
    if (localPeak < silenceThreshold * globalPeak || localPeak === 0) {
      frames.push({ t, f0: 0, r: 0 });
      continue;
    }
    fft(re, im);
    for (let i = 0; i < nfft; i++) {
      re[i] = re[i] * re[i] + im[i] * im[i];
      im[i] = 0;
    }
    fft(re, im, true);
    const r0 = re[0];
    if (r0 <= 0) {
      frames.push({ t, f0: 0, r: 0 });
      continue;
    }
    // normalised, window-corrected autocorrelation
    const rc = (lag: number) => re[lag] / r0 / rWin[lag];
    let bestStrength = -Infinity;
    let bestLag = 0;
    let bestR = 0;
    for (let lag = minLag + 1; lag < maxLag; lag++) {
      const a = rc(lag - 1);
      const b = rc(lag);
      const c = rc(lag + 1);
      if (b > a && b >= c && b > 0.3 * voicingThreshold) {
        // parabolic interpolation
        const den = a - 2 * b + c;
        const d = den !== 0 ? (0.5 * (a - c)) / den : 0;
        const lagI = lag + d;
        const rI = Math.min(0.99999, b - 0.25 * (a - c) * d);
        const strength = rI - octaveCost * Math.log2(MIN_PITCH * (lagI / sr));
        if (strength > bestStrength) {
          bestStrength = strength;
          bestLag = lagI;
          bestR = rI;
        }
      }
    }
    if (bestLag > 0 && bestR >= voicingThreshold) frames.push({ t, f0: sr / bestLag, r: bestR });
    else frames.push({ t, f0: 0, r: bestR > 0 ? bestR : 0 });
  }
  return frames;
}

function pitchTrack(x: Float32Array, sr: number): Frame[] {
  const frames = acAnalysis(x, sr, 3, 0.01, 0.03, 0.45, 0.01);
  // simple median-of-3 octave-jump cleanup
  for (let i = 1; i < frames.length - 1; i++) {
    const a = frames[i - 1].f0;
    const b = frames[i].f0;
    const c = frames[i + 1].f0;
    if (a && c && b && Math.abs(Math.log2(b / ((a + c) / 2))) > 0.6) frames[i].f0 = (a + c) / 2;
  }
  return frames;
}

function hnrTrack(x: Float32Array, sr: number): number[] {
  // Praat "To Harmonicity (ac)": time step 0.01, min pitch 75, silence 0.1, 4.5 periods/window
  const frames = acAnalysis(x, sr, 4.5, 0.01, 0.1, 0.45, 0.0);
  const out: number[] = [];
  for (const f of frames) {
    if (f.f0 > 0 && f.r > 0) {
      const r = Math.min(f.r, 0.999999);
      out.push(10 * Math.log10(r / (1 - r)));
    }
  }
  return out;
}

// ───────────────────────── glottal periods, jitter, shimmer ─────────────────────────

interface Period {
  t0: number; // start sample (fractional)
  T: number; // length in samples (fractional)
  amp: number; // peak absolute amplitude in period
}

function interpPitch(frames: Frame[], t: number): number {
  // nearest voiced frame within 15 ms
  let best = 0;
  let bd = 0.015;
  for (const f of frames) {
    const d = Math.abs(f.t - t);
    if (f.f0 > 0 && d < bd) {
      bd = d;
      best = f.f0;
    }
  }
  return best;
}

/** Waveform-matching period extraction (cross-correlation of adjacent cycles). */
function extractPeriods(x: Float32Array, sr: number, frames: Frame[]): Period[] {
  const periods: Period[] = [];
  const voicedRuns: [number, number][] = [];
  let runStart = -1;
  frames.forEach((f, i) => {
    if (f.f0 > 0 && runStart < 0) runStart = i;
    if ((f.f0 === 0 || i === frames.length - 1) && runStart >= 0) {
      voicedRuns.push([frames[runStart].t, frames[f.f0 === 0 ? i - 1 : i].t]);
      runStart = -1;
    }
  });
  for (const [ts, te] of voicedRuns) {
    if (te - ts < 0.06) continue;
    let pos = ts * sr;
    const end = te * sr;
    // anchor on the largest positive peak in the first period
    const f0start = interpPitch(frames, ts) || 120;
    let Tprev = sr / f0start;
    let maxv = -Infinity;
    let maxi = Math.round(pos);
    for (let i = Math.round(pos); i < Math.round(pos + Tprev) && i < x.length; i++) {
      if (x[i] > maxv) {
        maxv = x[i];
        maxi = i;
      }
    }
    pos = maxi;
    let guard = 0;
    while (pos + 2.4 * Tprev < end && guard++ < 10000) {
      const f0 = interpPitch(frames, pos / sr);
      const Texp = f0 ? sr / f0 : Tprev;
      const L = Math.round(Texp);
      const p0 = Math.round(pos);
      // search the lag that maximises normalised correlation between this cycle and the next
      const lo = Math.max(2, Math.floor(Texp * 0.8));
      const hi = Math.ceil(Texp * 1.25);
      const corr = (lag: number) => {
        let sxy = 0;
        let sxx = 0;
        let syy = 0;
        for (let k = 0; k < L; k++) {
          const a = x[p0 + k] ?? 0;
          const b = x[p0 + lag + k] ?? 0;
          sxy += a * b;
          sxx += a * a;
          syy += b * b;
        }
        return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
      };
      let bestLag = Texp;
      let bestC = -1;
      let prevC = corr(lo - 1);
      let curC = corr(lo);
      for (let lag = lo; lag <= hi; lag++) {
        const nextC = corr(lag + 1);
        if (curC >= prevC && curC >= nextC && curC > bestC) {
          const den = prevC - 2 * curC + nextC;
          const d = den !== 0 ? (0.5 * (prevC - nextC)) / den : 0;
          bestC = curC;
          bestLag = lag + Math.max(-0.5, Math.min(0.5, d));
        }
        prevC = curC;
        curC = nextC;
      }
      if (bestC < 0.5) {
        // lost tracking: skip ahead one expected period
        pos += Texp;
        Tprev = Texp;
        continue;
      }
      let amp = 0;
      const a0 = Math.round(pos);
      const a1 = Math.round(pos + bestLag);
      for (let i = a0; i < a1; i++) amp = Math.max(amp, Math.abs(x[i] ?? 0));
      periods.push({ t0: pos, T: bestLag, amp });
      pos += bestLag;
      Tprev = bestLag;
    }
  }
  return periods;
}

function jitterShimmer(periods: Period[], sr: number): { jitter: number; shimmer: number } {
  // Praat constraints: period floor 0.0001 s, ceiling 0.02 s, max period factor 1.3, max amplitude factor 1.6
  let dj = 0;
  let nj = 0;
  let sumT = 0;
  let nT = 0;
  let ds = 0;
  let ns = 0;
  let sumA = 0;
  let nA = 0;
  for (let i = 0; i < periods.length; i++) {
    const T = periods[i].T / sr;
    if (T < 0.0001 || T > 0.02) continue;
    sumT += T;
    nT++;
    sumA += periods[i].amp;
    nA++;
    if (i > 0) {
      const contiguous = Math.abs(periods[i - 1].t0 + periods[i - 1].T - periods[i].t0) < 1;
      const Tp = periods[i - 1].T / sr;
      if (contiguous && Tp >= 0.0001 && Tp <= 0.02) {
        const f = Math.max(T, Tp) / Math.min(T, Tp);
        if (f <= 1.3) {
          dj += Math.abs(T - Tp);
          nj++;
        }
        const Ap = periods[i - 1].amp;
        const A = periods[i].amp;
        if (Ap > 0 && A > 0 && Math.max(A, Ap) / Math.min(A, Ap) <= 1.6) {
          ds += Math.abs(A - Ap);
          ns++;
        }
      }
    }
  }
  return {
    jitter: nj && nT ? (100 * (dj / nj)) / (sumT / nT) : NaN,
    shimmer: ns && nA ? (100 * (ds / ns)) / (sumA / nA) : NaN,
  };
}

// ───────────────────────── CPPS ─────────────────────────

/**
 * Smoothed cepstral peak prominence, Praat-style parameters:
 * resample to 10 kHz, pre-emphasis from 50 Hz, analysis window 3/60 s (Hann),
 * time step 2 ms, smoothing 10 ms (time) × 1 ms (quefrency), peak search 60–330 Hz,
 * straight tilt line fitted from 1 ms upward.
 */
export function cppsRaw(xIn: Float32Array, srIn: number, opts: { winSec?: number; gaussian?: boolean } = {}): { mean: number; perFrame: number[] } {
  const sr = 10000;
  const x0 = resample(xIn, srIn, sr);
  // pre-emphasis
  const a = Math.exp((-2 * Math.PI * 50) / sr);
  const x = new Float32Array(x0.length);
  for (let i = x0.length - 1; i > 0; i--) x[i] = x0[i] - a * x0[i - 1];
  const winLen = Math.round((opts.winSec ?? 0.1) * sr);
  const nfft = nextPow2(winLen);
  const w = (opts.gaussian ?? true) ? gaussWin(winLen) : hann(winLen);
  const hop = Math.round(0.002 * sr);
  const cepstra: Float64Array[] = [];
  const energies: number[] = [];
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  for (let s = 0; s + winLen <= x.length; s += hop) {
    re.fill(0);
    im.fill(0);
    let e = 0;
    for (let i = 0; i < winLen; i++) {
      re[i] = x[s + i] * w[i];
      e += re[i] * re[i];
    }
    energies.push(e);
    fft(re, im);
    for (let i = 0; i < nfft; i++) {
      const p = re[i] * re[i] + im[i] * im[i];
      re[i] = 10 * Math.log10(p + 1e-12);
      im[i] = 0;
    }
    fft(re, im, true);
    const c = new Float64Array(nfft / 2);
    for (let i = 0; i < nfft / 2; i++) c[i] = re[i] * re[i] + im[i] * im[i]; // linear power; smoothed before dB
    cepstra.push(c);
  }
  if (!cepstra.length) return { mean: NaN, perFrame: [] };
  // keep frames with energy within 30 dB of the max (voiced/speech frames)
  const eMax = Math.max(...energies);
  const keep = energies.map((e) => 10 * Math.log10((e + 1e-20) / eMax) > -30);
  // smoothing
  const tHalf = Math.max(1, Math.round(0.01 / 0.002 / 2));
  const qHalf = Math.max(1, Math.round((0.001 * sr) / 2));
  const nq = nfft / 2;
  const qLo = Math.floor(sr / 330);
  const qHi = Math.min(nq - 2, Math.ceil(sr / 60));
  const fitLo = Math.round(0.001 * sr);
  const perFrame: number[] = [];
  for (let f = 0; f < cepstra.length; f++) {
    if (!keep[f]) continue;
    const avg = new Float64Array(nq);
    let cnt = 0;
    for (let g = Math.max(0, f - tHalf); g <= Math.min(cepstra.length - 1, f + tHalf); g++) {
      cnt++;
      for (let q = 0; q < nq; q++) avg[q] += cepstra[g][q];
    }
    for (let q = 0; q < nq; q++) avg[q] /= cnt;
    const sm = new Float64Array(nq);
    for (let q = 0; q < nq; q++) {
      let s = 0;
      let n = 0;
      for (let k = Math.max(0, q - qHalf); k <= Math.min(nq - 1, q + qHalf); k++) {
        s += avg[k];
        n++;
      }
      sm[q] = 10 * Math.log10(s / n + 1e-30);
    }
    // regression line over [fitLo, nq)
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    let n = 0;
    for (let q = fitLo; q < nq; q++) {
      sx += q;
      sy += sm[q];
      sxx += q * q;
      sxy += q * sm[q];
      n++;
    }
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const icpt = (sy - slope * sx) / n;
    let pk = -Infinity;
    let pq = qLo;
    for (let q = qLo; q <= qHi; q++) {
      if (sm[q] > pk) {
        pk = sm[q];
        pq = q;
      }
    }
    perFrame.push(pk - (icpt + slope * pq));
  }
  return { mean: mean(perFrame), perFrame };
}

// ───────────────────────── quality ─────────────────────────

function quality(x: Float32Array, sr: number, voicedFraction: number, minDur: number): VoiceQuality {
  const durationS = x.length / sr;
  let clipped = 0;
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > 0.985) clipped++;
  const frameLen = Math.round(0.025 * sr);
  const db: number[] = [];
  for (let s = 0; s + frameLen <= x.length; s += frameLen) {
    let e = 0;
    for (let i = 0; i < frameLen; i++) e += x[s + i] * x[s + i];
    db.push(10 * Math.log10(e / frameLen + 1e-12));
  }
  const snrDb = percentile(db, 95) - percentile(db, 10);
  const warnings: string[] = [];
  if (durationS < minDur) warnings.push('Recording is shorter than recommended.');
  if (clipped / x.length > 0.002) warnings.push('Input is clipping: move the phone a little further away.');
  if (snrDb < 20) warnings.push('Background noise is high: acoustic measures may be unreliable.');
  if (voicedFraction < 0.3) warnings.push('Little voiced sound detected.');
  return { durationS, clippedFraction: clipped / x.length, snrDb, voicedFraction, ok: warnings.length === 0, warnings };
}

type Cal = Record<string, { slope: number; intercept: number }>;
function cal(name: 'cpps' | 'jitterLocal' | 'shimmerLocal', raw: number): number {
  const c = (calibration as unknown as Cal)[name];
  return c ? c.slope * raw + c.intercept : raw;
}
function calibrateCpps(raw: number): number {
  return cal('cpps', raw);
}

// ───────────────────────── public API ─────────────────────────

/** Sustained vowel /a/ task. */
export function analyzeSustainedVowel(xIn: Float32Array, srIn: number): VoiceFeatures {
  const sr = Math.min(srIn, 48000);
  const x = srIn > 48000 ? resample(xIn, srIn, sr) : xIn;
  const framesAll = pitchTrack(x, sr);
  // Analyse the stable middle of the longest phonation (clinical practice: drop onset/offset).
  let bestRun: [number, number] = [0, x.length / sr];
  {
    let rs = -1;
    let lv = -1;
    let bestLen = 0;
    for (const f of framesAll) {
      if (f.f0 > 0) {
        if (rs < 0 || f.t - lv > 0.15) rs = f.t;
        lv = f.t;
        if (lv - rs > bestLen) {
          bestLen = lv - rs;
          bestRun = [rs, lv];
        }
      }
    }
  }
  const trim = Math.min(0.5, (bestRun[1] - bestRun[0]) * 0.1);
  const segStart = Math.max(0, Math.floor((bestRun[0] + trim) * sr));
  const segEnd = Math.min(x.length, Math.ceil((bestRun[1] - trim) * sr));
  const seg = segEnd - segStart > sr * 0.8 ? x.subarray(segStart, segEnd) : x;
  const frames = seg === x ? framesAll : pitchTrack(seg, sr);
  const voiced = frames.filter((f) => f.f0 > 0);
  const f0s = voiced.map((f) => f.f0);
  const periods = extractPeriods(seg, sr, frames);
  const { jitter, shimmer } = jitterShimmer(periods, sr);
  const hnr = hnrTrack(seg, sr);
  const cp = cppsRaw(seg, sr);
  // MPT: longest voiced run allowing gaps < 150 ms
  let best = 0;
  let runStart = -1;
  let lastVoiced = -1;
  framesAll.forEach((f) => {
    if (f.f0 > 0) {
      if (runStart < 0 || f.t - lastVoiced > 0.15) runStart = f.t;
      lastVoiced = f.t;
      best = Math.max(best, lastVoiced - runStart);
    }
  });
  const voicedFraction = framesAll.length ? framesAll.filter((f) => f.f0 > 0).length / framesAll.length : 0;
  return {
    f0Mean: mean(f0s),
    f0Sd: sd(f0s),
    jitterLocal: cal('jitterLocal', jitter),
    shimmerLocal: cal('shimmerLocal', shimmer),
    jitterRaw: jitter,
    shimmerRaw: shimmer,
    hnrMean: mean(hnr),
    hnrSd: sd(hnr),
    cppsRaw: cp.mean,
    cpps: calibrateCpps(cp.mean),
    mpt: best,
    nPeriods: periods.length,
    quality: quality(x, sr, voicedFraction, 2.5),
  };
}

/** Read-passage task: pauses (breathing) and connected-speech CPPS. */
export function analyzeReadSpeech(xIn: Float32Array, srIn: number): SpeechFeatures {
  const sr = Math.min(srIn, 48000);
  const x = srIn > 48000 ? resample(xIn, srIn, sr) : xIn;
  const frameLen = Math.round(0.025 * sr);
  const hop = Math.round(0.01 * sr);
  const db: number[] = [];
  for (let s = 0; s + frameLen <= x.length; s += hop) {
    let e = 0;
    for (let i = 0; i < frameLen; i++) e += x[s + i] * x[s + i];
    db.push(10 * Math.log10(e / frameLen + 1e-12));
  }
  const thr = percentile(db, 97) - 25;
  const speech = db.map((d) => d > thr);
  const first = speech.indexOf(true);
  const last = speech.lastIndexOf(true);
  let pauses: number[] = [];
  let speechFrames = 0;
  if (first >= 0) {
    let run = 0;
    for (let i = first; i <= last; i++) {
      if (speech[i]) {
        speechFrames++;
        if (run >= 25) pauses.push(run * 0.01); // pauses >= 250 ms
        run = 0;
      } else run++;
    }
  }
  const span = first >= 0 ? (last - first + 1) * 0.01 : 0;
  const pauseTotal = pauses.reduce((a, b) => a + b, 0);
  const cp = cppsRaw(x, sr);
  return {
    durationS: x.length / sr,
    speechS: speechFrames * 0.01,
    pauseRatio: span ? pauseTotal / span : NaN,
    pausesPer10s: span ? (pauses.length / span) * 10 : NaN,
    meanPauseS: pauses.length ? pauseTotal / pauses.length : 0,
    cpps: calibrateCpps(cp.mean),
    quality: quality(x, sr, span ? speechFrames / (db.length || 1) : 0, 8),
  };
}

/** Reference values used in the clinician view. Each has a published source. */
export const VOICE_REFERENCES = {
  cpps: { threshold: 14.45, direction: 'below' as const, label: 'CPPS (sustained /a/)', unit: 'dB', source: 'murton2020' },
  jitterLocal: { threshold: 1.04, direction: 'above' as const, label: 'Jitter (local)', unit: '%', source: 'teixeira2013' },
  shimmerLocal: { threshold: 3.81, direction: 'above' as const, label: 'Shimmer (local)', unit: '%', source: 'teixeira2013' },
};
