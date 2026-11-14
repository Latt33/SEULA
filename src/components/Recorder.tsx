import { useEffect, useRef, useState } from 'react';
import { Mic, Square, RotateCcw, CheckCircle2 } from 'lucide-react';

/** Captures raw PCM in the browser. Audio stays in memory on the device. */
export function Recorder({ maxSeconds, onDone, labels }: { maxSeconds: number; onDone: (x: Float32Array, sr: number) => void; labels: { start: string; stop: string; again: string; denied: string; done: string } }) {
  const [state, setState] = useState<'idle' | 'rec' | 'done' | 'denied'>('idle');
  const [t, setT] = useState(0);
  const [level, setLevel] = useState(0);
  const chunks = useRef<Float32Array[]>([]);
  const ctx = useRef<AudioContext | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number>(0);
  const srRef = useRef(48000);

  const stop = () => {
    window.clearInterval(timer.current);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    ctx.current?.close().catch(() => {});
    const n = chunks.current.reduce((s, c) => s + c.length, 0);
    const x = new Float32Array(n);
    let o = 0;
    for (const c of chunks.current) {
      x.set(c, o);
      o += c.length;
    }
    setState('done');
    onDone(x, srRef.current);
  };

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      stream.current = s;
      const ac = new AudioContext();
      ctx.current = ac;
      srRef.current = ac.sampleRate;
      const src = ac.createMediaStreamSource(s);
      const proc = ac.createScriptProcessor(4096, 1, 1);
      chunks.current = [];
      proc.onaudioprocess = (e) => {
        const d = new Float32Array(e.inputBuffer.getChannelData(0));
        chunks.current.push(d);
        let m = 0;
        for (let i = 0; i < d.length; i += 16) m = Math.max(m, Math.abs(d[i]));
        setLevel(m);
      };
      src.connect(proc);
      proc.connect(ac.destination);
      setT(0);
      setState('rec');
      const t0 = performance.now();
      timer.current = window.setInterval(() => {
        const el = (performance.now() - t0) / 1000;
        setT(el);
        if (el >= maxSeconds) stop();
      }, 100);
    } catch {
      setState('denied');
    }
  };

  useEffect(() => () => {
    window.clearInterval(timer.current);
    stream.current?.getTracks().forEach((tr) => tr.stop());
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {state === 'rec' ? (
        <button onClick={stop} className="w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center rec-pulse" aria-label={labels.stop}>
          <Square size={30} fill="white" />
        </button>
      ) : state === 'done' ? (
        <div className="w-24 h-24 rounded-full bg-emerald-50 border-2 border-emerald-600 text-emerald-700 flex items-center justify-center">
          <CheckCircle2 size={40} />
        </div>
      ) : (
        <button onClick={start} className="w-24 h-24 rounded-full bg-white border-2 border-primary text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors" aria-label={labels.start}>
          <Mic size={36} />
        </button>
      )}
      <div className="h-2 w-48 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${state === 'rec' ? Math.min(100, level * 180) : 0}%` }} />
      </div>
      <div className="text-sm text-muted-foreground tnum">
        {state === 'rec' && `${t.toFixed(1)} s · ${labels.stop}`}
        {state === 'idle' && labels.start}
        {state === 'done' && labels.done}
        {state === 'denied' && labels.denied}
      </div>
      {state === 'done' && (
        <button className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground" onClick={() => setState('idle')}>
          <RotateCcw size={14} /> {labels.again}
        </button>
      )}
    </div>
  );
}
