import { Kicker } from './parts'

const ROW = { padding: '12px 0', borderTop: '1px solid var(--hairline)' }

function toggleInSet(set, i) {
  const next = new Set(set)
  if (next.has(i)) next.delete(i)
  else next.add(i)
  return next
}

function KeyTerms({ terms, flipped, setFlipped }) {
  return (
    <section>
      <Kicker>Key terms · tap to reveal</Kicker>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
        {terms.map((kt, i) => {
          const isOpen = flipped.has(i)
          return (
            <button key={i} onClick={() => setFlipped(prev => toggleInSet(prev, i))}
              style={{
                minHeight: 64, padding: '12px 14px', textAlign: 'left', cursor: 'pointer', font: 'inherit',
                background: 'transparent', borderRadius: 'var(--radius-md)',
                border: `1px solid ${isOpen ? 'var(--border-strong)' : 'var(--border)'}`,
                color: isOpen ? 'var(--muted)' : 'var(--text)', fontSize: isOpen ? 12.5 : 13.5,
                fontWeight: isOpen ? 400 : 500, lineHeight: 1.45, transition: 'border-color 0.15s',
              }}>
              {isOpen ? kt.definition : kt.term}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function PracticeQuestions({ questions, revealed, setRevealed }) {
  return (
    <section>
      <Kicker>Practice questions</Kicker>
      {questions.map((q, i) => (
        <div key={i} style={ROW}>
          <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', gap: 12 }}>
            <span className="mono" style={{ color: 'var(--faint)', fontSize: 12, paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
            <span>{q.question}</span>
          </div>
          {revealed[i] ? (
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 6, paddingLeft: 30 }}>{q.answer}</div>
          ) : (
            <button className="btn-quiet" style={{ marginLeft: 24, fontSize: 12.5 }}
              onClick={() => setRevealed(prev => ({ ...prev, [i]: true }))}>
              Show answer
            </button>
          )}
        </div>
      ))}
    </section>
  )
}

export default function VideoSummary({ videoResult, videoId, videoFlipped, setVideoFlipped, videoRevealed, setVideoRevealed, onTakeQuiz }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36, marginTop: 40 }}>
      <section style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {videoId && (
          <img src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt="" width={128} height={72}
            style={{ borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }} />
        )}
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h2 style={{ fontSize: 18, lineHeight: 1.35 }}>{videoResult.title}</h2>
          <div className="mono" style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>{videoResult.duration_estimate}</div>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)', marginTop: 10, maxWidth: '68ch' }}>{videoResult.summary}</p>
        </div>
      </section>

      {videoResult.keyPoints?.length > 0 && (
        <section>
          <Kicker>Key points</Kicker>
          {videoResult.keyPoints.map((pt, i) => (
            <div key={i} style={{ ...ROW, fontSize: 14, lineHeight: 1.55 }}>{pt}</div>
          ))}
        </section>
      )}

      {videoResult.keyTerms?.length > 0 && (
        <KeyTerms terms={videoResult.keyTerms} flipped={videoFlipped} setFlipped={setVideoFlipped} />
      )}

      {videoResult.studyNotes && (
        <section>
          <Kicker>Study notes</Kicker>
          <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)', whiteSpace: 'pre-wrap', maxWidth: '72ch' }}>
            {videoResult.studyNotes}
          </div>
        </section>
      )}

      {videoResult.questions?.length > 0 && (
        <PracticeQuestions questions={videoResult.questions} revealed={videoRevealed} setRevealed={setVideoRevealed} />
      )}

      <div>
        <button className="btn btn-ghost btn-lg" onClick={onTakeQuiz}>Take a full quiz on this video</button>
      </div>
    </div>
  )
}
