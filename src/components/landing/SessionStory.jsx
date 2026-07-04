import { useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const RING_R = 118
const RING_C = 2 * Math.PI * RING_R

const PHASES = [
  {
    word: 'FOCUS',
    kicker: 'PHASE 01 · 25:00 → 17:00',
    line: '25 minutes. One subject. Zero doomscroll.',
    body: 'The adaptive timer learns your real attention span and sizes each block to it — with ambient audio that survives even iOS.',
  },
  {
    word: 'TEST',
    kicker: 'PHASE 02 · 17:00 → 08:00',
    line: 'Your notes become questions.',
    body: 'Claude AI turns what you just studied into active-recall questions on the spot. Testing yourself beats re-reading — every time.',
  },
  {
    word: 'STREAK',
    kicker: 'PHASE 03 · 08:00 → 00:30',
    line: 'Show up tomorrow. And the day after.',
    body: 'Enter your SAT, ACT, or AP date and FocusOS plans backwards from it. Streaks and XP make consistency automatic.',
  },
]

const QUIZ = {
  q: 'Active recall works because retrieval —',
  choices: ['strengthens the memory trace', 'feels easier than re-reading', 'only works for math', 'requires flashcards'],
  correct: 0,
}

// deterministic pseudo-random fill pattern for the heatmap (no Math.random → stable renders)
const CELLS = Array.from({ length: 70 }, (_, i) => (i * 37 + 11) % 97 < 62)

export default function SessionStory() {
  const container = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(() => {
    if (reduced) return

    // initial state via GSAP (not inline styles — GSAP parses translateY() into a
    // separate `y` channel that yPercent tweens never touch, leaving words stuck)
    gsap.set('.ss-word-0 .ss-inner, .ss-word-1 .ss-inner, .ss-word-2 .ss-inner', { yPercent: 110 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container.current,
        start: 'top top',
        end: '+=3400',
        scrub: 1,
        pin: true,
        anticipatePin: 1,
      },
    })

    // ── PHASE 1 · FOCUS — ring draws down like time elapsing
    tl.fromTo('.ss-word-0 .ss-inner', { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'none' }, 0)
      .fromTo('.ss-copy-0', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.1)
      .fromTo('.ss-ring-fg', { strokeDashoffset: 0 }, { strokeDashoffset: RING_C * 0.62, duration: 2.2, ease: 'none' }, 0.2)
      .fromTo('.ss-vis-0', { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.5 }, 0)

    // phase 1 out
    tl.to('.ss-word-0 .ss-inner', { yPercent: -110, duration: 0.5 }, 2.6)
      .to('.ss-copy-0', { autoAlpha: 0, y: -18, duration: 0.4 }, 2.6)
      .to('.ss-vis-0', { autoAlpha: 0, scale: 0.95, duration: 0.4 }, 2.7)

    // ── PHASE 2 · TEST — quiz answers itself
    tl.fromTo('.ss-word-1 .ss-inner', { yPercent: 110 }, { yPercent: 0, duration: 0.6 }, 3.0)
      .fromTo('.ss-copy-1', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 3.1)
      .fromTo('.ss-vis-1', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 3.1)
      .fromTo('.ss-choice', { autoAlpha: 0, x: 18 }, { autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.28 }, 3.5)
      .to('.ss-choice-correct', {
        borderColor: 'var(--accent)', color: 'var(--accent)',
        backgroundColor: 'rgba(181,242,58,0.08)', duration: 0.4,
      }, 5.1)

    // phase 2 out
    tl.to('.ss-word-1 .ss-inner', { yPercent: -110, duration: 0.5 }, 5.8)
      .to('.ss-copy-1', { autoAlpha: 0, y: -18, duration: 0.4 }, 5.8)
      .to('.ss-vis-1', { autoAlpha: 0, y: -22, duration: 0.4 }, 5.9)

    // ── PHASE 3 · STREAK — heatmap fills day by day
    tl.fromTo('.ss-word-2 .ss-inner', { yPercent: 110 }, { yPercent: 0, duration: 0.6 }, 6.2)
      .fromTo('.ss-copy-2', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 6.3)
      .fromTo('.ss-vis-2', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 6.3)
      .fromTo('.lv3-cell.on', { backgroundColor: 'rgba(255,255,255,0.06)', scale: 0.7 }, {
        backgroundColor: '#b5f23a', scale: 1, duration: 0.12,
        stagger: { each: 0.035, from: 'start' }, ease: 'none',
      }, 6.6)
      .fromTo('.ss-streak-n', { textContent: 0 }, {
        textContent: 43, duration: 2.2, snap: { textContent: 1 }, ease: 'none',
      }, 6.6)
  }, { scope: container })

  const stageRow = {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
    gap: 'clamp(32px, 6vw, 110px)', width: '100%', maxWidth: 1150, padding: '0 clamp(20px, 4vw, 48px)',
  }
  const wordStyle = {
    fontFamily: "'Bebas Neue', 'Outfit', sans-serif",
    fontSize: 'clamp(64px, 11vw, 168px)', lineHeight: 0.9, letterSpacing: '2px', color: '#f0f0f2',
  }
  const copyBlock = { maxWidth: 420 }
  const kickerStyle = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '3px',
    color: 'var(--accent)', display: 'block', marginBottom: 14,
  }
  const lineStyle = { fontSize: 'clamp(19px, 2.1vw, 26px)', fontWeight: 700, color: '#f0f0f2', marginBottom: 12, lineHeight: 1.25 }
  const bodyStyle = { fontSize: 'clamp(14px, 1.35vw, 16px)', lineHeight: 1.7, color: 'rgba(240,240,242,0.58)' }
  const visBox = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }

  return (
    <section ref={container} aria-label="One FocusOS session" style={{ position: 'relative', background: '#0a0a0b' }}>
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative',
      }}>
        <div style={stageRow}>
          {/* left: stacked phase words + copy */}
          <div style={{ flex: '1 1 340px', minWidth: 300 }}>
            <div style={{ position: 'relative', height: 'clamp(70px, 12vw, 160px)', marginBottom: 26 }}>
              {PHASES.map((p, i) => (
                <h2 key={p.word} className={`lv3-line-mask ss-word-${i}`} aria-hidden={reduced ? undefined : i !== 0}
                  style={{ ...wordStyle, position: reduced ? 'static' : 'absolute', inset: 0, margin: 0 }}>
                  <span className="ss-inner">
                    {p.word}<span style={{ color: 'var(--accent)' }}>.</span>
                  </span>
                </h2>
              ))}
            </div>
            <div style={{ position: 'relative', minHeight: 170 }}>
              {PHASES.map((p, i) => (
                <div key={p.word} className={`ss-copy-${i}`}
                  style={{ ...copyBlock, position: reduced ? 'static' : 'absolute', top: 0, opacity: reduced ? 1 : (i === 0 ? 1 : 0), marginBottom: reduced ? 34 : 0 }}>
                  <span style={kickerStyle}>{p.kicker}</span>
                  <p style={lineStyle}>{p.line}</p>
                  <p style={bodyStyle}>{p.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* right: swapping visuals */}
          <div style={{ flex: '0 1 380px', position: 'relative', height: 'clamp(280px, 38vw, 380px)', minWidth: 290 }}>
            {/* vis 0 — timer ring */}
            <div className="ss-vis-0" style={{ ...visBox, position: reduced ? 'static' : 'absolute' }}>
              <svg width="280" height="280" viewBox="0 0 280 280" role="img" aria-label="Focus timer at 25 minutes">
                <circle cx="140" cy="140" r={RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                <circle className="ss-ring-fg" cx="140" cy="140" r={RING_R} fill="none" stroke="var(--accent)"
                  strokeWidth="7" strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset="0"
                  transform="rotate(-90 140 140)" style={{ filter: 'drop-shadow(0 0 10px rgba(181,242,58,0.45))' }} />
                <text x="140" y="132" textAnchor="middle" fill="#f0f0f2"
                  fontFamily="'JetBrains Mono', monospace" fontSize="42" fontWeight="600">25:00</text>
                <text x="140" y="164" textAnchor="middle" fill="rgba(240,240,242,0.4)"
                  fontFamily="'JetBrains Mono', monospace" fontSize="12" letterSpacing="3">AP BIO · DEEP WORK</text>
              </svg>
            </div>

            {/* vis 1 — quiz card */}
            <div className="ss-vis-1" style={{ ...visBox, opacity: reduced ? 1 : 0, position: reduced ? 'static' : 'absolute' }}>
              <div style={{
                width: 'min(360px, 100%)', background: '#111113', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: 'clamp(18px, 2.4vw, 28px)',
              }}>
                <span style={{ ...kickerStyle, marginBottom: 10 }}>QUIZ · FROM YOUR NOTES</span>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#f0f0f2', marginBottom: 16, lineHeight: 1.45 }}>{QUIZ.q}</p>
                {QUIZ.choices.map((c, i) => (
                  <div key={c} className={`ss-choice ${i === QUIZ.correct ? 'ss-choice-correct' : ''}`} style={{
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                    padding: '10px 14px', marginBottom: 8, fontSize: 13.5,
                    color: 'rgba(240,240,242,0.72)', fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    <span style={{ color: 'rgba(240,240,242,0.35)', marginRight: 10 }}>{String.fromCharCode(65 + i)}</span>{c}
                  </div>
                ))}
              </div>
            </div>

            {/* vis 2 — streak heatmap */}
            <div className="ss-vis-2" style={{ ...visBox, opacity: reduced ? 1 : 0, position: reduced ? 'static' : 'absolute' }}>
              <div style={{ width: 'min(340px, 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                  <span style={{ ...kickerStyle, marginBottom: 0 }}>LAST 10 WEEKS</span>
                  <span style={{ fontFamily: "'Bebas Neue', 'Outfit', sans-serif", fontSize: 40, color: 'var(--accent)', lineHeight: 1 }}>
                    <span className="ss-streak-n">{reduced ? 43 : 0}</span><span style={{ fontSize: 18, color: 'rgba(240,240,242,0.5)', marginLeft: 6 }}>DAY STREAK</span>
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 5 }}>
                  {CELLS.map((on, i) => (
                    <div key={i} className={`lv3-cell ${on ? 'on' : ''}`} style={reduced && on ? { background: 'var(--accent)' } : undefined} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
