import { Link, NavLink } from 'react-router-dom';
import { ReactNode, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Check, Menu, Search, Siren, X } from 'lucide-react';
import { SOURCES } from '../data/sources';
import { Level, LEVEL_META } from '../engine/questionnaire';

export function Logo({ size = 32, light = false }: { size?: number; light?: boolean }) {
  // A sieve: many dots pass, one is caught
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill={light ? '#ffffff' : 'rgb(var(--primary-rgb))'} />
      <g fill={light ? 'rgb(var(--primary-rgb))' : '#ffffff'}>
        {[[22, 24], [32, 24], [42, 24], [22, 34], [42, 34], [27, 44], [37, 44]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.4" />
        ))}
      </g>
      <circle cx="32" cy="34" r="5" fill={light ? 'rgb(var(--sage-rgb))' : 'rgb(var(--sage-rgb))'} />
    </svg>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <Logo size={28} light={light} />
      <span className={`text-xl font-medium tracking-tight ${light ? 'text-white' : 'text-deep'}`}>seula</span>
    </span>
  );
}

const LINKS = [
  ['/clinician', 'For doctors'],
  ['/region', 'For regions'],
  ['/evidence', 'Evidence'],
];

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-6xl px-5 md:px-8 h-16 flex items-center justify-between">
        <Link to="/"><Wordmark /></Link>
        <nav className="hidden md:flex items-center gap-8 text-[15px]">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'text-deep font-medium' : 'text-muted-foreground hover:text-deep')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/check" className="btn-primary py-2.5 px-5 text-[15px] hidden sm:inline-flex">Try it yourself</Link>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-line bg-white px-5 py-3 flex flex-col">
          {[...LINKS, ['/check', 'Try it yourself']].map(([to, label]) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className="py-2.5 text-muted-foreground">
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Cite({ k, children }: { k: string; children?: ReactNode }) {
  const s = SOURCES[k];
  if (!s) return null;
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.label} className="text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-deep inline-flex items-center gap-0.5">
      {children ?? s.label}
      <ArrowUpRight size={11} />
    </a>
  );
}

export function PageHeader({ eyebrow, title, children, center = false }: { eyebrow?: string; title: ReactNode; children?: ReactNode; center?: boolean }) {
  return (
    <div className={`mb-12 ${center ? 'text-center mx-auto' : ''} max-w-3xl`}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h1 className="text-4xl md:text-5xl text-deep mb-4">{title}</h1>
      {children && <div className="text-lg text-muted-foreground leading-relaxed">{children}</div>}
    </div>
  );
}

const LEVEL_ICON = { urgent: Siren, investigate: AlertTriangle, review: Search, info: Check };
export function LevelBadge({ level, long = false }: { level: Level; long?: boolean }) {
  const m = LEVEL_META[level];
  const Icon = LEVEL_ICON[level];
  return (
    <span className="chip" style={{ color: m.color, background: m.bg }}>
      <Icon size={12} /> {long ? m.label : m.short}
    </span>
  );
}

export function Stat({ value, label, cite, accent = false }: { value: ReactNode; label: ReactNode; cite?: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-4xl md:text-5xl font-medium tnum leading-none ${accent ? 'text-primary' : 'text-deep'}`}>{value}</div>
      <p className="text-[15px] text-muted-foreground mt-3 leading-snug">{label}</p>
      {cite && <div className="mt-1"><Cite k={cite} /></div>}
    </div>
  );
}

export function Page({ children, wide = false, tint = false }: { children: ReactNode; wide?: boolean; tint?: boolean }) {
  return (
    <div className={`min-h-[100dvh] flex flex-col ${tint ? 'bg-mist' : ''}`}>
      <Nav />
      <main className={`flex-1 mx-auto w-full ${wide ? 'max-w-7xl' : 'max-w-6xl'} px-5 md:px-8 py-14`}>{children}</main>
      <Footer />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-deep text-white/80 mt-10">
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-10 grid md:grid-cols-[1.5fr_1fr_1fr] gap-8 text-sm">
        <div>
          <Wordmark light />
          <p className="mt-3 max-w-sm text-white/70">A calm, 4-minute check before your doctor’s visit. Built at Junction 2026 for the AstraZeneca challenge on equal cancer care in Finland.</p>
        </div>
        <div className="space-y-2">
          <p className="text-white font-medium">Explore</p>
          <Link to="/check" className="block hover:text-white">Try it yourself</Link>
          <Link to="/clinician" className="block hover:text-white">For doctors</Link>
          <Link to="/region" className="block hover:text-white">For regions</Link>
          <Link to="/evidence" className="block hover:text-white">Evidence</Link>
        </div>
        <div className="space-y-2 text-white/60">
          <p className="text-white font-medium">Good to know</p>
          <p>Research prototype, not a medical device.</p>
          <p>All patients shown are fictional.</p>
          <p>Voice is analysed on the phone and never uploaded.</p>
        </div>
      </div>
    </footer>
  );
}
