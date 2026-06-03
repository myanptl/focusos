import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ContainerScroll } from '../components/ui/container-scroll-animation'
import FlowArt, { FlowSection } from '../components/ui/story-scroll'

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

function ParticleCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf, particles = [], mouseX = -9999, mouseY = -9999

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      const count = Math.max(35, Math.floor((canvas.width * canvas.height) / 15000))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.26,
        vy: (Math.random() - 0.5) * 0.26,
        r: Math.random() * 1.3 + 0.4,
        a: Math.random() * 0.12 + 0.06,
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
          if (d < 100) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(181,242,58,${(1 - d / 100) * 0.055})`
            ctx.lineWidth = 0.4
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke()
          }
        }
      }
      for (const p of particles) {
        const cx = mouseX - p.x, cy = mouseY - p.y
        const cd = Math.sqrt(cx * cx + cy * cy)
        if (cd < 160 && cd > 0) {
          const f = ((160 - cd) / 160) * 0.007
          p.vx += (cx / cd) * f; p.vy += (cy / cd) * f
        }
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (spd > 0.68) { p.vx = (p.vx / spd) * 0.68; p.vy = (p.vy / spd) * 0.68 }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(181,242,58,${p.a})`
        ctx.fill()
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
      }
      raf = requestAnimationFrame(tick)
    }

    function onMove(e) { mouseX = e.clientX; mouseY = e.clientY }
    resize(); tick()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
}

