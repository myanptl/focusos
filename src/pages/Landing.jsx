import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import LogoIcon from '../components/LogoIcon'

/* Text on the left, a running focus block on the right. Every few seconds
   (or when you reach for the button) the distractions around the dial
   blur away and it turns lime — the product, acted out. */

// Corners and top edge only, so no word ever crosses the tick ring.
const DISTRACTIONS = [
  { text: 'group chat (14)',  x: '0%',  y: '3%',  d: 0 },
  { text: 'new follower',     x: '74%', y: '1%',  d: 1.2 },
  { text: 'one more video',   x: '0%',  y: '94%', d: 0.6 },
  { text: 'email · 3 unread', x: '70%', y: '96%', d: 1.8 },
  { text: 'streak expiring',  x: '38%', y: '-7%', d: 0.9 },
]

const BLOCK_SECS = 25 * 60
const TICKS = 60
const R = 150
const C = 180
const EASE = [0.22, 1, 0.36, 1]
const pad = n => String(n).padStart(2, '0')
const fade = delay => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.7, ease: EASE } })

function useTicker(reduce) {
  const [left, setLeft] = useState(BLOCK_SECS - 9 * 60 - 38)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date())
      if (!reduce) setLeft(s => (s <= 1 ? BLOCK_SECS : s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [reduce])
  return { left, now }
}

function Dial({ calm, left }) {
  const lit = Math.round((1 - left / BLOCK_SECS) * TICKS)
  return (
    <svg viewBox="0 0 360 360" width="100%" height="100%" aria-hidden="true">
      {Array.from({ length: TICKS }, (_, i) => {
        const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2
        const major = i % 5 === 0
        const r2 = R + (major ? 14 : 8)
        const on = i <= lit
        return (
          <line key={i}
            x1={C + R * Math.cos(a)} y1={C + R * Math.sin(a)}
            x2={C + r2 * Math.cos(a)} y2={C + r2 * Math.sin(a)}
            stroke={on ? (calm ? 'var(--accent)' : 'rgba(255,255,255,0.7)') : 'rgba(255,255,255,0.13)'}
            strokeWidth={major ? 1.6 : 1}
            style={{ transition: 'stroke 0.6s ease' }} />
        )
      })}
      <circle cx={C} cy={C} r={R - 16} fill="none" stroke="rgba(255,255,255,0.06)" />
    </svg>
  )
}

export default function Landing() {
  const reduce = useReducedMotion()
  const { left, now } = useTicker(reduce)
  const [hovering, setHovering] = useState(false)
  const [cycle, setCycle] = useState(false)

  useEffect(() => {
    if (reduce) return
    let off
    const id = setInterval(() => {
      setCycle(true)
      off = setTimeout(() => setCycle(false), 3400)
    }, 7000)
    return () => { clearInterval(id); clearTimeout(off) }
  }, [reduce])

  const calm = hovering || cycle

  return (
    <div className="landing">
      <header className="landing-bar">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>
          <LogoIcon size={20} spinning={calm} /> FocusOS
        </Link>
        <span className="mono hide-mobile" style={{ fontSize: 12, color: 'var(--faint)', fontVariantNumeric: 'tabular-nums' }}>
          {now.toLocaleTimeString([], { hour12: false })}
        </span>
        <Link to="/login" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>Sign in</Link>
      </header>

      <main className="landing-main">
        <div aria-hidden="true" className="landing-grid" />

        <section className="landing-copy">
          <motion.span {...fade(0.1)} className="kicker landing-status">
            <motion.span style={{ width: 6, height: 6, borderRadius: '50%' }}
              animate={{ background: calm ? 'var(--accent)' : 'var(--faint)' }} />
            {calm ? 'Status: focused' : 'Status: distracted'}
          </motion.span>

          <h1 className="landing-title">
            {['Train your', 'attention span.'].map((line, i) => (
              <span key={line} style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.08em' }}>
                <motion.span style={{ display: 'inline-block' }}
                  initial={{ y: '105%' }} animate={{ y: 0 }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: EASE }}>
                  {i === 1 ? <>attention <span style={{ color: 'var(--accent)' }}>span.</span></> : line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p {...fade(0.5)} className="landing-sub">
            Focus blocks start where your attention is and grow two minutes every time you finish one.
            Then quiz yourself on your own notes.
          </motion.p>

          <motion.div {...fade(0.65)} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-accent btn-lg landing-cta"
              onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
              onFocus={() => setHovering(true)} onBlur={() => setHovering(false)}>
              Start focusing
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg landing-cta">I have an account</Link>
          </motion.div>

          <motion.div {...fade(0.9)} className="mono landing-readout" aria-hidden="true">
            <span>distractions <b style={{ color: calm ? 'var(--accent)' : 'var(--muted)' }}>{calm ? 0 : DISTRACTIONS.length}</b></span>
            <span>next block <b>+2 min</b></span>
            <span>cost <b>$0</b></span>
          </motion.div>
        </section>

        <motion.section className="landing-visual" aria-hidden="true"
          initial={{ opacity: 0, scale: 0.94, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.4, ease: EASE }}>
          <motion.div style={{ position: 'absolute', inset: 0 }} animate={{ scale: calm ? 1.03 : 1 }} transition={{ duration: 0.8, ease: EASE }}>
            <Dial calm={calm} left={left} />
          </motion.div>
          <div className="landing-readout-center">
            <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', color: calm ? 'var(--accent)' : 'var(--faint)', transition: 'color 0.6s' }}>
              FOCUS · BLOCK 03
            </span>
            <span className="num landing-clock">
              {pad(Math.floor(left / 60))}<span style={{ color: 'var(--faint)' }}>:</span>{pad(left % 60)}
            </span>
          </div>
          {DISTRACTIONS.map(w => (
            <motion.span key={w.text} className="mono landing-noise"
              style={{ left: w.x, top: w.y }}
              initial={{ opacity: 0 }}
              animate={reduce ? { opacity: calm ? 0 : 0.6 } : {
                opacity: calm ? 0 : 0.6,
                filter: calm ? 'blur(6px)' : 'blur(0px)',
                y: calm ? 0 : [0, -8, 0],
              }}
              transition={{
                opacity: { duration: calm ? 0.5 : 1.2, delay: calm ? 0 : 0.6 + w.d * 0.3 },
                filter: { duration: 0.6 },
                y: { duration: 5 + w.d, repeat: Infinity, ease: 'easeInOut' },
              }}>
              <span style={{ color: 'var(--faint)' }}>› </span>{w.text}
            </motion.span>
          ))}
        </motion.section>
      </main>

      <footer className="landing-foot">
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
