import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import LogoIcon from './LogoIcon'

const DEMO_SECS = 25 * 60
const pad = n => String(n).padStart(2, '0')

/* Left half: a real 25:00 block quietly running, so the first thing anyone
   sees is the product itself rather than a slogan. */
function LiveBlock() {
  const reduce = useReducedMotion()
  const [left, setLeft] = useState(DEMO_SECS - 7)
  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setLeft(s => (s <= 1 ? DEMO_SECS : s - 1)), 1000)
    return () => clearInterval(id)
  }, [reduce])
  const pct = 1 - left / DEMO_SECS

  return (
    <div>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
        Focus block · running
      </div>
      <div className="num" style={{ fontSize: 'clamp(72px, 9vw, 128px)', fontWeight: 200, lineHeight: 1, color: 'var(--text)' }}>
        {pad(Math.floor(left / 60))}<span style={{ color: 'var(--faint)' }}>:</span>{pad(left % 60)}
      </div>
      <div style={{ height: 1, background: 'var(--hairline)', marginTop: 28, position: 'relative', maxWidth: 420 }}>
        <motion.div
          style={{ position: 'absolute', inset: 0, background: 'var(--accent)', transformOrigin: 'left' }}
          animate={{ scaleX: pct }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
    </div>
  )
}

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-screen">
      <section className="auth-side">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)', textDecoration: 'none' }}>
          <LogoIcon size={22} spinning />
          <span className="auth-wordmark">FocusOS</span>
        </Link>
        <LiveBlock />
        <ul style={{ listStyle: 'none', display: 'grid', gap: 10, fontSize: 13.5, color: 'var(--muted)', maxWidth: 360 }}>
          <li>Focus blocks that grow with your attention span.</li>
          <li>Quizzes written from your own notes and videos.</li>
          <li>Rooms to study next to your friends.</li>
        </ul>
      </section>

      <section className="auth-form">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="hide-desktop" style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoIcon size={22} spinning /> <span className="auth-wordmark">FocusOS</span>
          </div>
          <h1 style={{ fontSize: 24, letterSpacing: '-0.03em', marginBottom: 6 }}>{title}</h1>
          {subtitle && <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>{subtitle}</p>}
          {!subtitle && <div style={{ height: 22 }} />}
          {children}
        </motion.div>
      </section>
    </div>
  )
}
