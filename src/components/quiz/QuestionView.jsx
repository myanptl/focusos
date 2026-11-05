import { motion, AnimatePresence } from 'framer-motion'
import { OptionRow, Kicker } from './parts'
import { MODES, splitOption } from './constants'

const TYPE_LABELS = {
  multiple_choice: 'Multiple choice', short_answer: 'Short answer', fill_blank: 'Fill in blank',
  explain: 'Explain', true_false: 'True / false',
}
const CONF_LABELS = ['', 'Not sure', 'Vague idea', 'Mostly sure', 'Very sure', 'Certain']
const SPRING = { type: 'spring', stiffness: 500, damping: 40 }
const LOW_TIME = 15

function MetaLine({ q }) {
  const { current, total, mode, qType, difficulty, activeQ, harderQ, timed, timeLeft } = q
  const modeLabel = mode === 'mixed' ? `Mixed · ${TYPE_LABELS[qType] || ''}` : MODES.find(m => m.key === mode)?.label
  const parts = [modeLabel, difficulty, activeQ.isReview && 'Spaced review', harderQ && 'Harder'].filter(Boolean)
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
      <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
        <span style={{ color: 'var(--text)' }}>{String(current + 1).padStart(2, '0')}</span> / {String(total).padStart(2, '0')}
        <span style={{ color: 'var(--faint)' }}> · {parts.join(' · ')}</span>
      </span>
      {timed && (
        <span className="mono" style={{ fontSize: 13, color: timeLeft < LOW_TIME ? 'var(--red)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
          {timeLeft}s
        </span>
      )}
    </div>
  )
}

function mcState(letter, q) {
  if (!q.revealed) return 'idle'
  if (letter === q.activeQ.correct_option) return 'correct'
  if (letter === q.selectedOption) return 'wrong'
  return 'dim'
}

function tfState(opt, q) {
  if (!q.revealed) return 'idle'
  const isAnswer = q.activeQ.correct === (opt === 'True')
  if (isAnswer) return 'correct'
  return q.tfResult?.selected === opt ? 'wrong' : 'dim'
}

function TextAnswer({ value, onChange, placeholder, rows }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      rows={rows} style={{ resize: 'vertical', lineHeight: 1.6, fontSize: 15 }} />
  )
}

function AnswerInput({ q }) {
  const { activeQ, revealed, isMC, isTF, isFB, isSA, isExplain } = q
  if (isMC) {
    return (
      <div style={{ borderBottom: '1px solid var(--hairline)' }}>
        {(activeQ.options || []).map((opt, i) => {
          const letter = opt.match(/^([A-D])/)?.[1]
          const { letter: shown, text } = splitOption(opt)
          return <OptionRow key={i} letter={shown} label={text} state={mcState(letter, q)} onClick={() => letter && q.onMCSelect(letter)} />
        })}
      </div>
    )
  }
  if (isTF) {
    return (
      <div style={{ borderBottom: '1px solid var(--hairline)' }}>
        {['True', 'False'].map(opt => <OptionRow key={opt} label={opt} state={tfState(opt, q)} onClick={() => q.onTFSelect(opt)} />)}
      </div>
    )
  }
  if (revealed) return null
  if (isFB) {
    return (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input type="text" value={q.fbInput} onChange={e => q.setFbInput(e.target.value)}
          placeholder="Type the missing word or phrase" style={{ flex: '1 1 240px', fontSize: 15 }}
          onKeyDown={e => { if (e.key === 'Enter') q.onFBCheck() }} />
        <button className="btn btn-accent" onClick={q.onFBCheck} disabled={!q.fbInput.trim()}>Check</button>
      </div>
    )
  }
  if (isSA) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <TextAnswer value={q.userAnswer} onChange={q.setUserAnswer} placeholder="Write your answer" rows={3} />
        <button className="btn btn-accent" disabled={q.saGrading || !q.userAnswer.trim()} onClick={q.gradeShortAnswer}>
          {q.saGrading ? <><span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--on-accent)' }} /> Grading</> : 'Check answer'}
        </button>
      </div>
    )
  }
  if (isExplain) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <TextAnswer value={q.userAnswer} onChange={q.setUserAnswer} placeholder="Explain it in your own words" rows={4} />
        <button className="btn btn-ghost" onClick={() => q.setRevealed(true)}>See model answer</button>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
      <TextAnswer value={q.userAnswer} onChange={q.setUserAnswer} placeholder="Write your answer (optional, helps you self-grade)" rows={3} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span className="label" style={{ fontSize: 10.5 }}>Confidence</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} className={`pill${q.confidence === n ? ' active' : ''}`} onClick={() => q.setConfidence(n)}
              style={{ width: 34, padding: 0 }} aria-label={`${n}: ${CONF_LABELS[n]}`}>{n}</button>
          ))}
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{CONF_LABELS[q.confidence]}</span>
      </div>
      <button className="btn btn-ghost" onClick={() => q.setRevealed(true)}>Show answer</button>
    </div>
  )
}

