import { Activity, ArrowUpRight, CircleHelp, FileText, FlaskConical, HeartPulse, Home, Info, Menu, ScanLine, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Page } from '../types';

const navItems: { label: Page; icon: typeof Home }[] = [
  { label: 'Home', icon: Home }, { label: 'Analysis', icon: ScanLine }, { label: 'Results', icon: Activity },
  { label: 'History', icon: Activity }, { label: 'Research', icon: FlaskConical }, { label: 'Reports', icon: FileText }, { label: 'About', icon: Info },
];

export function Shell({ page, onNavigate, children }: { page: Page; onNavigate: (page: Page) => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = (target: Page) => { onNavigate(target); setOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return <div className="app-shell">
    <header className="topbar"><div className="topbar-inner">
      <button className="brand" onClick={() => navigate('Home')} aria-label="DR-XAI home"><span className="brand-mark"><Activity size={19}/></span><span>DR<span className="brand-x">·</span>XAI<small>RESEARCH PLATFORM</small></span></button>
      <nav className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
        {navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-link ${page === label ? 'active' : ''}`} onClick={() => navigate(label)}><Icon size={15}/>{label}</button>)}
      </nav>
      <button className="button button-primary header-cta" onClick={() => navigate('Analysis')}>Start analysis <ArrowUpRight size={16}/></button>
      <button className="menu-button" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
    </div></header>
    <main>{children}</main>
    <footer className="footer"><div className="footer-inner"><div className="footer-brand"><span className="brand-mark small"><Activity size={15}/></span><strong>DR-XAI</strong><span>Explainable deep learning research</span></div><p>Experimental research prototype · Not intended for clinical diagnosis</p><button className="footer-help" onClick={() => navigate('About')}><CircleHelp size={15}/> About this project</button></div></footer>
  </div>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/>{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-heading-action">{action}</div>}</div>;
}

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return <aside className={`disclaimer ${compact ? 'compact' : ''}`}><span className="disclaimer-icon"><HeartPulse size={17}/></span><p><strong>Research use only.</strong> DR-XAI is an experimental research prototype. Predictions are not a medical diagnosis; the system has not been clinically validated and is not a substitute for evaluation by a qualified healthcare professional.</p></aside>;
}
