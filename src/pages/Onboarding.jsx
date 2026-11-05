import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import LogoIcon from '../components/LogoIcon'

const attentionLevels = [
  { max: 10,  name: 'Scattered',  desc: 'Building the habit. Short sessions are real sessions.' },
  { max: 20,  name: 'Warming up', desc: 'Getting there. Brief bursts of real focus.' },
  { max: 35,  name: 'Focused',    desc: 'Solid concentration. You\'re in the zone.' },
  { max: 50,  name: 'Deep work',  desc: 'High performance mode.' },
  { max: 999, name: 'Flow state', desc: 'Your attention span is already long. We\'ll keep it there.' },
]
const TOP_LEVEL = attentionLevels[attentionLevels.length - 1]

function getLevel(mins) {
  return attentionLevels.find(l => mins <= l.max) || TOP_LEVEL
}

const SPRING = { type: 'spring', stiffness: 500, damping: 40 }
const slide = {
  enter: dir => ({ x: dir * 32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: dir => ({ x: dir * -32, opacity: 0 }),
}

const SCORE_PLACEHOLDERS = {
  SAT: { current: '1000', target: '1500' },
  ACT: { current: '22', target: '32' },
  AP:  { current: '3', target: '5' },
}

function StepHead({ kicker, title, sub }) {
  return (
    <header style={{ marginBottom: 36 }}>
      <span className="kicker">{kicker}</span>
      <h1 className="page-title">{title}</h1>
      {sub && <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>{sub}</p>}
    </header>
  )
}

export default function Onboarding() {
  const { user, updateProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('focus')
  const [dir, setDir] = useState(1)
  const [focusDuration, setFocusDuration] = useState(25)
  const [testType, setTestType] = useState('')
  const [subject, setSubject] = useState('')
  const [currentScore, setCurrentScore] = useState('')
  const [targetScore, setTargetScore] = useState('')
  const [testDate, setTestDate] = useState('')
  const [saving, setSaving] = useState(false)

  const level = getLevel(focusDuration)
  const isTop = level === TOP_LEVEL
  const steps = testType ? ['focus', 'test', 'score', 'done'] : ['focus', 'test', 'done']
  const stepIndex = steps.indexOf(step)
  const progress = (stepIndex + 1) / steps.length

  function go(next) {
    setDir(steps.indexOf(next) >= stepIndex ? 1 : -1)
    setStep(next)
  }

  function back() {
    if (stepIndex > 0) go(steps[stepIndex - 1])
  }

  async function finish() {
    setSaving(true)
    await updateProfile({ focus_duration: focusDuration, onboarding_complete: true })
    if (testType && targetScore) {
      await supabase.from('score_goals').insert({
        user_id: user.id,
        test_type: testType,
        subject: subject || testType,
        current_score: currentScore ? Number(currentScore) : null,
        target_score: Number(targetScore),
        test_date: testDate || null,
      })
    }
    await refreshProfile()
    navigate('/timer')
  }

  const placeholders = SCORE_PLACEHOLDERS[testType] || SCORE_PLACEHOLDERS.SAT

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ height: 2, background: 'var(--hairline)', position: 'relative' }} aria-hidden="true">
        <motion.div
          style={{ position: 'absolute', inset: 0, background: 'var(--accent)', transformOrigin: 'left' }}
          initial={false}
          animate={{ scaleX: progress }}
          transition={SPRING}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
        <LogoIcon size={22} />
        <span className="mono" style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: '0.08em' }}>
          {String(stepIndex + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
        </span>
      </div>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px 64px', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SPRING}
            >
              {step === 'focus' && (
                <>
                  <StepHead
                    kicker="Setup · Attention"
                    title="How long can you actually focus right now?"
                    sub="FocusOS starts at your real attention span, not a generic 25-minute Pomodoro."
                  />
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="num" style={{ fontSize: 72, lineHeight: 1, color: 'var(--text)' }}>{focusDuration}</span>
                    <span className="mono" style={{ fontSize: 14, color: 'var(--muted)' }}>min</span>
                  </div>
                  <div style={{ marginTop: 10, minHeight: 44 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: isTop ? 'var(--accent)' : 'var(--text)' }}>{level.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{level.desc}</div>
                  </div>
                  <input
                    type="range" min={5} max={60} value={focusDuration}
                    aria-label="Focus duration in minutes"
                    onChange={e => setFocusDuration(Number(e.target.value))}
                    style={{ width: '100%', marginTop: 28 }}
                  />
                  <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--faint)', marginTop: 8 }}>
                    <span>5</span><span>60</span>
                  </div>
                  <div style={{ marginTop: 40 }}>
                    <button className="btn btn-accent btn-lg" onClick={() => go('test')}>Continue</button>
                  </div>
                </>
              )}

              {step === 'test' && (
                <>
                  <StepHead
                    kicker="Setup · Goal"
                    title="What are you studying for?"
                    sub="Pick a test and FocusOS will build your study plan around it."
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['SAT', 'ACT', 'AP'].map(t => (
                      <button
                        key={t}
                        className={`pill ${testType === t ? 'active' : ''}`}
                        onClick={() => setTestType(t)}
                        style={{ flex: 1, height: 40 }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn-quiet" onClick={back} aria-label="Back"><ArrowLeft size={16} strokeWidth={1.6} /></button>
                    <button className="btn btn-accent btn-lg" onClick={() => go(testType ? 'score' : 'done')} disabled={!testType}>Continue</button>
                    <button className="btn-quiet" onClick={() => go('done')} style={{ marginLeft: 'auto' }}>Skip for now</button>
                  </div>
                </>
              )}

              {step === 'score' && (
                <>
                  <StepHead
                    kicker={`Setup · ${testType}`}
                    title="Where are you, and where do you want to be?"
                    sub="A target score is enough. The rest is optional."
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {testType === 'AP' && (
                      <div>
                        <label className="label" htmlFor="ob-subject" style={{ display: 'block', marginBottom: 6 }}>Subject</label>
                        <input id="ob-subject" type="text" placeholder="e.g. AP Calculus BC" value={subject} onChange={e => setSubject(e.target.value)} />
                      </div>
                    )}
                    <div className="grid-2">
                      <div>
                        <label className="label" htmlFor="ob-current" style={{ display: 'block', marginBottom: 6 }}>Current score</label>
                        <input id="ob-current" type="number" placeholder={placeholders.current} value={currentScore} onChange={e => setCurrentScore(e.target.value)} />
                      </div>
                      <div>
                        <label className="label" htmlFor="ob-target" style={{ display: 'block', marginBottom: 6 }}>Target score</label>
                        <input id="ob-target" type="number" placeholder={placeholders.target} value={targetScore} onChange={e => setTargetScore(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="label" htmlFor="ob-date" style={{ display: 'block', marginBottom: 6 }}>Test date</label>
                      <input id="ob-date" type="date" value={testDate} onChange={e => setTestDate(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn-quiet" onClick={back} aria-label="Back"><ArrowLeft size={16} strokeWidth={1.6} /></button>
                    <button className="btn btn-accent btn-lg" onClick={() => go('done')}>Continue</button>
                    <button className="btn-quiet" onClick={() => go('done')} style={{ marginLeft: 'auto' }}>Skip for now</button>
                  </div>
                </>
              )}

              {step === 'done' && (
                <>
                  <StepHead kicker="Setup · Ready" title="You're set." />
                  <div className="stat-row">
                    <div>
                      <div className="v">{focusDuration}<span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 4 }}>min</span></div>
                      <div className="k">Starting session</div>
                    </div>
                    <div>
                      <div className="v" style={{ fontSize: 16, paddingTop: 5, color: isTop ? 'var(--accent)' : 'var(--text)' }}>{level.name}</div>
                      <div className="k">Starting level</div>
                    </div>
                  </div>
                  <blockquote className="research-callout" style={{ marginTop: 28 }}>
                    &ldquo;Whenever I study, my attention span is very terrible due to high usage of Instagram...
                    I only can study for ten minutes maybe at most.&rdquo;
                    <footer style={{ marginTop: 8, color: 'var(--faint)', fontSize: 12 }}>
                      Myan Patel, Westford Academy sophomore
                    </footer>
                  </blockquote>
                  <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn-quiet" onClick={back} aria-label="Back" disabled={saving}><ArrowLeft size={16} strokeWidth={1.6} /></button>
                    <button className="btn btn-accent btn-lg" onClick={finish} disabled={saving}>
                      {saving ? <><span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--on-accent)' }} /> Setting up</> : 'Start focusing'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
