import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Flame, Check } from 'lucide-react'

function pad2(n) { return String(n).padStart(2, '0') }

function dateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function dayLabel(dateString) {
  const d = new Date(dateString + 'T12:00:00')
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
}

function TrendBadge({ thisWeek, lastWeek }) {
  if (lastWeek === 0 && thisWeek === 0) return null
  if (lastWeek === 0) return (
    <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>↑ First week!</span>
  )
  const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
  const up = pct >= 0
  return (
    <span style={{ color: up ? 'var(--accent)' : 'var(--red)', fontWeight: 700, fontSize: 14 }}>
      {up ? '↑' : '↓'} {Math.abs(pct)}% vs last week
    </span>
  )
}

export default function Review() {
  const { profile, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [thisWeekLog, setThisWeekLog] = useState([])
  const [lastWeekLog, setLastWeekLog] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [copied, setCopied] = useState(false)

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const today = new Date()
    const sun = new Date(today)
    sun.setDate(today.getDate() - today.getDay())
    sun.setHours(0, 0, 0, 0)

    const lastSun = new Date(sun)
    lastSun.setDate(sun.getDate() - 7)

    const [logRes, quizRes] = await Promise.all([
      supabase.from('daily_focus_log')
        .select('log_date, total_minutes, sessions_completed, sessions_count')
        .eq('user_id', user.id)
        .gte('log_date', dateStr(lastSun))
        .lte('log_date', dateStr(today)),
      supabase.from('quiz_results')
        .select('subject, score_percentage, weak_topics, quiz_date')
        .eq('user_id', user.id)
        .gte('quiz_date', dateStr(lastSun))
        .order('quiz_date', { ascending: false }),
    ])

    const log = logRes.data || []
    const sunStr = dateStr(sun)
    const lastSunStr = dateStr(lastSun)

    setThisWeekLog(log.filter(d => d.log_date >= sunStr))
    setLastWeekLog(log.filter(d => d.log_date >= lastSunStr && d.log_date < sunStr))
    setQuizzes(quizRes.data || [])
    setLoading(false)
  }

  const thisWeekMins = thisWeekLog.reduce((s, d) => s + (d.total_minutes || 0), 0)
  const lastWeekMins = lastWeekLog.reduce((s, d) => s + (d.total_minutes || 0), 0)
  const thisWeekSessions = thisWeekLog.reduce((s, d) => s + (d.sessions_completed || d.sessions_count || 0), 0)

  const bestDay = thisWeekLog.length > 0
    ? thisWeekLog.reduce((a, b) => (b.total_minutes || 0) > (a.total_minutes || 0) ? b : a)
    : null

  const subjectCounts = {}
  quizzes.forEach(q => {
    if (q.subject) subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1
  })
  const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  const weakTopicCounts = {}
  quizzes.forEach(q => {
    ;(q.weak_topics || []).forEach(t => {
      weakTopicCounts[t] = (weakTopicCounts[t] || 0) + 1
    })
  })
  const weakTopics = Object.entries(weakTopicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t)

  const streak = profile?.streak_count ?? 0

  function getNextWeekRec() {
    if (thisWeekMins === 0) return 'Complete at least one focus session this week to build momentum.'
    if (thisWeekMins < 60) return 'Aim for 60 minutes total next week — about 3 short sessions.'
    if (thisWeekMins < lastWeekMins && lastWeekMins > 0) return `You focused ${lastWeekMins - thisWeekMins} min less than last week. Stay consistent next week.`
    if (weakTopics.length > 0) return `Focus on your weak spots: ${weakTopics.slice(0, 2).join(', ')}. Use the quiz generator.`
    return `Great week! Push for ${Math.round(thisWeekMins * 1.15)} min next week — 15% growth.`
  }

  function buildShareText() {
    const lines = [
      'My FocusOS Weekly Review',
      '',
      `Focus: ${thisWeekMins} minutes`,
      `Streak: ${streak} days`,
      `Quizzes: ${quizzes.filter(q => {
        const d = new Date(); const sun = new Date(d); sun.setDate(d.getDate() - d.getDay()); sun.setHours(0,0,0,0)
        return q.quiz_date >= dateStr(sun)
      }).length} completed`,
    ]
    if (topSubject) lines.push(`Top subject: ${topSubject}`)
    lines.push('', 'Trained with FocusOS — focusos.live')
    return lines.join('\n')
  }

  function copyShare() {
    navigator.clipboard.writeText(buildShareText()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  return (
    <div className="page-fade" style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Weekly Review</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>This week's focus summary</div>
        </div>
        <Link to="/progress" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
          ← Progress
        </Link>
      </div>

      {/* Key stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Minutes Focused', value: thisWeekMins, color: 'var(--accent)' },
          { label: 'Sessions', value: thisWeekSessions, color: 'var(--cyan)' },
          { label: 'Day Streak', value: streak, showFlame: true, color: 'var(--amber)' },
        ].map(c => (
          <div key={c.label} className="card" style={{ textAlign: 'center' }}>
            <div className="bebas glow-num" style={{ fontSize: 38, color: c.color, lineHeight: 1, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {c.value}{c.showFlame && <Flame size={24} color={c.color} />}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Week vs last week */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="label">This Week vs Last Week</div>
          <TrendBadge thisWeek={thisWeekMins} lastWeek={lastWeekMins} />
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[['This week', thisWeekMins, 'var(--accent)'], ['Last week', lastWeekMins, 'rgba(255,255,255,0.2)']].map(([label, mins, color]) => (
            <div key={label} style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--card2)', overflow: 'hidden', marginBottom: 4 }}>
                <div style={{
                  height: '100%', borderRadius: 3, background: color,
                  width: `${Math.min(100, (mins / Math.max(thisWeekMins, lastWeekMins, 1)) * 100)}%`,
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{mins} min</div>
            </div>
          ))}
        </div>
      </div>

      {/* Best day + top subject */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <div className="card">
          <div className="label" style={{ marginBottom: 8 }}>Best Focus Day</div>
          {bestDay ? (
            <>
              <div className="bebas" style={{ fontSize: 32, color: 'var(--accent)', lineHeight: 1 }}>
                {dayLabel(bestDay.log_date)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{bestDay.total_minutes} min focused</div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>No sessions yet this week</div>
          )}
        </div>
        <div className="card">
          <div className="label" style={{ marginBottom: 8 }}>Top Subject</div>
          {topSubject ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--cyan)', lineHeight: 1.2 }}>{topSubject}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                {subjectCounts[topSubject]} quiz{subjectCounts[topSubject] > 1 ? 'zes' : ''} this week
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>No quizzes this week</div>
          )}
        </div>
      </div>

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--amber)' }}>
          <div className="label" style={{ marginBottom: 12, color: 'var(--amber)' }}>Top 3 Weak Topics This Week</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weakTopics.map((t, i) => (
              <div key={t} style={{
                display: 'flex', gap: 10, alignItems: 'center',
                padding: '8px 12px', borderRadius: 8,
                background: 'rgba(242,199,90,0.06)', border: '1px solid rgba(242,199,90,0.15)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', minWidth: 16 }}>{i + 1}.</span>
                <span style={{ fontSize: 13 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next week recommendation */}
      <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--accent)' }}>
        <div className="label" style={{ marginBottom: 8, color: 'var(--accent)' }}>Next Week Recommendation</div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>{getNextWeekRec()}</p>
      </div>

      {/* Share card */}
      <div className="card">
        <div className="label" style={{ marginBottom: 12 }}>Share Your Week</div>
        <pre style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5,
          color: 'var(--muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap',
          background: 'var(--card2)', borderRadius: 8, padding: '12px 14px',
          marginBottom: 14, border: '1px solid var(--border)',
        }}>{buildShareText()}</pre>
        <button className="btn btn-accent" onClick={copyShare}>
          {copied ? <><Check size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Copied!</> : 'Copy to Clipboard'}
        </button>
      </div>
    </div>
  )
}
