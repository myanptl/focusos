import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Clock } from 'lucide-react'

const MODE_LABELS = {
  multiple_choice: 'MC', short_answer: 'SA', fill_blank: 'FIB', explain: 'Explain',
}

const ROW = { borderTop: '1px solid var(--hairline)' }
const TICK = { fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)' }

function Section({ title, meta, children }) {
  return (
    <section style={{ marginTop: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, gap: 12 }}>
        <h2 className="label">{title}</h2>
        {meta && <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{meta}</span>}
      </div>
      {children}
    </section>
  )
}

/* Vertical bars on a hairline grid: lime for the highlighted index, muted for the rest. */
function Bars({ values, highlight, labels, height = 120, gap = 10, onHover }) {
  const max = Math.max(...values, 1)
  return (
    <div>
      <div style={{
        position: 'relative', height, display: 'flex', alignItems: 'flex-end', gap,
        borderBottom: '1px solid var(--border)',
        backgroundImage: 'linear-gradient(var(--hairline) 1px, transparent 1px)',
        backgroundSize: `100% ${height / 4}px`,
      }}>
        {values.map((v, i) => (
          <div key={i} title={labels?.[i]?.title}
            onMouseEnter={onHover ? () => onHover(i) : undefined}
            onMouseLeave={onHover ? () => onHover(null) : undefined}
            style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{
              width: '100%', maxWidth: 28,
              height: v > 0 ? `${Math.max(2, (v / max) * 100)}%` : 1,
              background: i === highlight ? 'var(--accent)' : v > 0 ? 'var(--surface-3)' : 'var(--border)',
              transition: 'height 0.5s var(--ease-out)',
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap, marginTop: 8 }}>
        {values.map((_, i) => (
          <div key={i} style={{ ...TICK, flex: 1, textAlign: 'center', color: i === highlight ? 'var(--text)' : 'var(--faint)' }}>
            {labels?.[i]?.tick ?? ''}
          </div>
        ))}
      </div>
    </div>
  )
}

function WeekChart({ data }) {
  const today = new Date().getDay()
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return (
    <Bars
      values={data.map(d => d.mins)}
      highlight={today}
      labels={data.map((d, i) => ({ tick: days[i], title: `${days[i]} · ${d.mins} min` }))}
    />
  )
}

function hourLabel(h) {
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? String(h) : String(h - 12)
}

function hourDisplay(h) {
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function FocusHours({ hourlyMins }) {
  const [hovered, setHovered] = useState(null)
  const hasData = hourlyMins.some(m => m > 0)

  const peakHour     = hasData ? hourlyMins.indexOf(Math.max(...hourlyMins)) : -1
  const nonZeroHours = hourlyMins.map((m, h) => ({ m, h })).filter(x => x.m > 0)
  const leastHour    = nonZeroHours.length > 1
    ? nonZeroHours.reduce((a, b) => a.m < b.m ? a : b).h : -1

  const readout = hovered !== null
    ? `${hourDisplay(hovered)} · ${hourlyMins[hovered] > 0 ? `${hourlyMins[hovered]} min` : 'no data'}`
    : null

  return (
    <div>
      <div className="mono" style={{ fontSize: 12, color: 'var(--muted)', height: 18, marginBottom: 8 }}>
        {readout}
      </div>
      <Bars
        values={hourlyMins}
        highlight={peakHour}
        height={80}
        gap={3}
        onHover={setHovered}
        labels={hourlyMins.map((_, h) => ({ tick: h % 3 === 0 ? hourLabel(h) : '' }))}
      />
      {hasData ? (
        <div className="stat-row" style={{ marginTop: 20 }}>
          <div>
            <div className="v" style={{ fontSize: 18 }}>{hourDisplay(peakHour)}–{hourDisplay((peakHour + 1) % 24)}</div>
            <div className="k">Peak focus</div>
          </div>
          {leastHour >= 0 && (
            <div>
              <div className="v" style={{ fontSize: 18, color: 'var(--muted)' }}>{hourDisplay(leastHour)}</div>
              <div className="k">Least productive</div>
            </div>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 16, lineHeight: 1.6 }}>
          Complete focus sessions to see your peak hours. Your pattern shows up after about five sessions.
        </p>
      )}
    </div>
  )
}

function pad2(n) { return String(n).padStart(2, '0') }
function buildDateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export default function Progress() {
  const { profile, user } = useAuth()

  const [weekData,       setWeekData]       = useState(Array(7).fill(null).map(() => ({ mins: 0 })))
  const [hourlyMins,     setHourlyMins]     = useState(Array(24).fill(0))
  const [, setSessions]                     = useState([])
  const [recentSessions, setRecentSessions] = useState([])
  const [quizHistory,    setQuizHistory]    = useState([])
  const [allWeakTopics,  setAllWeakTopics]  = useState([])

  useEffect(() => { loadData() }, [user])

  async function loadData() {
    if (!user) return
    try {
      const today  = new Date()
      const sunday = new Date(today)
      sunday.setDate(today.getDate() - today.getDay())
      sunday.setHours(0, 0, 0, 0)
      const sunStr = buildDateStr(sunday)

      const [logRes, sessRes, recentSessRes, quizRes, heatmapRes] = await Promise.all([
        supabase.from('daily_focus_log').select('*').eq('user_id', user.id).gte('log_date', sunStr),
        supabase.from('focus_sessions').select('duration_minutes, session_date').eq('user_id', user.id).order('session_date', { ascending: false }).limit(50),
        supabase.from('focus_sessions')
          .select('id, duration_minutes, session_date, completed_at, completed, notes')
          .eq('user_id', user.id).eq('completed', true)
          .order('completed_at', { ascending: false }).limit(10),
        supabase.from('quiz_results')
          .select('id, subject, score_percentage, weak_topics, quiz_date, mode, questions_correct, questions_total, focus_score, time_taken_seconds, timed, created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('focus_sessions')
          .select('completed_at, duration_minutes').eq('user_id', user.id)
          .eq('completed', true).not('completed_at', 'is', null)
          .gte('completed_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .limit(500),
      ])

      const logMap = {}
      ;(logRes.data || []).forEach(d => {
        const dow = new Date(d.log_date + 'T12:00:00').getDay()
        logMap[dow] = d.total_minutes
      })
      setWeekData(Array.from({ length: 7 }, (_, i) => ({ mins: logMap[i] || 0 })))

      const hourMap = Array(24).fill(0)
      ;(heatmapRes.data || []).forEach(s => {
        const h = new Date(s.completed_at).getHours()
        hourMap[h] += s.duration_minutes || 0
      })
      setHourlyMins(hourMap)

      setSessions(sessRes.data || [])
      setRecentSessions(recentSessRes.data || [])

      const quizzes = quizRes.data || []
      setQuizHistory(quizzes)
      const topicCounts = {}
      quizzes.forEach(q => {
        ;(q.weak_topics || []).forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1 })
      })
      setAllWeakTopics(
        Object.entries(topicCounts).sort(([, a], [, b]) => b - a)
          .slice(0, 6).map(([topic, count]) => ({ topic, count }))
      )
    } catch {
      // data stays at defaults on network error
    }
  }

  const streak        = profile?.streak_count ?? 0
  const totalMins     = profile?.total_focus_minutes ?? 0
  const totalSessions = profile?.total_sessions ?? 0
  const avgSession    = totalSessions > 0 ? Math.round(totalMins / totalSessions) : 0
  const thisWeekMins  = weekData.reduce((s, d) => s + d.mins, 0)

  return (
    <div className="page-fade">
      <header className="page-head">
        <h1 className="page-title">Stats</h1>
      </header>

      <div className="stat-row">
        <div><div className="v" style={{ color: streak > 0 ? 'var(--accent)' : undefined }}>{streak}</div><div className="k">Day streak</div></div>
        <div><div className="v">{totalMins}</div><div className="k">Minutes focused</div></div>
        <div><div className="v">{totalSessions}</div><div className="k">Sessions</div></div>
        <div><div className="v">{avgSession}</div><div className="k">Avg minutes</div></div>
      </div>

      <Section title="This week" meta={`${thisWeekMins} min`}>
        <WeekChart data={weekData} />
      </Section>

      <Section title="Focus by hour" meta="Last 90 days">
        <FocusHours hourlyMins={hourlyMins} />
      </Section>

      {recentSessions.length > 0 && (
        <Section title="Recent sessions">
          {recentSessions.map(s => (
            <div key={s.id} style={{ ...ROW, padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="mono" style={{ fontSize: 13 }}>{s.duration_minutes} min</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{s.session_date}</span>
              </div>
              {s.notes && (
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.55 }}>{s.notes}</p>
              )}
            </div>
          ))}
        </Section>
      )}

      {quizHistory.length > 0 && (
        <Section title="Quiz history">
          {quizHistory.map(q => {
            const pctColor = q.score_percentage >= 80 ? 'var(--accent)' : q.score_percentage < 60 ? 'var(--red)' : 'var(--text)'
            const mins = q.time_taken_seconds ? Math.round(q.time_taken_seconds / 60) : null
            return (
              <div key={q.id} style={{ ...ROW, display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0' }}>
                <div className="num" style={{ fontSize: 20, color: pctColor, minWidth: 52 }}>{q.score_percentage}%</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q.subject || 'General'}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {q.quiz_date} · {MODE_LABELS[q.mode] || q.mode || 'SA'} · {q.questions_correct}/{q.questions_total}
                    {mins !== null ? ` · ${mins}m` : ''}
                    {q.timed && <Clock size={11} strokeWidth={1.6} aria-label="Timed" />}
                  </div>
                </div>
                {q.focus_score != null && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="mono" style={{ fontSize: 13 }}>{q.focus_score}%</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>focus</div>
                  </div>
                )}
              </div>
            )
          })}
        </Section>
      )}

      {allWeakTopics.length > 0 && (
        <Section title="Recurring weak topics">
          {allWeakTopics.map(({ topic, count }) => (
            <div key={topic} style={{ ...ROW, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
              <span style={{ fontSize: 13.5, flex: 1 }}>{topic}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--amber)' }}>{count}×</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}
