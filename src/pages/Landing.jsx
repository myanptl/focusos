import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'


/* ─── Particle Canvas ─────────────────────────────────────────── */
function ParticleCanvas() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let raf
    let particles = []

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    function initParticles() {
      const count = Math.max(40, Math.floor((canvas.width * canvas.height) / 14000))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.6,
        a: Math.random() * 0.45 + 0.15,
      }))
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x, dy = p.y - q.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 130) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(181,242,58,${(1 - d / 130) * 0.13})`
            ctx.lineWidth = 0.6
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.stroke()
          }
        }
      }

      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(181,242,58,${p.a})`
        ctx.fill()
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
      }

      raf = requestAnimationFrame(tick)
    }

    resize()
    tick()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <canvas ref={ref} style={{
      position: 'absolute', inset: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none',
    }} />
  )
}

/* ─── Animated Word ───────────────────────────────────────────── */
function Word({ children, delay }) {
  return (
    <span style={{
      display: 'inline-block',
      opacity: 0,
      animation: `lFadeUp 0.65s cubic-bezier(0.22,1,0.36,1) forwards ${delay}ms`,
    }}>
      {children}
    </span>
  )
}

/* ─── Feature Card ────────────────────────────────────────────── */
function FeatureCard({ illustration, title, desc, stat, index }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const transform = !visible ? 'translateY(48px)' : hovered ? 'translateY(-5px)' : 'translateY(0)'
  const transition = visible
    ? 'transform 0.22s ease, opacity 0.25s ease, box-shadow 0.22s ease'
    : `transform 0.65s cubic-bezier(0.22,1,0.36,1) ${index * 110}ms, opacity 0.65s ease ${index * 110}ms`

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, minWidth: 240,
        background: '#111113',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTop: '2px solid #b5f23a',
        borderRadius: 16,
        padding: '32px 26px',
        transform,
        opacity: visible ? 1 : 0,
        transition,
        boxShadow: hovered ? '0 16px 48px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.2)',
        cursor: 'default',
      }}
    >
      {illustration && <div style={{ marginBottom: 16 }}>{illustration}</div>}
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: '#f0f0f2' }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 20 }}>{desc}</div>
      <div style={{
        fontSize: 11.5, color: '#b5f23a', lineHeight: 1.55,
        background: 'rgba(181,242,58,0.07)', border: '1px solid rgba(181,242,58,0.14)',
        borderRadius: 8, padding: '8px 12px',
      }}>{stat}</div>
    </div>
  )
}

