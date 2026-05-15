import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const attentionLevels = [
  { max: 10,  name: 'Scattered',  color: '#f25a5a',  desc: 'Building the habit. Short sessions are real sessions.' },
  { max: 20,  name: 'Warming Up', color: '#f2c75a',  desc: 'Getting there. Brief bursts of real focus.' },
  { max: 35,  name: 'Focused',    color: '#60d3f8',  desc: 'Solid concentration. You\'re in the zone.' },
  { max: 50,  name: 'Deep Work',  color: '#a855f7',  desc: 'High performance mode. Elite territory.' },
  { max: 999, name: 'Flow State', color: '#b5f23a',  desc: 'Unbreakable. Your attention span is elite.' },
]

function getLevel(mins) {
  return attentionLevels.find(l => mins <= l.max) || attentionLevels[4]
}

export default function Onboarding() {
  const { user, updateProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [focusDuration, setFocusDuration] = useState(25)
  const [testType, setTestType] = useState('')
  const [subject, setSubject] = useState('')
  const [currentScore, setCurrentScore] = useState('')
  const [targetScore, setTargetScore] = useState('')
  const [testDate, setTestDate] = useState('')
  const [saving, setSaving] = useState(false)

  const level = getLevel(focusDuration)
  const pct = ((focusDuration - 5) / (60 - 5)) * 100

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Progress dots with connecting line */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, gap: 0 }}>
          {[1,2,3].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: s === step ? 24 : 8, height: 8, borderRadius: 4,
                background: s <= step ? 'var(--accent)' : 'var(--card2)',
                transition: 'all 0.3s',
                flexShrink: 0,
              }} />
              {i < 2 && (
                <div style={{
                  width: 32, height: 2, borderRadius: 1,
                  background: s < step
                    ? 'var(--accent)'
                    : 'linear-gradient(to right, var(--accent) 0%, var(--card2) 100%)',
                  transition: 'background 0.4s',
                  flexShrink: 0,
                }} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="card page-fade" style={{ padding: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              How long can you <em>actually</em> focus right now?
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              FocusOS starts at YOUR real attention span, not a generic 25-minute Pomodoro.
            </p>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div className="bebas" style={{ fontSize: 64, color: level.color, lineHeight: 1 }}>
                {focusDuration}<span style={{ fontSize: 28 }}>min</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: level.color, marginTop: 4 }}>{level.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{level.desc}</div>
            </div>

            <input
              type="range" min={5} max={60} value={focusDuration}
              onChange={e => setFocusDuration(Number(e.target.value))}
              style={{
                width: '100%', marginBottom: 24,
                background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, #222226 ${pct}%, #222226 100%)`,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 28 }}>
              <span>5 min</span><span>60 min</span>
            </div>

            <button className="btn btn-accent btn-full btn-lg" onClick={() => setStep(2)}>Continue →</button>
          </div>
        )}

        {step === 2 && (
          <div className="card page-fade" style={{ padding: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>What are you studying for?</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Set a score goal and FocusOS will build your study plan.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['SAT','ACT','AP'].map(t => (
                <button key={t} className={`pill ${testType === t ? 'active' : ''}`} onClick={() => setTestType(t)} style={{ flex: 1, textAlign: 'center' }}>
                  {t}
                </button>
              ))}
            </div>

            {testType && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {testType === 'AP' && (
                  <input type="text" placeholder="Subject (e.g. AP Calculus BC)" value={subject} onChange={e => setSubject(e.target.value)} />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label" style={{ display: 'block', marginBottom: 6 }}>Current Score</label>
                    <input type="number" placeholder={testType === 'SAT' ? '1000' : testType === 'ACT' ? '22' : '3'} value={currentScore} onChange={e => setCurrentScore(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" style={{ display: 'block', marginBottom: 6 }}>Target Score</label>
                    <input type="number" placeholder={testType === 'SAT' ? '1500' : testType === 'ACT' ? '32' : '5'} value={targetScore} onChange={e => setTargetScore(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 6 }}>Test Date</label>
                  <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setStep(3)} style={{ flex: 1 }}>Skip for now</button>
              <button className="btn btn-accent" onClick={() => setStep(3)} style={{ flex: 2 }}>Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card page-fade" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>You're all set</h2>

            <div style={{
              background: 'rgba(181,242,58,0.06)', border: '1px solid rgba(181,242,58,0.15)',
              borderRadius: 10, padding: '14px 18px', margin: '20px 0', textAlign: 'left',
            }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Your starting level</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: level.color }}>{level.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{focusDuration} min sessions · {level.desc}</div>
            </div>

            <blockquote style={{
              background: 'var(--card2)', borderRadius: 10, padding: '16px 20px',
              textAlign: 'left', margin: '0 0 24px', borderLeft: '3px solid var(--accent)',
            }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, fontStyle: 'italic' }}>
                "Whenever I study, my attention span is very terrible due to high usage of Instagram...
                I only can study for ten minutes maybe at most."
              </p>
              <footer style={{ fontSize: 12, color: 'var(--accent)', marginTop: 10, fontStyle: 'normal', fontWeight: 600 }}>
                — Myan Patel, Westford Academy sophomore
              </footer>
            </blockquote>

            <button className="btn btn-accent btn-full btn-lg" onClick={finish} disabled={saving}>
              {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Setting up...</> : 'Start Focusing →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
