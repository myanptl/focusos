import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import AnimateInView from '../components/AnimateInView'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Flame, Calendar, BarChart2, Clock, Target, Mail, AlertTriangle } from 'lucide-react'

const MODE_LABELS = {
  multiple_choice: 'MC', short_answer: 'SA', fill_blank: 'FIB', explain: 'Explain',
}

/* shared glass card style — applied inline to override .card solid bg */
const gc = (extra = {}) => ({
  background: 'rgba(0,0,0,0.42)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(181,242,58,0.1)',
  borderRadius: 16,
  padding: 24,
  position: 'relative',
  zIndex: 1,
  ...extra,
})

/* section heading that matches LandingV2 */
function SectionLabel({ children, color = 'var(--accent)' }) {
  return (
    <div className="bebas" style={{
      fontSize: 18, letterSpacing: '0.1em',
      color, marginBottom: 14, lineHeight: 1,
    }}>
      {children}
    </div>
  )
}

function BarChart({ data }) {
  const max   = Math.max(...data.map(d => d.mins), 1)
  const today = new Date().getDay()
  const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
      {data.map((d, i) => {
        const isToday = i === today
        const h = Math.max(4, (d.mins / max) * 100)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{d.mins > 0 ? `${d.mins}m` : ''}</div>
            <div style={{
              width: '100%', height: `${h}px`,
              background: isToday ? 'var(--accent)' : 'rgba(181,242,58,0.25)',
              borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease', minHeight: 4,
              opacity: d.mins === 0 ? 0.3 : 1,
            }} />
            <div style={{ fontSize: 11, color: isToday ? 'var(--accent)' : 'var(--muted)', fontWeight: isToday ? 700 : 400 }}>
              {days[i]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FocusHeatmap({ hourlyMins }) {
  const [hovered, setHovered] = useState(null)
  const hasData = hourlyMins.some(m => m > 0)

  function heatColor(mins) {
    if (mins === 0)   return 'rgba(255,255,255,0.04)'
    if (mins <= 30)   return 'rgba(var(--accent-rgb),0.2)'
    if (mins <= 60)   return 'rgba(var(--accent-rgb),0.4)'
    if (mins <= 120)  return 'rgba(var(--accent-rgb),0.6)'
    return 'var(--accent)'
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

  const peakHour      = hasData ? hourlyMins.indexOf(Math.max(...hourlyMins)) : -1
  const nonZeroHours  = hourlyMins.map((m, h) => ({ m, h })).filter(x => x.m > 0)
  const leastHour     = nonZeroHours.length > 1
    ? nonZeroHours.reduce((a, b) => a.m < b.m ? a : b).h : -1
  const tooltipPct    = hovered !== null
    ? Math.max(8, Math.min(92, ((hovered + 0.5) / 24) * 100)) : 0

  return (
    <div>
      <div style={{ position: 'relative', paddingTop: 40 }}>
        {hovered !== null && (
          <div style={{
            position: 'absolute', top: 4, left: `${tooltipPct}%`,
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(181,242,58,0.18)',
            borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600,
            color: hourlyMins[hovered] > 0 ? 'var(--accent)' : 'var(--muted)',
            whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}>
            {hourDisplay(hovered)} — {hourlyMins[hovered] > 0 ? `${hourlyMins[hovered]} min focused` : 'no data'}
          </div>
        )}
        <div style={{ display: 'flex', gap: 3 }}>
          {hourlyMins.map((mins, h) => (
            <div key={h} style={{
              flex: 1, height: 48,
              background: hasData ? heatColor(mins) : 'rgba(181,242,58,0.04)',
              borderRadius: 4,
              border: `1px solid ${hovered === h ? 'rgba(181,242,58,0.5)' : 'transparent'}`,
              transition: 'border-color 0.1s', cursor: 'default',
            }}
              onMouseEnter={() => setHovered(h)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', marginTop: 6 }}>
        {hourlyMins.map((_, h) => (
          <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--muted)' }}>
            {h % 2 === 0 ? hourLabel(h) : ''}
          </div>
        ))}
      </div>
      {hasData ? (
        <div style={{ marginTop: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>Peak focus time: </span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
              {hourDisplay(peakHour)} – {hourDisplay((peakHour + 1) % 24)}
            </span>
          </span>
          {leastHour >= 0 && (
            <span style={{ fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Least productive: </span>
              <span style={{ fontWeight: 700 }}>{hourDisplay(leastHour)}</span>
            </span>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12, lineHeight: 1.6 }}>
          Complete focus sessions to see your peak hours. Your personal pattern emerges after 5+ sessions.
        </p>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color = 'var(--accent)' }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.42)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(181,242,58,0.1)',
      borderTop: `2px solid ${color}`,
      backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.022) 0%, transparent 45%)`,
      borderRadius: 16, padding: 24, textAlign: 'center',
      position: 'relative', zIndex: 1,
    }}>
      <div className="bebas" style={{
        fontSize: 44, color, lineHeight: 1, marginBottom: 6, letterSpacing: '-0.01em',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>}
    </div>
  )
}

function pad2(n) { return String(n).padStart(2, '0') }
function buildDateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export default function Progress() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()

  const [dispStreak,   setDispStreak]   = useState(0)
  const [dispMins,     setDispMins]     = useState(0)
  const [dispSessions, setDispSessions] = useState(0)
  const [dispGoals,    setDispGoals]    = useState(0)
  const statsAnimated = useRef(false)

  const [weekData,       setWeekData]       = useState(Array(7).fill(null).map(() => ({ mins: 0 })))
  const [hourlyMins,     setHourlyMins]     = useState(Array(24).fill(0))
  const [goalsCount,     setGoalsCount]     = useState(0)
  const [sessions,       setSessions]       = useState([])
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

      const [logRes, goalRes, sessRes, recentSessRes, quizRes, heatmapRes] = await Promise.all([
        supabase.from('daily_focus_log').select('*').eq('user_id', user.id).gte('log_date', sunStr),
        supabase.from('score_goals').select('id').eq('user_id', user.id),
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

      setGoalsCount(goalRes.data?.length || 0)
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

  useEffect(() => {
    if (statsAnimated.current) return
    const anyData = streak > 0 || totalMins > 0 || totalSessions > 0 || goalsCount > 0
    if (!anyData) return
    statsAnimated.current = true
    const targets = [
      { end: streak,        set: setDispStreak   },
      { end: totalMins,     set: setDispMins     },
      { end: totalSessions, set: setDispSessions },
      { end: goalsCount,    set: setDispGoals    },
    ]
    targets.forEach(({ end, set }, i) => {
      const obj = { v: 0 }
      gsap.to(obj, {
        v: end, duration: 1.4, ease: 'power2.out', delay: i * 0.1,
        snap: { v: 1 }, onUpdate: () => set(Math.round(obj.v)),
      })
    })
  }, [streak, totalMins, totalSessions, goalsCount])

  function generateInsights() {
    const insights = []
    if (streak >= 3) insights.push(`You're on a ${streak}-day streak — you're building a real habit.`)
    else if (streak === 0) insights.push('Start today to begin your streak. Even one 5-minute session counts.')
    if (avgSession >= 35) insights.push(`Your average session is ${avgSession} min — you're in Deep Work territory.`)
    else if (avgSession > 0) insights.push(`Average session: ${avgSession} min. Push to 35+ min to reach Deep Work level.`)
    if (thisWeekMins > 0) insights.push(`${thisWeekMins} minutes focused this week — that's ${Math.round(thisWeekMins / 60 * 10) / 10} hours.`)
    if (goalsCount > 0) insights.push(`You have ${goalsCount} active score goal${goalsCount > 1 ? 's' : ''}. Study sessions get you closer.`)
    else insights.push('Add a score goal to unlock your personalized study plan.')
    const fallbacks = [
      'Try the quiz generator to turn your notes into active recall practice.',
      'Consistency beats duration — even a 10-minute session keeps your streak alive.',
      'Spaced repetition schedules your weakest questions for review automatically.',
    ]
    for (const fb of fallbacks) {
      if (insights.length >= 4) break
      insights.push(fb)
    }
    return insights.slice(0, 4)
  }

  return (
    <div className="page-fade">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <span className="v3-kicker">Receipts · Your numbers</span>
        <h1 className="page-title"><span className="pt-inner">Progress<span className="v3-dot">.</span></span></h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/planner')}>
            <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Study Planner
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/review')}>
            <BarChart2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Weekly Review
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-4-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Day Streak"    value={dispStreak}   sub="days in a row"   color="var(--accent)" />
        <StatCard label="Total Minutes" value={dispMins}     sub="minutes focused" color="var(--cyan)" />
        <StatCard label="Sessions"      value={dispSessions} sub="completed"       color="var(--purple)" />
        <StatCard label="Goals"         value={dispGoals}    sub="score goals set" color="var(--amber)" />
      </div>

      {/* This Week bar chart */}
      <AnimateInView delay={0.1}>
        <div style={gc({ marginBottom: 20 })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <SectionLabel>This Week</SectionLabel>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{thisWeekMins} min total</span>
          </div>
          <BarChart data={weekData} />
        </div>
      </AnimateInView>

      {/* Peak Focus Hours */}
      <AnimateInView delay={0.15}>
        <div style={gc({ marginBottom: 20 })}>
          <SectionLabel>Your Peak Focus Hours</SectionLabel>
          <FocusHeatmap hourlyMins={hourlyMins} />
          <div style={{
            marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.55,
          }}>
            Circadian rhythms create predictable windows of peak cognitive performance that vary significantly by individual.{' '}
            [<em>Folkard &amp; Monk, Chronobiology, 1985</em>]
          </div>
        </div>
      </AnimateInView>

      {/* Honest Insights */}
      <AnimateInView delay={0.1}>
        <div style={gc({ marginBottom: 20 })}>
          <SectionLabel>Honest Insights</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {generateInsights().map((insight, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '11px 0',
                borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
                <span style={{ fontSize: 14, lineHeight: 1.55 }}>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      </AnimateInView>

      {/* Session History */}
      {recentSessions.length > 0 && (
        <AnimateInView delay={0.1}>
          <div style={gc({ marginBottom: 20 })}>
            <SectionLabel>Session History</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentSessions.map((s, i) => (
                <div key={s.id} style={{
                  padding: '12px 0',
                  borderBottom: i < recentSessions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                        {s.duration_minutes} min
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.session_date}</span>
                    </div>
                  </div>
                  {s.notes && (
                    <div style={{
                      fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.55,
                      fontStyle: 'italic', paddingLeft: 10,
                      borderLeft: '2px solid rgba(181,242,58,0.2)',
                    }}>
                      "{s.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </AnimateInView>
      )}

      {/* Quiz History */}
      {quizHistory.length > 0 && (
        <AnimateInView delay={0.1}>
          <div style={gc({ marginBottom: 20 })}>
            <SectionLabel>Quiz History</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {quizHistory.map(q => {
                const pctColor = q.score_percentage >= 80 ? 'var(--accent)' : q.score_percentage >= 60 ? 'var(--amber)' : 'var(--red)'
                const mins = q.time_taken_seconds ? Math.round(q.time_taken_seconds / 60) : null
                return (
                  <div key={q.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div className="bebas" style={{ fontSize: 26, color: pctColor, minWidth: 58 }}>
                      {q.score_percentage}%
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{q.subject || 'General'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {q.quiz_date} · {MODE_LABELS[q.mode] || q.mode || 'SA'} · {q.questions_correct}/{q.questions_total} correct
                        {mins !== null ? ` · ${mins}m` : ''}
                        {q.timed ? <> · <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /></> : ''}
                      </div>
                    </div>
                    {q.focus_score != null && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Focus</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>{q.focus_score}%</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </AnimateInView>
      )}

      {/* Recurring Weak Topics */}
      {allWeakTopics.length > 0 && (
        <AnimateInView delay={0.1}>
          <div style={gc({ marginBottom: 20, border: '1px solid rgba(242,199,90,0.15)' })}>
            <SectionLabel color="var(--amber)">Recurring Weak Topics</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allWeakTopics.map(({ topic, count }) => (
                <div key={topic} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px',
                  background: 'rgba(242,199,90,0.06)',
                  border: '1px solid rgba(242,199,90,0.12)', borderRadius: 8,
                }}>
                  <AlertTriangle size={13} color="var(--amber)" />
                  <span style={{ fontSize: 13, flex: 1 }}>{topic}</span>
                  <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700 }}>{count}×</span>
                </div>
              ))}
            </div>
          </div>
        </AnimateInView>
      )}

      {/* Coming in V2 */}
      <div style={gc()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <SectionLabel>Coming in V2</SectionLabel>
          <span style={{
            fontSize: 11, background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
            padding: '3px 10px', color: 'var(--muted)',
          }}>August 2026</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { Icon: Target,   title: 'Peak Focus Detector', desc: 'AI learns your best focus times' },
            { Icon: Mail,     title: 'Weekly Email Report', desc: 'Progress summary to your inbox' },
            { Icon: Calendar, title: 'Calendar Sync',       desc: 'Block study time automatically' },
            { Icon: Flame,    title: 'Study Partner Rooms', desc: 'Focus with friends in real time' },
          ].map(f => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.08)',
              borderRadius: 10, padding: 14, opacity: 0.6,
            }}>
              <div style={{ marginBottom: 6 }}><f.Icon size={20} color="var(--muted)" /></div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
