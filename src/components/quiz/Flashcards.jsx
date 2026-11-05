import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

const SPRING = { type: 'spring', stiffness: 500, damping: 40 }

export default function Flashcards({ questions, fcDeck, fcFlipped, setFcFlipped, onGotIt, onReviewAgain, onExit }) {
  const totalCards = questions.length
  const doneCount = totalCards - new Set(fcDeck).size
  const q = fcDeck.length > 0 ? questions[fcDeck[0]] : null
  if (!q) return null

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="kicker" style={{ margin: 0 }}>Flashcards</span>
        <button className="btn-quiet" style={{ fontSize: 12.5 }} onClick={onExit}>Back to setup</button>
      </div>
      <div className="progress-bar">
        <motion.div className="progress-bar-fill" animate={{ width: `${(doneCount / totalCards) * 100}%` }} transition={SPRING} style={{ transition: 'none' }} />
      </div>
      <div className="mono" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
        <span style={{ color: 'var(--text)' }}>{doneCount}</span> / {totalCards} mastered
        <span style={{ color: 'var(--faint)' }}> · {fcDeck.length} left</span>
      </div>

      <button
        type="button"
        onClick={() => setFcFlipped(f => !f)}
        aria-label={fcFlipped ? 'Show question' : 'Reveal answer'}
        className="card"
        style={{
          width: '100%', minHeight: 260, marginTop: 28, cursor: 'pointer', font: 'inherit', color: 'var(--text)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16, padding: '40px 24px', textAlign: 'center',
          borderColor: fcFlipped ? 'var(--border-strong)' : undefined,
        }}
      >
        <span className="kicker" style={{ margin: 0, color: 'var(--faint)' }}>{fcFlipped ? 'Answer' : 'Question'}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${fcDeck[0]}-${fcFlipped}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ fontSize: fcFlipped ? 17 : 21, fontWeight: fcFlipped ? 400 : 500, lineHeight: 1.5, maxWidth: '52ch', letterSpacing: '-0.015em' }}
          >
            {fcFlipped ? q.answer : q.question}
          </motion.div>
        </AnimatePresence>
        <span style={{ fontSize: 12, color: 'var(--faint)' }}>{fcFlipped ? 'Tap to flip back' : 'Tap to reveal'}</span>
      </button>

      {fcFlipped && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-accent" onClick={onGotIt}>Got it</button>
          <button className="btn btn-ghost" onClick={onReviewAgain}><RotateCcw size={14} strokeWidth={1.6} />Review again</button>
        </div>
      )}
    </section>
  )
}
