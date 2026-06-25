'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import {
  Brain, TrendingUp, AlertTriangle, Users, Zap, Shield, BarChart3,
  ChevronRight, Play, ArrowRight, Sparkles, Activity, Target,
  CheckCircle, Globe, Lock, Cpu
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1800) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setVal(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return { ref, val };
}

/* ─── KPI floating cards ───────────────────────────────────────────── */
interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
  style?: React.CSSProperties;
  delay?: number;
}

function KPICard({ icon, label, value, sub, color, style, delay = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.04 }}
      style={style}
      className="absolute pointer-events-auto"
    >
      <div
        className="rounded-2xl border border-white/10 backdrop-blur-xl px-4 py-3.5 flex items-center gap-3 shadow-2xl"
        style={{ background: 'rgba(11,17,32,0.75)', minWidth: 190 }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}22`, border: `1px solid ${color}44` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest leading-none mb-1">{label}</p>
          <p className="text-[22px] font-bold leading-none text-white">{value}</p>
          <p className="text-[10px] text-white/40 mt-0.5">{sub}</p>
        </div>
        {/* pulse dot */}
        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }}>
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.4 }} />
        </span>
      </div>
    </motion.div>
  );
}

/* ─── Pill Navbar ──────────────────────────────────────────────────── */
const NAV_LINKS = ['Features', 'Solutions', 'Pricing', 'AI Copilot', 'Contact'];

function PillNav({ ctaHref }: { ctaHref: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
    >
      <div
        className="flex items-center gap-1 px-2 py-2 rounded-full border border-white/10 backdrop-blur-2xl shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.07)' }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center px-3 mr-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full-white.png" alt="Xyrenis" style={{ height: 22, width: 'auto', objectFit: 'contain' }} />
        </Link>

        {/* Links */}
        {NAV_LINKS.map(l => (
          <a
            key={l}
            href={`#${l.toLowerCase().replace(' ', '-')}`}
            className="px-3.5 py-2 rounded-full text-[12.5px] font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            {l}
          </a>
        ))}

        {/* Divider */}
        <span className="w-px h-5 bg-white/15 mx-1" />

        {/* CTA */}
        <Link
          href={ctaHref}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-semibold text-white transition-all duration-200 hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #2563EB, #1d4ed8)', boxShadow: '0 0 20px rgba(37,99,235,0.5)' }}
        >
          Start Free Trial <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  );
}

/* ─── Stats Marquee ────────────────────────────────────────────────── */
const STATS = [
  { icon: <Globe className="w-4 h-4" />, label: '500+ Enterprises', color: '#2563EB' },
  { icon: <CheckCircle className="w-4 h-4" />, label: '120K Tasks Managed', color: '#10b981' },
  { icon: <Target className="w-4 h-4" />, label: '99.7% SLA Accuracy', color: '#8b5cf6' },
  { icon: <TrendingUp className="w-4 h-4" />, label: '18% Productivity Boost', color: '#f59e0b' },
  { icon: <Shield className="w-4 h-4" />, label: '35% Risk Reduction', color: '#ef4444' },
  { icon: <Zap className="w-4 h-4" />, label: '4× Faster Decisions', color: '#06b6d4' },
  { icon: <Activity className="w-4 h-4" />, label: '2.4B Events Processed', color: '#ec4899' },
];