function OrbBackground() {
  const reduced = useReducedMotion()
  const orbs = [
    { w: 680, h: 580, left: '-18%', top: '-10%', dur: 36, ax: [0, 58, -24, 0], ay: [0, -48, 30, 0], op: 0.03 },
    { w: 480, h: 480, left:  '58%', top: '-14%', dur: 31, ax: [0, -44, 52, 0], ay: [0,  46, -26, 0], op: 0.022 },
    { w: 320, h: 320, left:  '28%', top:  '58%', dur: 42, ax: [0,  36, -46, 0], ay: [0, -34,  20, 0], op: 0.016 },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {orbs.map((orb, i) => (
        <motion.div key={i}
          style={{
            position: 'absolute', left: orb.left, top: orb.top,
            width: orb.w, height: orb.h, borderRadius: '50%',
            background: `radial-gradient(circle, rgba(181,242,58,${orb.op}) 0%, rgba(181,242,58,0) 72%)`,
            filter: 'blur(72px)', willChange: 'transform',
          }}
          animate={reduced ? {} : { x: orb.ax, y: orb.ay }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function FadeUp({ children, delay = 0, style = {}, className }) {
  const reduced = useReducedMotion()
  return (
    <motion.div className={className}
      initial={reduced ? {} : { opacity: 0, y: 32, filter: 'blur(4px)' }}
      whileInView={reduced ? {} : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-56px' }}
      transition={{ duration: 0.72, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  )
}

function RippleButton({ className, style, onClick, children }) {
  const [ripples, setRipples] = useState([])
  const handleClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const id = Date.now()
    setRipples(prev => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700)
    onClick?.(e)
  }, [onClick])
  return (
    <button className={className} style={{ ...style, position: 'relative', overflow: 'hidden' }} onClick={handleClick}>
      {children}
      <AnimatePresence>
        {ripples.map(r => (
          <motion.span key={r.id}
            initial={{ scale: 0, opacity: 0.4 }} animate={{ scale: 5.5, opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.62, ease: 'easeOut' }}
            style={{ position: 'absolute', left: r.x - 20, top: r.y - 20, width: 40, height: 40, borderRadius: '50%', background: 'rgba(10,10,11,0.3)', pointerEvents: 'none' }}
          />
        ))}
      </AnimatePresence>
    </button>
  )
}

function BrowserMockup() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0b' }}>

      {/* Browser chrome */}
      <div style={{
        background: '#111113', borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff5f56', '#ffbd2e', '#27c93f'].map(c => (
            <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{
          flex: 1, background: '#0a0a0b', borderRadius: 5,
          padding: '3px 10px', fontSize: 9, color: 'rgba(255,255,255,0.28)',
          textAlign: 'center', fontFamily: 'JetBrains Mono, monospace',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>focusos.live/timer</div>
        <div style={{ width: 36 }} />
      </div>

      {/* App nav */}
      <div style={{
        background: '#0a0a0b', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 14px', height: 34, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 8 }}>
          <span style={{ fontSize: 10, color: '#b5f23a', animation: 'spin 8s linear infinite' }}>⟳</span>
          <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '3px', color: 'white' }}>FOCUSOS</span>
        </div>
        {['Timer', 'Quiz', 'Goals', 'Streak'].map((t, i) => (
          <span key={t} style={{
            fontSize: 8, padding: '2px 8px', borderRadius: 20,
            color: i === 0 ? '#b5f23a' : 'rgba(255,255,255,0.32)',
            background: i === 0 ? 'rgba(181,242,58,0.1)' : 'transparent',
            border: i === 0 ? '1px solid rgba(181,242,58,0.2)' : 'none',
          }}>{t}</span>
        ))}
      </div>

      {/* Page content */}
      <div style={{
        flex: 1, background: '#0a0a0b', padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 9, overflow: 'hidden',
      }}>

        {/* Greeting */}
        <div style={{ fontSize: 15, fontWeight: 800, color: '#f0f0f2', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Good morning, <span style={{ color: '#b5f23a' }}>User</span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 5 }}>
          {[
            { label: 'Sessions', value: '3' },
            { label: 'Minutes',  value: '47' },
            { label: 'Streak',   value: '7 🔥' },
          ].map(c => (
            <div key={c.label} style={{
              padding: '5px 10px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8,
              fontSize: 9, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ color: 'rgba(148,148,160,0.6)' }}>{c.label}:</span>
              <span style={{ fontWeight: 700, color: '#f0f0f2' }}>{c.value}</span>
            </div>
          ))}
        </div>

        {/* Attention level card */}
        <div style={{
          background: '#111113', borderRadius: 10, flexShrink: 0,
          border: '1px solid rgba(255,255,255,0.07)',
          borderLeft: '2px solid #60d3f8',
          padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#60d3f8', letterSpacing: '0.04em' }}>FOCUSED</span>
            <span style={{
              fontSize: 8, color: 'rgba(148,148,160,0.5)',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20, padding: '2px 8px',
            }}>12m to FLOW STATE</span>
          </div>
          <div style={{ fontSize: 9.5, color: 'rgba(148,148,160,0.6)', marginBottom: 8, lineHeight: 1.4 }}>
            Solid concentration. You're in the zone.
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
            <div style={{
              width: '68%', height: '100%', borderRadius: 4,
              background: 'linear-gradient(90deg, #60d3f899, #60d3f8)',
            }} />
          </div>
        </div>

        {/* Timer card */}
        <div style={{
          background: '#111113', borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '12px 14px',
          flex: 1, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            fontSize: 8, fontWeight: 700, color: 'rgba(148,148,160,0.5)',
            letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10,
          }}>Focus Session</div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            {/* Circular timer */}
            <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="38" fill="none" stroke="#1a1a1e" strokeWidth="5" />
                <circle cx="48" cy="48" r="38" fill="none" stroke="#b5f23a" strokeWidth="5"
                  strokeLinecap="round" strokeDasharray="239" strokeDashoffset="60"
                  transform="rotate(-90 48 48)">
                  <animate attributeName="stroke-dashoffset" values="239;60;239" dur="6s" repeatCount="indefinite"
                    calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" />
                </circle>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'white', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.03em' }}>25:00</div>
                <div style={{ fontSize: 6, color: '#b5f23a', letterSpacing: '0.14em', fontWeight: 700 }}>FOCUS</div>
              </div>
            </div>

            {/* Focus level indicator */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 8, color: 'rgba(148,148,160,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Focus Level</div>
              {[
                { label: 'FLOW STATE', pct: 100, color: '#b5f23a', active: false },
                { label: 'FOCUSED',    pct: 68,  color: '#60d3f8', active: true },
                { label: 'BUILDING',   pct: 30,  color: '#f2c75a', active: false },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 7, fontWeight: row.active ? 700 : 500, color: row.active ? row.color : 'rgba(148,148,160,0.4)', letterSpacing: '0.05em' }}>{row.label}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 3, height: 3, overflow: 'hidden' }}>
                    <div style={{ width: row.active ? `${row.pct}%` : '0%', height: '100%', borderRadius: 3, background: row.color, opacity: row.active ? 1 : 0.2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: '#b5f23a', borderRadius: 7, padding: '9px',
            textAlign: 'center', marginTop: 10,
            fontSize: 9, fontWeight: 800, color: '#0a0a0b', letterSpacing: '0.08em',
          }}>START SESSION</div>
        </div>

      </div>
    </div>
  )
}

/* ─── Story scroll visuals ───────────────────────────────────── */
const WAVE_H = [30, 58, 88, 62, 100, 44, 78, 94, 50, 72, 38, 82, 55, 96, 34]

function TimerVisual() {
  const [playing, setPlaying] = useState(false)
  const r = 88, cx = 110, cy = 110
  const circ = 2 * Math.PI * r
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, minWidth: 300 }}>
      <div style={{ position: 'relative', width: 220, height: 220 }}>
        <svg width="220" height="220" viewBox="0 0 220 220">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#b5f23a" strokeWidth="10"
            strokeDasharray={`${circ * 0.72} ${circ * 0.28}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ filter: 'drop-shadow(0 0 12px rgba(181,242,58,0.45))' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: '#f0f0f2', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>23:47</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6, letterSpacing: '0.12em', textTransform: 'uppercase' }}>remaining</div>
          <div style={{ fontSize: 10, color: 'rgba(181,242,58,0.55)', marginTop: 4 }}>Session 7 of 8</div>
        </div>
      </div>
      <div style={{ width: 280, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Brown Noise</span>
          <button onClick={() => setPlaying(p => !p)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#b5f23a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: '#0a0a0b', lineHeight: 1 }}>{playing ? '⏸' : '▶'}</span>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
          {WAVE_H.map((h, i) => (
            <div key={i} style={{
              flex: 1, background: '#b5f23a', borderRadius: 2, minHeight: 3,
              height: playing ? undefined : `${(h / 100) * 22 + 3}px`,
              animation: playing ? `waveBar ${0.45 + (i % 6) * 0.08}s ease-in-out ${(i % 5) * 0.06}s infinite alternate` : 'none',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function QuizVisual() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setActive(a => (a + 1) % 4), 1600)
    return () => clearInterval(id)
  }, [])
  const modes = ['Easy', 'Medium', 'Hard', 'Custom']
  return (
    <div style={{ minWidth: 300, maxWidth: 380, width: '100%' }}>
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '24px 28px', marginBottom: 14, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: 10, color: 'rgba(181,242,58,0.75)', fontWeight: 700, letterSpacing: '0.12em', marginBottom: 14, textTransform: 'uppercase' }}>Biology · Flashcard</div>
        <div style={{ fontSize: 15, color: '#f0f0f2', lineHeight: 1.6, marginBottom: 20 }}>What triggers the release of insulin from the pancreas?</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
          Rising blood glucose levels signal beta cells in the islets of Langerhans to secrete insulin.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {modes.map((mode, i) => (
          <div key={mode} style={{
            flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 10,
            background: i === active ? 'rgba(181,242,58,0.12)' : 'rgba(255,255,255,0.04)',
            fontSize: 11, fontWeight: 700,
            color: i === active ? '#b5f23a' : 'rgba(255,255,255,0.3)',
            border: i === active ? '2px solid rgba(181,242,58,0.28)' : '2px solid transparent',
            transform: i === active ? 'scale(1.06)' : 'scale(1)',
            transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>{mode}</div>
        ))}
      </div>
    </div>
  )
}

/* ─── LandingV2 ─────────────────────────────────────────────── */
export default function LandingV2() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const isMobile = useIsMobile()

  const ctaTarget = user ? '/timer' : '/signup'

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  return (
    <div style={{
      background: '#0a0a0b', color: '#f0f0f2',
      fontFamily: "'Outfit', sans-serif",
      overflowX: 'hidden',
      position: 'relative',
    }}>
      <ParticleCanvas />
      <div aria-hidden style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '100vh',
        pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 70% 45% at 50% 10%, rgba(181,242,58,0.024) 0%, transparent 72%)',
      }} />

      {/* ════ HERO ══════════════════════════════════════════════ */}
      <section style={{ position: 'relative', minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <OrbBackground />
        <div className="hero-dot-grid" aria-hidden />
        <div className="hero-scan-line" aria-hidden />
        <div aria-hidden style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%',
          background: 'linear-gradient(to bottom, transparent, #0a0a0b)',
          pointerEvents: 'none', zIndex: 6,
        }} />

        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, opacity: 0.033,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='512' height='512' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat', backgroundSize: '200px 200px',
        }} />

        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
          background: 'radial-gradient(ellipse 72% 54% at 50% 32%, rgba(181,242,58,0.062) 0%, transparent 68%)',
        }} />

        {/* Nav */}
        <nav style={{ position: 'relative', zIndex: 10, padding: 'clamp(16px,2.5vw,24px) clamp(16px,3vw,40px) 0' }}>
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(10,10,11,0.72)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 50, padding: '0 6px 0 20px', height: 52,
              maxWidth: 1100, margin: '0 auto',
              boxShadow: '0 1px 0 rgba(255,255,255,0.07) inset, 0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22, color: '#b5f23a', lineHeight: 1, fontWeight: 300, animation: 'spin 8s linear infinite' }}>⟳</span>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '4px', color: 'white' }}>FOCUSOS</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {!user && (
                <button onClick={() => navigate('/login')} style={{
                  background: 'transparent', border: 'none',
                  color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'Outfit, sans-serif', padding: '8px 14px',
                  transition: 'color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f0f0f2'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                >Sign in</button>
              )}
              <button onClick={() => navigate(ctaTarget)} style={{
                background: '#b5f23a', color: '#0a0a0b', border: 'none', borderRadius: 40,
                padding: '9px 20px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                transition: 'transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.18s cubic-bezier(0.22,1,0.36,1)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.3) inset',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.3) inset, 0 6px 20px rgba(181,242,58,0.28)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.3) inset' }}
              >{user ? 'Open app' : 'Get started'}</button>
            </div>
          </motion.div>
        </nav>

        {/* Hero body */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(40px,6vw,72px) clamp(20px,4vw,56px) clamp(40px,5vw,64px)',
          position: 'relative', zIndex: 10,
          textAlign: 'center', maxWidth: 1100, margin: '0 auto', width: '100%',
        }}>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(181,242,58,0.07)', border: '1px solid rgba(181,242,58,0.18)',
              borderRadius: 50, padding: '6px 16px 6px 10px',
              fontSize: 11, fontWeight: 600, color: 'rgba(181,242,58,0.85)',
              letterSpacing: '0.055em', marginBottom: 32,
            }}
          >
            <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#b5f23a', flexShrink: 0 }} />
            AI-powered · Built on peer-reviewed research
          </motion.div>

          <div style={{ marginBottom: 30 }}>
            <div style={{ overflow: 'hidden', display: 'block', lineHeight: 0.9 }}>
              <motion.div
                initial={reduced ? {} : { y: '110%' }}
                animate={reduced ? {} : { y: '0%' }}
                transition={{ duration: 0.95, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: isMobile ? 'clamp(62px,15vw,92px)' : 'clamp(82px,10.5vw,148px)',
                  fontWeight: 400, lineHeight: 0.9, letterSpacing: '0.01em',
                  color: '#f0f0f2', display: 'block', paddingTop: '0.06em',
                }}>STUDY SMARTER.</span>
              </motion.div>
            </div>
            <div style={{ overflow: 'hidden', display: 'block', lineHeight: 0.9 }}>
              <motion.div
                initial={reduced ? {} : { y: '110%' }}
                animate={reduced ? {} : { y: '0%' }}
                transition={{ duration: 0.95, delay: 0.48, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="text-gradient-lime" style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: isMobile ? 'clamp(62px,15vw,92px)' : 'clamp(82px,10.5vw,148px)',
                  fontWeight: 400, lineHeight: 0.9, letterSpacing: '0.01em',
                  display: 'block', paddingBottom: '0.08em',
                }}>FOCUS LONGER.</span>
              </motion.div>
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.58, delay: 1.04, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: isMobile ? 15 : 'clamp(15px,1.45vw,18px)',
              color: 'rgba(255,255,255,0.44)',
              maxWidth: 440, lineHeight: 1.78, marginBottom: 38,
              letterSpacing: '-0.01em',
            }}
          >
            FocusOS adapts to your real attention span — not a generic timer.
            Backed by 242 peer-reviewed studies on how humans actually learn.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.52, delay: 1.20, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', width: isMobile ? '100%' : 'auto', marginBottom: 38 }}
          >
            <RippleButton className="l-btn-primary" onClick={() => navigate(ctaTarget)} style={{ fontSize: 15, width: isMobile ? '100%' : 'auto' }}>
              {user ? 'Back to app' : 'Start for free'}
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>→</span>
            </RippleButton>
            <button className="l-btn-outline" onClick={() => document.getElementById('v2-story')?.scrollIntoView({ behavior: 'smooth' })} style={{ fontSize: 15, width: isMobile ? '100%' : 'auto' }}>
              See how it works <span style={{ opacity: 0.6 }}>↓</span>
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.38, duration: 0.65 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}
          >
            <div style={{ display: 'flex' }}>
              {[
                { init: 'MP', bg: '#0f1e07', c: '#b5f23a' },
                { init: 'JK', bg: '#07121e', c: '#60d3f8' },
                { init: 'AS', bg: '#1e1207', c: '#f2c75a' },
                { init: 'TR', bg: '#12071e', c: '#a855f7' },
                { init: 'CL', bg: '#1e0707', c: '#f05a5a' },
              ].map(({ init, bg, c }, i) => (
                <div key={i} style={{
                  width: 30, height: 30, borderRadius: '50%', background: bg,
                  border: '2px solid #0a0a0b', marginLeft: i > 0 ? -9 : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: c,
                  boxShadow: `0 0 0 1px ${c}22, inset 0 1px 0 ${c}18`,
                }}>{init}</div>
              ))}
            </div>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.34)', letterSpacing: '0.01em' }}>
              Trusted by 2,400+ students
            </span>
          </motion.div>

        </div>
      </section>

      {/* ════ APP REVEAL ════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 1 }}>
        <ContainerScroll
          titleComponent={
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                color: '#b5f23a', textTransform: 'uppercase', marginBottom: 14,
              }}>The App</div>
              <h2 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(48px,7vw,96px)',
                fontWeight: 400, lineHeight: 0.95,
                letterSpacing: '0.01em', color: '#f0f0f2',
                marginBottom: 16,
              }}>
                BUILT FOR HOW YOU<br />
                <span style={{ color: '#b5f23a' }}>ACTUALLY STUDY.</span>
              </h2>
              <p style={{
                fontSize: 'clamp(14px,1.3vw,17px)',
                color: 'rgba(255,255,255,0.44)',
                maxWidth: 480, margin: '0 auto',
                lineHeight: 1.75,
              }}>
                Scroll to see FocusOS in action — the focus timer that adapts to you.
              </p>
            </div>
          }
        >
          <BrowserMockup />
        </ContainerScroll>
      </section>

      {/* ════ STORY SCROLL ════════════════════════════════════════ */}
      <div id="v2-story" style={{ position: 'relative', zIndex: 1 }}>
        <FlowArt>

          {/* Section 1 – Adaptive Timer: text left, timer right */}
          <FlowSection aria-label="Adaptive Timer" style={{ background: '#0d0d0f', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'flex-start', padding: 0, gap: 0 }}>
            <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(20px,3vh,36px)', padding: 'clamp(48px,7vw,96px) clamp(32px,4vw,64px)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(181,242,58,0.6)', textTransform: 'uppercase' }}>
                01 — ADAPTIVE TIMER
              </div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(56px,7vw,112px)', fontWeight: 400, lineHeight: 0.88, letterSpacing: '0.01em', color: '#f0f0f2' }}>
                YOUR BRAIN.<br /><span style={{ color: '#b5f23a' }}>YOUR PACE.</span>
              </h2>
              <p style={{ fontSize: 'clamp(14px,1.2vw,17px)', color: 'rgba(255,255,255,0.44)', lineHeight: 1.75, maxWidth: 400 }}>
                Generic apps assume 25 minutes. FocusOS starts at YOUR real attention span and grows it every session. Based on attention research by Ariga &amp; Lleras, <em>Cognition</em>, 2011.
              </p>
            </div>
            <div style={{ flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(48px,7vw,96px) clamp(32px,4vw,64px)' }}>
              <TimerVisual />
            </div>
          </FlowSection>

          {/* Section 2 – AI Quiz: quiz left, text right */}
          <FlowSection aria-label="AI Quiz" style={{ background: '#0b1a09', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'flex-start', padding: 0, gap: 0 }}>
            <div style={{ flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(48px,7vw,96px) clamp(32px,4vw,64px)' }}>
              <QuizVisual />
            </div>
            <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(20px,3vh,36px)', padding: 'clamp(48px,7vw,96px) clamp(32px,4vw,64px)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(181,242,58,0.6)', textTransform: 'uppercase' }}>
                02 — AI QUIZ
              </div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(56px,7vw,112px)', fontWeight: 400, lineHeight: 0.88, letterSpacing: '0.01em', color: '#f0f0f2' }}>
                PASTE NOTES.<br /><span style={{ color: '#b5f23a' }}>GET SMARTER.</span>
              </h2>
              <p style={{ fontSize: 'clamp(14px,1.2vw,17px)', color: 'rgba(255,255,255,0.44)', lineHeight: 1.75, maxWidth: 400 }}>
                Claude AI turns your notes into active recall questions instantly. Practice testing is rated the #1 study technique — Dunlosky et al., 2013. Confirmed by 242 studies and 169,179 participants.
              </p>
            </div>
          </FlowSection>

          {/* Section 3 – Goals & Streaks: text left, heatmap right */}
          <FlowSection aria-label="Goals and Streaks" style={{ background: '#0f0e19', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'flex-start', padding: 0, gap: 0 }}>
            <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(20px,3vh,36px)', padding: 'clamp(48px,7vw,96px) clamp(32px,4vw,64px)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(181,242,58,0.6)', textTransform: 'uppercase' }}>
                03 — GOALS &amp; STREAKS
              </div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(56px,7vw,112px)', fontWeight: 400, lineHeight: 0.88, letterSpacing: '0.01em', color: '#f0f0f2' }}>
                SET THE DATE.<br /><span style={{ color: '#b5f23a' }}>BUILD THE HABIT.</span>
              </h2>
              <p style={{ fontSize: 'clamp(14px,1.2vw,17px)', color: 'rgba(255,255,255,0.44)', lineHeight: 1.75, maxWidth: 400 }}>
                Enter your SAT, ACT, or AP test date and get a backwards study plan. Daily streaks and XP keep you consistent. Implementation intentions increase follow-through 3x — Gollwitzer, 1999.
              </p>
            </div>
            <div style={{ flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(48px,7vw,96px) clamp(32px,4vw,64px)' }}>
              <div style={{ width: '100%', maxWidth: 380 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>June 2026</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(181,242,58,0.08)', border: '1px solid rgba(181,242,58,0.18)', borderRadius: 20, padding: '5px 14px' }}>
                    <span style={{ fontSize: 15 }}>🔥</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#b5f23a', fontFamily: "'JetBrains Mono', monospace" }}>18</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>day streak</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 20 }}>
                  {['M','T','W','T','F','S','S'].map((d, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.2)', paddingBottom: 4 }}>{d}</div>
                  ))}
                  {Array.from({ length: 28 }, (_, i) => {
                    const done = i < 18, today = i === 17
                    return (
                      <div key={i} style={{
                        height: 34, borderRadius: 7,
                        background: today ? '#b5f23a' : done ? 'rgba(181,242,58,0.22)' : 'rgba(255,255,255,0.04)',
                        border: today ? 'none' : done ? '1px solid rgba(181,242,58,0.35)' : '1px solid rgba(255,255,255,0.06)',
                      }} />
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ label: 'XP earned', val: '2,840' }, { label: 'Goals hit', val: '6/7' }, { label: 'Best streak', val: '24d' }].map(({ label, val }) => (
                    <div key={label} style={{ flex: 1, padding: '14px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 19, fontWeight: 800, color: '#f0f0f2', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{val}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FlowSection>

          {/* Section 4 – CTA: fully centered */}
          <FlowSection aria-label="Free to Start" style={{ background: '#060608', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 'clamp(48px,7vw,96px) clamp(20px,5vw,56px)' }}>
            <div style={{ maxWidth: 640, padding: '0 clamp(20px,5vw,56px)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(181,242,58,0.6)', marginBottom: 24, textTransform: 'uppercase' }}>
                04 — FREE TO START
              </div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(52px,8vw,112px)', fontWeight: 400, lineHeight: 0.92, letterSpacing: '0.01em', color: '#f0f0f2', marginBottom: 20 }}>
                READY TO<br /><span style={{ color: '#b5f23a' }}>ACTUALLY FOCUS?</span>
              </h2>
              <p style={{ fontSize: 'clamp(14px,1.3vw,17px)', color: 'rgba(255,255,255,0.38)', lineHeight: 1.7, marginBottom: 36 }}>
                5 free AI quizzes per day. Adaptive timer. Goals tracker. No credit card.
              </p>
              <RippleButton
                className="l-btn-primary"
                style={{ fontSize: 16, padding: '15px 36px' }}
                onClick={() => navigate(ctaTarget)}
              >
                {user ? 'Back to app' : 'Start for free'}
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>→</span>
              </RippleButton>
            </div>
          </FlowSection>

        </FlowArt>
        <div aria-hidden style={{
          position: 'absolute', bottom: 0, width: '100%', height: 120,
          background: 'linear-gradient(to bottom, transparent, #0a0a0a)',
          pointerEvents: 'none', zIndex: 20,
        }} />
      </div>

      {/* ════ CTA ════════════════════════════════════════════════ */}
      <section style={{
        padding: 'clamp(100px,12vw,160px) clamp(20px,4vw,48px)',
        textAlign: 'center', position: 'relative', overflow: 'hidden', zIndex: 1,
      }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 75% 55% at 50% 50%, rgba(181,242,58,0.042) 0%, transparent 70%)',
        }} />
        {[600, 820, 1060].map((size, i) => (
          <div key={size} aria-hidden style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: size, height: size, pointerEvents: 'none',
          }}>
            <motion.div
              animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{ duration: 30 + i * 16, repeat: Infinity, ease: 'linear' }}
              style={{
                width: '100%', height: '100%', borderRadius: '50%',
                border: `1px dashed rgba(181,242,58,${0.07 - i * 0.018})`,
              }}
            />
          </div>
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>
          <FadeUp>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(181,242,58,0.55)', marginBottom: 20, textTransform: 'uppercase' }}>
              Free · No credit card
            </div>
            <h2 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: isMobile ? 'clamp(52px,14vw,80px)' : 'clamp(52px,7vw,96px)',
              fontWeight: 400, lineHeight: 0.95,
              letterSpacing: '0.01em', marginBottom: 24,
            }}>
              READY TO<br /><span style={{ color: '#b5f23a' }}>ACTUALLY FOCUS?</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 44, fontSize: isMobile ? 14 : 'clamp(14px,1.5vw,18px)', lineHeight: 1.65 }}>
              Join 2,400+ students building real focus — one session at a time.
            </p>
            <RippleButton
              className="l-btn-primary"
              style={{ fontSize: 16, padding: '15px 36px', margin: '0 auto' }}
              onClick={() => navigate(ctaTarget)}
            >
              {user ? 'Back to app' : 'Create your free account'}
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>→</span>
            </RippleButton>
            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', letterSpacing: '0.02em' }}>No credit card required.</p>
          </FadeUp>
        </div>
      </section>

      {/* ════ FOOTER ════════════════════════════════════════════ */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '24px clamp(20px,4vw,48px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
        fontSize: 12.5, color: 'var(--muted)', letterSpacing: '0.01em',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, color: '#b5f23a', animation: 'spin 8s linear infinite', display: 'inline-block' }}>⟳</span>
          <span>© 2026 FocusOS</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <a href="/privacy" className="l-footer-link">Privacy</a>
          <a href="/terms" className="l-footer-link">Terms</a>
          <a href="/support" className="l-footer-link">Support</a>
        </div>
      </div>

    </div>
  )
}
