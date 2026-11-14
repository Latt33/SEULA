/**
 * Node harness: runs the exact browser voice engine (src/engine/voice.ts) on WAV files.
 * Usage: tsx analysis/node/features.ts list.txt out.json
 *   list.txt: one WAV path per line (16-bit PCM or 32-bit float, mono)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { analyzeSustainedVowel } from '../../src/engine/voice';

export function readWav(path: string): { x: Float32Array; sr: number } {
  const b = readFileSync(path);
  let p = 12;
  let sr = 0;
  let bits = 16;
  let fmt = 1;
  let ch = 1;
  let data: Buffer | null = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4);
    const size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') {
      fmt = b.readUInt16LE(p + 8);
      ch = b.readUInt16LE(p + 10);
      sr = b.readUInt32LE(p + 12);
      bits = b.readUInt16LE(p + 22);
    } else if (id === 'data') {
      data = b.subarray(p + 8, p + 8 + size);
    }
    p += 8 + size + (size % 2);
  }
  if (!data) throw new Error('no data chunk: ' + path);
  const n = data.length / (bits / 8) / ch;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * ch * (bits / 8);
    x[i] = fmt === 3 ? data.readFloatLE(o) : bits === 16 ? data.readInt16LE(o) / 32768 : data.readInt32LE(o) / 2147483648;
  }
  return { x, sr };
}

if (process.argv[2]) {
  const files = readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean);
  const out: Record<string, unknown> = {};
  for (const f of files) {
    try {
      const { x, sr } = readWav(f);
      const r = analyzeSustainedVowel(x, sr);
      out[f] = { f0Mean: r.f0Mean, jitterLocal: r.jitterRaw, shimmerLocal: r.shimmerRaw, hnrMean: r.hnrMean, hnrSd: r.hnrSd, cppsRaw: r.cppsRaw, mpt: r.mpt, nPeriods: r.nPeriods };
    } catch (e) {
      out[f] = { error: String(e) };
    }
  }
  writeFileSync(process.argv[3], JSON.stringify(out));
}