function Verdict({ q }) {
  const { isFB, isSA, fbResult, saFeedback } = q
  if (isFB && fbResult) {
    return fbResult.correct
      ? <div style={{ color: 'var(--accent)', fontSize: 14 }}>Correct</div>
      : <div style={{ color: 'var(--red)', fontSize: 14 }}>Not quite. You wrote “{q.fbInput}”.</div>
  }
  if (isSA && saFeedback) {
    return (
      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
        <span style={{ color: saFeedback.correct ? 'var(--accent)' : 'var(--red)' }}>{saFeedback.correct ? 'Correct' : 'Needs work'}</span>
        {saFeedback.score !== undefined && <span className="mono" style={{ color: 'var(--muted)', fontSize: 12.5 }}> · {saFeedback.score}/100</span>}
        <div style={{ color: 'var(--muted)', marginTop: 4 }}>{saFeedback.feedback}</div>
      </div>
    )
  }
  return null
}

function GradeActions({ q }) {
  const { isMC, isTF, isFB, isSA, mcGrade, saFeedback, advance, current, total } = q
  const nextLabel = current + 1 >= total ? 'See results' : 'Next question'
  if (isMC || isTF || isFB) return <button className="btn btn-accent" onClick={() => advance(mcGrade)}>{nextLabel}</button>
  if (isSA) return <button className="btn btn-accent" onClick={() => advance(saFeedback?.correct ? 'got' : 'missed')}>{nextLabel}</button>
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button className="btn btn-accent" onClick={() => advance('got')}>Got it</button>
      <button className="btn btn-ghost" onClick={() => advance('almost')}>Almost</button>
      <button className="btn btn-ghost" onClick={() => advance('missed')}>Missed</button>
    </div>
  )
}

function Reveal({ q }) {
  const { activeQ, followupLoading, harderQ, miniLesson, requestFollowup, isMC, isTF } = q
  const optionsShowAnswer = isMC || isTF
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Verdict q={q} />
      {!optionsShowAnswer && (
        <div style={{ borderLeft: '1px solid var(--accent-line)', paddingLeft: 16 }}>
          <Kicker style={{ color: 'var(--accent)' }}>Answer</Kicker>
          <div style={{ fontSize: 15, lineHeight: 1.65 }}>{activeQ.answer}</div>
        </div>
      )}
      {activeQ.explanation && (
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)', maxWidth: '68ch' }}>{activeQ.explanation}</p>
      )}
      {miniLesson && (
        <div style={{ borderLeft: '1px solid var(--border-strong)', paddingLeft: 16 }}>
          <Kicker>Mini lesson</Kicker>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)' }}>{miniLesson}</div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--hairline)' }}>
        <GradeActions q={q} />
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <button className="btn-quiet" style={{ padding: 0, fontSize: 13 }} onClick={() => requestFollowup('mini_lesson')} disabled={!!followupLoading || !!miniLesson}>
            {followupLoading === 'mini_lesson' ? 'Explaining…' : 'Explain more'}
          </button>
          <button className="btn-quiet" style={{ padding: 0, fontSize: 13 }} onClick={() => requestFollowup('harder')} disabled={!!followupLoading || !!harderQ}>
            {followupLoading === 'harder' ? 'Writing…' : 'Try a harder one'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/** One question at a time: thin progress line, large question, hairline answer rows. */
export default function QuestionView(q) {
  const { activeQ, current, harderQ, progress, revealed, onExit } = q
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <MetaLine q={q} />
        <button className="btn-quiet" style={{ fontSize: 12.5 }} onClick={onExit}>End quiz</button>
      </div>
      <div className="progress-bar">
        <motion.div className="progress-bar-fill" animate={{ width: `${progress}%` }} transition={SPRING} style={{ transition: 'none' }} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${current}-${harderQ ? 'h' : 'n'}`}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={SPRING}
          style={{ display: 'flex', flexDirection: 'column', gap: 28, marginTop: 36 }}
        >
          <h2 style={{ fontSize: 'clamp(20px, 2.4vw, 26px)', fontWeight: 500, lineHeight: 1.35, letterSpacing: '-0.02em', maxWidth: '62ch' }}>
            {activeQ.question}
          </h2>
          <AnswerInput q={q} />
          {revealed && <Reveal q={q} />}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
