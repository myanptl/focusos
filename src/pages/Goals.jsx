import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { X, Plus } from 'lucide-react'

const SPRING = { type: 'spring', stiffness: 500, damping: 40 }

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

const fieldLabel = { display: 'block', marginBottom: 6 }

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
    try {
      const { data } = await supabase.from('score_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setGoals(data || [])
    } finally {
      setLoading(false)
    }
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
      toast('Goal added', 'success')
    }
    setSaving(false)
    setShowModal(false)
  }

  async function updateCurrentScore(goalId, score) {
    const { error } = await supabase.from('score_goals').update({ current_score: Number(score) }).eq('id', goalId)
    if (!error) {
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, current_score: Number(score) } : g))
      toast('Score updated', 'success')
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
      <header className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Goals</h1>
          <p>Work backwards from test day.</p>
        </div>
        {goals.length > 0 && (
          <button className="btn btn-accent" onClick={openModal}>
            <Plus size={14} strokeWidth={1.6} />Add goal
          </button>
        )}
      </header>

      {loading && <div style={{ padding: '48px 0', color: 'var(--muted)', fontSize: 13 }}>Loading goals…</div>}

      {!loading && goals.length === 0 && (
        <div style={{ borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)', padding: '48px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No goals yet</div>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 20, maxWidth: '48ch' }}>
            Set a target score and a test date. FocusOS works out how many sessions a week it takes.
          </p>
          <button className="btn btn-accent" onClick={openModal}><Plus size={14} strokeWidth={1.6} />Add your first goal</button>
        </div>
      )}

      {goals.length > 0 && (
        <ul style={{ listStyle: 'none', borderBottom: '1px solid var(--hairline)' }}>
          <AnimatePresence initial={false}>
            {goals.map(goal => (
              <GoalRow
                key={goal.id}
                goal={goal}
                editingValue={editingScore[goal.id]}
                onEditStart={() => setEditingScore(prev => ({ ...prev, [goal.id]: goal.current_score || '' }))}
                onEditChange={v => setEditingScore(prev => ({ ...prev, [goal.id]: v }))}
                onEditCommit={() => updateCurrentScore(goal.id, editingScore[goal.id])}
                onDelete={() => deleteGoal(goal.id)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal goal-modal" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 id="goal-modal-title" style={{ fontSize: 16, fontWeight: 600 }}>New score goal</h2>
              <button className="btn-quiet" onClick={() => setShowModal(false)} aria-label="Close"><X size={16} strokeWidth={1.6} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <span className="label" style={fieldLabel}>Test</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['SAT', 'ACT', 'AP'].map(t => (
                    <button key={t} className={`pill ${testType === t ? 'active' : ''}`}
                      onClick={() => setTestType(t)} style={{ flex: 1 }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {testType === 'AP' && (
                <div>
                  <label className="label" style={fieldLabel} htmlFor="goal-subject">Subject</label>
                  <input id="goal-subject" type="text" placeholder="e.g. AP Calculus BC" value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label" style={fieldLabel} htmlFor="goal-current">Current</label>
                  <input id="goal-current" type="number" className="mono"
                    placeholder={testType === 'SAT' ? '1000' : testType === 'ACT' ? '22' : '3'}
                    value={modalCurrent} onChange={e => setModalCurrent(e.target.value)} />
                </div>
                <div>
                  <label className="label" style={fieldLabel} htmlFor="goal-target">Target</label>
                  <input id="goal-target" type="number" className="mono"
                    placeholder={testType === 'SAT' ? '1500' : testType === 'ACT' ? '32' : '5'}
                    value={modalTarget} onChange={e => setModalTarget(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label" style={fieldLabel} htmlFor="goal-date">Test date</label>
                <input id="goal-date" type="date" value={modalDate} onChange={e => setModalDate(e.target.value)} />
              </div>

              <button className="btn btn-accent btn-full" onClick={handleSave} disabled={saving || !modalTarget}>
                {saving ? 'Saving…' : 'Add goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function GoalRow({ goal, editingValue, onEditStart, onEditChange, onEditCommit, onDelete }) {
  const days = daysUntil(goal.test_date)
  const pct = goal.current_score && goal.target_score
    ? Math.min(100, Math.round((goal.current_score / goal.target_score) * 100))
    : 0
  const spw = sessionsNeeded(goal.current_score, goal.target_score, days)
  const dayColor = days !== null && days < 14 ? 'var(--red)' : days !== null && days < 60 ? 'var(--amber)' : 'var(--muted)'
  const isEditing = editingValue !== undefined

  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={SPRING}
      style={{ borderTop: '1px solid var(--hairline)', padding: '20px 0' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--muted)', minWidth: 30 }}>{goal.test_type}</span>
        <span style={{ fontWeight: 500, fontSize: 14.5, flex: '1 1 140px', minWidth: 0 }}>{goal.subject}</span>
        {days !== null && (
          <span className="mono" style={{ fontSize: 12, color: dayColor }}>
            {days > 0 ? `${days}d left` : 'Test day'}
          </span>
        )}
        <button className="btn-quiet" onClick={onDelete} aria-label={`Remove ${goal.subject} goal`} style={{ alignSelf: 'center' }}>
          <X size={14} strokeWidth={1.6} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '12px 0 12px 42px', flexWrap: 'wrap' }}>
        {isEditing ? (
          <input
            type="number"
            className="mono"
            aria-label="Current score"
            value={editingValue}
            onChange={e => onEditChange(e.target.value)}
            onBlur={onEditCommit}
            onKeyDown={e => e.key === 'Enter' && onEditCommit()}
            autoFocus
            style={{ width: 96, padding: '4px 8px', fontSize: 16 }}
          />
        ) : (
          <button
            onClick={onEditStart}
            title="Edit current score"
            className="num"
            style={{ background: 'none', border: 'none', borderBottom: '1px dashed var(--border-strong)', color: 'var(--text)', fontSize: 22, cursor: 'pointer', padding: 0 }}
          >
            {goal.current_score ?? '—'}
          </button>
        )}
        <span className="mono" style={{ color: 'var(--faint)', fontSize: 14 }}>→</span>
        <span className="num" style={{ fontSize: 22, color: 'var(--muted)' }}>{goal.target_score}</span>
      </div>

      <div style={{ marginLeft: 42 }}>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
          <span className="mono">{goal.current_score ? `${pct}%` : 'Set a current score'}</span>
          {spw && (
            <span>
              <span className="mono" style={{ color: 'var(--text)' }}>{spw}</span> sessions/week until{' '}
              {new Date(goal.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </motion.li>
  )
}
