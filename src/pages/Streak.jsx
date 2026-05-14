import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import Confetti from 'react-confetti'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const BADGES = [
  { id: 'first_focus',   label: 'First Focus',   icon: '🎯', desc: 'Complete your first session',    check: (p)          => (p?.total_sessions ?? 0) >= 1 },
  { id: 'on_fire',       label: 'On Fire',        icon: '🔥', desc: '3-day streak',                  check: (p)          => (p?.streak_count ?? 0) >= 3 },
  { id: 'unstoppable',   label: 'Unstoppable',    icon: '⚡', desc: '7-day streak',                  check: (p)          => (p?.streak_count ?? 0) >= 7 },
  { id: 'hour_hero',     label: 'Hour Hero',      icon: '⏰', desc: '60+ minutes in a single day',   check: (_, log)     => log.some(d => d.total_minutes >= 60) },
  { id: 'five_sessions', label: 'Five Sessions',  icon: '✋', desc: 'Complete 5 total sessions',     check: (p)          => (p?.total_sessions ?? 0) >= 5 },
  { id: 'deep_worker',   label: 'Deep Worker',    icon: '🧠', desc: 'Complete a 35+ min session',   check: (_, __, s)   => s.some(x => x.duration_minutes >= 35) },
  { id: 'goal_setter',   label: 'Goal Setter',    icon: '🎓', desc: 'Add your first score goal',    check: (_p, _l, _s, g) => g.length >= 1 },
  { id: 'diamond_mind',  label: 'Diamond Mind',   icon: '💎', desc: '10-day streak',                check: (p)          => (p?.streak_count ?? 0) >= 10 },
]

function FlameDecor() {
  return (
    <svg viewBox="0 0 120 140" width="120" height="140" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#f2c75a" stopOpacity="0.9"/>
          <stop offset="55%" stopColor="#f2813a" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#b5f23a" stopOpacity="0.5"/>
        </linearGradient>
      </defs>
      {/* Outer flame */}
      <path d="M60 10 C70 30 90 35 88 60 C86 85 75 95 60 130 C45 95 34 85 32 60 C30 35 50 30 60 10Z"
        fill="url(#flameGrad)" opacity="0.85">
        <animate attributeName="d"
          values="M60 10 C70 30 90 35 88 60 C86 85 75 95 60 130 C45 95 34 85 32 60 C30 35 50 30 60 10Z;
                  M60 14 C68 32 88 38 86 62 C84 87 73 97 60 130 C47 97 36 87 34 62 C32 38 52 32 60 14Z;
                  M60 10 C70 30 90 35 88 60 C86 85 75 95 60 130 C45 95 34 85 32 60 C30 35 50 30 60 10Z"
          dur="2.4s" repeatCount="indefinite"/>
      </path>
      {/* Inner flame */}
      <path d="M60 42 C66 54 75 58 74 72 C73 86 68 92 60 115 C52 92 47 86 46 72 C45 58 54 54 60 42Z"
        fill="#b5f23a" opacity="0.55">
        <animate attributeName="d"
          values="M60 42 C66 54 75 58 74 72 C73 86 68 92 60 115 C52 92 47 86 46 72 C45 58 54 54 60 42Z;
                  M60 46 C65 56 73 60 72 74 C71 88 66 93 60 115 C54 93 49 88 48 74 C47 60 55 56 60 46Z;
                  M60 42 C66 54 75 58 74 72 C73 86 68 92 60 115 C52 92 47 86 46 72 C45 58 54 54 60 42Z"
          dur="1.9s" repeatCount="indefinite"/>
      </path>
    </svg>
  )
}

function HeatmapCell({ minutes }) {
  const intensity = !minutes ? 0 : minutes < 20 ? 1 : minutes < 45 ? 2 : minutes < 90 ? 3 : 4
  const colors = ['rgba(255,255,255,0.04)', 'rgba(181,242,58,0.2)', 'rgba(181,242,58,0.45)', 'rgba(181,242,58,0.7)', '#b5f23a']
  return (
    <div title={minutes ? `${minutes} min` : 'No sessions'} style={{
      width: 32, height: 32, borderRadius: 6,
      background: colors[intensity],
      border: '1px solid rgba(255,255,255,0.05)',
    }} />
  )
}