function StatsMarquee() {
  const items = [...STATS, ...STATS];
  return (
    <div
      className="relative overflow-hidden py-6 border-y border-white/5"
      style={{ background: 'rgba(255,255,255,0.02)' }}
      onMouseEnter={e => (e.currentTarget.querySelector('.marquee-track') as HTMLElement)!.style.animationPlayState = 'paused'}
      onMouseLeave={e => (e.currentTarget.querySelector('.marquee-track') as HTMLElement)!.style.animationPlayState = 'running'}
    >
      {/* fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10" style={{ background: 'linear-gradient(to right, #050816, transparent)' }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10" style={{ background: 'linear-gradient(to left, #050816, transparent)' }} />

      <div className="marquee-track flex gap-4" style={{ width: 'max-content', animation: 'marquee-x 28s linear infinite' }}>
        {items.map((s, i) => (
          <div
            key={i}
            className="h-[72px] w-52 shrink-0 flex items-center gap-3 rounded-full border border-white/10 backdrop-blur-lg px-5"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <span style={{ color: s.color }}>{s.icon}</span>
            <span className="text-[13px] font-semibold text-white/80">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Integrations Marquee ─────────────────────────────────────────── */
const INTEGRATIONS = [
  { name: 'Jira', bg: '#0052CC' },
  { name: 'SAP', bg: '#0070F3' },
  { name: 'Slack', bg: '#4A154B' },
  { name: 'Teams', bg: '#6264A7' },
  { name: 'Power BI', bg: '#F2C811', dark: true },
  { name: 'Snowflake', bg: '#29B5E8' },
  { name: 'Salesforce', bg: '#00A1E0' },
  { name: 'ServiceNow', bg: '#62D84E', dark: true },
];

function IntegrationsMarquee() {
  const double = [...INTEGRATIONS, ...INTEGRATIONS];
  return (
    <div className="py-14 overflow-hidden">
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] mb-8"
      >
        Connects seamlessly with your enterprise stack
      </motion.p>
      <div
        className="relative overflow-hidden"
        onMouseEnter={e => (e.currentTarget.querySelector('.int-track') as HTMLElement)!.style.animationPlayState = 'paused'}
        onMouseLeave={e => (e.currentTarget.querySelector('.int-track') as HTMLElement)!.style.animationPlayState = 'running'}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10" style={{ background: 'linear-gradient(to right, #050816, transparent)' }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10" style={{ background: 'linear-gradient(to left, #050816, transparent)' }} />

        <div className="int-track flex gap-4" style={{ width: 'max-content', animation: 'marquee-x 22s linear infinite reverse' }}>
          {double.map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4, scale: 1.06 }}
              transition={{ duration: 0.2 }}
              className="group relative h-24 w-44 shrink-0 flex flex-col items-center justify-center rounded-2xl border border-white/10 cursor-pointer overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(135deg, ${item.bg}22, ${item.bg}08)` }}
              />
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 text-[11px] font-black relative z-10"
                style={{ background: item.bg, color: item.dark ? '#000' : '#fff' }}
              >
                {item.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-[12px] font-semibold text-white/60 group-hover:text-white/90 transition-colors relative z-10">{item.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Feature cards ────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Brain className="w-5 h-5" />, color: '#8b5cf6',
    title: 'AI Copilot',
    desc: 'Surface risks before they escalate. Auto-generate portfolio summaries, get smart next-action recommendations.',
  },
  {
    icon: <BarChart3 className="w-5 h-5" />, color: '#2563EB',
    title: 'Portfolio Intelligence',
    desc: 'Live RAG status across every project. Drill from executive overview to a single task in one click.',
  },
  {
    icon: <Users className="w-5 h-5" />, color: '#10b981',
    title: 'Workforce Planning',
    desc: 'Capacity heatmaps, allocation analytics, and overload detection — across all seven departments.',
  },
  {
    icon: <Shield className="w-5 h-5" />, color: '#ef4444',
    title: 'Risk Management',
    desc: 'Real-time risk scoring, automated alerts, and mitigation playbooks built for enterprise resilience.',
  },
  {
    icon: <Cpu className="w-5 h-5" />, color: '#f59e0b',
    title: 'Smart Automation',
    desc: 'Event-driven workflows that trigger on status changes, deadline proximity, and resource thresholds.',
  },
  {
    icon: <Lock className="w-5 h-5" />, color: '#06b6d4',
    title: 'Enterprise Security',
    desc: 'Role-based access, department scoping, SSO, and full audit trail — built for regulated industries.',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-28 px-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="text-center mb-16"
      >
        <span className="inline-flex items-center gap-2 text-[11px] font-bold text-blue-400 uppercase tracking-[0.18em] mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Everything you need
        </span>
        <h2
          className="text-[clamp(32px,4vw,52px)] font-bold leading-[1.05] tracking-[-0.03em] text-white"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          One platform for the<br />
          <span style={{ background: 'linear-gradient(135deg, #60a5fa, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            entire flow of work
          </span>
        </h2>
        <p className="mt-5 text-[16px] text-white/50 max-w-xl mx-auto leading-relaxed">
          From project kickoff to executive dashboard — Xyrenis unifies governance, intelligence, and automation.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group relative rounded-2xl border border-white/8 p-6 overflow-hidden cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `radial-gradient(circle at 30% 30%, ${f.color}12, transparent 70%)` }}
            />
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 relative z-10"
              style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}
            >
              <span style={{ color: f.color }}>{f.icon}</span>
            </div>
            <h3 className="text-[16px] font-bold text-white mb-2 relative z-10">{f.title}</h3>
            <p className="text-[13.5px] text-white/50 leading-relaxed relative z-10">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─── Trust metrics ────────────────────────────────────────────────── */
const TRUST = [
  { to: 172, suffix: '', prefix: '', label: 'Active Projects' },
  { to: 94, suffix: '%', prefix: '', label: 'Portfolio Health' },
  { to: 88, suffix: '+', prefix: '', label: 'Team Members' },
  { to: 99.9, suffix: '%', prefix: '', label: 'Uptime SLA' },
];

function TrustSection() {
  return (
    <section className="py-20 px-6 max-w-5xl mx-auto">
      <div
        className="rounded-3xl border border-white/10 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(139,92,246,0.08))' }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #2563EB, transparent)' }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
          {TRUST.map(m => {
            const { ref, val } = useCountUp(m.to);
            const display = m.to % 1 === 0 ? Math.round(val).toLocaleString() : val.toFixed(1);
            return (
              <div key={m.label} className="text-center">
                <p
                  className="text-[clamp(36px,4vw,52px)] font-bold leading-none"
                  style={{ background: 'linear-gradient(135deg, #60a5fa, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                  <span ref={ref}>{m.prefix}{display}{m.suffix}</span>
                </p>
                <p className="text-[13px] text-white/40 mt-2 font-medium">{m.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Banner ───────────────────────────────────────────────────── */
function CTASection({ ctaHref }: { ctaHref: string }) {
  return (
    <section id="pricing" className="py-24 px-6 text-center max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <h2
          className="text-[clamp(32px,4.5vw,56px)] font-bold leading-[1.05] tracking-[-0.03em] text-white mb-5"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          Ready to run work<br />the intelligent way?
        </h2>
        <p className="text-[16px] text-white/50 mb-10 leading-relaxed">
          Join hundreds of enterprise teams who&apos;ve replaced spreadsheet chaos with real-time AI-powered intelligence.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href={ctaHref}
            className="flex items-center gap-2 h-14 px-8 rounded-full font-semibold text-white text-[15px] shadow-lg transition-all duration-200 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1d4ed8)', boxShadow: '0 0 40px rgba(37,99,235,0.5)' }}
          >
            <Sparkles className="w-4 h-4" /> Book a Demo
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 h-14 px-8 rounded-full font-semibold text-white/80 text-[15px] border border-white/15 backdrop-blur-sm transition-all duration-200 hover:border-white/30 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            Sign In <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Footer ───────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-white/8 px-6 py-14">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-10">
        <div className="max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full-white.png" alt="Xyrenis" style={{ height: 36, width: 'auto', objectFit: 'contain', marginBottom: 16 }} />
          <p className="text-[13px] text-white/40 leading-relaxed">
            The AI-Powered Enterprise Work Operating System. Built for teams that move fast and think ahead.
          </p>
        </div>
        <div className="flex gap-16 flex-wrap">
          {[
            { title: 'Product', links: ['Features', 'AI Copilot', 'Portfolio', 'Workforce'] },
            { title: 'Solutions', links: ['Operations', 'Commercial', 'Leadership'] },
            { title: 'Company', links: ['About', 'Security', 'Support'] },
          ].map(col => (
            <div key={col.title}>
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-4">{col.title}</p>
              <div className="flex flex-col gap-2.5">
                {col.links.map(l => (
                  <a key={l} href="#" className="text-[13px] text-white/50 hover:text-white transition-colors">{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/5 flex justify-between items-center flex-wrap gap-4">
        <p className="text-[12px] text-white/25">© 2026 Xyrenis. All rights reserved.</p>
        <p className="text-[12px] text-white/25">Secure · Enterprise-grade · AI-powered</p>
      </div>
    </footer>
  );
}

/* ─── MAIN PAGE ────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { user, loading } = useAuth();
  const isAuthed = !loading && !!user;
  const ctaHref = isAuthed ? '/command-center' : '/login';

  const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 44 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1, delay, ease },
  });

  return (
    <div style={{ background: '#050816', color: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ══════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════ */}
      <section className="relative flex justify-center px-4 pt-6 pb-10">
        {/* Hero container */}
        <div
          className="relative w-full max-w-[1500px] rounded-[48px] border border-white/10 overflow-hidden flex flex-col shadow-2xl"
          style={{
            background: '#0B1120',
            height: 720,
            boxShadow: '0 40px 150px -20px rgba(37,99,235,0.25), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          {/* ── Video background ── */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover scale-105"
              style={{ opacity: 0.35 }}
            >
              <source src="/logo-reveal.mp4" type="video/mp4" />
            </video>
            {/* gradient overlay */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, rgba(5,8,22,0.82) 0%, rgba(11,17,32,0.60) 55%, rgba(37,99,235,0.18) 100%)' }}
            />
            {/* ambient glow */}
            <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-30" style={{ background: 'radial-gradient(circle, #2563EB, transparent)' }} />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
          </div>

          {/* ── Grid pattern overlay ── */}
          <div
            className="absolute inset-0 z-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '52px 52px',
            }}
          />

          {/* ── Hero text content ── */}
          <div className="relative z-20 flex-1 px-8 md:px-20 pt-16 md:pt-20 flex flex-col items-start justify-center pointer-events-none" style={{ maxWidth: '62%' }}>
            {/* Badge */}
            <motion.div {...fadeUp(0.08)} className="pointer-events-auto">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 mb-8 backdrop-blur-sm"
                style={{ background: 'rgba(37,99,235,0.15)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[11.5px] font-semibold text-blue-300 tracking-wide">AI-Powered Enterprise Platform</span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              {...fadeUp(0.12)}
              className="text-[clamp(42px,5.5vw,76px)] font-semibold leading-[0.95] tracking-[-0.04em] text-white mb-6"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              AI-Powered<br />
              <span
                style={{
                  background: 'linear-gradient(90deg, #67e8f9 0%, #3b82f6 50%, #818cf8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Project Intelligence
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              {...fadeUp(0.24)}
              className="text-[clamp(14px,1.4vw,18px)] text-white/55 leading-relaxed mb-9"
              style={{ maxWidth: 540 }}
            >
              Transform projects, dependencies, resources, and risks into real-time strategic intelligence with Xyrenis.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              {...fadeUp(0.36)}
              className="flex items-center gap-4 pointer-events-auto"
            >
              <motion.a
                href={ctaHref}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 h-14 px-8 rounded-full font-semibold text-white text-[14.5px] cursor-pointer"
                style={{
                  background: '#2563EB',
                  boxShadow: '0 0 30px rgba(37,99,235,0.55), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                <Sparkles className="w-4 h-4" /> Book Demo
              </motion.a>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 h-14 px-7 rounded-full font-semibold text-white/80 text-[14.5px] border border-white/15 backdrop-blur-sm cursor-pointer hover:bg-white/8 transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              >
                <Play className="w-4 h-4 fill-current" /> Watch Demo
              </motion.button>
            </motion.div>
          </div>

          {/* ── Floating KPI Cards ── */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            <KPICard
              icon={<Activity className="w-4 h-4" />}
              label="Active Projects"
              value="172"
              sub="↑ 12% this quarter"
              color="#2563EB"
              style={{ top: 48, right: 80 }}
              delay={0.6}
            />
            <KPICard
              icon={<Target className="w-4 h-4" />}
              label="Portfolio Health"
              value="94%"
              sub="Above target"
              color="#10b981"
              style={{ top: 190, right: 40 }}
              delay={0.75}
            />
            <KPICard
              icon={<AlertTriangle className="w-4 h-4" />}
              label="AI Risk Alerts"
              value="15"
              sub="3 critical, 12 medium"
              color="#f59e0b"
              style={{ bottom: 150, right: 100 }}
              delay={0.9}
            />
            <KPICard
              icon={<Users className="w-4 h-4" />}
              label="Resource Utilization"
              value="87%"
              sub="Optimal range"
              color="#8b5cf6"
              style={{ top: 340, right: 260 }}
              delay={1.05}
            />
          </div>

          {/* ── Bottom pill navbar ── */}
          <PillNav ctaHref={ctaHref} />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS MARQUEE
      ══════════════════════════════════════════ */}
      <StatsMarquee />

      {/* ══════════════════════════════════════════
          INTEGRATIONS
      ══════════════════════════════════════════ */}
      <IntegrationsMarquee />

      {/* ══════════════════════════════════════════
          FEATURES GRID
      ══════════════════════════════════════════ */}
      <FeaturesSection />

      {/* ══════════════════════════════════════════
          TRUST METRICS
      ══════════════════════════════════════════ */}
      <TrustSection />

      {/* ══════════════════════════════════════════
          CTA
      ══════════════════════════════════════════ */}
      <CTASection ctaHref={ctaHref} />

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <Footer />

      {/* ── keyframe animations ── */}
      <style>{`
        @keyframes marquee-x {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes float-a {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes float-b {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(8px); }
        }
      `}</style>
    </div>
  );
}
