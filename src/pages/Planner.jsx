import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

const TEST_TYPES = ['SAT', 'ACT', 'AP']
const LEVELS     = ['Beginner', 'Intermediate', 'Advanced']

export default function Planner() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  // Form state
  const [testType,     setTestType]     = useState('SAT')
  const [subject,      setSubject]      = useState('')
  const [testDate,     setTestDate]     = useState('')
  const [hoursPerWeek, setHoursPerWeek] = useState(8)
  const [currentLevel, setCurrentLevel] = useState('Intermediate')
  const [weakAreas,    setWeakAreas]    = useState('')

  // Plan state
  const [loading,    setLoading]    = useState(false)
  const [plan,       setPlan]       = useState(null)
  const [savedPlans, setSavedPlans] = useState([])
  const [view,       setView]       = useState('form') // 'form' | 'plan'

  useEffect(() => { if (user) loadSavedPlans() }, [user])

  async function loadSavedPlans() {
    const { data } = await supabase
      .from('study_plans')
      .select('id, test_type, subject, test_date, created_at, plan_json')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setSavedPlans(data || [])
  }

  async function generate() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: 'planner', testType, subject: subject || testType,
          testDate: testDate || null, hoursPerWeek, currentLevel, weakAreas,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.plan) {
        toast(data.error || 'Failed to generate plan. Try again.', 'error')
        return
      }
      setPlan(data.plan)
      setView('plan')

      // Save to Supabase
      await supabase.from('study_plans').insert({
        user_id: user.id, test_type: testType,
        subject: subject || testType, test_date: testDate || null,
        hours_per_week: hoursPerWeek, weak_areas: weakAreas,
        current_level: currentLevel, plan_json: data.plan,
      })
      loadSavedPlans()
    } catch (err) {
      toast('Network error — check your connection.', 'error')
    } finally {
      setLoading(false)
    }
  }

  function loadPlan(p) {
    setPlan(p.plan_json)
    setView('plan')
  }

  function quizFromWeek(week) {
    const BANK_SUBJECTS = ['SAT Math','SAT Reading','SAT Writing','ACT English','ACT Math','ACT Science','ACT Reading']
    const topic = (week.quizTopic || `${testType} ${subject || ''}`).trim()
    const matched =
      BANK_SUBJECTS.find(s => topic.toLowerCase().includes(s.toLowerCase())) ||
      BANK_SUBJECTS.find(s => s.toLowerCase().startsWith(testType.toLowerCase())) ||
      'SAT Math'
    navigate('/quiz', { state: { prefillBankSubject: matched } })
  }

  const totalHours = plan?.weeks?.reduce((sum, w) =>
    sum + (w.days?.reduce((s, d) => s + (d.duration || 45), 0) || 0), 0) / 60

  return (
    <div className="page-fade" style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700 }}>AI Study Planner</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Personalized week-by-week plan built around your schedule
          </div>
        </div>
        <Link to="/progress" style={{
          fontSize: 13, color: 'var(--muted)', textDecoration: 'none',
          padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 8,
        }}>← Progress</Link>
      </div>

      {/* Saved plans */}
      {savedPlans.length > 0 && view === 'form' && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="label" style={{ marginBottom: 12 }}>Recent Plans</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedPlans.map(p => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: 8, background: 'var(--card2)',
                border: '1px solid var(--border)',
              }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{p.test_type}</span>
                  {p.subject && p.subject !== p.test_type && (
                    <span style={{ color: 'var(--muted)', fontSize: 13 }}> · {p.subject}</span>
                  )}
                  {p.test_date && (
                    <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>
                      {new Date(p.test_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => loadPlan(p)}>View →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'form' ? (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div>
              <label className="label" style={{ display: 'block', marginBottom: 10 }}>Test Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TEST_TYPES.map(t => (
                  <button key={t} className={`pill ${testType === t ? 'active' : ''}`}
                    onClick={() => setTestType(t)} style={{ flex: 1, textAlign: 'center', fontSize: 14 }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {testType === 'AP' && (
              <div>
                <label className="label" style={{ display: 'block', marginBottom: 6 }}>AP Subject</label>
                <input type="text" placeholder="e.g. AP Calculus BC, AP World History"
                  value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
            )}

            <div className="planner-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: 6 }}>Test Date (optional)</label>
                <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, letterSpacing: 2, color: '#9494a0' }}>HOURS PER WEEK</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{hoursPerWeek}h</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={hoursPerWeek}
                  onChange={e => setHoursPerWeek(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${((hoursPerWeek - 1) / 19) * 100}%, #222226 ${((hoursPerWeek - 1) / 19) * 100}%, #222226 100%)`,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555560' }}>
                  <span>1h</span>
                  <span>10h</span>
                  <span>20h</span>
                </div>
              </div>
            </div>

            <div>
              <label className="label" style={{ display: 'block', marginBottom: 10 }}>Current Level</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {LEVELS.map(l => (
                  <button key={l} className={`pill ${currentLevel === l ? 'active' : ''}`}
                    onClick={() => setCurrentLevel(l)} style={{ flex: 1, textAlign: 'center' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>
                Weak Areas <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11, color: 'var(--muted)' }}>(optional)</span>
              </label>
              <textarea
                placeholder={`e.g. ${testType === 'SAT' ? 'algebra, reading comprehension' : testType === 'ACT' ? 'science reasoning, trigonometry' : 'free response, unit 3'}`}
                value={weakAreas} onChange={e => setWeakAreas(e.target.value)}
                rows={2} style={{ resize: 'none' }}
              />
            </div>

            <button className="btn btn-accent btn-full btn-lg" onClick={generate} disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Generating plan...</> : 'Generate My Study Plan →'}
            </button>
          </div>
        </div>
      ) : plan && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button className="btn btn-ghost" onClick={() => setView('form')}>← New Plan</button>
          </div>

          {/* Overview */}
          <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--accent)' }}>
            <div className="label" style={{ marginBottom: 8 }}>Your Plan Overview</div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{plan.overview}</p>
            {totalHours > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {plan.weeks?.length} weeks · ~{Math.round(totalHours)}h total
                </span>
              </div>
            )}
          </div>

          {/* Weekly grid */}
          {plan.weeks?.map(week => (
            <div key={week.weekNum} className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.05em' }}>
                    WEEK {week.weekNum}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{week.theme}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => quizFromWeek(week)}>
                  Generate Quiz →
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {week.days?.map(d => (
                  <div key={d.day} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 12px', borderRadius: 8, background: 'var(--card2)',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', width: 36, flexShrink: 0 }}>
                      {d.day.slice(0, 3).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, fontSize: 13 }}>{d.task}</div>
                    <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>
                      {d.duration}min
                    </div>
                  </div>
                ))}
              </div>

              {week.weekendPractice && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: 12, color: 'var(--muted)',
                  background: 'rgba(181,242,58,0.04)', border: '1px solid rgba(181,242,58,0.12)',
                }}>
                  Weekend: {week.weekendPractice}
                </div>
              )}
            </div>
          ))}

          {/* Final week + Day before */}
          <div className="planner-final-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {plan.finalWeek && (
              <div className="card" style={{ border: '1px solid rgba(168,139,250,0.3)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>Final Week</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>{plan.finalWeek.focus}</div>
                <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {plan.finalWeek.tasks?.map((t, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--text)' }}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {plan.dayBefore && (
              <div className="card" style={{ border: '1px solid rgba(242,199,90,0.3)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)', marginBottom: 8 }}>Day Before</div>
                <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {plan.dayBefore.tasks?.map((t, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--text)' }}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Resources */}
          {plan.resources?.length > 0 && (
            <div className="card">
              <div className="label" style={{ marginBottom: 12 }}>Recommended Resources</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.resources.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: '10px 12px', borderRadius: 8, background: 'var(--card2)',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: 'rgba(181,242,58,0.1)', border: '1px solid rgba(181,242,58,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
                    }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