export default function Streak() {
  const { profile, user } = useAuth()
  const [log, setLog] = useState([])
  const [sessions, setSessions] = useState([])
  const [goals, setGoals] = useState([])

  const [displayStreak, setDisplayStreak] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const streakAnimated = useRef(false)
  const badgeRefs = useRef({})
  const badgesAnimated = useRef(false)

  useEffect(() => { loadData() }, [user])

  async function loadData() {
    if (!user) return
    const fiveWeeksAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const [logRes, sessRes, goalRes] = await Promise.all([
      supabase.from('daily_focus_log').select('*').eq('user_id', user.id).gte('log_date', fiveWeeksAgo),
      supabase.from('focus_sessions').select('duration_minutes').eq('user_id', user.id),
      supabase.from('score_goals').select('id').eq('user_id', user.id),
    ])
    setLog(logRes.data || [])
    setSessions(sessRes.data || [])
    setGoals(goalRes.data || [])
  }

  const streak = profile?.streak_count ?? 0

  // GSAP count-up for streak number
  useEffect(() => {
    if (streakAnimated.current || streak === 0) return
    streakAnimated.current = true
    const obj = { v: 0 }
    gsap.to(obj, {
      v: streak, duration: 1.5, ease: 'power2.out',
      snap: { v: 1 },
      onUpdate: () => setDisplayStreak(Math.round(obj.v)),
    })
  }, [streak])
  const totalMins = profile?.total_focus_minutes ?? 0
  const totalSessions = profile?.total_sessions ?? 0
  const xp = streak * 25 + totalMins * 2
  const level = Math.floor(xp / 200)
  const xpInLevel = xp % 200
  const xpPct = (xpInLevel / 200) * 100

  const logMap = {}
  log.forEach(d => { logMap[d.log_date] = d.total_minutes })

  const today = new Date()
  const days = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (34 - i))
    const key = d.toISOString().split('T')[0]
    return { key, mins: logMap[key] || 0 }
  })
  const weeks = Array.from({ length: 5 }, (_, i) => days.slice(i * 7, i * 7 + 7))
  const dayLabels = ['S','M','T','W','T','F','S']

  const unlockedBadges = BADGES.filter(b => b.check(profile, log, sessions, goals))

  // GSAP back.out scale on unlocked badges
  useEffect(() => {
    if (badgesAnimated.current || unlockedBadges.length === 0) return
    badgesAnimated.current = true
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 2800)
    unlockedBadges.forEach((badge, i) => {
      const el = badgeRefs.current[badge.id]
      if (!el) return
      gsap.fromTo(el,
        { scale: 0, rotation: -10 },
        { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.7)', delay: i * 0.07 }
      )
    })
  }, [unlockedBadges.length])

  return (
    <div className="page-fade" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
      {showConfetti && (
        <Confetti
          recycle={false} numberOfPieces={90} gravity={0.35}
          colors={['#b5f23a','#f2c75a','#60d3f8','#ffffff']}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 9998, pointerEvents: 'none' }}
        />
      )}
      <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative' }}>
        {streak > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -58%)',
            opacity: 0.18, pointerEvents: 'none',
          }}>
            <FlameDecor />
          </div>
        )}
        {/* Radial glow behind number */}
        {streak > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 260, height: 180,
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(181,242,58,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        )}
        <div className="bebas" style={{
          fontSize: 'clamp(96px, 18vw, 140px)',
          color: 'var(--accent)',
          lineHeight: 1,
          position: 'relative', zIndex: 1,
          letterSpacing: '-0.02em',
          textShadow: streak > 0 ? '0 0 60px rgba(181,242,58,0.3)' : 'none',
        }}>{streak > 0 ? displayStreak : 0}</div>
        <div style={{
          fontSize: 20, color: '#9494a0', fontWeight: 700,
          letterSpacing: '0.04em', position: 'relative', zIndex: 1,
          textTransform: 'uppercase', fontSize: 14,
        }}>day streak 🔥</div>
        {streak === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>Complete a focus session to start your streak!</div>}
      </div>

      <div className="card card-top" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <span className="label">Level {level}</span>
            <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 8 }}>{xp} XP total</span>
          </div>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{xpInLevel}/200 to Level {level + 1}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${xpPct}%` }} />
        </div>
        <div style={{
          display: 'inline-block', marginTop: 10,
          background: '#18181c', borderRadius: 6, padding: '8px 12px',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#9494a0',
        }}>XP = streak × 25 + total minutes × 2</div>
      </div>

      <div className="card card-top" style={{ marginBottom: 20 }}>
        <div className="label" style={{ marginBottom: 14 }}>5-Week Focus Heatmap</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          {dayLabels.map((d, i) => (
            <div key={i} style={{ width: 32, textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {week.map((d, di) => <HeatmapCell key={di} minutes={d.mins} />)}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
          <span>Less</span>
          {['rgba(255,255,255,0.04)','rgba(181,242,58,0.2)','rgba(181,242,58,0.45)','rgba(181,242,58,0.7)','#b5f23a'].map((c,i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: c }} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="card card-top" style={{ marginBottom: 20 }}>
        <div className="label" style={{ marginBottom: 16, color: 'var(--accent)' }}>Badges — {unlockedBadges.length}/{BADGES.length} unlocked</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {BADGES.map(badge => {
            const unlocked = unlockedBadges.some(b => b.id === badge.id)
            return (
              <div key={badge.id} ref={el => { if (unlocked) badgeRefs.current[badge.id] = el }} style={{
                background: unlocked ? 'rgba(181,242,58,0.08)' : 'var(--card2)',
                border: `1px solid ${unlocked ? 'rgba(181,242,58,0.25)' : 'var(--border)'}`,
                borderRadius: 10, padding: '12px 14px',
                opacity: unlocked ? 1 : 0.35,
                filter: unlocked ? 'none' : 'grayscale(1)',
              }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>{badge.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: unlocked ? 'var(--accent)' : 'var(--text)', marginBottom: 3 }}>{badge.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{badge.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="research-callout">
        <strong>Habit loops form in 66 days on average</strong>, not 21 — and consistency beats duration.
        Even a 5-minute session counts. [<em>Lally et al., European Journal of Social Psychology, 2010</em>]
      </div>
    </div>
  )
}
