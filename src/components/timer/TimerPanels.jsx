import { motion, AnimatePresence } from 'framer-motion'
import { X, Shuffle, ArrowUpRight } from 'lucide-react'
import { LEVELS, SOUND_OPTIONS, SPOTIFY_PLAYLISTS } from './timerData'

const fill = pct => ({ background: `linear-gradient(to right, var(--accent) ${pct}%, var(--surface-3) ${pct}%)` })

function Row({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: '1px solid var(--hairline)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  )
}

function Slider({ label, value, unit, min, max, onChange, disabled }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ padding: '14px 0', borderTop: '1px solid var(--hairline)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
        <span>{label}</span>
        <span className="num" style={{ fontSize: 13.5, color: 'var(--text)' }}>{value} {unit}</span>
      </div>
      <input type="range" min={min} max={max} step={1} value={value} disabled={disabled}
        aria-label={label} onChange={e => onChange(Number(e.target.value))} style={fill(pct)} />
    </div>
  )
}

export function SessionPanel({ pomodoroMode, running, onTogglePomodoro, focusMins, breakMins, onFocus, onBreak, level, nextLvl, minsToNext, pctToNext }) {
  return (
    <div>
      <div style={{ paddingBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={pomodoroMode ? 'pomo' : level.name}
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="label" style={{ color: 'var(--text)' }}>
              {pomodoroMode ? 'Classic Pomodoro' : level.name}
            </motion.span>
          </AnimatePresence>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {pomodoroMode ? '25 / 5 fixed' : nextLvl ? `${minsToNext} min to ${nextLvl.name.toLowerCase()}` : 'Top level'}
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 10px' }}>
          {pomodoroMode ? 'Fixed 25-minute blocks with 5-minute breaks.' : level.desc}
        </p>
        {!pomodoroMode && <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${pctToNext}%` }} /></div>}
      </div>

      <Row label="Adaptive length" hint={pomodoroMode ? 'Off — using classic Pomodoro' : 'Blocks grow 2 min each time you finish one'}>
        <label className="toggle">
          <input type="checkbox" checked={!pomodoroMode} disabled={running}
            onChange={e => onTogglePomodoro(!e.target.checked)} />
          <span className="toggle-slider" />
        </label>
      </Row>
      <div style={{ opacity: pomodoroMode ? 0.35 : 1, transition: 'opacity 0.2s' }}>
        <Slider label="Focus" unit="min" value={focusMins} min={5} max={90} onChange={onFocus} disabled={running || pomodoroMode} />
        <Slider label="Break" unit="min" value={breakMins} min={1} max={30} onChange={onBreak} disabled={running || pomodoroMode} />
      </div>

      <details className="v3-details" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 14 }}>
        <summary style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--muted)' }}>
          How levels work <span className="v3-details-chevron" aria-hidden>+</span>
        </summary>
        <ol style={{ listStyle: 'none', marginTop: 12, display: 'grid', gap: 8 }}>
          {LEVELS.map(l => (
            <li key={l.name} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, fontSize: 12.5 }}>
              <span className="mono" style={{ color: l.name === level.name ? 'var(--accent)' : 'var(--text)' }}>
                {l.max < 999 ? `< ${l.max} min` : '50+ min'}
              </span>
              <span style={{ color: 'var(--muted)' }}><span style={{ color: 'var(--text)' }}>{l.name.toLowerCase()}</span> — {l.desc}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  )
}

export function SoundPanel({ soundType, setSoundType, volume, setVolume, running }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }} role="radiogroup" aria-label="Ambient sound">
        {SOUND_OPTIONS.map(s => {
          const on = soundType === s.id
          return (
            <button key={s.id} role="radio" aria-checked={on} onClick={() => setSoundType(s.id)}
              style={{
                position: 'relative', height: 64, borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${on ? 'var(--border-strong)' : 'var(--hairline)'}`,
                background: on ? 'rgba(255,255,255,0.04)' : 'transparent',
                color: on ? 'var(--text)' : 'var(--muted)', font: 'inherit', fontSize: 12,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'color 0.15s, border-color 0.15s',
              }}>
              <s.Icon size={16} strokeWidth={1.6} />
              {s.label}
              {on && s.id !== 'silent' && running && (
                <span style={{ position: 'absolute', top: 7, right: 7, width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} className="live-dot" />
              )}
            </button>
          )
        })}
      </div>
      {soundType !== 'silent' && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
            <span>Volume</span><span className="num">{Math.round(volume * 100)}</span>
          </div>
          <input type="range" min={0} max={1} step={0.05} value={volume} aria-label="Volume"
            onChange={e => setVolume(parseFloat(e.target.value))} style={fill(volume * 100)} />
          {!running && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Plays when a focus block starts.</p>}
        </div>
      )}
    </div>
  )
}

export function TasksPanel({ tasks, taskInput, setTaskInput, addTask, removeTask, running }) {
  return (
    <div>
      <ul style={{ listStyle: 'none' }}>
        <AnimatePresence initial={false}>
          {tasks.map((t, i) => (
            <motion.li key={t.id} layout
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--hairline)' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--faint)' }}>0{i + 1}</span>
                <span style={{ flex: 1, fontSize: 14, color: t.done ? 'var(--muted)' : 'var(--text)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
                {!running && (
                  <button className="btn-quiet" onClick={() => removeTask(i)} aria-label={`Remove ${t.text}`}><X size={14} /></button>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {tasks.length < 3 && !running && (
        <form onSubmit={e => { e.preventDefault(); addTask() }} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input placeholder={tasks.length ? 'Another task…' : 'What will you work on?'} value={taskInput} maxLength={80}
            onChange={e => setTaskInput(e.target.value)} />
          <button type="submit" className="btn btn-ghost" disabled={!taskInput.trim()}>Add</button>
        </form>
      )}
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
        {running && tasks.length === 0 ? 'No tasks for this block.' : `Up to 3 per block · ${tasks.length}/3 · tick them off when it ends for +5 XP each.`}
      </p>
    </div>
  )
}

export function BreakPanel({ breakTips, onShuffle }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span className="label" style={{ color: 'var(--text)' }}>Move, don't scroll</span>
        <button className="btn-quiet" style={{ fontSize: 12 }} onClick={onShuffle}><Shuffle size={13} /> Shuffle</button>
      </div>
      <ul style={{ listStyle: 'none' }}>
        {breakTips.map((tip, i) => (
          <motion.li key={tip.text} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            style={{ padding: '11px 0', borderBottom: '1px solid var(--hairline)', fontSize: 14, display: 'flex', gap: 12 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--faint)', paddingTop: 2 }}>0{i + 1}</span>{tip.text}
          </motion.li>
        ))}
      </ul>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
        {SPOTIFY_PLAYLISTS.map(name => (
          <a key={name} className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
            href={`https://open.spotify.com/search/${encodeURIComponent(name)}`} target="_blank" rel="noopener noreferrer">
            {name} <ArrowUpRight size={12} />
          </a>
        ))}
      </div>
    </div>
  )
}
