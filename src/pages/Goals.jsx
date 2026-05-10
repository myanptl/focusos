import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

const TEST_COLORS = { SAT: '#a855f7', ACT: '#f2c75a', AP: '#b5f23a' }

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function sessionsNeeded(current, target, daysLeft) {
  if (!daysLeft || daysLeft <= 0 || !target || !current) return null
  const weeksLeft = Math.floor(daysLeft / 7)
  if (weeksLeft <= 0) return null
  const gap = target - current
  const sessionsTotal = Math.ceil((gap / (target * 0.01)) * 10)
  return Math.ceil(sessionsTotal / weeksLeft)
}

export default function Goals() {
  const { user } = useAuth()
  const toast = useToast()

  // Page state
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingScore, setEditingScore] = useState({})

  // Modal form state
  const [testType, setTestType] = useState('SAT')
  const [subject, setSubject] = useState('')
  const [modalCurrent, setModalCurrent] = useState('')
  const [modalTarget, setModalTarget] = useState('')
  const [modalDate, setModalDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadGoals() }, [user])

  async function loadGoals() {
    if (!user) return
    const { data } = await supabase.from('score_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setGoals(data || [])
    setLoading(false)
  }

  function openModal() {
    setTestType('SAT')
    setSubject('')
    setModalCurrent('')
    setModalTarget('')
    setModalDate('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!modalTarget) return
    setSaving(true)
    const { data, error } = await supabase.from('score_goals').insert({
      user_id: user.id,
      test_type: testType,
      subject: subject || testType,
      current_score: modalCurrent ? Number(modalCurrent) : null,
      target_score: Number(modalTarget),
      test_date: modalDate || null,
    }).select().single()
    if (!error) {
      setGoals(prev => [data, ...prev])
      toast('Goal added!', 'success')
    }
    setSaving(false)
    setShowModal(false)
  }

  async function updateCurrentScore(goalId, score) {
    const { error } = await supabase.from('score_goals').update({ current_score: Number(score) }).eq('id', goalId)
    if (!error) {
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, current_score: Number(score) } : g))
      toast('Score updated!', 'success')
    }
    setEditingScore({})
  }

  async function deleteGoal(goalId) {
    await supabase.from('score_goals').delete().eq('id', goalId)
    setGoals(prev => prev.filter(g => g.id !== goalId))
    toast('Goal removed', 'info')
  }

  return (
    <>
      <div className="page-fade" style={{ background: 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title">Score Goals</h1>
        <button className="btn btn-accent" onClick={openModal}
          style={{ borderRadius: 10, padding: '10px 20px' }}>+ Add Goal</button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Loading goals...</div>}

      {!loading && goals.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <svg viewBox="0 0 80 80" width="72" height="72">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2"/>
              <circle cx="40" cy="40" r="22" fill="none" stroke="rgba(181,242,58,0.18)" strokeWidth="2"/>
              <circle cx="40" cy="40" r="10" fill="rgba(181,242,58,0.12)" stroke="rgba(181,242,58,0.4)" strokeWidth="2">
                <animate attributeName="r" values="9;11;9" dur="2.2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.8;1;0.8" dur="2.2s" repeatCount="indefinite"/>
              </circle>
              <line x1="74" y1="40" x2="52" y2="40" stroke="rgba(181,242,58,0.6)" strokeWidth="2" strokeLinecap="round"/>
              <polygon points="52,37 46,40 52,43" fill="rgba(181,242,58,0.6)"/>
              <line x1="40" y1="6" x2="40" y2="28" stroke="rgba(181,242,58,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3"/>
            </svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No goals yet</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Set your first score goal and FocusOS will build your study plan.</p>
          <button className="btn btn-accent" onClick={openModal}>Add Your First Goal</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {goals.map(goal => {
          const days = daysUntil(goal.test_date)
          const pct = goal.current_score && goal.target_score
            ? Math.min(100, Math.round((goal.current_score / goal.target_score) * 100))
            : 0
          const color = TEST_COLORS[goal.test_type] || 'var(--accent)'
          const spw = sessionsNeeded(goal.current_score, goal.target_score, days)
          const dayColor = days !== null ? (days < 14 ? 'var(--red)' : days < 60 ? 'var(--amber)' : 'var(--muted)') : 'var(--muted)'

          return (
            <div key={goal.id} className="card card-top">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: `${color}22`, color,
                  }}>{goal.test_type}</span>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{goal.subject}</span>
                </div>
                <button onClick={() => deleteGoal(goal.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: 20, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Current</div>
                  {editingScore[goal.id] !== undefined ? (
                    <input
                      type="number"
                      value={editingScore[goal.id]}
                      onChange={e => setEditingScore(prev => ({ ...prev, [goal.id]: e.target.value }))}
                      onBlur={() => updateCurrentScore(goal.id, editingScore[goal.id])}
                      onKeyDown={e => e.key === 'Enter' && updateCurrentScore(goal.id, editingScore[goal.id])}
                      autoFocus
                      style={{ width: 80, padding: '4px 8px', fontSize: 16 }}
                    />
                  ) : (
                    <div
                      style={{ fontSize: 22, fontWeight: 700, color, cursor: 'pointer' }}
                      onClick={() => setEditingScore(prev => ({ ...prev, [goal.id]: goal.current_score || '' }))}
                      title="Click to edit"
                    >
                      {goal.current_score ?? '—'} <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>✎</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Target</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{goal.target_score}</div>
                </div>
                {days !== null && (
                  <div>
                    <div className="label" style={{ marginBottom: 4 }}>Test Date</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: dayColor }}>{days > 0 ? `${days}d left` : 'Today!'}</div>
                  </div>
                )}
              </div>

              {goal.current_score && (
                <>
                  <div className="progress-bar" style={{ marginBottom: 6 }}>
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{pct}% of the way to your goal</div>
                </>
              )}

              {spw && (
                <div style={{ fontSize: 13, color: 'var(--muted)', background: 'var(--card2)', borderRadius: 8, padding: '8px 12px' }}>
                  📅 Study plan: <strong style={{ color: 'var(--text)' }}>{spw} sessions/week</strong> to reach your goal by {new Date(goal.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>

    {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '80px',
            paddingBottom: '40px',
            zIndex: 9999,
          }}
        >
          <div style={{
            background: '#111113',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '32px',
            width: '440px',
            maxWidth: '92vw',
            position: 'relative',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}>
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none',
                color: '#9494a0', fontSize: 20,
                cursor: 'pointer', lineHeight: 1,
              }}
            >×</button>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 24 }}>Add Score Goal</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: 6 }}>Test Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['SAT', 'ACT', 'AP'].map(t => (
                    <button key={t} className={`pill ${testType === t ? 'active' : ''}`}
                      onClick={() => setTestType(t)} style={{ flex: 1, textAlign: 'center' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {testType === 'AP' && (
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 6 }}>Subject</label>
                  <input type="text" placeholder="e.g. AP Calculus BC" value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 6 }}>Current Score</label>
                  <input type="number"
                    placeholder={testType === 'SAT' ? '1000' : testType === 'ACT' ? '22' : '3'}
                    value={modalCurrent} onChange={e => setModalCurrent(e.target.value)} />
                </div>
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 6 }}>Target Score</label>
                  <input type="number"
                    placeholder={testType === 'SAT' ? '1500' : testType === 'ACT' ? '32' : '5'}
                    value={modalTarget} onChange={e => setModalTarget(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: 6 }}>Test Date</label>
                <input type="date" value={modalDate} onChange={e => setModalDate(e.target.value)} />
              </div>

              <div className="research-callout">
                <strong>Implementation intentions</strong> — writing down when and where you'll study
                increases follow-through by up to 3x. [<em>Gollwitzer, 1999</em>]
              </div>

              <button className="btn btn-accent btn-full" onClick={handleSave} disabled={saving || !modalTarget}>
                {saving ? 'Saving...' : 'Add Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
