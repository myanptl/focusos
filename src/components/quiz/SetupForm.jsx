import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Note } from './parts'
import VideoSource from './VideoSource'
import { MODES, DIFFICULTIES } from './constants'

const SOURCES = [{ id: 'notes', label: 'Notes' }, { id: 'bank', label: 'Question bank' }, { id: 'video', label: 'Video' }]
const BANK_SUBJECTS = ['SAT Math', 'SAT Reading', 'SAT Writing', 'ACT English', 'ACT Math', 'ACT Science', 'ACT Reading']
const COUNTS = [5, 10, 15]
const SPRING = { type: 'spring', stiffness: 500, damping: 40 }

function SourceTabs({ value, onChange }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--hairline)' }}>
      {SOURCES.map(s => (
        <button key={s.id} role="tab" aria-selected={value === s.id} onClick={() => onChange(s.id)}
          style={{
            position: 'relative', padding: '0 0 12px', background: 'none', border: 'none', font: 'inherit',
            fontSize: 13.5, cursor: 'pointer', color: value === s.id ? 'var(--text)' : 'var(--muted)',
          }}>
          {s.label}
          {value === s.id && <motion.span layoutId="quiz-source-line" transition={SPRING} className="subnav-line" />}
        </button>
      ))}
    </div>
  )
}

function NotesSource({ notes, setNotes, subject, setSubject, dragOver, setDragOver, onDrop, fileInputRef, onFileInput }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{ position: 'relative' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Paste your notes. More detail makes better questions."
          aria-label="Your notes"
          style={{ lineHeight: 1.6, minHeight: 180, borderColor: dragOver ? 'var(--accent)' : undefined }}
        />
        {notes && (
          <button className="btn-quiet" onClick={() => setNotes('')} aria-label="Clear notes"
            style={{ position: 'absolute', top: 6, right: 6 }}>
            <X size={14} strokeWidth={1.6} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Subject (optional)" value={subject}
          onChange={e => setSubject(e.target.value)} aria-label="Subject"
          style={{ flex: '1 1 200px' }}
        />
        <span style={{ fontSize: 12, color: 'var(--faint)' }}>
          Drop a .txt or .md file, or{' '}
          <button className="btn-quiet" style={{ padding: 0, fontSize: 12, textDecoration: 'underline' }}
            onClick={() => fileInputRef.current?.click()}>browse</button>
        </span>
      </div>
      <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.docx" onChange={onFileInput} style={{ display: 'none' }} />
    </div>
  )
}

function BankSource({ bankSubject, setBankSubject }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {BANK_SUBJECTS.map(s => (
        <button key={s} className={`pill${bankSubject === s ? ' active' : ''}`} onClick={() => setBankSubject(s)}>{s}</button>
      ))}
    </div>
  )
}

function ModelLine({ modelPref, generationsToday }) {
  const overLimit = modelPref === 'auto' && generationsToday >= 5
  const text = modelPref === 'ollama' ? 'Using Llama 3.1 (free)'
    : overLimit ? 'Daily Claude limit reached · using the free backup model'
    : `${Math.max(0, 5 - generationsToday)} of 5 free Claude quizzes left today`
  return (
    <span className="mono" style={{ fontSize: 11.5, color: overLimit ? 'var(--amber)' : 'var(--faint)' }}>{text}</span>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 150px' }}>
      <span className="label">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ height: 40, paddingLeft: 12 }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function OptionsRow({ count, setCount, mode, setMode, difficulty, setDifficulty }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
      <Select label="Questions" value={count} onChange={v => setCount(Number(v))}
        options={COUNTS.map(n => ({ value: n, label: `${n} questions` }))} />
      <Select label="Format" value={mode} onChange={setMode}
        options={MODES.map(m => ({ value: m.key, label: m.label }))} />
      <Select label="Level" value={difficulty} onChange={setDifficulty}
        options={DIFFICULTIES.map(d => ({ value: d, label: d }))} />
    </div>
  )
}

export default function SetupForm(props) {
  const {
    user, sourceMode, setSourceMode, notes, dueReview, error, loading,
    generateQuiz, generationsToday, modelPref,
  } = props
  const isVideo = sourceMode === 'video'
  const dueCount = dueReview.length

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SourceTabs value={sourceMode} onChange={setSourceMode} />

      {sourceMode === 'notes' && <NotesSource {...props} />}
      {sourceMode === 'bank' && <BankSource {...props} />}
      {isVideo && <VideoSource {...props} />}

      {!isVideo && (
        <>
          <OptionsRow {...props} />

          {dueCount > 0 && (
            <Note>{dueCount} question{dueCount !== 1 ? 's' : ''} due for spaced review will come first.</Note>
          )}

          {error && (
            <Note tone="red">
              {error}{' '}
              <button className="btn-quiet" onClick={generateQuiz} style={{ padding: 0, color: 'var(--text)', textDecoration: 'underline' }}>Retry</button>
            </Note>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button
              className="btn btn-accent btn-lg"
              onClick={generateQuiz}
              disabled={loading || (sourceMode === 'notes' && !notes.trim())}
            >
              {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--on-accent)' }} /> Generating</> : 'Generate quiz'}
            </button>
            {user && generationsToday !== null && <ModelLine modelPref={modelPref} generationsToday={generationsToday} />}
          </div>
        </>
      )}
    </section>
  )
}
