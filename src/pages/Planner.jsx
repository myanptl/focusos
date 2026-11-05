import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

const TEST_TYPES = ['SAT', 'ACT', 'AP']
const LEVELS     = ['Beginner', 'Intermediate', 'Advanced']

const fieldLabel = { display: 'block', marginBottom: 8 }
const hairTop = { borderTop: '1px solid var(--hairline)' }

function shortDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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
    } catch {
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
    <div style={{ maxWidth: 720 }}>
      <header className="page-head">
        <h1 className="page-title">Planner</h1>
        <p>A week-by-week plan built around the hours you actually have.</p>
      </header>

      {view === 'form' ? (
        <>
          {savedPlans.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <span className="kicker">Recent plans</span>
              <ul style={{ listStyle: 'none', borderBottom: '1px solid var(--hairline)' }}>
                {savedPlans.map(p => (
                  <li key={p.id} style={{ ...hairTop, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                    <span className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--muted)', minWidth: 30 }}>{p.test_type}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.subject && p.subject !== p.test_type ? p.subject : `${p.test_type} prep`}
                    </span>
                    {p.test_date && <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{shortDate(p.test_date)}</span>}
                    <button className="btn-quiet" onClick={() => loadPlan(p)} style={{ fontSize: 12.5 }}>
                      Open <ArrowRight size={14} strokeWidth={1.6} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <span className="kicker" style={{ marginBottom: -8 }}>New plan</span>

            <div>
              <span className="label" style={fieldLabel}>Test</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {TEST_TYPES.map(t => (
                  <button key={t} className={`pill ${testType === t ? 'active' : ''}`}
                    onClick={() => setTestType(t)} style={{ flex: 1 }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {testType === 'AP' && (
              <div>
                <label className="label" style={fieldLabel} htmlFor="plan-subject">AP subject</label>
                <input id="plan-subject" type="text" placeholder="e.g. AP Calculus BC, AP World History"
                  value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
            )}

            <div className="planner-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label className="label" style={fieldLabel} htmlFor="plan-date">Test date <span style={{ color: 'var(--faint)' }}>· optional</span></label>
                <input id="plan-date" type="date" value={testDate} onChange={e => setTestDate(e.target.value)} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <label className="label" htmlFor="plan-hours">Hours per week</label>
                  <span className="mono" style={{ fontSize: 13, color: 'var(--text)' }}>{hoursPerWeek}h</span>
                </div>
                <input id="plan-hours" type="range" min={1} max={20} step={1}
                  value={hoursPerWeek} onChange={e => setHoursPerWeek(Number(e.target.value))} />
                <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--faint)', marginTop: 4 }}>
                  <span>1h</span><span>10h</span><span>20h</span>
                </div>
              </div>
            </div>

            <div>
              <span className="label" style={fieldLabel}>Current level</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {LEVELS.map(l => (
                  <button key={l} className={`pill ${currentLevel === l ? 'active' : ''}`}
                    onClick={() => setCurrentLevel(l)} style={{ flex: 1 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label" style={fieldLabel} htmlFor="plan-weak">
                Weak areas <span style={{ color: 'var(--faint)' }}>· optional</span>
              </label>
              <textarea
                id="plan-weak"
                placeholder={`e.g. ${testType === 'SAT' ? 'algebra, reading comprehension' : testType === 'ACT' ? 'science reasoning, trigonometry' : 'free response, unit 3'}`}
                value={weakAreas} onChange={e => setWeakAreas(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <button className="btn btn-accent btn-lg" onClick={generate} disabled={loading}>
                {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--on-accent)' }} />Generating plan…</> : <>Generate plan <ArrowRight size={16} strokeWidth={1.6} /></>}
              </button>
            </div>
          </section>
        </>
      ) : plan && (
        <PlanView plan={plan} totalHours={totalHours} onBack={() => setView('form')} onQuiz={quizFromWeek} />
      )}
    </div>
  )
}

function PlanView({ plan, totalHours, onBack, onQuiz }) {
  return (
    <div>
      <button className="btn-quiet" onClick={onBack} style={{ marginBottom: 24, marginLeft: -6 }}>
        <ArrowLeft size={14} strokeWidth={1.6} /> New plan
      </button>

      <section style={{ marginBottom: 40 }}>
        <span className="kicker">Overview</span>
        <p style={{ fontSize: 15, lineHeight: 1.7, maxWidth: '62ch' }}>{plan.overview}</p>
        {totalHours > 0 && (
          <div className="stat-row" style={{ marginTop: 20 }}>
            <div><div className="v">{plan.weeks?.length}</div><div className="k">Weeks</div></div>
            <div><div className="v">~{Math.round(totalHours)}h</div><div className="k">Total study</div></div>
          </div>
        )}
      </section>

      <ol style={{ listStyle: 'none', borderBottom: '1px solid var(--hairline)' }}>
        {plan.weeks?.map(week => (
          <li key={week.weekNum} style={{ ...hairTop, padding: '24px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <div>
                <span className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--accent)' }}>
                  WEEK {String(week.weekNum).padStart(2, '0')}
                </span>
                <div style={{ fontSize: 15.5, fontWeight: 500, marginTop: 4 }}>{week.theme}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => onQuiz(week)}>
                Quiz this week <ArrowRight size={14} strokeWidth={1.6} />
              </button>
            </div>

            <div>
              {week.days?.map(d => (
                <div key={d.day} style={{ ...hairTop, display: 'flex', alignItems: 'baseline', gap: 14, padding: '9px 0' }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', width: 32, flexShrink: 0 }}>
                    {d.day.slice(0, 3).toUpperCase()}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>{d.task}</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{d.duration}m</span>
                </div>
              ))}
              {week.weekendPractice && (
                <div style={{ ...hairTop, display: 'flex', alignItems: 'baseline', gap: 14, padding: '9px 0', fontSize: 13, color: 'var(--muted)' }}>
                  <span className="mono" style={{ fontSize: 11, width: 32, flexShrink: 0 }}>WKND</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{week.weekendPractice}</span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {(plan.finalWeek || plan.dayBefore) && (
        <div className="planner-final-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 40 }}>
          {plan.finalWeek && (
            <section>
              <span className="kicker">Final week</span>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>{plan.finalWeek.focus}</p>
              <TaskList tasks={plan.finalWeek.tasks} />
            </section>
          )}
          {plan.dayBefore && (
            <section>
              <span className="kicker">Day before</span>
              <TaskList tasks={plan.dayBefore.tasks} />
            </section>
          )}
        </div>
      )}

      {plan.resources?.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <span className="kicker">Resources</span>
          <ol style={{ listStyle: 'none', borderBottom: '1px solid var(--hairline)' }}>
            {plan.resources.map((r, i) => (
              <li key={i} style={{ ...hairTop, display: 'flex', gap: 14, padding: '12px 0' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--faint)', width: 20, flexShrink: 0, paddingTop: 2 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 2 }}>{r.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

function TaskList({ tasks }) {
  return (
    <ul style={{ listStyle: 'none' }}>
      {tasks?.map((t, i) => (
        <li key={i} style={{ ...hairTop, fontSize: 13.5, padding: '8px 0' }}>{t}</li>
      ))}
    </ul>
  )
}
