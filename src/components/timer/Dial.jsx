import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { fmt } from './timerData'

const SIZE = 400
const C = SIZE / 2
const R = 176
const CIRC = 2 * Math.PI * R
const TICKS = 60

/* One slot per character; only the characters that change roll. */
function RollingTime({ value }) {
  const reduce = useReducedMotion()
  return (
    <span style={{ display: 'inline-flex' }} aria-hidden="true">
      {value.split('').map((ch, i) => (
        <span key={i} style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', width: ch === ':' ? '0.42em' : '0.6em', textAlign: 'center' }}>
          {ch === ':' ? <span style={{ color: 'var(--faint)' }}>:</span> : (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={ch}
                style={{ display: 'inline-block' }}
                initial={reduce ? false : { y: '-60%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduce ? undefined : { y: '60%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          )}
        </span>
      ))}
    </span>
  )
}

export default function Dial({ timeLeft, totalTime, phase, running, flashRing, label, children }) {
  const progress = totalTime > 0 ? 1 - timeLeft / totalTime : 0
  const color = phase === 'focus' ? 'var(--accent)' : 'var(--text)'
  const headAngle = progress * 2 * Math.PI - Math.PI / 2
  const head = { x: C + R * Math.cos(headAngle), y: C + R * Math.sin(headAngle) }
  const litTicks = Math.floor(progress * TICKS)

  return (
    <div style={{ position: 'relative', width: 'min(380px, 80vw)', aspectRatio: '1', margin: '0 auto' }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * 2 * Math.PI - Math.PI / 2
          const major = i % 5 === 0
          const r1 = R + 12
          const r2 = R + (major ? 22 : 17)
          return (
            <line key={i}
              x1={C + r1 * Math.cos(a)} y1={C + r1 * Math.sin(a)}
              x2={C + r2 * Math.cos(a)} y2={C + r2 * Math.sin(a)}
              stroke={i < litTicks ? color : 'rgba(255,255,255,0.14)'}
              strokeOpacity={i < litTicks ? 0.55 : 1}
              strokeWidth={major ? 1.4 : 1}
              style={{ transition: 'stroke 0.6s ease' }}
            />
          )
        })}
        <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        <circle
          cx={C} cy={C} r={R} fill="none"
          stroke={color} strokeWidth="2" strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)}
          transform={`rotate(-90 ${C} ${C})`}
          className={flashRing ? 'ring-flash' : ''}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
        />
        {progress > 0 && (
          <g>
            {running && (
              <circle cx={head.x} cy={head.y} r="5" fill={color}
                style={{ transformOrigin: `${head.x}px ${head.y}px`, animation: 'ping 1.8s ease-out infinite', transition: 'cx 1s linear, cy 1s linear' }} />
            )}
            <circle cx={head.x} cy={head.y} r="4.5" fill={color} stroke="var(--bg)" strokeWidth="2"
              style={{ transition: 'cx 1s linear, cy 1s linear' }} />
          </g>
        )}
      </svg>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span className="label" style={{ color: phase === 'focus' && running ? 'var(--accent)' : 'var(--muted)' }}>{label}</span>
        <div
          role="timer" aria-label={`${fmt(timeLeft)} remaining`}
          className="num"
          style={{ fontSize: 'clamp(56px, 13vw, 92px)', fontWeight: 200, lineHeight: 1, color: 'var(--text)' }}
        >
          <RollingTime value={fmt(timeLeft)} />
        </div>
        {children}
      </div>
    </div>
  )
}
