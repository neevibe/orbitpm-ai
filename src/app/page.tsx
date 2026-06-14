'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

/* ============================================================
   Scroll reveal (Zoho-style fade/slide-in on scroll)
   ============================================================ */
function Reveal({
  children,
  from = 'up',
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  from?: 'up' | 'left' | 'right';
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setShown(true),
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const offset = from === 'up' ? 'translateY(40px)' : from === 'left' ? 'translateX(-48px)' : 'translateX(48px)';
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : offset,
        transition: `opacity .7s cubic-bezier(.2,.7,.2,1) ${delay}s, transform .7s cubic-bezier(.2,.7,.2,1) ${delay}s`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

/* Count-up number for trust metrics */
function CountUp({ to, suffix = '', prefix = '', duration = 1600 }: { to: number; suffix?: string; prefix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
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
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(to * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);
  const display = to % 1 === 0 ? Math.round(val).toLocaleString() : val.toFixed(1);
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

/* ============================================================
   Hero dashboard mockup (animated, CSS-built "screenshot")
   ============================================================ */
function DashboardMockup() {
  return (
    <div className="dash-float" style={{ position: 'relative', width: '100%', maxWidth: 580 }}>
      {/* floating accent chips */}
      <div className="chip-a" style={chipStyle('#10b981')}>✓ Project on track</div>
      <div className="chip-b" style={chipStyle('#e86c2d')}>▲ 12% ahead of plan</div>

      <div style={{ borderRadius: 14, overflow: 'hidden', background: '#fff', boxShadow: '0 30px 70px -20px rgba(15,27,45,0.35), 0 0 0 1px rgba(15,27,45,0.05)' }}>
        {/* browser bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#0f1b2d' }}>
          <span style={dot('#ff5f57')} /><span style={dot('#febc2e')} /><span style={dot('#28c840')} />
          <div style={{ marginLeft: 10, flex: 1, height: 20, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', padding: '0 10px' }}>
            <span style={{ fontSize: 10, color: '#7e93ad' }}>app.xyrenis.com/command-center</span>
          </div>
        </div>
        {/* body */}
        <div style={{ display: 'flex', minHeight: 320 }}>
          {/* mini sidebar */}
          <div style={{ width: 56, background: '#16263c', padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: '#e86c2d' }} />
            {['#3a4d66', '#e86c2d', '#3a4d66', '#3a4d66', '#3a4d66'].map((c, i) => (
              <div key={i} style={{ width: 22, height: 22, borderRadius: 6, background: i === 1 ? 'rgba(232,108,45,0.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: c }} />
              </div>
            ))}
          </div>
          {/* main */}
          <div style={{ flex: 1, padding: 16, background: '#f7f9fc' }}>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
              {[['163', 'Projects', '#2563eb'], ['89%', 'On Track', '#10b981'], ['7', 'At Risk', '#ef4444']].map(([n, l, c]) => (
                <div key={l} style={{ background: '#fff', borderRadius: 9, padding: '10px 11px', boxShadow: '0 1px 2px rgba(15,27,45,0.06)' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: c as string }}>{n}</div>
                  <div style={{ fontSize: 9.5, color: '#7e8aa0', fontWeight: 600 }}>{l}</div>
                </div>
              ))}
            </div>
            {/* gantt */}
            <div style={{ background: '#fff', borderRadius: 9, padding: 13, boxShadow: '0 1px 2px rgba(15,27,45,0.06)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#16263c', marginBottom: 11 }}>Portfolio Timeline</div>
              {[
                { w: '78%', off: '0%', c: '#2563eb', label: 'Retail Expansion' },
                { w: '55%', off: '14%', c: '#e86c2d', label: 'Digital Wayfinding' },
                { w: '64%', off: '8%', c: '#8b5cf6', label: 'Amenities Upgrade' },
                { w: '40%', off: '30%', c: '#10b981', label: 'Retail Analytics' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                  <div style={{ width: 78, fontSize: 8.5, color: '#7e8aa0', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</div>
                  <div style={{ flex: 1, height: 12, borderRadius: 6, background: '#eef2f7', position: 'relative' }}>
                    <div className="gantt-bar" style={{ position: 'absolute', left: b.off, height: '100%', borderRadius: 6, background: b.c, width: b.w, animationDelay: `${0.3 + i * 0.18}s` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
const dot = (c: string): React.CSSProperties => ({ width: 9, height: 9, borderRadius: 99, background: c });
const chipStyle = (c: string): React.CSSProperties => ({
  position: 'absolute', zIndex: 3, fontSize: 11, fontWeight: 700, color: c, background: '#fff',
  padding: '7px 11px', borderRadius: 9, boxShadow: '0 10px 30px -8px rgba(15,27,45,0.25), 0 0 0 1px rgba(15,27,45,0.04)',
});

/* small feature visuals for alternating rows */
function MiniVisual({ kind }: { kind: 'kanban' | 'chart' | 'ai' | 'team' }) {
  const wrap: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 24px 60px -24px rgba(15,27,45,0.3), 0 0 0 1px rgba(15,27,45,0.05)' };
  if (kind === 'kanban') {
    return (
      <div style={wrap}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[['To Do', '#94a3b8', 3], ['In Progress', '#e86c2d', 2], ['Done', '#10b981', 4]].map(([t, c, n]) => (
            <div key={t as string} style={{ background: '#f7f9fc', borderRadius: 10, padding: 9 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: c as string, marginBottom: 8 }}>{t} · {n as number}</div>
              {Array.from({ length: n as number }).map((_, i) => (
                <div key={i} className="rise" style={{ background: '#fff', borderRadius: 7, padding: 7, marginBottom: 6, boxShadow: '0 1px 2px rgba(15,27,45,0.07)', animationDelay: `${i * 0.1}s` }}>
                  <div style={{ height: 5, width: '70%', borderRadius: 3, background: '#cbd5e1', marginBottom: 4 }} />
                  <div style={{ height: 5, width: '45%', borderRadius: 3, background: '#e2e8f0' }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === 'chart') {
    return (
      <div style={wrap}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#16263c', marginBottom: 14 }}>Department Performance</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 150, padding: '0 6px' }}>
          {[['Ops', 70, '#2563eb'], ['Digital', 92, '#e86c2d'], ['Retail', 58, '#8b5cf6'], ['Comm', 80, '#10b981'], ['Support', 46, '#06b6d4'], ['A&M', 66, '#f59e0b']].map(([l, h, c], i) => (
            <div key={l as string} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div className="bar-grow" style={{ width: '100%', maxWidth: 30, height: `${h}%`, background: c as string, borderRadius: '6px 6px 0 0', animationDelay: `${i * 0.12}s` }} />
              <span style={{ fontSize: 8.5, color: '#7e8aa0', fontWeight: 600 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === 'ai') {
    return (
      <div style={wrap}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#e86c2d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✦</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#16263c' }}>AI Copilot</span>
        </div>
        {[
          { t: '3 projects are trending toward delay in Digital & Data', c: '#fef2f2', b: '#fecaca' },
          { t: 'Duty Free Expansion is 12% ahead — reallocate 2 FTE?', c: '#f0fdf4', b: '#bbf7d0' },
          { t: 'Summary ready: Q2 portfolio review (8 risks flagged)', c: '#eff6ff', b: '#bfdbfe' },
        ].map((m, i) => (
          <div key={i} className="rise" style={{ background: m.c, border: `1px solid ${m.b}`, borderRadius: 9, padding: '9px 11px', marginBottom: 8, fontSize: 10.5, color: '#334155', lineHeight: 1.4, animationDelay: `${i * 0.14}s` }}>{m.t}</div>
        ))}
      </div>
    );
  }
  return (
    <div style={wrap}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#16263c', marginBottom: 14 }}>Workforce Capacity</div>
      {[['Operations', 86, '#2563eb'], ['Digital & Data', 72, '#e86c2d'], ['Commercial Dev', 64, '#8b5cf6'], ['Retail & Commerce', 91, '#ef4444']].map(([l, w, c], i) => (
        <div key={l as string} style={{ marginBottom: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', fontWeight: 600, marginBottom: 5 }}>
            <span>{l}</span><span>{w}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 5, background: '#eef2f7' }}>
            <div className="bar-grow-x" style={{ height: '100%', borderRadius: 5, background: c as string, width: `${w}%`, animationDelay: `${i * 0.12}s` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */
export default function LandingPage() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [tab, setTab] = useState(0);
  const isAuthed = !loading && !!user;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const ctaHref = isAuthed ? '/command-center' : '/login';

  return (
    <div style={{ background: '#fff', color: '#16263c', fontFamily: 'inherit' }}>
      {/* ---------------- NAV ---------------- */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${scrolled ? '#eef1f6' : 'transparent'}`,
        transition: 'all .3s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e86c2d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em', color: '#0f1b2d' }}>Xyrenis</span>
          </div>
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 30 }}>
            {['Features', 'Solutions', 'Resources', 'Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={navLink}
                onMouseEnter={e => (e.currentTarget.style.color = '#e86c2d')}
                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>{l}</a>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {isAuthed ? (
              <Link href="/command-center" style={btnPrimary}>Go to Dashboard</Link>
            ) : (
              <>
                <Link href="/login" style={{ ...navLink, fontWeight: 600 }}>Sign In</Link>
                <Link href="/login" style={btnPrimary}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ---------------- HERO ---------------- */}
      <section style={{ paddingTop: 130, paddingBottom: 80, position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg,#fbfcfe 0%,#fff 60%)' }}>
        <div style={{ position: 'absolute', top: -120, right: -120, width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle,rgba(232,108,45,0.10),transparent 65%)' }} />
        <div style={{ position: 'absolute', top: 120, left: -140, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,0.08),transparent 65%)' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 50, alignItems: 'center' }} className="hero-grid">
          <div>
            <Reveal>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 100, background: '#fff', border: '1px solid #eef1f6', boxShadow: '0 2px 8px rgba(15,27,45,0.04)', marginBottom: 22 }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: '#10b981' }} />
                <span style={{ fontSize: 12.5, color: '#475569', fontWeight: 600 }}>The Enterprise Work OS for Modern Teams</span>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 style={{ fontSize: 'clamp(36px,4.6vw,56px)', fontWeight: 800, lineHeight: 1.06, letterSpacing: '-0.03em', color: '#0f1b2d', marginBottom: 20 }}>
                Manage projects.<br />Manage them <span style={{ color: '#e86c2d' }}>brilliantly.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p style={{ fontSize: 18, color: '#516074', lineHeight: 1.6, marginBottom: 24, maxWidth: 480 }}>
                Project governance, portfolio intelligence, workforce planning, and an AI copilot — built for increased productivity, sharper collaboration, and total clarity.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 30 }}>
                {['Plan & track every project across departments', 'Spot risks early with a proactive AI copilot', 'See portfolio health in real time'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 99, background: '#eafaf1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                    </span>
                    <span style={{ fontSize: 14.5, color: '#34435a', fontWeight: 500 }}>{t}</span>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.24}>
              <div style={{ display: 'flex', gap: 13, flexWrap: 'wrap' }}>
                <Link href={ctaHref} style={{ ...btnPrimary, padding: '14px 28px', fontSize: 14.5 }}>{isAuthed ? 'Open Dashboard' : 'Sign Up Now'}</Link>
                <a href="#features" style={btnSecondary}>Take a Tour</a>
              </div>
            </Reveal>
          </div>
          <Reveal from="right" delay={0.1}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><DashboardMockup /></div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- SOCIAL PROOF QUOTE ---------------- */}
      <section style={{ padding: '10px 24px 50px' }}>
        <Reveal>
          <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
            <p style={{ fontSize: 'clamp(20px,2.6vw,28px)', fontWeight: 600, color: '#1f2d40', lineHeight: 1.4, letterSpacing: '-0.01em' }}>
              “Xyrenis brings every project, team, and decision into a single command center —
              <span style={{ color: '#e86c2d' }}> the way modern enterprises should run work.</span>”
            </p>
          </div>
        </Reveal>
      </section>

      {/* ---------------- USE-CASE TABS ---------------- */}
      <section id="solutions" style={{ padding: '40px 24px 70px', background: '#f7f9fc' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 34 }}>
              {useCases.map((u, i) => (
                <button key={u.title} onClick={() => setTab(i)} style={{
                  padding: '11px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
                  border: `1px solid ${tab === i ? '#e86c2d' : '#e4e9f0'}`,
                  background: tab === i ? '#e86c2d' : '#fff',
                  color: tab === i ? '#fff' : '#475569',
                  boxShadow: tab === i ? '0 8px 20px -6px rgba(232,108,45,0.4)' : 'none',
                }}>{u.title}</button>
              ))}
            </div>
          </Reveal>
          <Reveal>
            <div style={{ background: '#fff', borderRadius: 16, padding: 'clamp(26px,4vw,44px)', boxShadow: '0 20px 50px -28px rgba(15,27,45,0.25), 0 0 0 1px rgba(15,27,45,0.04)', textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
              <div style={{ fontSize: 34, marginBottom: 12 }}>{useCases[tab].icon}</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f1b2d', marginBottom: 10 }}>{useCases[tab].title}</h3>
              <p style={{ fontSize: 15.5, color: '#516074', lineHeight: 1.65 }}>{useCases[tab].desc}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- ALTERNATING FEATURE ROWS ---------------- */}
      <section id="features" style={{ padding: '90px 24px 40px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 70, maxWidth: 660, marginLeft: 'auto', marginRight: 'auto' }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#e86c2d', letterSpacing: '0.1em', marginBottom: 12 }}>EVERYTHING YOU NEED</p>
              <h2 style={{ fontSize: 'clamp(30px,4vw,44px)', fontWeight: 800, letterSpacing: '-0.025em', color: '#0f1b2d', lineHeight: 1.12 }}>
                One platform for the entire flow of work
              </h2>
            </div>
          </Reveal>

          {featureRows.map((f, i) => {
            const flip = i % 2 === 1;
            return (
              <div key={f.title} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center', marginBottom: 90 }} className="feature-row">
                <Reveal from={flip ? 'right' : 'left'} className={flip ? 'order-2' : ''}>
                  <div>
                    <div style={{ display: 'inline-flex', width: 44, height: 44, borderRadius: 12, background: `${f.color}14`, alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 16 }}>{f.emoji}</div>
                    <h3 style={{ fontSize: 26, fontWeight: 800, color: '#0f1b2d', letterSpacing: '-0.02em', marginBottom: 12 }}>{f.title}</h3>
                    <p style={{ fontSize: 16, color: '#516074', lineHeight: 1.65, marginBottom: 18 }}>{f.desc}</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {f.points.map(p => (
                        <li key={p} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: '#34435a' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5" /></svg>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
                <Reveal from={flip ? 'left' : 'right'} className={flip ? 'order-1' : ''}>
                  <MiniVisual kind={f.visual} />
                </Reveal>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- DEPARTMENT LOGOS ---------------- */}
      <section style={{ padding: '40px 24px 60px', borderTop: '1px solid #eef1f6', borderBottom: '1px solid #eef1f6' }}>
        <Reveal>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.14em', marginBottom: 26 }}>RUNNING WORK ACROSS EVERY ENTERPRISE DEPARTMENT</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(20px,4vw,52px)', flexWrap: 'wrap', alignItems: 'center' }}>
            {['Operations', 'Digital & Data', 'Retail & Commerce', 'Commercial Development', 'Strategic Support', 'Advertising & Marketing', 'Amenities & Hospitality'].map(d => (
              <span key={d} style={{ fontSize: 15, fontWeight: 700, color: '#9aa7b8', letterSpacing: '-0.01em' }}>{d}</span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ---------------- AI 4-COLUMN GRID ---------------- */}
      <section id="resources" style={{ padding: '90px 24px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56, maxWidth: 620, marginInline: 'auto' }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#8b5cf6', letterSpacing: '0.1em', marginBottom: 12 }}>AI, BUILT IN</p>
              <h2 style={{ fontSize: 'clamp(28px,3.6vw,40px)', fontWeight: 800, letterSpacing: '-0.025em', color: '#0f1b2d' }}>An intelligent copilot for every team</h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 18 }}>
            {aiFeatures.map((a, i) => (
              <Reveal key={a.title} delay={i * 0.07}>
                <div className="lift" style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #eef1f6', height: '100%' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: `${a.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, marginBottom: 15 }}>{a.icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f1b2d', marginBottom: 8 }}>{a.title}</h3>
                  <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.55 }}>{a.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- TRUST METRICS ---------------- */}
      <section style={{ padding: '20px 24px 90px' }}>
        <Reveal>
          <div style={{ maxWidth: 1000, margin: '0 auto', background: 'linear-gradient(135deg,#0f1b2d,#16263c)', borderRadius: 24, padding: 'clamp(36px,5vw,60px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 30, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(232,108,45,0.25),transparent 70%)' }} />
            {[
              { n: <CountUp to={163} suffix="+" />, l: 'Projects governed' },
              { n: <CountUp to={88} />, l: 'Team members onboarded' },
              { n: <CountUp to={7} />, l: 'Departments unified' },
              { n: <><CountUp to={99.9} />%</>, l: 'Uptime SLA' },
            ].map((m, i) => (
              <div key={i} style={{ position: 'relative', textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(30px,4vw,44px)', fontWeight: 800, background: 'linear-gradient(120deg,#ffae6b,#e86c2d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{m.n}</div>
                <div style={{ fontSize: 13.5, color: '#9fb0c8', marginTop: 6 }}>{m.l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ---------------- CTA BANNER ---------------- */}
      <section id="pricing" style={{ padding: '40px 24px 100px' }}>
        <Reveal>
          <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(32px,4.4vw,50px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f1b2d', lineHeight: 1.08, marginBottom: 18 }}>
              Ready to run work<br />the intelligent way?
            </h2>
            <p style={{ fontSize: 17.5, color: '#516074', marginBottom: 32, lineHeight: 1.6 }}>
              Sign in with your credentials and take command of your portfolio today.
            </p>
            <div style={{ display: 'flex', gap: 13, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={ctaHref} style={{ ...btnPrimary, padding: '16px 36px', fontSize: 15.5 }}>{isAuthed ? 'Open Dashboard' : 'Get Started Free'}</Link>
              <a href="#features" style={{ ...btnSecondary, padding: '16px 36px', fontSize: 15.5 }}>Explore Features</a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer style={{ background: '#0f1b2d', padding: '50px 24px 36px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 30, marginBottom: 34 }}>
            <div style={{ maxWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: '#e86c2d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
                </div>
                <span style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>Xyrenis</span>
              </div>
              <p style={{ fontSize: 13, color: '#7e93ad', lineHeight: 1.6 }}>The AI-powered Enterprise Work Operating System.</p>
            </div>
            <div style={{ display: 'flex', gap: 'clamp(30px,6vw,70px)', flexWrap: 'wrap' }}>
              {footerCols.map(col => (
                <div key={col.title}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 13 }}>{col.title}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {col.links.map(l => <a key={l} href="#" style={{ fontSize: 13, color: '#9fb0c8', textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.color = '#e86c2d')} onMouseLeave={e => (e.currentTarget.style.color = '#9fb0c8')}>{l}</a>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 22, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12.5, color: '#5f708a' }}>© 2026 Xyrenis. All rights reserved.</p>
            <p style={{ fontSize: 12.5, color: '#5f708a' }}>Secure sign-in powered by Supabase</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes growW { from { width: 0; } }
        @keyframes growH { from { height: 0; } }
        @keyframes riseIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes chipA { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        @keyframes chipB { 0%,100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
        .dash-float { animation: floaty 6s ease-in-out infinite; }
        .gantt-bar { animation: growW 1s cubic-bezier(.2,.7,.2,1) both; }
        .bar-grow { animation: growH .9s cubic-bezier(.2,.7,.2,1) both; }
        .bar-grow-x { animation: growW .9s cubic-bezier(.2,.7,.2,1) both; }
        .rise { animation: riseIn .5s ease both; }
        .chip-a { top: 26px; left: -18px; animation: chipA 5s ease-in-out infinite; }
        .chip-b { bottom: 40px; right: -14px; animation: chipB 5.5s ease-in-out infinite; }
        .lift { transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
        .lift:hover { transform: translateY(-5px); box-shadow: 0 20px 40px -22px rgba(15,27,45,0.3); border-color: #e2e8f0 !important; }
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .feature-row { grid-template-columns: 1fr !important; gap: 28px !important; }
          .feature-row .order-1 { order: -1; }
          .feature-row .order-2 { order: 0; }
        }
      `}</style>
    </div>
  );
}

/* ---------------- styles ---------------- */
const navLink: React.CSSProperties = { fontSize: 14, color: '#475569', fontWeight: 500, textDecoration: 'none', transition: 'color .2s', cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { padding: '10px 20px', borderRadius: 9, background: '#e86c2d', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block', boxShadow: '0 8px 22px -8px rgba(232,108,45,0.5)' };
const btnSecondary: React.CSSProperties = { padding: '10px 20px', borderRadius: 9, background: '#fff', color: '#0f1b2d', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block', border: '1px solid #e4e9f0' };

/* ---------------- data ---------------- */
const useCases = [
  { title: 'Project Managers', icon: '📋', desc: 'Plan, schedule, and track every project with Gantt timelines, dependencies, and stage gates — keeping delivery on time and on scope.' },
  { title: 'Operations', icon: '⚙️', desc: 'Coordinate cross-department work, monitor risks, and keep airport operations running with real-time status across every program.' },
  { title: 'Commercial', icon: '📈', desc: 'Track revenue initiatives, retail rollouts, and duty-free expansions with KPIs and portfolio health at your fingertips.' },
  { title: 'Leadership', icon: '🎯', desc: 'Get a single source of truth — portfolio intelligence, workforce capacity, and AI-surfaced risks in one executive command center.' },
];

const featureRows = [
  { title: 'Plan & track with clarity', emoji: '🗂️', color: '#2563eb', visual: 'kanban' as const,
    desc: 'Organize work into projects, boards, and timelines. Track progress from kickoff to completion across all seven departments.',
    points: ['Kanban boards & Gantt timelines', 'Dependencies & stage gates', 'Department-scoped access control'] },
  { title: 'Portfolio intelligence in real time', emoji: '📊', color: '#10b981', visual: 'chart' as const,
    desc: 'See health, progress, and risk across the entire portfolio. Drill from program down to a single task in one click.',
    points: ['Live RAG status & burn-down', 'Department performance analytics', 'Executive-ready reports'] },
  { title: 'A proactive AI copilot', emoji: '✦', color: '#8b5cf6', visual: 'ai' as const,
    desc: 'Let AI surface risks before they escalate, summarize portfolio reviews, and recommend the next best action automatically.',
    points: ['Early risk detection', 'Auto-generated summaries', 'Smart recommendations'] },
  { title: 'Workforce & capacity planning', emoji: '👥', color: '#e86c2d', visual: 'team' as const,
    desc: 'Balance allocation across teams, spot over-capacity early, and plan staffing with confidence using live workforce analytics.',
    points: ['Capacity heatmaps', 'Allocation by department', 'Team-level analytics'] },
];

const aiFeatures = [
  { icon: '⚠️', color: '#ef4444', title: 'Risk Detection', desc: 'AI flags projects trending toward delay or budget overrun before they slip.' },
  { icon: '📝', color: '#2563eb', title: 'Auto Summaries', desc: 'Instant portfolio reviews and status digests, written for you.' },
  { icon: '💡', color: '#f59e0b', title: 'Recommendations', desc: 'Next-best-action suggestions to keep delivery on track.' },
  { icon: '🔍', color: '#8b5cf6', title: 'Ask Anything', desc: 'Query your entire portfolio in natural language and get answers instantly.' },
];

const footerCols = [
  { title: 'Product', links: ['Features', 'Portfolio', 'AI Copilot', 'Workforce'] },
  { title: 'Solutions', links: ['Operations', 'Commercial', 'Leadership'] },
  { title: 'Company', links: ['About Us', 'Security', 'Support'] },
];
