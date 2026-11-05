import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import LogoIcon from '../components/LogoIcon'

/* The page acts out the product: distractions drift around a focus dial,
   and every few seconds (or when you reach for the button) they fade away
   and the dial lights up. */

const DISTRACTIONS = [
  { text: 'group chat (14)',   x: '8%',  y: '22%', d: 0 },
  { text: 'new follower',      x: '74%', y: '16%', d: 1.2, wide: true },
  { text: 'one more video',    x: '4%',  y: '64%', d: 0.6, wide: true },
  { text: 'email · 3 unread',  x: '80%', y: '58%', d: 1.8, wide: true },
  { text: 'what’s for dinner', x: '16%', y: '86%', d: 2.4 },
  { text: 'streak expiring',   x: '68%', y: '84%', d: 0.9, wide: true },
  { text: 'check the score',   x: '28%', y: '8%',  d: 1.5 },
  { text: 'notification',      x: '58%', y: '4%',  d: 2.1 },
]

const FEATURES = [
  ['Adaptive focus', 'Blocks start where your attention is and grow two minutes every time you finish one.'],
  ['Quizzes from your notes', 'Paste notes or a video link. What you miss comes back until it sticks.'],
  ['Study rooms', 'Share a code and focus next to your friends, timers in sync.'],
]

const SPECS = ['+2 min per block', 'spaced repetition', 'realtime sync']

const TICKS = 60
const R = 150
const C = 180
const EASE = [0.22, 1, 0.36, 1]

function FocusDial({ calm }) {
  const reduce = useReducedMotion()
  const [lit, setLit] = useState(18)
  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setLit(n => (n >= TICKS ? 0 : n + 1)), 500)
    return () => clearInterval(id)
  }, [reduce])

  return (
    <svg viewBox="0 0 360 360" width="100%" height="100%" aria-hidden="true" style={{ overflow: 'visible' }}>
      {Array.from({ length: TICKS }, (_, i) => {
        const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2
        const major = i % 5 === 0
        const r2 = R + (major ? 16 : 10)
        const on = i < lit
        return (
          <line key={i}
            x1={C + R * Math.cos(a)} y1={C + R * Math.sin(a)}
            x2={C + r2 * Math.cos(a)} y2={C + r2 * Math.sin(a)}
            stroke={on && calm ? 'var(--accent)' : on ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.12)'}
            strokeWidth={major ? 1.5 : 1}
            style={{ transition: 'stroke 0.6s ease' }}
          />
        )
      })}
      <circle cx={C} cy={C} r={R - 14} fill="none" stroke="rgba(255,255,255,0.06)" />
    </svg>
  )
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="mono hide-mobile" style={{ fontSize: 12, color: 'var(--faint)', fontVariantNumeric: 'tabular-nums' }}>{now.toLocaleTimeString([], { hour12: false })}</span>
}

