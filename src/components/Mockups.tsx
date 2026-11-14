import { ReactNode } from 'react';
import { Check, Mic } from 'lucide-react';

export function Phone({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="relative w-[230px] h-[460px] rounded-[38px] bg-[#1f2a27] p-[9px] shadow-[0_30px_60px_-20px_rgba(33,45,41,.35)]">
        <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-[#1f2a27] z-10" />
        <div className="w-full h-full rounded-[30px] bg-white overflow-hidden flex flex-col">
          <div className="h-9 shrink-0" />
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormScreen() {
  const rows: [string, boolean, string?][] = [
    ['Cough', true, '3–6 weeks'],
    ['Hoarse or changed voice', true, 'Over 6 weeks'],
    ['Shortness of breath', false],
    ['Blood in stool', false],
    ['Weight loss without trying', false],
  ];
  return (
    <div className="px-4 text-[11px] flex-1 flex flex-col">
      <div className="h-1 rounded-full bg-sage mb-4"><div className="h-1 rounded-full bg-primary w-1/2" /></div>
      <p className="text-[15px] font-medium text-deep leading-tight mb-1">Have you had any of these?</p>
      <p className="text-muted-foreground mb-3">Tick everything you have noticed.</p>
      <div className="space-y-1.5">
        {rows.map(([l, on, d]) => (
          <div key={l} className={`rounded-xl border px-2.5 py-2 ${on ? 'border-primary bg-sage/60' : 'border-line'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center ${on ? 'bg-primary' : 'border border-line'}`}>{on && <Check size={10} className="text-white" />}</span>
              <span className={on ? 'font-medium text-deep' : ''}>{l}</span>
            </div>
            {d && <span className="ml-5 mt-1 inline-block chip bg-white text-deep border border-primary/30 text-[10px]">{d}</span>}
          </div>
        ))}
      </div>
      <div className="mt-auto mb-4 rounded-full bg-primary text-white text-center py-2 text-[12px] font-medium">Next</div>
    </div>
  );
}

export function VoiceScreen() {
  return (
    <div className="px-4 flex-1 flex flex-col items-center text-center">
      <p className="text-[15px] font-medium text-deep mt-2">Say “aaah”</p>
      <p className="text-[11px] text-muted-foreground mb-4">As long as feels comfortable</p>
      <div className="relative w-44 h-44 flex items-center justify-center my-3">
        <div className="absolute inset-0 rounded-full bg-sage breathe" />
        <div className="absolute inset-6 rounded-full bg-primary/25 breathe" style={{ animationDelay: '-1.5s' }} />
        <div className="relative w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center"><Mic size={28} /></div>
      </div>
      <p className="text-[12px] text-deep font-medium tnum">6.2 s</p>
      <p className="text-[10px] text-muted-foreground mt-auto mb-5 px-2">Analysed on this phone. Your voice is never uploaded.</p>
    </div>
  );
}

export function DoctorCard() {
  return (
    <div className="card p-4 w-[260px] shadow-[0_20px_40px_-20px_rgba(33,45,41,.3)] text-[12px]">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-deep text-[13px]">Pekka V., 67</span>
        <span className="chip" style={{ color: '#a8483f', background: '#f9ece9' }}>Urgent</span>
      </div>
      <p className="text-muted-foreground mb-2">Hoarse voice for over 6 weeks, former smoker</p>
      <div className="rounded-xl bg-sage/70 px-3 py-2 text-deep font-medium">Next step: ENT laryngoscopy</div>
    </div>
  );
}
