import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Flame, Music, Bell, TrendingUp } from 'lucide-react'

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

/* ─── Drifting Lime Orbs ──────────────────────────────────────── */
function OrbBackground() {
  const reduced = useReducedMotion()

  const orbs = [
    { w: 700, h: 620, left: '-14%', top:  '-5%',  dur: 34, ax: [0, 70, -30, 0], ay: [0, -60, 38, 0], op: 0.042 },
    { w: 520, h: 520, left:  '60%', top: '-12%',  dur: 29, ax: [0, -50, 60, 0], ay: [0, 52, -30, 0], op: 0.032 },
    { w: 360, h: 360, left:  '30%', top:  '60%',  dur: 40, ax: [0, 40, -52, 0], ay: [0, -40, 24, 0], op: 0.026 },
  ]

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: orb.left, top: orb.top,
            width: orb.w, height: orb.h,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(181,242,58,${orb.op}) 0%, rgba(181,242,58,0) 72%)`,
            filter: 'blur(60px)',
            willChange: 'transform',
          }}
          animate={reduced ? {} : { x: orb.ax, y: orb.ay }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/* ─── Reveal — framer whileInView ──────────────────────────────── */
function Reveal({ children, delay = 0, style = {}, fromY = 40, className }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? {} : { opacity: 0, y: fromY, filter: 'blur(4px)' }}
      whileInView={reduced ? {} : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.72, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  )
}

/* ─── Feature Card ────────────────────────────────────────────── */
function FeatureCard({ title, desc, stat, index, heroArt, compact, fill, pills }) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 48 }}
      whileInView={reduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.65, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduced ? {} : { y: -4 }}
      style={{
        background: '#111113',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTop: '2px solid #b5f23a',
        borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.24)',
        cursor: 'default', willChange: 'transform',
        transition: 'box-shadow 0.28s cubic-bezier(0.22,1,0.36,1)',
        display: 'flex', flexDirection: 'column',
        height: fill ? '100%' : 'auto',
      }}
    >
      {heroArt && (
        <div style={{
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
          height: compact ? 150 : 200,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {heroArt}
        </div>
      )}

      <div style={{ padding: '22px 26px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontSize: 17, fontWeight: 700, marginBottom: 10,
          color: '#f0f0f2', letterSpacing: '-0.01em',
        }}>{title}</div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>{desc}</div>
        <div style={{
          fontSize: 11.5, color: '#b5f23a', lineHeight: 1.55,
          background: 'rgba(181,242,58,0.06)', border: '1px solid rgba(181,242,58,0.12)',
          borderRadius: 8, padding: '8px 12px',
        }}>{stat}</div>

        {pills && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, flex: 1, justifyContent: 'flex-end' }}>
            {pills.map(({ icon, label }, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(181,242,58,0.1)',
                borderRadius: 8, padding: '9px 13px',
                fontSize: 12.5, color: 'var(--muted)',
                fontWeight: 500,
              }}>
                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
                {label}
              </div>
            ))}
          </div>
        )}
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
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 5.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.62, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: r.x - 20, top: r.y - 20,
              width: 40, height: 40,
              borderRadius: '50%',
              background: 'rgba(10,10,11,0.3)',
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
      initial={{ opacity: 0, scale: 0.84, y: 20 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: reduced ? 0 : [0, -10, 0],
      }}
      transition={{
        opacity: { duration: 0.7, delay: 0.9 },
        scale:   { duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] },
        y:       { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.8 },
      }}
    >
      {/* Outer double-bezel shell */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 20, padding: 4,
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}>
        {/* Inner core */}
        <div style={{
          background: '#0a0a0b',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 20px 48px rgba(181,242,58,0.08)',
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
              {[['Session','1 / 3',false],['Today','0 min',false],['Streak','4',true]].map(([label, val, showFlame]) => (
                <div key={label} style={{
                  flex: 1, background: '#111113', borderRadius: 8, padding: '8px',
                  border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>{val}{showFlame && <Flame size={11} color="var(--amber, #f2c75a)" />}</div>
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
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 70% at 50% 55%, rgba(181,242,58,0.05) 0%, rgba(181,242,58,0) 70%)',
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
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 70% at 50% 55%, rgba(181,242,58,0.05) 0%, rgba(181,242,58,0) 70%)',
      overflow: 'hidden',
    }}>
      <svg viewBox="0 0 200 200" width="180" height="180">
        {qmarks.map((q, i) => (
          <text key={i} x={q.x} y={q.y} fontSize={q.s} fill="rgba(181,242,58,0.11)"
            fontWeight="900" fontFamily="'Outfit',sans-serif">?
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
          fill="#b5f23a" fontFamily="'Outfit',sans-serif">?</text>
      </svg>
    </div>
  )
}

function GoalCardArt() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 70% at 50% 55%, rgba(181,242,58,0.05) 0%, rgba(181,242,58,0) 70%)',
    }}>
      <svg viewBox="0 0 200 200" width="180" height="180">
        <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5"/>
        <circle cx="100" cy="100" r="56" fill="none" stroke="rgba(181,242,58,0.09)" strokeWidth="1.5"/>
        <circle cx="100" cy="100" r="34" fill="none" stroke="rgba(181,242,58,0.17)" strokeWidth="1.5"/>
        <circle cx="100" cy="100" r="14" fill="rgba(181,242,58,0.12)" stroke="#b5f23a" strokeWidth="2">
          <animate attributeName="r" values="12;17;12" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2.2s" repeatCount="indefinite"/>
        </circle>
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="72,0; 0,0; 0,0; 72,0"
            keyTimes="0; 0.3; 0.68; 1"
            dur="3.4s" repeatCount="indefinite" calcMode="spline"
            keySplines="0.4 0 0.15 1; 1 0 1 0; 0.55 0 1 1"/>
          <line x1="184" y1="100" x2="118" y2="100" stroke="#b5f23a" strokeWidth="2.5" strokeLinecap="round"/>
          <polygon points="118,96.5 112,100 118,103.5" fill="#b5f23a"/>
        </g>
        <g>
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.27;0.38;0.66;0.76" dur="3.4s" repeatCount="indefinite"/>
          <rect x="118" y="62" width="52" height="22" rx="5"
            fill="rgba(181,242,58,0.14)" stroke="rgba(181,242,58,0.4)" strokeWidth="1"/>
          <text x="144" y="77" textAnchor="middle" fill="#b5f23a" fontSize="11"
            fontWeight="800" fontFamily="'Outfit',sans-serif">GOAL SET</text>
        </g>
      </svg>
    </div>
  )
}

/* ─── Step Card ─────────────────────────────────────────────────── */
function StepCard({ num, title, desc, i }) {
  const [hov, setHov] = useState(false)
  return (
    <Reveal delay={i * 100} style={{ flex: 1, minWidth: 220 }}>
      <div
        style={{
          background: '#111113', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: '22px 24px',
          position: 'relative', overflow: 'hidden', cursor: 'default',
          transition: 'border-color 0.22s',
          borderColor: hov ? 'rgba(181,242,58,0.22)' : 'rgba(255,255,255,0.07)',
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        {/* Marching-ants border on hover */}
        <svg aria-hidden style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', opacity: hov ? 1 : 0, transition: 'opacity 0.22s ease',
        }} viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect x="0.9" y="0.9" width="98.2" height="98.2" rx="0" fill="none"
            stroke="rgba(181,242,58,0.4)" strokeWidth="0.8" strokeDasharray="5 3">
            <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.1s" repeatCount="indefinite"/>
          </rect>
        </svg>

        {/* Large watermark number */}
        <div aria-hidden style={{
          position: 'absolute', bottom: -28, right: -2,
          fontSize: 150, fontWeight: 900, fontFamily: "'Bebas Neue', sans-serif",
          color: '#b5f23a', opacity: 0.04, lineHeight: 1,
          pointerEvents: 'none', userSelect: 'none',
        }}>{num}</div>

        {/* Step number circle */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(181,242,58,0.08)',
          border: '1px solid rgba(181,242,58,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: '#b5f23a',
          marginBottom: 14, position: 'relative', zIndex: 1,
        }}>{num}</div>

        <div style={{ fontWeight: 700, marginBottom: 8, position: 'relative', zIndex: 1, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, position: 'relative', zIndex: 1 }}>{desc}</div>
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

  useEffect(() => {
    if (reduced) return

    const ctx = gsap.context(() => {
      gsap.to('.hero-glow-parallax', {
        y: -90,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: 1.5,
        },
      })

      gsap.utils.toArray('.scroll-section').forEach(el => {
        gsap.fromTo(el,
          { y: 28 },
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
    <div style={{ minHeight: '100dvh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )
  if (user) return null

  return (
    <>
      <div style={{
        background: '#0a0a0b', color: '#f0f0f2',
        fontFamily: "'Outfit', sans-serif",
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.55s ease',
        overflowX: 'hidden',
      }}>

        {/* ════ HERO ════════════════════════════════════════════════ */}
        <section className="hero-section" style={{
          position: 'relative', minHeight: '100dvh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <OrbBackground />
          <ParticleCanvas />

          {/* Grain — fixed pseudo-element equivalent, pointer-events-none */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
            opacity: 0.04,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='512' height='512' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat', backgroundSize: '200px 200px',
          }} />

          {/* Watermark ⟳ */}
          <span aria-hidden style={{
            position: 'absolute', top: '50%', right: '-150px',
            transform: 'translateY(-50%)',
            fontSize: 480, color: '#b5f23a', opacity: 0.035,
            animation: 'spin-slow 60s linear infinite',
            lineHeight: 1, fontWeight: 300,
            pointerEvents: 'none', userSelect: 'none', zIndex: 1,
          }}>⟳</span>

          {/* Radial glow (parallax target) */}
          <div className="hero-glow-parallax" style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
            background: 'radial-gradient(ellipse 65% 50% at 50% 50%, rgba(181,242,58,0.065) 0%, rgba(181,242,58,0) 70%)',
          }} />

          {/* ── Floating glass pill nav ── */}
          <nav style={{ position: 'relative', zIndex: 10, padding: 'clamp(16px,2.5vw,24px) clamp(16px,3vw,40px) 0' }}>
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(10,10,11,0.72)',
                backdropFilter: 'blur(22px)',
                WebkitBackdropFilter: 'blur(22px)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 50,
                padding: '0 8px 0 22px',
                height: 52,
                maxWidth: 1100, margin: '0 auto',
                boxShadow: '0 1px 0 rgba(255,255,255,0.07) inset, 0 8px 32px rgba(0,0,0,0.28)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 22, color: '#b5f23a',
                  display: 'inline-block', lineHeight: 1, fontWeight: 300,
                  animation: 'spin 8s linear infinite', transformOrigin: 'center',
                }}>⟳</span>
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '4px', color: 'white' }}>FOCUSOS</span>
              </div>
              <button
                className="l-btn-outline-sm"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
            </motion.div>
          </nav>

          {/* Hero content — split screen */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            padding: '0 clamp(20px, 4vw, 56px)',
            position: 'relative', zIndex: 10,
            gap: 'clamp(32px, 5vw, 72px)',
            maxWidth: 1200, margin: '0 auto', width: '100%',
          }}>
            {/* Left: text */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Eyebrow tag — premium small badge */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.52, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(181,242,58,0.07)',
                  border: '1px solid rgba(181,242,58,0.18)',
                  borderRadius: 6, padding: '5px 12px 5px 8px',
                  fontSize: 11, fontWeight: 600,
                  color: 'rgba(181,242,58,0.82)', letterSpacing: '0.055em',
                  marginBottom: 28,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#b5f23a',
                  boxShadow: '0 0 6px rgba(181,242,58,0.7)',
                  flexShrink: 0,
                }} />
                Built on peer-reviewed attention research
              </motion.div>

              {/* Headline line 1 — slides from LEFT */}
              <motion.h1
                initial={{ opacity: 0, x: -72, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.78, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontSize: 'clamp(42px, 5.8vw, 80px)', fontWeight: 800,
                  lineHeight: 1.02, letterSpacing: '-0.025em',
                  margin: '0 0 2px',
                }}
              >
                Study smarter.
              </motion.h1>

              {/* Headline line 2 — slides from RIGHT */}
              <motion.h1
                initial={{ opacity: 0, x: 72, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.78, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontSize: 'clamp(42px, 5.8vw, 80px)', fontWeight: 800,
                  lineHeight: 1.02, letterSpacing: '-0.025em',
                  margin: '0 0 30px', color: '#b5f23a',
                }}
              >
                Focus longer.
              </motion.h1>

              {/* Subhead */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.62, delay: 0.76, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontSize: 'clamp(14px, 1.4vw, 17px)', color: 'var(--muted)',
                  maxWidth: 420, lineHeight: 1.75, marginBottom: 40,
                  letterSpacing: '-0.005em',
                }}
              >
                FocusOS adapts to your real attention span — not a generic 25-minute timer.
              </motion.p>

              {/* CTAs — button-in-button architecture */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.94, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
              >
                <RippleButton className="l-btn-primary" onClick={() => navigate('/login')}>
                  Start for free
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.18)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                    transition: 'transform 0.22s',
                  }}>→</span>
                </RippleButton>
                <button className="l-btn-outline"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                  See how it works
                </button>
              </motion.div>
            </div>

            {/* Right: browser mockup */}
            <div className="hide-mobile" style={{
              flexShrink: 0, width: 'clamp(300px, 38vw, 480px)',
            }}>
              <BrowserMockup />
            </div>
          </div>
        </section>

        {/* ════ SOCIAL PROOF MARQUEE ════════════════════════════════ */}
        <section style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '14px 0', overflow: 'hidden',
          maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
        }}>
          <div style={{
            display: 'flex', whiteSpace: 'nowrap',
            animation: 'lMarquee 18s linear infinite',
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
                  <span key={j} style={{ padding: '0 6px', fontSize: 12.5, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.01em' }}>
                    {text}
                    <span style={{ margin: '0 18px', color: 'rgba(181,242,58,0.3)' }}>·</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </section>

        {/* ════ FEATURES — asymmetric bento grid ═══════════════════ */}
        <section id="features" className="scroll-section" style={{
          padding: 'clamp(80px, 9vw, 128px) clamp(20px, 4vw, 56px)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>

            {/* Section header — left-aligned, editorial */}
            <Reveal style={{ marginBottom: 56 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                color: '#b5f23a', marginBottom: 12, textTransform: 'uppercase',
              }}>What you get</div>
              <h2 style={{
                fontSize: 'clamp(28px, 3.8vw, 48px)', fontWeight: 800,
                lineHeight: 1.12, letterSpacing: '-0.02em', maxWidth: 520,
              }}>
                Everything you need to actually study.
              </h2>
            </Reveal>

            {/* Asymmetric bento: Timer spans full left, Quiz + Goals stack right */}
            <div className="features-bento">
              <div className="bento-timer">
                <FeatureCard index={0} heroArt={<TimerCardArt />} fill
                  title="Adaptive Focus Timer"
                  desc="Starts at YOUR attention span. Grows with every session. No arbitrary 25-minute assumption baked in."
                  stat="Avg user improves by 8 min in their first week"
                  pills={[
                    { icon: <Music size={13} color="#b5f23a" />, label: 'Focus music & ambience' },
                    { icon: <Bell size={13} color="#b5f23a" />, label: 'Session completion alerts' },
                    { icon: <TrendingUp size={13} color="#b5f23a" />, label: 'Attention span tracking' },
                  ]} />
              </div>
              <div className="bento-quiz">
                <FeatureCard index={1} heroArt={<QuizCardArt />} compact fill
                  title="AI Quiz Generator"
                  desc="Paste your notes. Claude AI instantly generates active recall questions across 5 question types."
                  stat="Practice testing = #1 study technique [Dunlosky, 2013]" />
              </div>
              <div className="bento-goals">
                <FeatureCard index={2} heroArt={<GoalCardArt />} compact fill
                  title="Score Goal Tracker"
                  desc="Set your SAT, ACT, or AP target. Get a backwards study plan anchored to your test date."
                  stat="Implementation intentions increase follow-through 3× [Gollwitzer, 1999]" />
              </div>
            </div>
          </div>
        </section>

        {/* ════ HOW IT WORKS ════════════════════════════════════════ */}
        <section className="scroll-section" style={{
          background: '#0d0d0f',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: 'clamp(80px, 9vw, 128px) clamp(20px, 4vw, 48px)',
        }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <Reveal style={{ marginBottom: 64 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                color: '#b5f23a', marginBottom: 12, textTransform: 'uppercase',
              }}>How it works</div>
              <h2 style={{
                fontSize: 'clamp(28px, 3.8vw, 42px)', fontWeight: 800,
                letterSpacing: '-0.02em', lineHeight: 1.12,
              }}>
                Three steps. Real results.
              </h2>
            </Reveal>

            {/* Step diagram */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
              <div style={{
                position: 'absolute', top: 16, left: '16.5%', right: '16.5%',
                height: 0, borderTop: '2px dashed rgba(181,242,58,0.18)',
                pointerEvents: 'none',
              }} />
              <div style={{ display: 'flex', gap: 0, width: '100%', maxWidth: 600 }}>
                {['Set your baseline', 'Focus and grow', 'Quiz yourself'].map((label, i) => (
                  <Reveal key={i} delay={i * 120} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'rgba(181,242,58,0.09)',
                      border: '1.5px solid rgba(181,242,58,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, color: '#b5f23a',
                      margin: '0 auto 14px', position: 'relative', zIndex: 1,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f2', letterSpacing: '0.01em' }}>{label}</div>
                  </Reveal>
                ))}
              </div>
            </div>

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
        <section className="scroll-section" style={{
          padding: 'clamp(80px, 9vw, 128px) clamp(20px, 4vw, 48px)',
        }}>
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <Reveal>
              <div style={{
                background: '#111113',
                border: '1px solid rgba(255,255,255,0.07)',
                borderLeft: '3px solid #b5f23a',
                borderRadius: 20, padding: 'clamp(32px, 4vw, 52px)',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 40px rgba(0,0,0,0.22)',
              }}>
                {/* Decorative large quotation mark — sans-serif, not Georgia */}
                <div aria-hidden style={{
                  position: 'absolute', top: -50, left: 14,
                  fontSize: 220, color: '#b5f23a', lineHeight: 1,
                  fontFamily: "'Outfit', sans-serif", fontWeight: 900,
                  pointerEvents: 'none', userSelect: 'none',
                  animation: 'quoteFloat 7s ease-in-out infinite',
                  opacity: 0.045,
                }}>"</div>

                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                  color: '#b5f23a', marginBottom: 16, position: 'relative', zIndex: 1,
                  textTransform: 'uppercase',
                }}>Research-backed</div>

                <h2 style={{
                  fontSize: 'clamp(24px, 3.2vw, 36px)', fontWeight: 800,
                  marginBottom: 18, letterSpacing: '-0.02em', lineHeight: 1.18,
                }}>
                  Not another Pomodoro app.
                </h2>
                <p style={{
                  fontSize: 15.5, color: 'var(--muted)', lineHeight: 1.8,
                  marginBottom: 26, maxWidth: 580, letterSpacing: '-0.003em',
                }}>
                  Generic apps assume 25 minutes works for everyone. Research shows attention spans vary widely by
                  individual — and can be trained over time. FocusOS starts where <em>you</em> are,
                  then helps you grow session by session.
                </p>
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(181,242,58,0.06)', border: '1px solid rgba(181,242,58,0.14)',
                  borderRadius: 8, padding: '10px 16px',
                  fontSize: 12.5, color: 'rgba(181,242,58,0.75)',
                  fontStyle: 'italic', lineHeight: 1.6,
                }}>
                  "Brief and rare mental breaks keep you focused: Deactivation and reactivation of task goals preempt
                  vigilance decrements." — Ariga & Lleras, Cognition, 2011
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ════ FINAL CTA ════════════════════════════════════════════ */}
        <section className="scroll-section" style={{
          padding: 'clamp(96px, 10vw, 144px) clamp(20px, 4vw, 48px)',
          textAlign: 'center',
          background: 'radial-gradient(ellipse 75% 55% at 50% 50%, rgba(181,242,58,0.035) 0%, rgba(181,242,58,0) 70%)',
        }}>
          <Reveal>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              color: 'rgba(181,242,58,0.6)', marginBottom: 20, textTransform: 'uppercase',
            }}>Get started</div>
            <h2 style={{
              fontSize: 'clamp(36px, 5.5vw, 64px)', fontWeight: 800,
              letterSpacing: '-0.025em', marginBottom: 18, lineHeight: 1.06,
            }}>
              Ready to actually focus?
            </h2>
            <p style={{
              color: 'var(--muted)', marginBottom: 44, fontSize: 17,
              lineHeight: 1.65, letterSpacing: '-0.005em',
            }}>
              Join students building real focus — one session at a time.
            </p>
            <RippleButton
              className="l-btn-primary"
              style={{ fontSize: 16, padding: '15px 36px', margin: '0 auto' }}
              onClick={() => navigate('/login')}
            >
              Create your free account
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(0,0,0,0.2)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, flexShrink: 0,
              }}>→</span>
            </RippleButton>
            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', letterSpacing: '0.02em' }}>No credit card required.</p>
          </Reveal>
        </section>

        {/* ════ FOOTER ══════════════════════════════════════════════ */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.055)',
          padding: '24px clamp(20px, 4vw, 48px)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
          fontSize: 12.5, color: 'var(--muted)',
          letterSpacing: '0.01em',
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
