import { useEffect, useState } from 'react';
import { ScanSearch } from 'lucide-react';
import type { DemoPatient } from '../data/demoPatients';
import { cxrSrc, MedGemmaResult, medgemmaUrl, preRead, recorded, warmup } from './client';

const NIH = 1024; // NIH ChestX-ray14 images are 1024 x 1024; boxes are in pixels

function Overlay({ res, nihBox, showNih }: { res?: MedGemmaResult | null; nihBox?: [number, number, number, number]; showNih: boolean }) {
  return (
    <svg viewBox="0 0 1000 1000" className="absolute inset-0 w-full h-full pointer-events-none">
      {showNih && nihBox && (
        <rect x={(nihBox[0] / NIH) * 1000} y={(nihBox[1] / NIH) * 1000} width={(nihBox[2] / NIH) * 1000} height={(nihBox[3] / NIH) * 1000}
          fill="none" stroke="#e0b25c" strokeWidth="6" strokeDasharray="18 12" />
      )}
      {res?.boxes.map((b, i) => {
        const [y0, x0, y1, x1] = b.box_2d;
        return (
          <g key={i}>
            <rect x={x0} y={y0} width={Math.max(4, x1 - x0)} height={Math.max(4, y1 - y0)} fill="rgba(110,190,160,0.12)" stroke="#6ebea0" strokeWidth="7" rx="6" />
            <text x={x0 + 8} y={Math.max(30, y0 - 12)} fill="#6ebea0" fontSize="34" fontWeight="600">{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Overlap (intersection over union) between MedGemma's box and the NIH radiologist's box. */
function iou(b: [number, number, number, number], nih: [number, number, number, number]) {
  const [y0, x0, y1, x1] = b;
  const [nx, ny, nw, nh] = nih.map((v) => (v / NIH) * 1000);
  const ix = Math.max(0, Math.min(x1, nx + nw) - Math.max(x0, nx));
  const iy = Math.max(0, Math.min(y1, ny + nh) - Math.max(y0, ny));
  const inter = ix * iy;
  return inter / ((x1 - x0) * (y1 - y0) + nw * nh - inter);
}

function Report({ text }: { text: string }) {
  const parts = text.replace(/\*\*/g, '').split(/\n(?=(?:FINDINGS|IMPRESSION)\b)/i);
  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-deep">
      {parts.map((p, i) => {
        const m = p.match(/^(FINDINGS|IMPRESSION)\s*:?\s*/i);
        return <p key={i}>{m && <b className="font-medium text-muted-foreground mr-1.5">{m[1][0] + m[1].slice(1).toLowerCase()}</b>}{m ? p.slice(m[0].length) : p}</p>;
      })}
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

  useEffect(() => { setRes(null); setErr(null); }, [p.id]);
  useEffect(() => { warmup(); }, []);

  const run = async () => {
    setBusy(true); setErr(null);
    try { setRes(await preRead(x.current, x.prior, context)); }
    catch (e: any) {
      if (rec) setRes(rec);
      setErr(e?.message === 'no-endpoint' ? null : `Live MedGemma unavailable (${e?.message ?? e}).${rec ? ' Showing the recorded result.' : ''}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="card p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-lg text-deep flex items-center gap-2"><ScanSearch size={19} className="text-primary" /> Chest X-ray pre-read</p>
          <p className="text-[15px] text-muted-foreground">MedGemma 1.5 reads the X-ray SEULA ordered{x.prior ? ', compares it with the earlier one' : ''} and sorts the radiologist’s list.</p>
        </div>
        <span className="text-xs font-medium text-primary bg-sage rounded-full px-2.5 py-1">Open model · runs on the county’s own GPU</span>
      </div>

      <div className={`grid gap-3 mb-5 ${x.prior ? 'grid-cols-[1fr_2fr]' : 'grid-cols-1 max-w-md'}`}>
        {x.prior && (
          <figure className="min-w-0">
            <img src={cxrSrc(x.prior)} alt="Earlier chest X-ray" className="w-full rounded-xl bg-black" />
            <figcaption className="text-sm text-muted-foreground mt-1.5">{x.priorWhen ?? 'Earlier'}</figcaption>
          </figure>
        )}
        <figure className="min-w-0">
          <div className="relative rounded-xl overflow-hidden bg-black">
            <img src={cxrSrc(x.current)} alt="Current chest X-ray" className="w-full block" />
            <Overlay res={res} nihBox={x.nihBox} showNih={showNih && !!res} />
          </div>
          <figcaption className="text-sm text-muted-foreground mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            <span>Now</span>
            {res && res.boxes.length > 0 && <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 border-[#6ebea0]" /> MedGemma</span>}
            {res && x.nihBox && (
              <button onClick={() => setShowNih(!showNih)} className="inline-flex items-center gap-1.5 hover:text-deep">
                <span className="w-3 h-3 rounded-sm border-2 border-dashed border-[#e0b25c]" /> Radiologist’s box (NIH) {showNih ? '' : '(hidden)'}
              </button>
            )}
          </figcaption>
        </figure>
      </div>

      {!res && (
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={run} disabled={busy || (!live && !rec)} className="btn-primary py-2 px-4 text-[15px] disabled:opacity-60">
            {busy ? 'MedGemma is reading…' : live ? 'Pre-read with MedGemma' : rec ? 'Show recorded MedGemma pre-read' : 'MedGemma server not connected'}
          </button>
          {busy && <span className="text-sm text-muted-foreground">About 20 s. The first read of the day also starts the GPU.</span>}
        </div>
      )}
      {err && <p className="text-sm text-[#a8483f] mt-3">{err}</p>}

      {res && (
        <div className="space-y-4">
          <div className={`rounded-2xl px-5 py-3.5 ${res.ct_within_2_weeks ? 'bg-[#f9ece9] text-[#a8483f]' : 'bg-sage text-primary'}`}>
            <p className="font-medium">{res.ct_within_2_weeks ? 'Moved to the top of the radiologist’s list' : 'Routine radiology list'}</p>
            <p className="text-[15px] opacity-90">{res.ct_within_2_weeks ? 'MedGemma suggests a chest CT within 2 weeks. A radiologist confirms before anything is booked.' : 'No finding that needs a fast-track CT. A radiologist still reports the image.'}</p>
          </div>
          {res.comparison && (
            <div><p className="text-sm text-muted-foreground mb-1">Change since the earlier X-ray</p><p className="text-[15px] text-deep leading-relaxed">{res.comparison}</p></div>
          )}
          <div><p className="text-sm text-muted-foreground mb-1">Pre-read</p><Report text={res.report} /></div>
          {x.nihBox && res.boxes[0] && (
            <p className="text-[15px] text-deep">MedGemma’s box overlaps the radiologist’s box by <b className="font-medium">{Math.round(iou(res.boxes[0].box_2d, x.nihBox) * 100)}%</b> (intersection over union).</p>
          )}
          <p className="text-sm text-muted-foreground">
            {res.model.replace('google/', '')} · {res.seconds} s{res.recorded ? ` · recorded ${res.recorded}` : ''}. Pre-read only: every image is reported by a radiologist. X-ray: NIH ChestX-ray14 (NIH Clinical Center), used with attribution.
          </p>
        </div>
      )}
    </div>
  );
}
