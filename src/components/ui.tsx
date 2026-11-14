import { Link, NavLink } from 'react-router-dom';
import { ReactNode, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Info, Menu, Search, Siren, X } from 'lucide-react';
import { SOURCES } from '../data/sources';
import { Level, LEVEL_META } from '../engine/questionnaire';

export function Logo({ size = 32 }: { size?: number }) {
  // A sieve: many dots pass, one is caught
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="26" fill="none" stroke="var(--foreground)" strokeWidth="3" />
      <g fill="var(--primary)">
        {[[22, 24], [32, 24], [42, 24], [22, 34], [42, 34], [27, 44], [37, 44]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" />
        ))}
      </g>
      <circle cx="32" cy="34" r="4.5" fill="var(--brand-blue)" />
    </svg>
  );
}

const LINKS = [
  ['/check', 'Try it'],
  ['/clinician', 'Clinician'],
  ['/region', 'Gap'],
  ['/impact', 'Impact'],
  ['/evidence', 'Evidence'],
  ['/pilot', 'Recommendations'],
];

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-6xl px-4 md:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-bold tracking-tight text-lg">SEULA</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `px-3 py-1.5 rounded-lg transition-colors ${isActive ? 'bg-white border border-line text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <nav className="md:hidden border-t border-line bg-background px-4 py-2 flex flex-col">
          {LINKS.map(([to, label]) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className="py-2 text-muted-foreground">
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
    <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.label} className="text-xs text-muted-foreground/80 underline decoration-dotted underline-offset-2 hover:text-foreground inline-flex items-center gap-0.5">
      {children ?? s.label}
      <ArrowUpRight size={11} />
    </a>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="text-3xl md:text-4xl mb-3">{title}</h1>
      {children && <div className="text-muted-foreground max-w-3xl prose-serif text-lg leading-relaxed">{children}</div>}
    </div>
  );
}

const LEVEL_ICON = { urgent: Siren, investigate: AlertTriangle, review: Search, info: Info };
export function LevelBadge({ level, long = false }: { level: Level; long?: boolean }) {
  const m = LEVEL_META[level];
  const Icon = LEVEL_ICON[level];
  return (
    <span className="chip border" style={{ color: m.color, background: m.bg, borderColor: m.color + '33' }}>
      <Icon size={12} /> {long ? m.label : m.short}
    </span>
  );
}

export function Stat({ value, label, cite, accent = false }: { value: ReactNode; label: ReactNode; cite?: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-3xl md:text-4xl font-bold tnum leading-none ${accent ? 'text-primary' : ''}`}>{value}</div>
      <p className="text-sm text-muted-foreground mt-2 leading-snug">{label}</p>
      {cite && <div className="mt-1"><Cite k={cite} /></div>}
    </div>
  );
}

export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Nav />
      <main className={`flex-1 mx-auto w-full ${wide ? 'max-w-7xl' : 'max-w-6xl'} px-4 md:px-6 py-10`}>{children}</main>
      <Footer />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line text-xs text-muted-foreground py-6 px-6 text-center space-y-1">
      <div>SEULA · Junction 2026 · AstraZeneca challenge: equitable and effective cancer care.</div>
      <div>Research prototype. Not a medical device. All patients shown are fictional. Audio is analysed on the device and never uploaded.</div>
    </footer>
  );
}
