import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'

const TONES = { red: 'var(--red)', amber: 'var(--amber)', muted: 'var(--muted)' }

/** Inline notice: a hairline on the left, coloured text. No boxes. */
export function Note({ tone = 'muted', children, style }) {
  return (
    <div style={{
      borderLeft: `1px solid ${TONES[tone]}`, paddingLeft: 12,
      fontSize: 13, lineHeight: 1.6, color: TONES[tone], ...style,
    }}>
      {children}
    </div>
  )
}

/** Small mono label above a block of content. */
export function Kicker({ children, style }) {
  return <span className="kicker" style={{ marginBottom: 6, ...style }}>{children}</span>
}

const ROW_COLORS = {
  idle:    { color: 'var(--text)',  bg: 'transparent' },
  correct: { color: 'var(--accent)', bg: 'var(--accent-soft)' },
  wrong:   { color: 'var(--red)',   bg: 'transparent' },
  dim:     { color: 'var(--faint)', bg: 'transparent' },
}

/** Answer option as a hairline row. state: idle | correct | wrong | dim */
export function OptionRow({ letter, label, state = 'idle', onClick }) {
  const { color, bg } = ROW_COLORS[state]
  const isIdle = state === 'idle'
  return (
    <motion.button
      type="button"
      onClick={isIdle ? onClick : undefined}
      disabled={!isIdle}
      whileHover={isIdle ? { backgroundColor: 'rgba(255,255,255,0.03)' } : undefined}
      style={{
        display: 'flex', alignItems: 'baseline', gap: 16, width: '100%',
        padding: '15px 8px', textAlign: 'left', font: 'inherit', fontSize: 15, lineHeight: 1.5,
        background: bg, color, border: 'none', borderTop: '1px solid var(--hairline)',
        cursor: isIdle ? 'pointer' : 'default', transition: 'color 0.15s, background 0.15s',
      }}
    >
      {letter && <span className="mono" style={{ fontSize: 12, color: isIdle ? 'var(--faint)' : 'inherit', width: 14, flexShrink: 0 }}>{letter}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
      {state === 'correct' && <Check size={15} strokeWidth={1.6} style={{ alignSelf: 'center' }} />}
      {state === 'wrong'   && <X size={15} strokeWidth={1.6} style={{ alignSelf: 'center' }} />}
    </motion.button>
  )
}

/** A labelled group of pills inside the options row. */
export function PillGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span className="label" style={{ fontSize: 10.5 }}>{label}</span>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}
