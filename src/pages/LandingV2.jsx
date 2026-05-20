import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* ─── Mobile hook ──────────────────────────────────────────── */
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

/* ─── Particle Canvas ──────────────────────────────────────── */
function ParticleCanvas() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let raf
    let particles = []
    let mouseX = -9999
    let mouseY = -9999

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    function initParticles() {
      const count = Math.max(55, Math.floor((canvas.width * canvas.height) / 10500))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() * 1.6 + 0.5,
        a: Math.random() * 0.38 + 0.12,
      }))
    }

    function onMouseMove(e) {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x, dy = p.y - q.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 120) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(181,242,58,${(1 - d / 120) * 0.11})`
            ctx.lineWidth = 0.55
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.stroke()
          }
        }
      }

      for (const p of particles) {
        const cx = mouseX - p.x
        const cy = mouseY - p.y
        const cd = Math.sqrt(cx * cx + cy * cy)
        if (cd < 180 && cd > 0) {
          const force = ((180 - cd) / 180) * 0.012
          p.vx += (cx / cd) * force
          p.vy += (cy / cd) * force
        }
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (spd > 0.85) { p.vx = (p.vx / spd) * 0.85; p.vy = (p.vy / spd) * 0.85 }

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
    window.addEventListener('mousemove', onMouseMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <canvas ref={ref} style={{
      position: 'absolute', inset: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 1,
    }} />
  )
}

/* ─── Aurora background ────────────────────────────────────── */
function AuroraBg() {
  const reduced = useReducedMotion()
  const orbs = [
    { w: 900, h: 700, left: '-18%', top: '-12%', dur: 38, color: 'rgba(181,242,58,0.035)', ax: [0, 90, -40, 0], ay: [0, -70, 40, 0] },
    { w: 650, h: 650, left: '52%',  top: '-18%', dur: 31, color: 'rgba(96,211,248,0.02)',  ax: [0, -60, 50, 0], ay: [0, 60, -35, 0] },
    { w: 550, h: 550, left: '22%',  top: '52%',  dur: 44, color: 'rgba(168,85,247,0.016)', ax: [0, 55, -40, 0], ay: [0, -45, 30, 0] },
    { w: 420, h: 420, left: '68%',  top: '38%',  dur: 26, color: 'rgba(181,242,58,0.022)', ax: [0, -42, 58, 0], ay: [0, 48, -28, 0] },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {orbs.map((o, i) => (
        <motion.div key={i}
          style={{
            position: 'absolute', left: o.left, top: o.top,
            width: o.w, height: o.h, borderRadius: '50%',
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            filter: 'blur(90px)', willChange: 'transform',
          }}
          animate={reduced ? {} : { x: o.ax, y: o.ay }}
          transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/* ─── FadeUp reveal ────────────────────────────────────────── */
function FadeUp({ children, delay = 0, style = {}, className }) {
  const reduced = useReducedMotion()
  return (
    <motion.div className={className}
      initial={reduced ? {} : { opacity: 0, y: 32, filter: 'blur(5px)' }}
      whileInView={reduced ? {} : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-56px' }}
      transition={{ duration: 0.78, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  )
}

/* ─── Stat counter ─────────────────────────────────────────── */
function StatCounter({ value, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!inView) return
    if (reduced) { setCount(value); return }
    let current = 0
    const step = value / 55
    const timer = setInterval(() => {
      current += step
      if (current >= value) { setCount(value); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 30)
    return () => clearInterval(timer)
  }, [inView, value, reduced])

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

/* ─── Timer phone mockup ───────────────────────────────────── */
function TimerMockup() {
  const reduced = useReducedMotion()
  return (
    <motion.div
      style={{ width: '100%', maxWidth: 268, margin: '0 auto', willChange: 'transform' }}
      initial={{ opacity: 0, scale: 0.9, y: 24 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={reduced ? {} : { y: [0, -14, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div style={{
          background: 'rgba(255,255,255,0.045)',
          border: '1px solid rgba(255,255,255,0.11)',
          borderRadius: 38, padding: 4,
          boxShadow: '0 48px 96px rgba(0,0,0,0.68), 0 0 0 1px rgba(255,255,255,0.05), 0 0 80px rgba(181,242,58,0.07)',
        }}>
          <div style={{ background: '#0a0a0b', borderRadius: 34, overflow: 'hidden' }}>
            {/* Status bar */}
            <div style={{
              background: 'rgba(10,10,11,0.95)', padding: '14px 22px 8px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>9:41</span>
              <div style={{ width: 64, height: 15, background: '#0d0d0f', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em' }}>●●●</span>
            </div>
            {/* App nav */}
            <div style={{ padding: '6px 20px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, color: '#b5f23a', animation: 'spin 8s linear infinite', display: 'inline-block' }}>⟳</span>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '3px', color: 'white' }}>FOCUSOS</span>
              </div>
              <span style={{ fontSize: 8, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>2 / 3</span>
            </div>
            {/* Timer */}
            <div style={{ padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 164, height: 164, marginBottom: 14 }}>
                <svg width="164" height="164" viewBox="0 0 164 164">
                  <circle cx="82" cy="82" r="70" fill="none" stroke="#1a1a1e" strokeWidth="8" />
                  <circle cx="82" cy="82" r="70" fill="none" stroke="#b5f23a" strokeWidth="8"
                    strokeLinecap="round" strokeDasharray="440" strokeDashoffset="110"
                    transform="rotate(-90 82 82)">
                    <animate attributeName="stroke-dashoffset" values="440;110;440" dur="6s" repeatCount="indefinite"
                      calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" />
                  </circle>
                </svg>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 30, fontWeight: 700, color: 'white', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.03em' }}>28:34</div>
                  <div style={{ fontSize: 8, color: '#b5f23a', letterSpacing: '0.14em', marginTop: 2, fontWeight: 700 }}>FOCUS</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, width: '100%', marginBottom: 12 }}>
                {[['Streak','7 🔥'],['Today','42 min'],['Level','Flow ✦']].map(([label, val]) => (
                  <div key={label} style={{
                    background: '#111113', borderRadius: 10, padding: '8px 4px',
                    border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{val}</div>
                    <div style={{ fontSize: 8, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{
                background: '#b5f23a', borderRadius: 12,
                padding: '12px', textAlign: 'center',
                fontSize: 11, fontWeight: 800, color: '#0a0a0b',
                letterSpacing: '0.07em', width: '100%',
              }}>PAUSE SESSION</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Quiz mockup ──────────────────────────────────────────── */
function QuizMockup() {
  const [active, setActive] = useState(1)
  useEffect(() => {
    const t = setInterval(() => setActive(c => (c + 1) % 4), 1800)
    return () => clearInterval(t)
  }, [])
  const options = ['Mitosis', 'Meiosis', 'Osmosis', 'Photosynthesis']
  return (
    <motion.div
      style={{ width: '100%', maxWidth: 370, margin: '0 auto', willChange: 'transform' }}
      initial={{ opacity: 0, x: 44, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.88, ease: [0.22, 1, 0.36, 1] }}
    >
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, padding: 4,
        boxShadow: '0 32px 72px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
      }}>
        <div style={{ background: '#0d0d0f', borderRadius: 20, padding: '22px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#b5f23a', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Biology · Q3/10</span>
            <span style={{ fontSize: 9, color: 'var(--muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '3px 8px' }}>Spaced rep.</span>
          </div>
          <div style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, color: '#f0f0f2', lineHeight: 1.65, fontWeight: 500 }}>
              What process produces genetically diverse gametes through two rounds of cell division?
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {options.map((opt, i) => (
              <motion.div key={opt}
                animate={{
                  background: i === active ? 'rgba(181,242,58,0.11)' : 'rgba(255,255,255,0.025)',
                  borderColor: i === active ? 'rgba(181,242,58,0.4)' : 'rgba(255,255,255,0.07)',
                }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: `1.5px solid ${i === active ? '#b5f23a' : 'rgba(255,255,255,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i === active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#b5f23a' }} />}
                </div>
                <span style={{ fontSize: 12, color: i === active ? '#b5f23a' : '#f0f0f2', fontWeight: i === active ? 600 : 400 }}>{opt}</span>
              </motion.div>
            ))}
          </div>
          <div style={{ marginTop: 14, background: '#b5f23a', borderRadius: 10, padding: '11px', textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#0a0a0b', letterSpacing: '0.06em' }}>
            CONFIRM ANSWER
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Goals mockup ─────────────────────────────────────────── */
function GoalsMockup() {
  return (
    <motion.div
      style={{ width: '100%', maxWidth: 370, margin: '0 auto' }}
      initial={{ opacity: 0, x: -44, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.88, ease: [0.22, 1, 0.36, 1] }}
    >
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, padding: 4,
        boxShadow: '0 32px 72px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
      }}>
        <div style={{ background: '#0d0d0f', borderRadius: 20, padding: '22px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#b5f23a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>SAT Score Goal</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Current</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#f0f0f2', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.03em' }}>1240</div>
            </div>
            <div style={{ fontSize: 18, color: 'var(--muted)', paddingBottom: 8 }}>→</div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Target</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#b5f23a', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.03em' }}>1520</div>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>Progress toward goal</span>
              <span style={{ fontSize: 10, color: '#b5f23a', fontWeight: 700 }}>47%</span>
            </div>
            <div style={{ background: '#1a1a1e', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', background: 'linear-gradient(90deg, #b5f23a, #e8ff9e)', borderRadius: 4 }}
                initial={{ width: '0%' }}
                whileInView={{ width: '47%' }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
              />
            </div>
          </div>
          {[
            { s: 'Math: Algebra', h: '3.2 hrs/wk', done: true },
            { s: 'Reading: Evidence', h: '2.0 hrs/wk', done: false },
            { s: 'Writing: Grammar', h: '1.5 hrs/wk', done: false },
          ].map(({ s, h, done }) => (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', borderRadius: 8, marginBottom: 6,
              background: done ? 'rgba(181,242,58,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${done ? 'rgba(181,242,58,0.18)' : 'rgba(255,255,255,0.05)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  background: done ? '#b5f23a' : 'rgba(255,255,255,0.08)',
                  border: done ? 'none' : '1.5px solid rgba(255,255,255,0.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, color: '#0a0a0b', fontWeight: 800,
                }}>{done && '✓'}</div>
                <span style={{ fontSize: 11, color: done ? '#b5f23a' : '#f0f0f2' }}>{s}</span>
              </div>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>{h}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Landing V2 ───────────────────────────────────────────── */
export default function LandingV2() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const reduced = useReducedMotion()
  const isMobile = useIsMobile()

  useEffect(() => { const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t) }, [])

  const ctaTarget = user ? '/timer' : '/signup'

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  const featureGridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: isMobile ? 48 : 'clamp(40px, 6vw, 80px)',
    alignItems: 'center',
  }

  return (
    <div style={{
      background: '#0a0a0b', color: '#f0f0f2',
      fontFamily: "'Outfit', sans-serif",
      opacity: mounted ? 1 : 0,
      transition: 'opacity 0.6s ease',
      overflowX: 'hidden',
    }}>

      {/* ════ HERO ══════════════════════════════════════════════ */}
      <section style={{ position: 'relative', minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AuroraBg />
        <ParticleCanvas />

        {/* Thin line grid — more premium than dots */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, black 0%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, black 0%, transparent 72%)',
        }} />

        {/* Film grain */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='512' height='512' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat', backgroundSize: '180px 180px',
        }} />

        {/* Horizontal scan line */}
        <div className="hero-scan-line" aria-hidden />

        {/* Nav */}
        <nav style={{ position: 'relative', zIndex: 10, padding: 'clamp(16px,2.5vw,24px) clamp(16px,3vw,40px) 0' }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(10,10,11,0.68)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 50, padding: '0 6px 0 20px', height: 52,
              maxWidth: 1100, margin: '0 auto',
              boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 8px 32px rgba(0,0,0,0.32)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22, color: '#b5f23a', display: 'inline-block', lineHeight: 1, fontWeight: 300, animation: 'spin 8s linear infinite' }}>⟳</span>
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
              <button onClick={() => navigate(ctaTarget)}
                style={{
                  background: '#b5f23a', color: '#0a0a0b',
                  border: 'none', borderRadius: 40,
                  padding: '9px 20px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                  transition: 'transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.18s cubic-bezier(0.22,1,0.36,1)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.3) inset',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.3) inset, 0 6px 20px rgba(181,242,58,0.28)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.3) inset' }}
              >
                {user ? 'Open app' : 'Get started'}
              </button>
            </div>
          </motion.div>
        </nav>

        {/* Hero body */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(40px,6vw,80px) clamp(20px,4vw,56px)',
          position: 'relative', zIndex: 10,
          textAlign: 'center', maxWidth: 1100, margin: '0 auto', width: '100%',
        }}>

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.58, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(181,242,58,0.08)',
              border: '1px solid rgba(181,242,58,0.2)',
              borderRadius: 50, padding: '6px 16px 6px 10px',
              fontSize: 11, fontWeight: 600,
              color: 'rgba(181,242,58,0.88)', letterSpacing: '0.06em',
              marginBottom: 32,
            }}
          >
            <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#b5f23a', flexShrink: 0 }} />
            AI-powered · Built on peer-reviewed research
          </motion.div>

          {/* Headline line 1 — slides from below (clip) */}
          <div style={{ overflow: 'hidden', marginBottom: 2 }}>
            <motion.h1
              initial={{ y: 130, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: isMobile ? 'clamp(64px,18vw,96px)' : 'clamp(80px,12vw,156px)',
                fontWeight: 400, lineHeight: 0.92,
                letterSpacing: '0.01em', color: '#f0f0f2', margin: 0,
              }}
            >STUDY SMARTER.</motion.h1>
          </div>
          <div style={{ overflow: 'hidden', marginBottom: 36 }}>
            <motion.h1
              initial={{ y: 130, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.52, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: isMobile ? 'clamp(64px,18vw,96px)' : 'clamp(80px,12vw,156px)',
                fontWeight: 400, lineHeight: 0.92,
                letterSpacing: '0.01em', color: '#b5f23a', margin: 0,
              }}
            >FOCUS LONGER.</motion.h1>
          </div>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.74, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: isMobile ? 15 : 'clamp(15px,1.6vw,19px)',
              color: 'rgba(255,255,255,0.5)',
              maxWidth: 500, lineHeight: 1.72, marginBottom: 44,
              letterSpacing: '-0.01em',
            }}
          >
            FocusOS adapts to your real attention span — not a generic timer.
            Backed by 242 peer-reviewed studies on how humans actually learn.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.92, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', width: isMobile ? '100%' : 'auto' }}
          >
            <button className="l-btn-primary" onClick={() => navigate(ctaTarget)} style={{ fontSize: 15, width: isMobile ? '100%' : 'auto' }}>
              {user ? 'Back to app' : 'Start for free'}
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>→</span>
            </button>
            <button className="l-btn-outline" onClick={() => document.getElementById('v2-features')?.scrollIntoView({ behavior: 'smooth' })} style={{ fontSize: 15, width: isMobile ? '100%' : 'auto' }}>
              Explore features <span style={{ opacity: 0.6 }}>↓</span>
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            style={{ marginTop: 52, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
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
                  width: 30, height: 30, borderRadius: '50%',
                  background: bg,
                  border: '2px solid #0a0a0b',
                  marginLeft: i > 0 ? -9 : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: c,
                  letterSpacing: '0.04em',
                  boxShadow: `0 0 0 1px ${c}22, inset 0 1px 0 ${c}18`,
                }}>
                  {init}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.01em' }}>
              Trusted by 2,400+ students
            </span>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
        >
          <motion.div
            animate={reduced ? {} : { y: [0, 10, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: 18, color: 'rgba(255,255,255,0.2)', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => document.getElementById('v2-stats')?.scrollIntoView({ behavior: 'smooth' })}
          >↓</motion.div>
        </motion.div>
      </section>

      {/* ════ STATS ═════════════════════════════════════════════ */}
      <section id="v2-stats" style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#0d0d0f',
        padding: 'clamp(48px,6vw,72px) clamp(20px,4vw,56px)',
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? 40 : 'clamp(24px,5vw,64px)',
        }}>
          {[
            { value: 2400, suffix: '+', prefix: '', label: 'Active students', sub: 'and growing' },
            { value: 8,    suffix: ' min', prefix: '+', label: 'Avg focus gain', sub: 'in your first week' },
            { value: 242,  suffix: '',     prefix: '', label: 'Studies analyzed', sub: 'powering our algorithm' },
          ].map(({ value, suffix, prefix, label, sub }, i) => (
            <FadeUp key={i} delay={i * 110}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: isMobile ? 56 : 'clamp(44px,5.5vw,68px)',
                  fontWeight: 400, color: '#b5f23a', lineHeight: 1,
                  marginBottom: 10, letterSpacing: '0.02em',
                }}>
                  <StatCounter value={value} suffix={suffix} prefix={prefix} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f2', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ════ FEATURES ══════════════════════════════════════════ */}
      <div id="v2-features">

        {/* — Timer — */}
        <section style={{ padding: 'clamp(80px,9vw,128px) clamp(20px,4vw,56px)', position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden style={{
            position: 'absolute', right: '-8%', top: '15%', width: 520, height: 520, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(181,242,58,0.04) 0%, transparent 70%)', pointerEvents: 'none',
          }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', ...featureGridStyle }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <TimerMockup />
            </div>
            <div>
              <FadeUp>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#b5f23a', marginBottom: 14, textTransform: 'uppercase' }}>Focus Timer</div>
                <h2 style={{ fontSize: isMobile ? 28 : 'clamp(28px,3.6vw,48px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 18 }}>
                  A timer that learns<br /><span style={{ color: '#b5f23a' }}>how you think.</span>
                </h2>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, marginBottom: 28, maxWidth: 440 }}>
                  Set your real attention span — 10 minutes, 8 minutes, whatever it actually is.
                  FocusOS builds it up session by session with science-backed progression.
                </p>
              </FadeUp>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: '◎', title: 'Adaptive pacing', desc: 'Grows with every session you complete' },
                  { icon: '♪', title: 'Brown noise & focus sounds', desc: 'Auditory neuroscience tuned for deep work' },
                  { icon: '↑', title: '5 focus levels', desc: 'Scattered → Flow State — real measurable progress' },
                  { icon: '✦', title: 'Streak & XP system', desc: 'Habit science keeps you coming back daily' },
                ].map(({ icon, title, desc }, i) => (
                  <FadeUp key={title} delay={i * 70 + 180}>
                    <div style={{
                      display: 'flex', gap: 14, alignItems: 'flex-start',
                      background: 'rgba(255,255,255,0.022)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderLeft: '2px solid rgba(181,242,58,0.42)',
                      borderRadius: 12, padding: '12px 14px',
                    }}>
                      <span style={{ color: '#b5f23a', fontSize: 15, flexShrink: 0, marginTop: 1, lineHeight: 1 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f0f0f2', marginBottom: 3 }}>{title}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</div>
                      </div>
                    </div>
                  </FadeUp>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', maxWidth: 1100, margin: '0 auto' }} />

        {/* — Quiz — */}
        <section style={{ padding: 'clamp(80px,9vw,128px) clamp(20px,4vw,56px)', background: '#0d0d0f', position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden style={{
            position: 'absolute', left: '-8%', bottom: '10%', width: 520, height: 520, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(96,211,248,0.028) 0%, transparent 70%)', pointerEvents: 'none',
          }} />
          <div style={{
            maxWidth: 1100, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 48 : 'clamp(40px,6vw,80px)',
            alignItems: 'center',
          }}>
            {/* Text first on mobile (natural order), mockup second */}
            <div>
              <FadeUp>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#b5f23a', marginBottom: 14, textTransform: 'uppercase' }}>AI Quiz</div>
                <h2 style={{ fontSize: isMobile ? 28 : 'clamp(28px,3.6vw,48px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 18 }}>
                  Paste your notes.<br /><span style={{ color: '#b5f23a' }}>Get quizzed instantly.</span>
                </h2>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, marginBottom: 28, maxWidth: 440 }}>
                  Claude AI turns your notes into 5 question types — MCQ, short answer,
                  true/false, cloze deletion, and spaced repetition cards — in seconds.
                </p>
              </FadeUp>
              <FadeUp delay={180}>
                <div style={{
                  background: 'rgba(181,242,58,0.05)', border: '1px solid rgba(181,242,58,0.13)',
                  borderRadius: 12, padding: '14px 18px',
                  fontSize: 12.5, color: 'rgba(181,242,58,0.72)',
                  fontStyle: 'italic', lineHeight: 1.7, maxWidth: 420,
                }}>
                  "Practice testing is the #1 most effective study technique across 242 analyzed studies." — Dunlosky et al., 2013
                </div>
              </FadeUp>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <QuizMockup />
            </div>
          </div>
        </section>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', maxWidth: 1100, margin: '0 auto' }} />

        {/* — Goals — */}
        <section style={{ padding: 'clamp(80px,9vw,128px) clamp(20px,4vw,56px)', position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden style={{
            position: 'absolute', right: '-5%', bottom: '15%', width: 440, height: 440, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.025) 0%, transparent 70%)', pointerEvents: 'none',
          }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', ...featureGridStyle }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoalsMockup />
            </div>
            <div>
              <FadeUp>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#b5f23a', marginBottom: 14, textTransform: 'uppercase' }}>Score Goals</div>
                <h2 style={{ fontSize: isMobile ? 28 : 'clamp(28px,3.6vw,48px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 18 }}>
                  Set your target score.<br /><span style={{ color: '#b5f23a' }}>Get a real plan.</span>
                </h2>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, marginBottom: 28, maxWidth: 440 }}>
                  Enter your SAT, ACT, or AP target. FocusOS builds a backwards
                  study plan anchored to your test date — with weekly hour allocations per subject.
                </p>
              </FadeUp>
              <FadeUp delay={180}>
                <div style={{
                  background: 'rgba(181,242,58,0.05)', border: '1px solid rgba(181,242,58,0.13)',
                  borderRadius: 12, padding: '14px 18px',
                  fontSize: 12.5, color: 'rgba(181,242,58,0.72)',
                  fontStyle: 'italic', lineHeight: 1.7, maxWidth: 420,
                }}>
                  "Implementation intentions increase follow-through by 3×." — Gollwitzer, 1999
                </div>
              </FadeUp>
            </div>
          </div>
        </section>
      </div>

      {/* ════ THE SCIENCE ═══════════════════════════════════════ */}
      <section style={{
        background: '#050506',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: 'clamp(80px,10vw,140px) clamp(20px,4vw,56px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Giant watermark */}
        <div aria-hidden style={{
          position: 'absolute', bottom: -60, right: -20,
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(100px,18vw,240px)',
          color: '#b5f23a', opacity: 0.022, lineHeight: 1,
          pointerEvents: 'none', userSelect: 'none', letterSpacing: '0.01em',
        }}>FOCUS</div>

        <div style={{ maxWidth: 880, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <FadeUp>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#b5f23a', marginBottom: 18, textTransform: 'uppercase' }}>The Method</div>
            <h2 style={{ fontSize: isMobile ? 30 : 'clamp(32px,4.5vw,56px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 20, maxWidth: 640 }}>
              Not another Pomodoro app.
            </h2>
            <p style={{ fontSize: isMobile ? 15 : 'clamp(15px,1.5vw,18px)', color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, maxWidth: 600, marginBottom: 56, letterSpacing: '-0.005em' }}>
              Generic timers assume 25 minutes works for everyone. Research shows attention spans
              vary widely and can be trained. FocusOS starts where you actually are.
            </p>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { stat: '25 min', label: 'Pomodoro assumes', note: 'Same for everyone', accent: '#f25a5a' },
              { stat: '8–30 min', label: 'Actual range varies', note: 'Ariga & Lleras, 2011', accent: '#b5f23a' },
              { stat: '3.2×', label: 'Better retention', note: 'Active recall vs rereading', accent: '#b5f23a' },
              { stat: '3×', label: 'More follow-through', note: 'With implementation intentions', accent: '#b5f23a' },
            ].map(({ stat, label, note, accent }, i) => (
              <FadeUp key={i} delay={i * 90}>
                <div style={{
                  background: `rgba(${accent === '#f25a5a' ? '242,90,90' : '181,242,58'},0.04)`,
                  border: `1px solid rgba(${accent === '#f25a5a' ? '242,90,90' : '181,242,58'},0.11)`,
                  borderRadius: 16, padding: '20px 18px',
                }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: isMobile ? 32 : 'clamp(28px,3vw,40px)', fontWeight: 400, color: accent, lineHeight: 1, marginBottom: 8, letterSpacing: '0.02em' }}>{stat}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f2', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{note}</div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ════ FEATURE MARQUEE ═══════════════════════════════════ */}
      <section style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 0', overflow: 'hidden',
        maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'lMarquee 22s linear infinite' }}>
          {[0, 1].map(idx => (
            <span key={idx} style={{ display: 'inline-flex' }}>
              {['Adaptive pacing','AI quiz generation','Spaced repetition','Brown noise','Score goal tracker','Focus levels','Streak system','Study rooms','Active recall','Session analytics'].map((text, j) => (
                <span key={j} style={{ padding: '0 6px', fontSize: 12, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.01em' }}>
                  {text}<span style={{ margin: '0 14px', color: 'rgba(181,242,58,0.4)', fontSize: 8 }}>◆</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </section>

      {/* ════ CTA ════════════════════════════════════════════════ */}
      <section style={{
        padding: 'clamp(100px,12vw,160px) clamp(20px,4vw,48px)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Radial glow */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 75% 55% at 50% 50%, rgba(181,242,58,0.042) 0%, transparent 70%)',
        }} />
        {/* Orbital rings */}
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
              Join students building real focus — one session at a time.
            </p>
            <button
              className="l-btn-primary"
              style={{ fontSize: 16, padding: '15px 36px' }}
              onClick={() => navigate(ctaTarget)}
            >
              {user ? 'Back to app' : 'Create your free account'}
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>→</span>
            </button>
            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', letterSpacing: '0.02em' }}>No credit card required.</p>
          </FadeUp>
        </div>
      </section>

      {/* ════ FOOTER ════════════════════════════════════════════ */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.055)',
        padding: '24px clamp(20px,4vw,48px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
        fontSize: 12.5, color: 'var(--muted)', letterSpacing: '0.01em',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, color: '#b5f23a', animation: 'spin 8s linear infinite', display: 'inline-block' }}>⟳</span>
          <span>© 2026 FocusOS · Myan Patel · Westford Academy</span>
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