export default function Landing() {
  const reduce = useReducedMotion()
  const [hovering, setHovering] = useState(false)
  const [cycle, setCycle] = useState(false)

  useEffect(() => {
    if (reduce) return
    let off
    const id = setInterval(() => {
      setCycle(true)
      off = setTimeout(() => setCycle(false), 3200)
    }, 7000)
    return () => { clearInterval(id); clearTimeout(off) }
  }, [reduce])

  const calm = hovering || cycle

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px clamp(16px, 4vw, 40px)', position: 'relative', zIndex: 2 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>
          <LogoIcon size={20} spinning={calm} /> FocusOS
        </Link>
        <Clock />
        <Link to="/login" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>Sign in</Link>
      </header>

      <main style={{ flex: 1, position: 'relative', display: 'grid', placeItems: 'center', padding: '24px 16px 64px', minHeight: 560 }}>
        <div aria-hidden="true" className="landing-grid" />
        {/* Distractions */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {DISTRACTIONS.map(w => (
            <motion.span key={w.text} className={w.wide ? 'mono landing-wide' : 'mono'}
              style={{ position: 'absolute', left: w.x, top: w.y, fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}
              initial={{ opacity: 0 }}
              animate={reduce ? { opacity: calm ? 0 : 0.6 } : {
                opacity: calm ? 0 : 0.6,
                filter: calm ? 'blur(6px)' : 'blur(0px)',
                y: calm ? 0 : [0, -10, 0],
              }}
              transition={{
                opacity: { duration: calm ? 0.5 : 1.2, delay: calm ? 0 : w.d * 0.3 },
                filter: { duration: 0.6 },
                y: { duration: 5 + w.d, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              <span style={{ color: 'var(--faint)' }}>› </span>{w.text}
            </motion.span>
          ))}
        </div>

        {/* Dial behind the headline */}
        <motion.div aria-hidden="true"
          style={{ position: 'absolute', width: 'min(620px, 120vw)', aspectRatio: '1', top: '50%', left: '50%', x: '-50%', y: '-50%' }}
          initial={{ opacity: 0, scale: 0.94, rotate: -20 }}
          animate={{ opacity: 1, scale: calm ? 1.03 : 1, rotate: 0 }}
          transition={{ duration: 1.4, ease: EASE }}
        >
          <FocusDial calm={calm} />
        </motion.div>

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 560 }}>
          <motion.span className="kicker" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', border: '1px solid var(--hairline)', borderRadius: 999, marginBottom: 24 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <motion.span
              style={{ width: 6, height: 6, borderRadius: '50%' }}
              animate={{ background: calm ? 'var(--accent)' : 'var(--faint)' }}
            />
            {calm ? 'Status: focused' : 'Status: distracted'}
          </motion.span>

          <h1 style={{ fontSize: 'clamp(44px, 8vw, 84px)', lineHeight: 0.98, letterSpacing: '-0.05em', fontWeight: 600 }}>
            {['Everything else', 'can wait.'].map((line, i) => (
              <span key={line} style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.06em' }}>
                <motion.span style={{ display: 'inline-block' }}
                  initial={{ y: '105%' }} animate={{ y: 0 }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: EASE }}>
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }}
            style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.55, margin: '20px auto 32px', maxWidth: 420 }}>
            Focus blocks that grow with your attention span. Quizzes written from your own notes. Free.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.6 }}
            style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-accent btn-lg"
              style={{ textDecoration: 'none', borderRadius: 999, padding: '0 28px' }}
              onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
              onFocus={() => setHovering(true)} onBlur={() => setHovering(false)}>
              Start focusing
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg" style={{ textDecoration: 'none', borderRadius: 999, padding: '0 24px' }}>
              I have an account
            </Link>
          </motion.div>

          <motion.div className="mono" aria-hidden="true"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
            style={{ marginTop: 28, fontSize: 11.5, color: 'var(--faint)', display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span>distractions <span style={{ color: calm ? 'var(--accent)' : 'var(--muted)' }}>{calm ? '0' : DISTRACTIONS.length}</span></span>
            <span>block <span style={{ color: 'var(--muted)' }}>25:00</span></span>
            <span>cost <span style={{ color: 'var(--muted)' }}>$0</span></span>
          </motion.div>
        </div>
      </main>

      <section style={{ borderTop: '1px solid var(--hairline)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {FEATURES.map(([title, body], i) => (
          <motion.div key={title}
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
            className="landing-feature"
            style={{ padding: '28px clamp(16px, 4vw, 40px)' }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--faint)', display: 'flex', justifyContent: 'space-between' }}>
              <span>0{i + 1}</span><span>{SPECS[i]}</span>
            </span>
            <h2 style={{ fontSize: 15, margin: '10px 0 6px', letterSpacing: '-0.01em' }}>{title}</h2>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{body}</p>
          </motion.div>
        ))}
      </section>

      <footer style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '20px clamp(16px, 4vw, 40px)', borderTop: '1px solid var(--hairline)', fontSize: 12.5, color: 'var(--faint)' }}>
        <span>FocusOS</span>
        <span style={{ display: 'flex', gap: 20 }}>
          {[['/privacy', 'Privacy'], ['/terms', 'Terms'], ['/support', 'Help']].map(([to, l]) => (
            <Link key={to} to={to} style={{ color: 'var(--faint)', textDecoration: 'none' }}>{l}</Link>
          ))}
        </span>
      </footer>
    </div>
  )
}
