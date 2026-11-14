import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, ScanSearch } from 'lucide-react';
import type { DemoPatient } from '../data/demoPatients';
import { cxrSrc, MedGemmaResult, medgemmaUrl, preRead, recorded, warmup } from './client';

const NIH = 1024; // NIH ChestX-ray14 images are 1024 x 1024; NIH boxes are pixels [x, y, w, h]
type Box = [number, number, number, number]; // [y0, x0, y1, x1] on 0-1000

/** Keep only plausible boxes: on an abnormal read, and not most of the image. */
const usable = (r: MedGemmaResult | null) =>
  r && r.ct_within_2_weeks ? r.boxes.filter((b) => (b.box_2d[2] - b.box_2d[0]) * (b.box_2d[3] - b.box_2d[1]) < 600_000) : [];

/** Share of the radiologist's box that lies inside MedGemma's region. */
function covered(b: Box, nih: [number, number, number, number]) {
  const [y0, x0, y1, x1] = b;
  const [nx, ny, nw, nh] = nih.map((v) => (v / NIH) * 1000);
  const ix = Math.max(0, Math.min(x1, nx + nw) - Math.max(x0, nx));
  const iy = Math.max(0, Math.min(y1, ny + nh) - Math.max(y0, ny));
  return (ix * iy) / (nw * nh);
}

function Report({ text }: { text: string }) {
  const parts = text.replace(/\*\*/g, '').split(/\n+(?=(?:FINDINGS|IMPRESSION)\b)/i);
  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-deep">
      {parts.map((p, i) => {
        const m = p.match(/^(FINDINGS|IMPRESSION)\s*:?\s*/i);
        return <p key={i}>{m && <b className="font-medium text-muted-foreground mr-1.5">{m[1][0] + m[1].slice(1).toLowerCase()}</b>}{m ? p.slice(m[0].length) : p}</p>;
      })}
    </div>
  );
}

/** Earlier vs now: drag to wipe between the two X-rays; MedGemma's box and the NIH box on top. */
function Viewer({ current, prior, boxes, nih, reading, showNih, done }: { current: string; prior?: string; boxes: { label: string; box_2d: Box }[]; nih?: [number, number, number, number]; reading: boolean; showNih: boolean; done: boolean }) {
  const [wipe, setWipe] = useState(prior ? 50 : 0);
  useEffect(() => {
    if (!done || !prior) return;
    let v = 50; const id = window.setInterval(() => { v = Math.max(0, v - 3); setWipe(v); if (v === 0) window.clearInterval(id); }, 16);
    return () => window.clearInterval(id);
  }, [done, prior]);
  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden bg-black select-none aspect-square">
        <img src={cxrSrc(current)} alt="Chest X-ray now" className="absolute inset-0 w-full h-full object-cover" />
        {prior && (
          <img src={cxrSrc(prior)} alt="Earlier chest X-ray" className="absolute inset-0 w-full h-full object-cover" style={{ clipPath: `inset(0 ${100 - wipe}% 0 0)` }} />
        )}
        {prior && (
          <>
            <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow" style={{ left: `${wipe}%` }} />
            <span className="absolute top-3 left-3 text-xs font-medium text-white bg-black/50 rounded-full px-2.5 py-1">Earlier</span>
            <span className="absolute top-3 right-3 text-xs font-medium text-white bg-black/50 rounded-full px-2.5 py-1">Now</span>
          </>
        )}
        <svg viewBox="0 0 1000 1000" className="absolute inset-0 w-full h-full pointer-events-none">
          {showNih && nih && (
            <rect x={(nih[0] / NIH) * 1000} y={(nih[1] / NIH) * 1000} width={(nih[2] / NIH) * 1000} height={(nih[3] / NIH) * 1000} fill="none" stroke="#e0b25c" strokeWidth="5" strokeDasharray="16 10" />
          )}
          {boxes.map((b, i) => {
            const [y0, x0, y1, x1] = b.box_2d;
            return (
              <g key={i}>
                <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx="14" fill="rgba(110,190,160,0.10)" stroke="#7fd3b2" strokeWidth="7" className="draw" />
                <rect x={x0} y={Math.max(0, y0 - 52)} width={Math.min(560, 22 * b.label.length + 40)} height="44" rx="10" fill="#7fd3b2" />
                <text x={x0 + 18} y={Math.max(0, y0 - 52) + 31} fill="#14251f" fontSize="28" fontWeight="600">{b.label}</text>
              </g>
            );
          })}
        </svg>
        {reading && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="scanline" />
            <div className="absolute bottom-3 left-3 text-xs font-medium text-white bg-black/60 rounded-full px-3 py-1.5">MedGemma is reading the image…</div>
          </div>
        )}
      </div>
      {prior && (
        <input type="range" min={0} max={100} value={wipe} onChange={(e) => setWipe(+e.target.value)} aria-label="Compare earlier and current X-ray" className="w-full mt-3 accent-[#3f7565]" />
      )}
    </div>
  );
}

