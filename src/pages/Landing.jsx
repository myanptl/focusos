import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* ─── Particle Canvas ─────────────────────────────────────────── */
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
      // Slightly higher density
      const count = Math.max(60, Math.floor((canvas.width * canvas.height) / 10000))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.6,
        a: Math.random() * 0.45 + 0.15,
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
        // Drift toward cursor
        const cx = mouseX - p.x
        const cy = mouseY - p.y
        const cd = Math.sqrt(cx * cx + cy * cy)
        if (cd < 200 && cd > 0) {
          const force = ((200 - cd) / 200) * 0.013
          p.vx += (cx / cd) * force
          p.vy += (cy / cd) * force
        }
        // Speed cap so they drift, not rush
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (spd > 0.9) { p.vx = (p.vx / spd) * 0.9; p.vy = (p.vy / spd) * 0.9 }

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

/* ─── Drifting Lime Orbs ──────────────────────────────────────── */
function OrbBackground() {
  const reduced = useReducedMotion()

  const orbs = [
    { w: 660, h: 580, left: '-12%', top:  '0%',  dur: 22, ax: [0, 65, -30, 0], ay: [0, -55, 35, 0], op: 0.045 },
    { w: 500, h: 500, left:  '58%', top: '-10%',  dur: 28, ax: [0, -45, 55, 0], ay: [0, 48, -28, 0], op: 0.035 },
    { w: 380, h: 380, left:  '28%', top:  '58%',  dur: 24, ax: [0, 38, -50, 0], ay: [0, -38, 22, 0], op: 0.028 },
  ]

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="drift-orb"
          style={{
            position: 'absolute',
            left: orb.left, top: orb.top,
            width: orb.w, height: orb.h,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(181,242,58,${orb.op}) 0%, transparent 72%)`,
            filter: 'blur(52px)',
            willChange: 'transform',
          }}
          animate={reduced ? {} : { x: orb.ax, y: orb.ay }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/* ─── Reveal — framer whileInView + GSAP ScrollTrigger ──────────── */
function Reveal({ children, delay = 0, style = {}, fromY = 44, className }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? {} : { opacity: 0, y: fromY }}
      whileInView={reduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.68, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  )
}

/* ─── Feature Card ────────────────────────────────────────────── */
function FeatureCard({ title, desc, stat, index, heroArt }) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 48 }}
      whileInView={reduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.65, delay: index * 0.11, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduced ? {} : { y: -6, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
      style={{
        flex: 1, minWidth: 240,
        background: '#111113',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTop: '2px solid #b5f23a',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        cursor: 'default', willChange: 'transform',
        transition: 'box-shadow 0.22s ease',
      }}
    >
      {/* SVG art header */}
      {heroArt && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {heroArt}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '22px 26px 28px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: '#f0f0f2' }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 20 }}>{desc}</div>
        <div style={{
          fontSize: 11.5, color: '#b5f23a', lineHeight: 1.55,
          background: 'rgba(181,242,58,0.07)', border: '1px solid rgba(181,242,58,0.14)',
          borderRadius: 8, padding: '8px 12px',
        }}>{stat}</div>
      </div>
    </motion.div>
  )
}

/* ─── Ripple Button ───────────────────────────────────────────── */
function RippleButton({ className, style, onClick, children }) {
  const [ripples, setRipples] = useState([])

  const handleClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples(prev => [...prev, { x, y, id }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700)
    onClick?.(e)
  }, [onClick])

  return (
    <button
      className={className}
      style={{ ...style, position: 'relative', overflow: 'hidden' }}
      onClick={handleClick}
    >
      {children}
      <AnimatePresence>
        {ripples.map(r => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.45 }}
            animate={{ scale: 5.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: r.x - 20, top: r.y - 20,
              width: 40, height: 40,
              borderRadius: '50%',
              background: 'rgba(10,10,11,0.35)',
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>
    </button>
  )
}

/* ─── Browser Mockup ──────────────────────────────────────────── */
function BrowserMockup() {
  const reduced = useReducedMotion()
  return (
    <motion.div
      style={{ width: '100%', maxWidth: 500, willChange: 'transform' }}
      initial={{ opacity: 0, scale: 0.82 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: reduced ? 0 : [0, -12, 0],
      }}
      transition={{
        opacity: { duration: 0.75, delay: 0.9 },
        scale:   { duration: 0.8,  delay: 0.9, ease: [0.22, 1, 0.36, 1] },
        y:       { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.8 },
      }}
    >
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
          }}>focusos.live/timer</div>
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
    </motion.div>
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

/* ─── Feature Card Art ─────────────────────────────────────────── */
function TimerCardArt() {
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = ((i * 6) - 90) * Math.PI / 180
    const big = i % 5 === 0
    const r1 = 82, r2 = big ? 72 : 77
    return { x1: 90 + r1 * Math.cos(a), y1: 90 + r1 * Math.sin(a), x2: 90 + r2 * Math.cos(a), y2: 90 + r2 * Math.sin(a), big }
  })
  return (
    <div style={{
      height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 70% at 50% 55%, rgba(181,242,58,0.05) 0%, transparent 70%)',
      position: 'relative',
    }}>
      <svg viewBox="0 0 180 180" width="176" height="176">
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.big ? 'rgba(181,242,58,0.28)' : 'rgba(255,255,255,0.07)'}
            strokeWidth={t.big ? 1.8 : 0.9} strokeLinecap="round"/>
        ))}
        <circle cx="90" cy="90" r="64" fill="none" stroke="#1c1c20" strokeWidth="9"/>
        <circle cx="90" cy="90" r="64" fill="none" stroke="#b5f23a" strokeWidth="9"
          strokeLinecap="round" strokeDasharray="402" transform="rotate(-90 90 90)">
          <animate attributeName="stroke-dashoffset" values="402;52;402" dur="5s" repeatCount="indefinite"
            calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"/>
        </circle>
        <circle cx="90" cy="90" r="52" fill="none" stroke="rgba(181,242,58,0.05)" strokeWidth="12"/>
        <text x="90" y="85" textAnchor="middle" fill="white" fontSize="26" fontWeight="800"
          fontFamily="'JetBrains Mono',monospace" letterSpacing="-1">25:00</text>
        <text x="90" y="103" textAnchor="middle" fill="rgba(181,242,58,0.65)" fontSize="10"
          fontWeight="700" letterSpacing="4">FOCUS</text>
      </svg>
    </div>
  )
}

function QuizCardArt() {
  const qmarks = [
    { x: 18, y: 46, s: 28, dur: '3s',   del: '0s'   },
    { x: 150, y: 38, s: 20, dur: '2.7s', del: '0.9s' },
    { x: 12,  y: 152, s: 16, dur: '3.4s', del: '0.5s' },
    { x: 158, y: 158, s: 22, dur: '2.9s', del: '1.3s' },
    { x: 82,  y: 16,  s: 13, dur: '3.1s', del: '0.7s' },
  ]
  const lines = [
    [100,70,100,46],[129,80,150,62],[135,112,160,112],
    [71,80,50,62],[65,112,40,112],[100,132,100,156],
  ]
  return (
    <div style={{
      height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 70% at 50% 55%, rgba(181,242,58,0.05) 0%, transparent 70%)',
      position: 'relative', overflow: 'hidden',
    }}>
      <svg viewBox="0 0 200 200" width="200" height="200">
        {qmarks.map((q, i) => (
          <text key={i} x={q.x} y={q.y} fontSize={q.s} fill="rgba(181,242,58,0.11)"
            fontWeight="900" fontFamily="'DM Sans',sans-serif">?
            <animate attributeName="opacity" values="0.06;0.32;0.06" dur={q.dur} begin={q.del} repeatCount="indefinite"/>
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-9;0,0" dur={q.dur} begin={q.del} repeatCount="indefinite"/>
          </text>
        ))}
        <circle cx="100" cy="100" r="46" fill="rgba(181,242,58,0.04)" stroke="rgba(181,242,58,0.12)" strokeWidth="1.5">
          <animate attributeName="r" values="44;50;44" dur="3s" repeatCount="indefinite"/>
        </circle>
        <circle cx="100" cy="100" r="30" fill="rgba(181,242,58,0.07)" stroke="rgba(181,242,58,0.22)" strokeWidth="1.5">
          <animate attributeName="r" values="28;33;28" dur="3s" repeatCount="indefinite"/>
        </circle>
        {lines.map(([x1,y1,x2,y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(181,242,58,0.16)" strokeWidth="1" strokeDasharray="3 2">
            <animate attributeName="opacity" values="0.2;0.65;0.2" dur={`${2.3+i*0.2}s`} repeatCount="indefinite"/>
          </line>
        ))}
        <text x="100" y="113" textAnchor="middle" fontSize="34" fontWeight="900"
          fill="#b5f23a" fontFamily="'DM Sans',sans-serif">?</text>
      </svg>
    </div>
  )
}

function GoalCardArt() {
  return (
    <div style={{
      height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 70% at 50% 55%, rgba(181,242,58,0.05) 0%, transparent 70%)',
      position: 'relative',
    }}>
      <svg viewBox="0 0 200 200" width="200" height="200">
        <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5"/>
        <circle cx="100" cy="100" r="56" fill="none" stroke="rgba(181,242,58,0.09)" strokeWidth="1.5"/>
        <circle cx="100" cy="100" r="34" fill="none" stroke="rgba(181,242,58,0.17)" strokeWidth="1.5"/>
        {/* Bullseye pulse */}
        <circle cx="100" cy="100" r="14" fill="rgba(181,242,58,0.12)" stroke="#b5f23a" strokeWidth="2">
          <animate attributeName="r" values="12;17;12" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2.2s" repeatCount="indefinite"/>
        </circle>
        {/* Arrow flies in, holds, retreats */}
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="72,0; 0,0; 0,0; 72,0"
            keyTimes="0; 0.3; 0.68; 1"
            dur="3.4s" repeatCount="indefinite" calcMode="spline"
            keySplines="0.4 0 0.15 1; 1 0 1 0; 0.55 0 1 1"/>
          <line x1="184" y1="100" x2="118" y2="100" stroke="#b5f23a" strokeWidth="2.5" strokeLinecap="round"/>
          <polygon points="118,96.5 112,100 118,103.5" fill="#b5f23a"/>
        </g>
        {/* Score pop */}
        <g>
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.27;0.38;0.66;0.76" dur="3.4s" repeatCount="indefinite"/>
          <rect x="118" y="62" width="48" height="22" rx="5"
            fill="rgba(181,242,58,0.14)" stroke="rgba(181,242,58,0.4)" strokeWidth="1"/>
          <text x="142" y="77" textAnchor="middle" fill="#b5f23a" fontSize="11"
            fontWeight="800" fontFamily="'DM Sans',sans-serif">GOAL ✓</text>
        </g>
      </svg>
    </div>
  )
}

/* ─── Step Card (hover dashed border + watermark) ───────────────── */
function StepCard({ num, title, desc, i }) {
  const [hov, setHov] = useState(false)
  return (
    <Reveal delay={i * 100} style={{ flex: 1, minWidth: 220 }}>
      <div
        style={{
          background: '#111113', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '20px 22px',
          position: 'relative', overflow: 'hidden', cursor: 'default',
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        {/* Marching-ants border — visible on hover, clipped by card border-radius via overflow:hidden */}
        <svg aria-hidden style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', opacity: hov ? 1 : 0, transition: 'opacity 0.22s ease',
        }} viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect x="0.9" y="0.9" width="98.2" height="98.2" rx="0" fill="none"
            stroke="rgba(181,242,58,0.45)" strokeWidth="0.85" strokeDasharray="5 3">
            <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.1s" repeatCount="indefinite"/>
          </rect>
        </svg>

        {/* Faint watermark number */}
        <div aria-hidden style={{
          position: 'absolute', bottom: -28, right: -2,
          fontSize: 150, fontWeight: 900, fontFamily: "'Bebas Neue', sans-serif",
          color: '#b5f23a', opacity: 0.04, lineHeight: 1,
          pointerEvents: 'none', userSelect: 'none',
        }}>{num}</div>

        {/* Content */}
        <div style={{ fontSize: 11, color: '#b5f23a', fontWeight: 700, letterSpacing: '0.07em', marginBottom: 8, position: 'relative', zIndex: 1 }}>
          STEP {num}
        </div>
        <div style={{ fontWeight: 700, marginBottom: 8, position: 'relative', zIndex: 1 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, position: 'relative', zIndex: 1 }}>{desc}</div>
      </div>
    </Reveal>
  )
}

/* ─── Landing ─────────────────────────────────────────────────── */
export default function Landing() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => { const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t) }, [])
  useEffect(() => { if (!loading && user) navigate('/timer', { replace: true }) }, [user, loading, navigate])

  // GSAP ScrollTrigger — parallax on hero glow + section depth
  useEffect(() => {
    if (reduced) return

    const ctx = gsap.context(() => {
      // Hero radial glow slow parallax upward
      gsap.to('.hero-glow-parallax', {
        y: -100,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: 1.5,
        },
      })

      // Each scroll-section slides up slightly on enter
      gsap.utils.toArray('.scroll-section').forEach(el => {
        gsap.fromTo(el,
          { y: 30 },
          {
            y: 0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              end: 'top 55%',
              scrub: 0.8,
            },
          }
        )
      })
    })

    return () => ctx.revert()
  }, [reduced])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )
  if (user) return null

  return (
    <>
      <div style={{
        background: '#0a0a0b', color: '#f0f0f2',
        fontFamily: "'DM Sans', sans-serif",
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.5s ease',
        overflowX: 'hidden',
      }}>

        {/* ════ HERO ════════════════════════════════════════════════ */}
        <section className="hero-section" style={{
          position: 'relative', height: '100vh', minHeight: 600,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Drifting orbs */}
          <OrbBackground />

          {/* Particle network */}
          <ParticleCanvas />

          {/* Grain texture overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
            opacity: 0.04,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='512' height='512' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat', backgroundSize: '200px 200px',
          }} />

          {/* watermark ⟳ */}
          <span style={{
            position: 'absolute', top: '50%', right: '-150px',
            transform: 'translateY(-50%)',
            fontSize: 480, color: '#b5f23a', opacity: 0.04,
            animation: 'spin-slow 60s linear infinite',
            lineHeight: 1, fontWeight: 300,
            pointerEvents: 'none', userSelect: 'none', zIndex: 1,
          }}>⟳</span>

          {/* Radial glow (parallax target) */}
          <div className="hero-glow-parallax" style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
            background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(181,242,58,0.07) 0%, transparent 70%)',
          }} />

          {/* Nav */}
          <nav style={{
            position: 'relative', zIndex: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0 clamp(24px, 4vw, 56px)', height: 64,
          }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span style={{
                fontSize: 24, color: '#b5f23a',
                display: 'inline-block',
                animation: 'spin-slow 8s linear infinite',
                lineHeight: 1, fontWeight: 300,
              }}>⟳</span>
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '4px', color: 'white' }}>
                FOCUSOS
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <button className="l-btn-outline-sm" onClick={() => navigate('/login')}>
                Sign In
              </button>
            </motion.div>
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
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
                style={{
                  display: 'inline-block',
                  background: 'rgba(181,242,58,0.09)', border: '1px solid rgba(181,242,58,0.22)',
                  borderRadius: 24, padding: '5px 16px',
                  fontSize: 11.5, fontWeight: 700, color: '#b5f23a',
                  letterSpacing: '0.08em', marginBottom: 30,
                }}
              >
                FOCUS · LEARN · IMPROVE
              </motion.div>

              {/* Headline line 1 — slides from LEFT */}
              <motion.h1
                initial={{ opacity: 0, x: -80 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.75, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontSize: 'clamp(40px, 5.5vw, 76px)', fontWeight: 800,
                  lineHeight: 1.04, letterSpacing: '-0.02em',
                  margin: '0 0 4px',
                }}
              >
                Study smarter.
              </motion.h1>

              {/* Headline line 2 — slides from RIGHT */}
              <motion.h1
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.75, delay: 0.52, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontSize: 'clamp(40px, 5.5vw, 76px)', fontWeight: 800,
                  lineHeight: 1.04, letterSpacing: '-0.02em',
                  margin: '0 0 28px', color: '#b5f23a',
                }}
              >
                Focus longer.
              </motion.h1>

              {/* Subhead */}
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.82, ease: 'easeOut' }}
                style={{
                  fontSize: 'clamp(14px, 1.5vw, 18px)', color: 'var(--muted)',
                  maxWidth: 440, lineHeight: 1.7, marginBottom: 40,
                }}
              >
                FocusOS adapts to your real attention span — not a generic 25-minute timer.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0, ease: 'easeOut' }}
                style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}
              >
                <RippleButton className="l-btn-primary" onClick={() => navigate('/login')}>
                  Start for Free →
                </RippleButton>
                <button className="l-btn-outline"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                  See how it works
                </button>
              </motion.div>
            </div>

            {/* Right: browser mockup (hidden on mobile) */}
            <div className="hide-mobile" style={{
              flexShrink: 0, width: 'clamp(300px, 38vw, 480px)',
            }}>
              <BrowserMockup />
            </div>
          </div>

          {/* Scroll caret */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.6 }}
            style={{
              position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
              zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', fontWeight: 600 }}>SCROLL</span>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', display: 'block', animation: 'lBounce 1.8s ease infinite' }}>↓</span>
          </motion.div>
        </section>

        {/* ════ SOCIAL PROOF MARQUEE ════════════════════════════════ */}
        <section style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '14px 0', overflow: 'hidden',
          // Wider gradient fade on both edges
          maskImage: 'linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)',
        }}>
          <div style={{
            display: 'flex', whiteSpace: 'nowrap',
            animation: 'lMarquee 16s linear infinite', // faster: was 28s
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
        <section id="features" className="scroll-section" style={{ padding: 'clamp(64px, 8vw, 110px) clamp(20px, 4vw, 48px)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <Reveal style={{ textAlign: 'center', marginBottom: 60 }}>
              <div className="label" style={{ color: '#b5f23a', marginBottom: 12 }}>What you get</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.015em' }}>
                Everything you need to<br />actually study.
              </h2>
            </Reveal>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <FeatureCard index={0} heroArt={<TimerCardArt />} title="Adaptive Focus Timer"
                desc="Starts at YOUR attention span. Grows with every session. No arbitrary 25-minute assumption baked in."
                stat="Avg user improves by 8 min in their first week" />
              <FeatureCard index={1} heroArt={<QuizCardArt />} title="AI Quiz Generator"
                desc="Paste your notes. Claude AI instantly generates active recall questions across 5 question types — multiple choice, fill-in, explain, and more."
                stat="Practice testing = #1 study technique [Dunlosky, 2013]" />
              <FeatureCard index={2} heroArt={<GoalCardArt />} title="Score Goal Tracker"
                desc="Set your SAT, ACT, or AP target. Get a backwards study plan anchored to your test date."
                stat="Implementation intentions increase follow-through 3× [Gollwitzer, 1999]" />
            </div>
          </div>
        </section>

        {/* ════ HOW IT WORKS ════════════════════════════════════════ */}
        <section className="scroll-section" style={{
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
                      margin: '0 auto 14px', position: 'relative', zIndex: 1,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f2' }}>{label}</div>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* Step detail cards */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <StepCard i={0} num={1} title="Set your baseline"
                desc="Tell us how long you can actually focus right now. FocusOS sets your first timer to match — not 25 minutes." />
              <StepCard i={1} num={2} title="Focus and grow"
                desc="Complete sessions. Your timer gradually extends as you build real focus capacity. Science-backed progression." />
              <StepCard i={2} num={3} title="Quiz yourself"
                desc="Paste your notes after each session. AI generates 5 question types. Active recall cements what you just studied." />
            </div>
          </div>
        </section>

        {/* ════ RESEARCH CALLOUT ════════════════════════════════════ */}
        <section className="scroll-section" style={{ padding: 'clamp(64px, 8vw, 110px) clamp(20px, 4vw, 48px)' }}>
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <Reveal>
              <div style={{
                background: '#111113',
                border: '1px solid rgba(255,255,255,0.07)',
                borderLeft: '3px solid #b5f23a',
                borderRadius: 18, padding: 'clamp(32px, 4vw, 52px)',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Animated quote-mark watermark */}
                <div aria-hidden style={{
                  position: 'absolute', top: -50, left: 14,
                  fontSize: 220, color: '#b5f23a', lineHeight: 1,
                  fontFamily: 'Georgia, serif', fontWeight: 900,
                  pointerEvents: 'none', userSelect: 'none',
                  animation: 'quoteFloat 7s ease-in-out infinite',
                }}>❝</div>
                <div className="label" style={{ color: '#b5f23a', marginBottom: 16, position: 'relative', zIndex: 1 }}>Research-backed</div>
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
        <section className="scroll-section" style={{
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
            <RippleButton className="l-btn-primary" style={{ fontSize: 17, padding: '16px 42px' }}
              onClick={() => navigate('/login')}>
              Create your free account →
            </RippleButton>
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
