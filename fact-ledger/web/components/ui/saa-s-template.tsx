'use client'

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Menu,
  X,
  Zap,
  ScanLine,
  CheckCircle2,
} from "lucide-react";
import { Blog7 } from "@/components/ui/blog7";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "gradient";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className = "", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

    const variants = {
      default: "bg-white text-black hover:bg-neutral-200 border border-white",
      secondary: "bg-white/5 text-white hover:bg-white/10 border border-white/15",
      ghost: "hover:bg-white/10 text-neutral-300 hover:text-white border border-transparent",
      gradient: "bg-white text-black hover:bg-neutral-200 active:scale-[0.98] border border-white"
    };

    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-9 px-4 text-xs font-bold uppercase tracking-wider",
      lg: "h-12 px-8 text-[15px] font-bold"
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

// ── Fixed Navigation (monochrome) ─────────────────────────────────
export const Navigation = React.memo(() => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 border-b ${
        scrolled
          ? "border-white/20 bg-black/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          : "border-white/10 bg-black/80 backdrop-blur-md"
      }`}
    >
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-70" />
      <nav className="max-w-7xl mx-auto px-5 sm:px-6 h-16 relative flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group z-10">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white text-black text-xs font-mono font-black transition-shadow">
            FL
          </span>
          <span className="leading-none">
            <span className="block text-[15px] font-extrabold text-white tracking-tight">Fact Ledger</span>
            <span className="block text-[10px] font-mono font-semibold tracking-[0.14em] text-neutral-400 uppercase">Drift Control</span>
          </span>
        </Link>

        {/* Center: Perfectly aligned & centered routing options */}
        <div className="hidden md:flex items-center gap-1 space-x-1 bg-white/5 border border-white/10 rounded-full px-2 py-1 absolute left-1/2 -translate-x-1/2 shadow-inner">
          {[
            { href: "#features", label: "Capabilities" },
            { href: "#how-it-works", label: "How It Works" },
            { href: "#feedback", label: "Customer Stories" },
            { href: "/clause-tree", label: "Clause Tree" },
            { href: "/dashboard", label: "Dashboard" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[13px] font-medium text-neutral-300 hover:text-white hover:bg-white/10 px-3.5 py-1 rounded-full transition-all duration-150 whitespace-nowrap"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0 z-10">
          <Link href="/login">
            <Button type="button" variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button type="button" variant="default" size="sm">
              Open Workspace
              <ArrowRight size={14} />
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/10"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-black border-t border-white/10">
          <div className="px-5 py-4 flex flex-col gap-1">
            {[
              { href: "#features", label: "Capabilities" },
              { href: "#how-it-works", label: "How It Works" },
              { href: "#feedback", label: "Customer Stories" },
              { href: "/dashboard", label: "Live Dashboard" },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-neutral-300 hover:text-white hover:bg-white/5 transition-colors py-2.5 px-2 rounded-lg border-b border-white/5"
                onClick={() => setMobileMenuOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                <Button type="button" variant="secondary" size="sm" className="w-full justify-center">
                  Sign In
                </Button>
              </Link>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                <Button type="button" variant="default" size="sm" className="w-full justify-center">
                  Open Workspace
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

Navigation.displayName = "Navigation";

// ── Live-style preview built with pure CSS (no external images) ──
function LedgerPreviewCard() {
  const metrics = [
    { label: "Drift Score", value: "0", sub: "open anomalies" },
    { label: "Active Facts", value: "8", sub: "canonical params" },
    { label: "Pages", value: "24", sub: "monitored docs" },
    { label: "Coverage", value: "98%", sub: "linked refs" },
  ];
  const rules = [
    { code: "R1", name: "Unlinked", state: "PASS" },
    { code: "R2", name: "Contradiction", state: "PASS" },
    { code: "R3", name: "Deprecated", state: "PASS" },
    { code: "R4", name: "Orphan", state: "WATCH" },
  ];
  return (
    <div className="hero-preview-wrapper">
      <div className="hero-preview-topbar">
        <div className="hero-preview-dots">
          <span style={{ background: "#3f3f46" }} />
          <span style={{ background: "#3f3f46" }} />
          <span style={{ background: "#fff" }} />
        </div>
        <div className="hero-preview-url">fact-ledger / control-center — live</div>
        <div className="preview-live-pill">
          <span className="preview-live-dot" />
          ZERO DRIFT
        </div>
      </div>
      <div className="hero-preview-content">
        <div className="preview-header">
          <div className="preview-header-left">
            <span className="preview-live-dot" />
            <span className="preview-live-text">SANITY CONTENT LAKE · REAL-TIME SCAN</span>
          </div>
          <span className="preview-badge-mono">RELEASE READY</span>
        </div>
        <div className="preview-metrics">
          {metrics.map((m) => (
            <div key={m.label} className="preview-metric">
              <span className="preview-metric-label">{m.label}</span>
              <span className="preview-metric-value">{m.value}</span>
              <span className="preview-metric-sub">{m.sub}</span>
            </div>
          ))}
        </div>
        <div className="preview-diff">
          <div className="preview-diff-row">
            <span className="preview-diff-before">30 days</span>
            <ArrowRight size={13} className="text-white" />
            <span className="preview-diff-after">60 days · factRef linked</span>
            <span className="preview-diff-tag">R1 HEALED</span>
          </div>
          <div className="preview-diff-row">
            <span className="preview-diff-before">99.9% uptime</span>
            <ArrowRight size={13} className="text-white" />
            <span className="preview-diff-after">99.95% · 1 release</span>
            <span className="preview-diff-tag">R2 HEALED</span>
          </div>
        </div>
        <div className="preview-rules">
          {rules.map((r) => (
            <div key={r.code} className="preview-rule">
              <span className="preview-rule-name">{r.code} · {r.name}</span>
              <span className="preview-rule-status">
                <span className="preview-rule-dot" />
                {r.state}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────
export const Hero = React.memo(() => {
  return (
    <section className="hero-section">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-grid-bg" aria-hidden="true" />

      <div className="hero-pill">
        <span className="hero-pill-dot" />
        <span className="hero-pill-text">
          Sanity Content Lake · Algorithmic Drift Engine
        </span>
        <Link href="/dashboard" className="hero-pill-link" aria-label="Launch live dashboard">
          Live demo
          <ArrowRight size={12} />
        </Link>
      </div>

      <h1 className="hero-title">
        Continuous Policy
        <br />
        <span className="hero-title-white">Drift Control</span> for Modern Teams
      </h1>

      <p className="hero-sub">
        Change one canonical fact — automatically detect every stale clause across
        contracts and policies, fix them in one reviewed release, and verify drift is zero.
      </p>

      <div className="hero-cta-row">
        <Link href="/login">
          <Button type="button" variant="gradient" size="lg" aria-label="Get started with the platform">
            Create Company Workspace
            <ArrowRight size={16} />
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button type="button" variant="secondary" size="lg" aria-label="Explore live dashboard">
            <ScanLine size={16} />
            Live Demo Dashboard
          </Button>
        </Link>
      </div>

      <div className="hero-social-proof">
        <div className="hero-avatars" aria-hidden="true">
          {["SC", "MR", "ET", "JK"].map((t, i) => (
            <span key={t} className="hero-avatar" style={{ zIndex: 4 - i }}>{t}</span>
          ))}
        </div>
        <span><strong>100% precision · 100% recall</strong> on 31 planted drift anomalies</span>
      </div>

      <LedgerPreviewCard />

      <div className="hero-trust-row">
        {["R1–R5 deterministic scanner", "Human-gated releases", "Immutable audit ledger"].map((t) => (
          <span key={t} className="hero-trust-chip">
            <CheckCircle2 size={13} /> {t}
          </span>
        ))}
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

// ── How It Works (monochrome) ─────────────────────────────────────
export function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      title: "Register Canonical Facts",
      desc: "Define SLAs, limits, fees and retention windows as versioned fact documents.",
    },
    {
      num: "02",
      title: "Index Corporate Corpus",
      desc: "Connect pages and contracts via Sanity webhooks. Every edit triggers a re-scan.",
    },
    {
      num: "03",
      title: "Real-time Verification",
      desc: "Rules R1–R5 flag drift instantly with file, block and character offsets.",
    },
    {
      num: "04",
      title: "Reconcile in One Release",
      desc: "Approve diffs once, publish atomically, and watch drift drop to zero.",
    },
  ];

  return (
    <section id="how-it-works" className="landing-section landing-section-alt">
      <div className="section-inner">
        <div className="section-header">
          <span className="section-eyebrow section-eyebrow-mono">Continuous Pipeline</span>
          <h2 className="section-title">Zero drift in 4 direct steps</h2>
          <p className="section-subtitle">
            Turn fragmented legal documents into structured, queryable data entities.
          </p>
        </div>

        <div className="how-steps">
          {steps.map((st, i) => (
            <div key={st.num} className="how-step-card">
              <span className="how-step-number">{st.num}</span>
              <h3 className="how-step-title">{st.title}</h3>
              <p className="how-step-desc">{st.desc}</p>
              {i < steps.length - 1 && <ArrowRight size={16} className="how-step-connector" />}
            </div>
          ))}
        </div>

        <div className="pipeline-strip">
          <span>FACT EDIT</span>
          <ArrowRight size={13} />
          <span>WEBHOOK</span>
          <ArrowRight size={13} />
          <span>SCANNER R1–R5</span>
          <ArrowRight size={13} />
          <span className="pipeline-strip-hl">DRAFT RELEASE</span>
          <ArrowRight size={13} />
          <span>HUMAN APPROVAL</span>
          <ArrowRight size={13} />
          <span className="pipeline-strip-hl">ZERO DRIFT</span>
        </div>
      </div>
    </section>
  );
}

// ── CTA (monochrome) ──────────────────────────────────────────────
export function CtaSection() {
  return (
    <section className="cta-section">
      <div className="cta-orb-1" />
      <div className="cta-inner">
        <div className="cta-icon-wrap">
          <ShieldCheck size={26} />
        </div>
        <h2 className="cta-title">
          Ready to eliminate policy drift?
        </h2>
        <p className="cta-subtitle">
          Start scanning contracts, security terms and handbooks for contradictions in minutes with the demo workspace.
        </p>
        <div className="cta-actions">
          <Link href="/login">
            <Button variant="default" size="lg" className="font-bold">
              Open Demo Workspace
              <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary" size="lg">
              Explore Live Overview
            </Button>
          </Link>
        </div>
        <div className="cta-features-list">
          {["No credit card", "Seeded benchmark data", "Sanity-native releases"].map((t) => (
            <span key={t} className="cta-feature-item">
              <Zap size={13} /> {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer (monochrome) ───────────────────────────────────────────
export function Footer() {
  return (
    <footer className="landing-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-white text-black font-mono text-[11px] font-black flex items-center justify-center">FL</span>
            <span className="font-bold text-white text-sm">Fact Ledger</span>
          </div>
          <p className="footer-desc">Continuous algorithmic policy governance on the Sanity Content Lake. Rules flag. AI drafts. Human approves. Sanity remembers.</p>
        </div>
        <div className="footer-links-group">
          <div className="footer-links-col">
            <h4>Product</h4>
            <a href="#features">Capabilities</a>
            <a href="#how-it-works">How it works</a>
            <a href="/dashboard">Live dashboard</a>
          </div>
          <div className="footer-links-col">
            <h4>Workspace</h4>
            <a href="/facts">Facts</a>
            <a href="/findings">Findings</a>
            <a href="/pages">Pages</a>
          </div>
          <div className="footer-links-col">
            <h4>Access</h4>
            <a href="/login">Sign in</a>
            <a href="/clause-tree">Clause tree</a>
            <a href="/">Overview</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>Fact Ledger — monochrome edition</span>
        <span className="font-mono">SANITY CONTENT LAKE · 100% BENCHMARK PRECISION</span>
      </div>
    </footer>
  );
}

// ── Page — Blog7 is the features section (imageless) ──────────────
export default function Component() {
  return (
    <main className="landing-root">
      <Navigation />
      <Hero />
      <div id="features">
        <Blog7 />
      </div>
      <HowItWorksSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