/* ─── Scroll-reveal wrapper ───────────────────────────────────── */
function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} style={{
      transform: visible ? 'translateY(0)' : 'translateY(40px)',
      opacity: visible ? 1 : 0,
      transition: `transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms, opacity 0.55s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  )
}

/* ─── Browser Mockup ──────────────────────────────────────────── */
function BrowserMockup() {
  return (
    <div style={{ width: '100%', maxWidth: 500, animation: 'lFloat 5s ease-in-out infinite' }}>
      <div style={{
        background: '#0a0a0b',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 40px 80px rgba(181,242,58,0.15), 0 0 0 1px rgba(255,255,255,0.05), 0 24px 64px rgba(0,0,0,0.7)',
      }}>
        {/* Chrome bar */}
        <div style={{
          background: '#111113', borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {['#ff5f56','#ffbd2e','#27c93f'].map(c => (
              <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{
            flex: 1, background: '#0a0a0b', borderRadius: 6,
            padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,0.3)',
            textAlign: 'center', fontFamily: 'monospace',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>focusos.app/timer</div>
          <div style={{ width: 44 }} />
        </div>
        {/* Mini nav */}
        <div style={{
          background: 'rgba(10,10,11,0.98)', borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '0 14px', height: 40, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 8 }}>
            <span style={{ fontSize: 12, color: '#b5f23a', display: 'inline-block', animation: 'spin-slow 8s linear infinite' }}>⟳</span>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '3px', color: 'white' }}>FOCUSOS</span>
          </div>
          {['Timer','Quiz','Goals','Streak'].map((t, i) => (
            <span key={t} style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 20,
              color: i === 0 ? '#b5f23a' : 'rgba(255,255,255,0.35)',
              background: i === 0 ? 'rgba(181,242,58,0.1)' : 'transparent',
              border: i === 0 ? '1px solid rgba(181,242,58,0.2)' : '1px solid transparent',
            }}>{t}</span>
          ))}
        </div>
        {/* Timer page */}
        <div style={{ padding: '20px 22px', background: '#0a0a0b' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <div style={{ position: 'relative', width: 130, height: 130 }}>
              <svg width="130" height="130" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r="54" fill="none" stroke="#1a1a1e" strokeWidth="7" />
                <circle cx="65" cy="65" r="54" fill="none" stroke="#b5f23a" strokeWidth="7"
                  strokeLinecap="round" strokeDasharray="339" strokeDashoffset="85"
                  transform="rotate(-90 65 65)" />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'white', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>25:00</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2, letterSpacing: '0.12em' }}>FOCUS</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[['Session','1 / 3'],['Today','0 min'],['Streak','4 🔥']].map(([label, val]) => (
              <div key={label} style={{
                flex: 1, background: '#111113', borderRadius: 8, padding: '8px',
                border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{val}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{
            background: '#b5f23a', borderRadius: 10,
            padding: '11px', textAlign: 'center',
            fontSize: 13, fontWeight: 800, color: '#0a0a0b', letterSpacing: '0.06em',
          }}>START SESSION</div>
        </div>
      </div>
    </div>
  )
}

/* ─── Feature Illustrations ────────────────────────────────────── */
function TimerIllu() {
  return (
    <svg viewBox="0 0 80 80" width="64" height="64">
      <circle cx="40" cy="40" r="32" fill="none" stroke="#222226" strokeWidth="6"/>
      <circle cx="40" cy="40" r="32" fill="none" stroke="#b5f23a" strokeWidth="6"
        strokeDasharray="160" strokeDashoffset="40" strokeLinecap="round"
        transform="rotate(-90 40 40)">
        <animate attributeName="stroke-dashoffset" values="200;40;200" dur="3s" repeatCount="indefinite"/>
      </circle>
      <text x="40" y="46" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">25</text>
    </svg>
  )
}

function BrainIllu() {
  return (
    <svg viewBox="0 0 80 60" width="80" height="60">
      <line x1="10" y1="15" x2="40" y2="12" stroke="#333" strokeWidth="1.5"><animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/></line>
      <line x1="10" y1="30" x2="40" y2="12" stroke="#333" strokeWidth="1.5"><animate attributeName="opacity" values="1;0.3;1" dur="2.4s" repeatCount="indefinite"/></line>
      <line x1="10" y1="45" x2="40" y2="30" stroke="#333" strokeWidth="1.5"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" repeatCount="indefinite"/></line>
      <line x1="40" y1="12" x2="70" y2="20" stroke="#b5f23a" strokeWidth="1.5"><animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.1s" repeatCount="indefinite"/></line>
      <line x1="40" y1="30" x2="70" y2="20" stroke="#b5f23a" strokeWidth="1.5"><animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.9s" repeatCount="indefinite"/></line>
      <line x1="40" y1="30" x2="70" y2="44" stroke="#b5f23a" strokeWidth="1.5"><animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.3s" repeatCount="indefinite"/></line>
      <circle cx="10" cy="15" r="4" fill="#1a1a1e" stroke="#9494a0" strokeWidth="1.5"><animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/></circle>
      <circle cx="10" cy="30" r="4" fill="#1a1a1e" stroke="#9494a0" strokeWidth="1.5"><animate attributeName="opacity" values="1;0.5;1" dur="2.3s" repeatCount="indefinite"/></circle>
      <circle cx="10" cy="45" r="4" fill="#1a1a1e" stroke="#9494a0" strokeWidth="1.5"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.7s" repeatCount="indefinite"/></circle>
      <circle cx="40" cy="12" r="4.5" fill="rgba(181,242,58,0.15)" stroke="#b5f23a" strokeWidth="1.5"><animate attributeName="opacity" values="0.6;1;0.6" dur="2.1s" repeatCount="indefinite"/></circle>
      <circle cx="40" cy="30" r="5.5" fill="rgba(181,242,58,0.2)" stroke="#b5f23a" strokeWidth="1.5"><animate attributeName="r" values="5;6.5;5" dur="2s" repeatCount="indefinite"/></circle>
      <circle cx="70" cy="20" r="4" fill="rgba(181,242,58,0.1)" stroke="#b5f23a" strokeWidth="1"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.9s" repeatCount="indefinite"/></circle>
      <circle cx="70" cy="44" r="4" fill="rgba(181,242,58,0.1)" stroke="#b5f23a" strokeWidth="1"><animate attributeName="opacity" values="1;0.5;1" dur="2.2s" repeatCount="indefinite"/></circle>
    </svg>
  )
}

function TargetIllu() {
  return (
    <svg viewBox="0 0 80 60" width="80" height="60">
      <circle cx="36" cy="30" r="26" fill="none" stroke="#222226" strokeWidth="2"/>
      <circle cx="36" cy="30" r="16" fill="none" stroke="#9494a0" strokeWidth="2" opacity="0.4"/>
      <circle cx="36" cy="30" r="7" fill="rgba(181,242,58,0.15)" stroke="#b5f23a" strokeWidth="2">
        <animate attributeName="r" values="6;8.5;6" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>
      </circle>
      <g>
        <line x1="74" y1="30" x2="46" y2="30" stroke="#b5f23a" strokeWidth="2" strokeLinecap="round">
          <animate attributeName="x1" values="74;50;74" dur="2.8s" repeatCount="indefinite"/>
        </line>
        <polygon points="46,27 40,30 46,33" fill="#b5f23a">
          <animate attributeName="opacity" values="1;0.3;1" dur="2.8s" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="translate" values="0,0;-4,0;0,0" dur="2.8s" repeatCount="indefinite"/>
        </polygon>
      </g>
    </svg>
  )
}

/* ─── Landing ─────────────────────────────────────────────────── */
export default function Landing() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t) }, [])
  useEffect(() => { if (!loading && user) navigate('/timer', { replace: true }) }, [user, loading, navigate])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )
  if (user) return null

  return (
    <>
      <style>{`
        @keyframes lFadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(9px); }
        }
        @keyframes lMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .l-btn-primary {
          background: #b5f23a; color: #0a0a0b;
          border: none; border-radius: 10px;
          padding: 14px 32px; font-size: 16px; font-weight: 700;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          display: inline-flex; align-items: center; gap: 8px;
          white-space: nowrap;
        }
        .l-btn-primary:hover {
          transform: scale(1.025);
          box-shadow: 0 0 36px rgba(181,242,58,0.38), 0 4px 16px rgba(181,242,58,0.2);
        }
        .l-btn-outline {
          background: transparent; color: #f0f0f2;
          border: 1px solid rgba(255,255,255,0.18); border-radius: 10px;
          padding: 14px 32px; font-size: 16px; font-weight: 600;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: border-color 0.15s, background 0.15s;
          white-space: nowrap;
        }
        .l-btn-outline:hover {
          border-color: rgba(255,255,255,0.45);
          background: rgba(255,255,255,0.05);
        }
        .l-btn-outline-sm {
          background: transparent; color: #f0f0f2;
          border: 1px solid rgba(255,255,255,0.18); border-radius: 8px;
          padding: 8px 20px; font-size: 14px; font-weight: 600;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: border-color 0.15s, background 0.15s;
        }
        .l-btn-outline-sm:hover {
          border-color: rgba(255,255,255,0.45);
          background: rgba(255,255,255,0.05);
        }
        .l-footer-link { color: var(--muted); text-decoration: none; transition: color 0.15s; }
        .l-footer-link:hover { color: #b5f23a; }
        @keyframes lFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
      `}</style>

      <div style={{
        background: '#0a0a0b', color: '#f0f0f2',
        fontFamily: "'DM Sans', sans-serif",
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.5s ease',
        overflowX: 'hidden',
      }}>

        {/* ════ HERO ════════════════════════════════════════════════ */}
        <section style={{
          position: 'relative', height: '100vh', minHeight: 600,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <ParticleCanvas />

          {/* watermark ⟳ */}
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 480, color: '#b5f23a', opacity: 0.04,
            animation: 'spin-slow 60s linear infinite',
            lineHeight: 1, fontWeight: 300,
            pointerEvents: 'none', userSelect: 'none',
            zIndex: 1,
          }}>⟳</span>

          {/* radial glow centre */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(181,242,58,0.06) 0%, transparent 70%)',
          }} />

          {/* Nav */}
          <nav style={{
            position: 'relative', zIndex: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0 clamp(24px, 4vw, 56px)', height: 64,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 24, color: '#b5f23a',
                display: 'inline-block',
                animation: 'spin-slow 8s linear infinite',
                lineHeight: 1, fontWeight: 300,
              }}>⟳</span>
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '4px', color: 'white' }}>
                FOCUSOS
              </span>
            </div>
            <button className="l-btn-outline-sm" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </nav>

          {/* Hero content — two columns */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            padding: '0 clamp(20px, 4vw, 56px)',
            position: 'relative', zIndex: 10,
            gap: 'clamp(32px, 5vw, 72px)',
            maxWidth: 1200, margin: '0 auto', width: '100%',
          }}>
            {/* Left: text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Badge */}
              <div style={{
                display: 'inline-block',
                background: 'rgba(181,242,58,0.09)', border: '1px solid rgba(181,242,58,0.22)',
                borderRadius: 24, padding: '5px 16px',
                fontSize: 11.5, fontWeight: 700, color: '#b5f23a',
                letterSpacing: '0.08em', marginBottom: 30,
                opacity: 0, animation: 'lFadeUp 0.5s ease forwards 80ms',
              }}>
                FOCUS · LEARN · IMPROVE
              </div>

              {/* Headline line 1 */}
              <h1 style={{
                fontSize: 'clamp(40px, 5.5vw, 76px)', fontWeight: 800,
                lineHeight: 1.04, letterSpacing: '-0.02em',
                margin: '0 0 4px',
              }}>
                {'Study smarter.'.split(' ').map((w, i) => (
                  <span key={i}><Word delay={280 + i * 100}>{w}</Word>{' '}</span>
                ))}
              </h1>

              {/* Headline line 2 */}
              <h1 style={{
                fontSize: 'clamp(40px, 5.5vw, 76px)', fontWeight: 800,
                lineHeight: 1.04, letterSpacing: '-0.02em',
                margin: '0 0 28px', color: '#b5f23a',
              }}>
                {'Focus longer.'.split(' ').map((w, i) => (
                  <span key={i}><Word delay={680 + i * 100}>{w}</Word>{' '}</span>
                ))}
              </h1>

              {/* Subhead */}
              <p style={{
                fontSize: 'clamp(14px, 1.5vw, 18px)', color: 'var(--muted)',
                maxWidth: 440, lineHeight: 1.7, marginBottom: 40,
                opacity: 0, animation: 'lFadeUp 0.6s ease forwards 1050ms',
              }}>
                FocusOS adapts to your real attention span — not a generic 25-minute timer.
              </p>

              {/* CTAs */}
              <div style={{
                display: 'flex', gap: 14, flexWrap: 'wrap',
                opacity: 0, animation: 'lFadeUp 0.6s ease forwards 1250ms',
              }}>
                <button className="l-btn-primary" onClick={() => navigate('/login')}>
                  Start for Free →
                </button>
                <button className="l-btn-outline"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                  See how it works
                </button>
              </div>
            </div>

            {/* Right: browser mockup (hidden on mobile) */}
            <div className="hide-mobile" style={{
              flexShrink: 0, width: 'clamp(300px, 38vw, 480px)',
              opacity: 0, animation: 'lFadeUp 0.7s ease forwards 900ms',
            }}>
              <BrowserMockup />
            </div>
          </div>

          {/* Scroll caret */}
          <div style={{
            position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            opacity: 0, animation: 'lFadeUp 0.5s ease forwards 1600ms',
          }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', fontWeight: 600 }}>SCROLL</span>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', animation: 'lBounce 1.8s ease infinite' }}>↓</span>
          </div>
        </section>

        {/* ════ SOCIAL PROOF MARQUEE ════════════════════════════════ */}
        <section style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '14px 0', overflow: 'hidden',
          maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
        }}>
          <div style={{
            display: 'flex', whiteSpace: 'nowrap',
            animation: 'lMarquee 28s linear infinite',
          }}>
            {[0, 1].map(idx => (
              <span key={idx} style={{ display: 'inline-flex' }}>
                {[
                  'Built on peer-reviewed research',
                  'Dunlosky et al. 2013',
                  'Ariga & Lleras 2011',
                  'Gollwitzer 1999',
                  '242 studies confirmed',
                  '169,179 participants',
                  'Active recall = #1 study method',
                  'Attention spans vary by individual',
                  'Spaced repetition works',
                  'Implementation intentions increase follow-through 3×',
                ].map((text, j) => (
                  <span key={j} style={{ padding: '0 6px', fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
                    {text}
                    <span style={{ margin: '0 18px', color: 'rgba(181,242,58,0.35)' }}>·</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </section>

        {/* ════ FEATURES ════════════════════════════════════════════ */}
        <section id="features" style={{ padding: 'clamp(64px, 8vw, 110px) clamp(20px, 4vw, 48px)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <Reveal style={{ textAlign: 'center', marginBottom: 60 }}>
              <div className="label" style={{ color: '#b5f23a', marginBottom: 12 }}>What you get</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.015em' }}>
                Everything you need to<br />actually study.
              </h2>
            </Reveal>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <FeatureCard index={0} illustration={<TimerIllu />} title="Adaptive Focus Timer"
                desc="Starts at YOUR attention span. Grows with every session. No arbitrary 25-minute assumption baked in."
                stat="Avg user improves by 8 min in their first week" />
              <FeatureCard index={1} illustration={<BrainIllu />} title="AI Quiz Generator"
                desc="Paste your notes. Claude AI instantly generates active recall questions across 5 question types — multiple choice, fill-in, explain, and more."
                stat="Practice testing = #1 study technique [Dunlosky, 2013]" />
              <FeatureCard index={2} illustration={<TargetIllu />} title="Score Goal Tracker"
                desc="Set your SAT, ACT, or AP target. Get a backwards study plan anchored to your test date."
                stat="Implementation intentions increase follow-through 3× [Gollwitzer, 1999]" />
            </div>
          </div>
        </section>

        {/* ════ HOW IT WORKS ════════════════════════════════════════ */}
        <section style={{
          background: '#0d0d0f',
          borderTop: '1px solid rgba(255,255,255,0.055)',
          borderBottom: '1px solid rgba(255,255,255,0.055)',
          padding: 'clamp(64px, 8vw, 110px) clamp(20px, 4vw, 48px)',
        }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <Reveal style={{ textAlign: 'center', marginBottom: 64 }}>
              <div className="label" style={{ color: '#b5f23a', marginBottom: 12 }}>How it works</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.015em' }}>
                Three steps. Real results.
              </h2>
            </Reveal>

            {/* Step diagram */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
              {/* connecting line */}
              <div style={{
                position: 'absolute', top: 24, left: '16.5%', right: '16.5%',
                height: 0, borderTop: '2px dashed rgba(181,242,58,0.22)',
                pointerEvents: 'none',
              }} />
              <div style={{ display: 'flex', gap: 0, width: '100%', maxWidth: 600 }}>
                {['Set your baseline', 'Focus and grow', 'Quiz yourself'].map((label, i) => (
                  <Reveal key={i} delay={i * 120} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'rgba(181,242,58,0.1)',
                      border: '1.5px solid rgba(181,242,58,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 17, fontWeight: 800, color: '#b5f23a',
                      margin: '0 auto 14px',
                      position: 'relative', zIndex: 1,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f2' }}>{label}</div>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* Step detail cards */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { num: 1, title: 'Set your baseline', desc: "Tell us how long you can actually focus right now. FocusOS sets your first timer to match — not 25 minutes." },
                { num: 2, title: 'Focus and grow', desc: "Complete sessions. Your timer gradually extends as you build real focus capacity. Science-backed progression." },
                { num: 3, title: 'Quiz yourself', desc: "Paste your notes after each session. AI generates 5 question types. Active recall cements what you just studied." },
              ].map((s, i) => (
                <Reveal key={i} delay={i * 100} style={{ flex: 1, minWidth: 220 }}>
                  <div style={{
                    background: '#111113', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12, padding: '20px 22px',
                  }}>
                    <div style={{ fontSize: 11, color: '#b5f23a', fontWeight: 700, letterSpacing: '0.07em', marginBottom: 8 }}>
                      STEP {s.num}
                    </div>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>{s.desc}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ════ RESEARCH CALLOUT ════════════════════════════════════ */}
        <section style={{ padding: 'clamp(64px, 8vw, 110px) clamp(20px, 4vw, 48px)' }}>
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <Reveal>
              <div style={{
                background: '#111113',
                border: '1px solid rgba(255,255,255,0.07)',
                borderLeft: '3px solid #b5f23a',
                borderRadius: 18, padding: 'clamp(32px, 4vw, 52px)',
              }}>
                <div className="label" style={{ color: '#b5f23a', marginBottom: 16 }}>Research-backed</div>
                <h2 style={{
                  fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 800,
                  marginBottom: 18, letterSpacing: '-0.015em', lineHeight: 1.2,
                }}>
                  Not another Pomodoro app.
                </h2>
                <p style={{ fontSize: 15.5, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 26, maxWidth: 580 }}>
                  Generic apps assume 25 minutes works for everyone. Research shows attention spans vary widely by
                  individual — and can be trained over time. FocusOS starts where <em>you</em> are,
                  then helps you grow session by session.
                </p>
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(181,242,58,0.06)', border: '1px solid rgba(181,242,58,0.15)',
                  borderRadius: 8, padding: '10px 16px',
                  fontSize: 12.5, color: '#b5f23a', fontStyle: 'italic', lineHeight: 1.55,
                }}>
                  "Brief and rare mental 'breaks' keep you focused: Deactivation and reactivation of task goals preempt
                  vigilance decrements." — Ariga & Lleras, Cognition, 2011
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ════ CTA ═════════════════════════════════════════════════ */}
        <section style={{
          padding: 'clamp(80px, 10vw, 130px) clamp(20px, 4vw, 48px)',
          textAlign: 'center',
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(181,242,58,0.04) 0%, transparent 70%)',
        }}>
          <Reveal>
            <h2 style={{
              fontSize: 'clamp(34px, 5.5vw, 62px)', fontWeight: 800,
              letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.1,
            }}>
              Ready to actually focus?
            </h2>
            <p style={{ color: 'var(--muted)', marginBottom: 40, fontSize: 17, lineHeight: 1.6 }}>
              Join students building real focus — one session at a time.
            </p>
            <button className="l-btn-primary" style={{ fontSize: 17, padding: '16px 42px' }}
              onClick={() => navigate('/login')}>
              Create your free account →
            </button>
            <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--muted)' }}>No credit card required.</p>
          </Reveal>
        </section>

        {/* ════ FOOTER ══════════════════════════════════════════════ */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '24px clamp(20px, 4vw, 48px)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
          fontSize: 13, color: 'var(--muted)',
        }}>
          <span>© 2026 FocusOS · Myan Patel · Westford Academy</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="/privacy" className="l-footer-link">Privacy</a>
            <a href="/terms" className="l-footer-link">Terms</a>
            <a href="/support" className="l-footer-link">Support</a>
          </div>
        </div>

      </div>
    </>
  )
}
