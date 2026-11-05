import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { DISTRACTIONS, SHORTCUTS } from './timerData'

function Overlay({ open, onClose, width = 440, children, label }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="bg" className="modal-backdrop" style={{ animation: 'none' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label={label}
            className="modal" style={{ maxWidth: width, animation: 'none' }}
            initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            onClick={e => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Choice({ selected, onClick, children, trailing }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
      padding: '11px 12px', borderRadius: 6, cursor: 'pointer', font: 'inherit', fontSize: 14,
      background: selected ? 'rgba(255,255,255,0.05)' : 'transparent',
      border: `1px solid ${selected ? 'var(--border-strong)' : 'var(--hairline)'}`,
      color: 'var(--text)', transition: 'background 0.15s, border-color 0.15s',
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0, display: 'grid', placeItems: 'center',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-strong)'}`,
        background: selected ? 'var(--accent)' : 'transparent', transition: 'all 0.15s',
      }}>
        {selected && <Check size={11} strokeWidth={3} color="var(--on-accent)" />}
      </span>
      <span style={{ flex: 1 }}>{children}</span>
      {trailing}
    </button>
  )
}

export function ReflectionModal({ open, completedMins, quote, tasks, toggleTask, selectedDistraction, setSelectedDistraction, onFinish }) {
  return (
    <Overlay open={open} label="Session complete" width={460}>
      <span className="kicker" style={{ color: 'var(--accent)' }}>Block complete · +{completedMins * 10} XP</span>
      <h2 style={{ fontSize: 22, letterSpacing: '-0.03em' }}>
        <span className="num" style={{ fontWeight: 300 }}>{completedMins}</span> minutes, logged.
      </h2>
      {quote && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>"{quote.text}" — {quote.author}</p>}

      {tasks.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <div className="label" style={{ marginBottom: 10 }}>Which tasks did you finish?</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {tasks.map((t, i) => (
              <Choice key={t.id} selected={t.done} onClick={() => toggleTask(i)}
                trailing={t.done && <span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>+5</span>}>
                {t.text}
              </Choice>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 24 }}>
        <div className="label" style={{ marginBottom: 10 }}>What pulled your attention away?</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {DISTRACTIONS.map(d => (
            <Choice key={d} selected={selectedDistraction === d} onClick={() => setSelectedDistraction(d)}>{d}</Choice>
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onFinish('skip')}>Skip</button>
        <button className="btn btn-accent" style={{ flex: 2, justifyContent: 'center' }} onClick={() => onFinish(selectedDistraction || 'skip')}>Save and start break</button>
      </div>
    </Overlay>
  )
}

export function QuitModal({ open, onCancel, onConfirm }) {
  return (
    <Overlay open={open} onClose={onCancel} label="End session early" width={380}>
      <h2 style={{ fontSize: 18 }}>End this block early?</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '8px 0 24px', lineHeight: 1.6 }}>
        The minutes still count, but your block length won't grow and your in-a-row streak resets.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-accent" style={{ flex: 1, justifyContent: 'center' }} onClick={onCancel}>Keep going</button>
        <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={onConfirm}>End block</button>
      </div>
    </Overlay>
  )
}

export function ShortcutsModal({ open, onClose }) {
  return (
    <Overlay open={open} onClose={onClose} label="Keyboard shortcuts" width={380}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18 }}>Keyboard shortcuts</h2>
        <button className="btn-quiet" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </div>
      {SHORTCUTS.map(s => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderTop: '1px solid var(--hairline)' }}>
          <kbd style={{ minWidth: 56, textAlign: 'center' }}>{s.key}</kbd>
          <span style={{ fontSize: 13.5 }}>{s.desc}</span>
        </div>
      ))}
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>Disabled while typing in a field.</p>
    </Overlay>
  )
}