/** The radiologist's chest X-ray list for today; the flagged patient rises to the top. */
function Worklist({ name, urgent }: { name: string; urgent: boolean | null }) {
  const others = [
    ['E. Korhonen', 'Routine, follow-up'],
    ['J. Lindqvist', 'Routine, pre-operative'],
    ['S. Mäkinen', 'Routine, cough 2 weeks'],
  ];
  const me: [string, string] = [name, urgent ? 'CT within 2 weeks suggested' : urgent === false ? 'Routine' : 'Waiting for pre-read'];
  const rows = urgent ? [me, ...others] : [...others, me];
  return (
    <div className="rounded-2xl border border-line overflow-hidden">
      <p className="px-4 py-2.5 text-sm text-muted-foreground bg-mist">Radiologist’s chest X-ray list, today</p>
      <ol>
        {rows.map(([n, d], i) => {
          const isMe = n === name;
          return (
            <li key={n} className={`flex items-center gap-3 px-4 py-2.5 border-t border-line ${isMe && urgent ? 'rise bg-[#f9ece9]' : ''}`} style={isMe && urgent ? ({ ['--from' as any]: '150px' }) : undefined}>
              <span className="w-5 text-sm text-muted-foreground tnum">{i + 1}</span>
              <span className="flex-1 min-w-0">
                <span className={`block truncate ${isMe ? 'text-deep font-medium' : 'text-deep'}`}>{n}</span>
                <span className={`block text-sm truncate ${isMe && urgent ? 'text-[#a8483f]' : 'text-muted-foreground'}`}>{d}</span>
              </span>
              {isMe && urgent && <span className="inline-flex items-center gap-1 text-xs font-medium text-[#a8483f]"><ArrowUp size={13} />from 4</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function XrayCard({ p, context }: { p: DemoPatient; context: string }) {
  const x = p.cxr!;
  const [res, setRes] = useState<MedGemmaResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showNih, setShowNih] = useState(true);
  const live = !!medgemmaUrl();
  const rec = recorded(x.current);
  const boxes = useMemo(() => usable(res), [res]);

  useEffect(() => { setRes(null); setErr(null); }, [p.id]);
  useEffect(() => { warmup(); }, []);

  const run = async () => {
    setBusy(true); setErr(null);
    const t0 = Date.now();
    try { setRes(await preRead(x.current, x.prior, context)); }
    catch (e: any) {
      if (rec) {
        await new Promise((r) => setTimeout(r, Math.max(0, 2200 - (Date.now() - t0)))); // let the scan finish
        setRes(rec);
      }
      if (e?.message !== 'no-endpoint') setErr(`Live MedGemma unavailable (${e?.message ?? e}).${rec ? ' Showing the recorded result.' : ''}`);
    } finally { setBusy(false); }
  };

  const cover = x.nihBox && boxes[0] ? covered(boxes[0].box_2d, x.nihBox) : null;

  return (
    <div className="card p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-lg text-deep flex items-center gap-2"><ScanSearch size={19} className="text-primary" /> Chest X-ray, pre-read by MedGemma</p>
          <p className="text-[15px] text-muted-foreground">The X-ray SEULA ordered. MedGemma reads it{x.prior ? ', compares it with the earlier one' : ''} and sorts the radiologist’s list.</p>
        </div>
        <span className="text-xs font-medium text-primary bg-sage rounded-full px-2.5 py-1">Open model · county’s own GPU</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6">
        <div className="min-w-0">
          <Viewer current={x.current} prior={x.prior} boxes={boxes} nih={x.nihBox} reading={busy} showNih={showNih && !!res} done={!!res} />
          <div className="text-sm text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {x.prior && <span>Drag to compare earlier and now</span>}
            {boxes.length > 0 && <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 border-[#7fd3b2]" /> MedGemma</span>}
            {res && x.nihBox && boxes.length > 0 && (
              <button onClick={() => setShowNih(!showNih)} className="inline-flex items-center gap-1.5 hover:text-deep">
                <span className="w-3 h-3 rounded-sm border-2 border-dashed border-[#e0b25c]" /> Radiologist’s box (NIH){showNih ? '' : ', hidden'}
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {!res && (
            <div className="space-y-3">
              <button onClick={run} disabled={busy || (!live && !rec)} className="btn-primary py-2.5 px-5 text-[15px] disabled:opacity-60">
                {busy ? 'Reading…' : live || rec ? 'Pre-read with MedGemma' : 'MedGemma server not connected'}
              </button>
              <p className="text-sm text-muted-foreground">{busy ? 'A few seconds once the GPU is warm; up to a minute for the first read of the day.' : 'MedGemma 1.5 writes a draft report, compares with the earlier X-ray, marks the finding and sets the priority.'}</p>
            </div>
          )}
          {res && (
            <div className={`rounded-2xl px-5 py-4 ${res.ct_within_2_weeks ? 'bg-[#f9ece9] text-[#a8483f]' : 'bg-sage text-primary'}`}>
              <p className="text-xl font-medium">{res.ct_within_2_weeks ? 'Chest CT within 2 weeks' : 'Routine'}</p>
              <p className="text-[15px] opacity-90">{res.ct_within_2_weeks ? 'Moved to the top of the radiologist’s list. A radiologist confirms before anything is booked.' : 'No finding that needs a fast-track CT. A radiologist still reports the image.'}</p>
            </div>
          )}
          <Worklist name={p.name} urgent={res ? res.ct_within_2_weeks : null} />
          {err && <p className="text-sm text-[#a8483f]">{err}</p>}
        </div>
      </div>

      {res && (
        <div className="mt-6 pt-5 border-t border-line grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {res.comparison && (
              <div><p className="text-sm text-muted-foreground mb-1">Change since the earlier X-ray</p><p className="text-[15px] text-deep leading-relaxed">{res.comparison}</p></div>
            )}
            {cover !== null && (
              <div><p className="text-sm text-muted-foreground mb-1">Checked against a radiologist</p><p className="text-[15px] text-deep">MedGemma’s region covers <b className="font-medium">{Math.round(cover * 100)}%</b> of the mass the NIH radiologist marked.</p></div>
            )}
          </div>
          <div><p className="text-sm text-muted-foreground mb-1">Draft report</p><Report text={res.report} /></div>
          <p className="md:col-span-2 text-sm text-muted-foreground">
            {res.model.replace('google/', '')} · {res.seconds} s{res.recorded ? ` · recorded ${res.recorded}` : ' · live'}. Pre-read only: every image is reported by a radiologist. X-rays: NIH ChestX-ray14, NIH Clinical Center.
          </p>
        </div>
      )}
    </div>
  );
}
