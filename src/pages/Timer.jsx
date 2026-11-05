import { useState, useEffect, useRef } from 'react'
import { useTimerContext } from '../context/TimerContext'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Square, X, Plus, Keyboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { unlockAudio, createAmbientSound } from '../lib/ambientAudio'
import {
  LEVELS, QUOTES, STUDY_TIPS, shuffleIndices, getLevel, shuffleBreakTips, getGreeting, todayKey,
} from '../components/timer/timerData'
import Dial from '../components/timer/Dial'
import { SessionPanel, SoundPanel, TasksPanel, BreakPanel } from '../components/timer/TimerPanels'
import { ReflectionModal, QuitModal, ShortcutsModal } from '../components/timer/TimerModals'

const PANELS = [
  { id: 'break',   label: 'Break' },
  { id: 'session', label: 'Session' },
  { id: 'sound',   label: 'Sound' },
  { id: 'tasks',   label: 'Tasks' },
]

export default function Timer() {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const ctx = useTimerContext()
  const { timeLeft, running, phase, focusMins, breakMins, focusDuration, breakDuration,
    pomodoroMode, focusJustCompleted, breakJustCompleted } = ctx

  // Session stats
  const [sessionsToday,   setSessionsToday]   = useState(0)
  const [minutesToday,    setMinutesToday]     = useState(0)
  const [focusBlocksStreak, setFocusBlocksStreak] = useState(0)

  // Goal context
  const [goals, setGoals] = useState([])

  // Reflection modal
  const [reflectionOpen,      setReflectionOpen]      = useState(false)
  const [completedMins,       setCompletedMins]       = useState(0)
  const [selectedDistraction, setSelectedDistraction] = useState(null)

  // Recommendation banner
  const [recommendation, setRecommendation] = useState(null)
  const recTimerRef = useRef(null)

  // Quit confirm dialog
  const [quitConfirm, setQuitConfirm] = useState(false)

  // Break tips
  const [breakTips, setBreakTips] = useState(() => shuffleBreakTips())

  // pomodoroMode comes from TimerContext

  // ── Feature: Tasks ──
  const [tasks, setTasks]       = useState([])
  const [taskInput, setTaskInput] = useState('')

  // ── Feature: Daily Intention ──
  const [intention, setIntention]         = useState(() => {
    const saved = localStorage.getItem('focusos_intention')
    if (!saved) return ''
    try {
      const { date, text } = JSON.parse(saved)
      return date === todayKey() ? text : ''
    } catch { return '' }
  })
  const [intentionInput, setIntentionInput] = useState('')
  const [showIntentionForm, setShowIntentionForm] = useState(false)

  // ── Feature: Ambient Sound ──
  const [soundType, setSoundType] = useState(() => {
    const saved = localStorage.getItem('focusos_sound') || 'silent'
    const valid = ['silent', 'brown', 'baroque', 'classical']
    return valid.includes(saved) ? saved : 'silent'
  })
  const [volume, setVolume] = useState(() =>
    parseFloat(localStorage.getItem('focusos_sound_vol') || '0.5')
  )
  const soundRef = useRef(null)

  // ── Feature: Quotes ──
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length))

  // ── Feature: Study Tips ──
  const [tipOrder]   = useState(() => shuffleIndices(STUDY_TIPS.length))
  const [tipPos,     setTipPos]     = useState(0)
  const [tipVisible, setTipVisible] = useState(true)

  // ── Feature: Keyboard Shortcuts modal ──
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // ── Feature: Tab Switch Tracking ──
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const tabSwitchCountRef = useRef(0)

  // ── Feature: Session Notes Panel ──
  // Which tool tab is open under the dial
  const [panel, setPanel] = useState('session')

  // ── Motion: ring flash on session complete ──
  const [flashRing, setFlashRing] = useState(false)

  // Refs
  const sessionsTodayRef  = useRef(0)
  const profileLoadedRef  = useRef(false)
  const runningRef        = useRef(running)
  const phaseRef          = useRef(phase)
  const timeLeftRef       = useRef(timeLeft)
  const focusDurationRef  = useRef(focusDuration)

  // keep refs in sync
  useEffect(() => { runningRef.current = running }, [running])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { timeLeftRef.current = timeLeft }, [timeLeft])
  useEffect(() => { focusDurationRef.current = focusDuration }, [focusDuration])
  useEffect(() => { tabSwitchCountRef.current = tabSwitchCount }, [tabSwitchCount])

  // ── Tab switch detection ─────────────────────────────────
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) return
      if (!runningRef.current || phaseRef.current !== 'focus') return
      const next = tabSwitchCountRef.current + 1
      setTabSwitchCount(next)
      tabSwitchCountRef.current = next
      const msg = next <= 2
        ? 'Welcome back — try to stay focused!'
        : next <= 5
        ? `Tab switch #${next} detected — refocus.`
        : `${next} switches this session. Every distraction costs 23 min of recovery.`
      toast(msg, next > 5 ? 'error' : 'info')
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // ── Sync profile on first load ───────────────────────
  useEffect(() => {
    if (!profile || profileLoadedRef.current) return
    profileLoadedRef.current = true
    setFocusBlocksStreak(profile.focus_blocks_streak ?? 0)
  }, [profile])

  useEffect(() => { if (user) { loadTodayData(); loadGoals() } }, [user])

  // ── Flush partial session on tab close ───────────────
  useEffect(() => {
    function handleBeforeUnload() {
      if (!runningRef.current || phaseRef.current !== 'focus') return
      const elapsed = focusDurationRef.current - timeLeftRef.current
      if (elapsed < 60 || !user?.id) return
      const blob = new Blob([JSON.stringify({
        user_id: user.id,
        duration_minutes: Math.floor(elapsed / 60),
        session_date: new Date().toISOString().split('T')[0],
      })], { type: 'application/json' })
      navigator.sendBeacon('/api/save-session', blob)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [user])
  useEffect(() => { sessionsTodayRef.current = sessionsToday }, [sessionsToday])
  useEffect(() => () => clearTimeout(recTimerRef.current), [])

  // Timer state (timeLeft, running, phase, focusMins, breakMins, pomodoroMode) lives in TimerContext

  // ── Ambient Sound ────────────────────────────────────
  function stopSound() {
    if (soundRef.current) {
      soundRef.current.stop()
      soundRef.current = null
    }
  }

  function startSound(type, vol) {
    stopSound()
    if (type === 'silent') return
    soundRef.current = createAmbientSound(type, vol)
  }

  useEffect(() => {
    localStorage.setItem('focusos_sound', soundType)
    if (running && phase === 'focus') {
      startSound(soundType, volume)
    } else {
      stopSound()
    }
    return stopSound
  }, [soundType])

  useEffect(() => {
    localStorage.setItem('focusos_sound_vol', volume)
    if (soundRef.current?.setVolume) {
      soundRef.current.setVolume(volume)
    }
  }, [volume])

  useEffect(() => {
    if (running && phase === 'focus') {
      startSound(soundType, volume)
    } else {
      stopSound()
    }
  }, [running, phase])

  useEffect(() => () => stopSound(), [])

  // ── Study Tips ───────────────────────────────────────
  function nextTip() {
    setTipVisible(false)
    setTimeout(() => {
      setTipPos(p => (p + 1) % STUDY_TIPS.length)
      setTipVisible(true)
    }, 300)
  }

  useEffect(() => {
    const id = setInterval(nextTip, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard Shortcuts ───────────────────────────────
  useEffect(() => {
    function handleKey(e) {
      const tag = document.activeElement?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (e.key === '?' && !inInput) {
        setShortcutsOpen(o => !o)
        return
      }

      if (shortcutsOpen && e.key === 'Escape') {
        setShortcutsOpen(false)
        return
      }

      if (e.key === 'Escape') {
        setReflectionOpen(false)
        setQuitConfirm(false)
        return
      }

      if (inInput) return

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (phaseRef.current === 'focus' || phaseRef.current === 'break') {
          runningRef.current ? ctx.pause() : ctx.start()
        }
        return
      }

      if (e.key === 'r' || e.key === 'R') {
        reset()
        return
      }

    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [shortcutsOpen, pomodoroMode, focusDuration, navigate])

  // ── Data loaders ─────────────────────────────────────
  async function loadTodayData() {
    try {
      const today = todayKey()
      const logRes = await supabase.from('daily_focus_log')
        .select('total_minutes, sessions_completed, sessions_count')
        .eq('user_id', user.id).eq('log_date', today).maybeSingle()
      if (logRes.data) {
        setSessionsToday((logRes.data.sessions_completed ?? logRes.data.sessions_count) || 0)
        setMinutesToday(logRes.data.total_minutes || 0)
      }
    } catch { /* Supabase unreachable — start with zero counts, session still usable */ }
  }

  async function loadGoals() {
    try {
      const { data } = await supabase
        .from('score_goals').select('test_type, subject')
        .eq('user_id', user.id).order('created_at', { ascending: false })
      setGoals(data || [])
    } catch { /* non-fatal */ }
  }

  // ── Phase completion (driven by TimerContext signals) ──
  useEffect(() => {
    if (!focusJustCompleted) return
    setFlashRing(true)
    setTimeout(() => setFlashRing(false), 1300)
    setCompletedMins(focusMins)
    setReflectionOpen(true)
  }, [focusJustCompleted]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!breakJustCompleted) return
    toast('Break over — back to work.', 'info')
    setBreakTips(shuffleBreakTips())
    setTabSwitchCount(0)
    tabSwitchCountRef.current = 0
    ctx.acknowledgeBreakCompleted()
  }, [breakJustCompleted]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save completed session ───────────────────────────
  async function saveFocusSession(mins, note, extraProfileFields = {}) {
    if (!user) return null
    try {
    const today = todayKey()

    const { data: sd } = await supabase.from('focus_sessions').insert({
      user_id: user.id, duration_minutes: mins, completed: true,
      session_date: today, completed_at: new Date().toISOString(),
      notes: note || null,
      distraction_count: tabSwitchCountRef.current,
    }).select('id').single()

    const sessionId = sd?.id

    const { data: existing } = await supabase.from('daily_focus_log')
      .select('id, total_minutes, sessions_completed, sessions_count')
      .eq('user_id', user.id).eq('log_date', today).maybeSingle()

    if (existing) {
      const newMins     = (existing.total_minutes || 0) + mins
      const newSessions = (existing.sessions_completed || existing.sessions_count || 0) + 1
      await supabase.from('daily_focus_log').update({
        total_minutes: newMins, sessions_completed: newSessions, sessions_count: newSessions,
      }).eq('id', existing.id)
      setMinutesToday(newMins)
      setSessionsToday(newSessions)
    } else {
      await supabase.from('daily_focus_log').insert({
        user_id: user.id, log_date: today,
        total_minutes: mins, sessions_completed: 1, sessions_count: 1,
      })
      setMinutesToday(mins)
      setSessionsToday(1)
    }

    const currentStreak = profile?.streak_count ?? 0
    const isFirstToday  = sessionsTodayRef.current === 0

    await supabase.from('profiles').update({
      total_focus_minutes: (profile?.total_focus_minutes ?? 0) + mins,
      total_sessions:      (profile?.total_sessions ?? 0) + 1,
      streak_count:        isFirstToday ? currentStreak + 1 : currentStreak,
      last_focus_date:     today,
      ...extraProfileFields,
    }).eq('user_id', user.id)

    await refreshProfile()
    return sessionId
    } catch (err) {
      console.error('Session save failed:', err.message)
      toast('Session logged locally — sync failed. Check your connection.', 'error')
      return null
    }
  }

  // ── Reflection submit ────────────────────────────────
  async function finishReflection(distraction) {
    try {
    const mins      = completedMins
    const newSpan   = pomodoroMode ? 25 : Math.min(90, mins + 2)
    const newStreak = focusBlocksStreak + 1

    const sessionId = await saveFocusSession(mins, '', pomodoroMode ? {} : {
      focus_duration:       newSpan,
      focus_blocks_streak:  newStreak,
    })

    if (distraction && distraction !== 'skip') {
      await supabase.from('session_reflections').insert({
        user_id: user.id, session_id: sessionId ?? null,
        distraction, session_date: todayKey(),
      })
    }

    // Save completed tasks and award XP
    const completedTasks = tasks.filter(t => t.done)
    let taskXP = 0
    if (completedTasks.length > 0 && user) {
      const today = todayKey()
      await supabase.from('tasks').insert(
        completedTasks.map(t => ({
          user_id: user.id, task_text: t.text,
          completed: true, session_date: today,
        }))
      )
      // Also insert incomplete tasks
      const incompleteTasks = tasks.filter(t => !t.done)
      if (incompleteTasks.length > 0) {
        await supabase.from('tasks').insert(
          incompleteTasks.map(t => ({
            user_id: user.id, task_text: t.text,
            completed: false, session_date: today,
          }))
        )
      }
      taskXP = completedTasks.length * 5
    }

    setFocusBlocksStreak(newStreak)

    if (!pomodoroMode) {
      ctx.setFocusMinsCtx(newSpan)
      showRec(`Next session: try ${newSpan} min — you earned it.`)
    } else {
      showRec('Pomodoro complete! Take your break.')
    }

    const xpMsg = taskXP > 0 ? ` +${taskXP} task XP` : ''
    toast(`+${mins * 10} XP · ${mins} minutes logged${xpMsg}`, 'success')

    // Advance quote and study tip
    setQuoteIdx(i => (i + 1) % QUOTES.length)
    nextTip()

    // Reset task state for next session
    setTasks([])
    setTaskInput('')
    localStorage.removeItem('focusos_session_note')
    setTabSwitchCount(0)
    tabSwitchCountRef.current = 0
    setReflectionOpen(false)
    setSelectedDistraction(null)
    setPanel('break')
    ctx.startBreak()
    } catch (err) {
      console.error('Reflection submit failed:', err.message)
      toast('Could not save session. Check your connection.', 'error')
      setReflectionOpen(false)
    }
  }

  // ── Early quit ───────────────────────────────────────
  async function handleEarlyQuit() {
    setQuitConfirm(false)
    ctx.pause()

    const elapsedMins = Math.max(1, Math.floor((focusDuration - timeLeft) / 60))

    if (user) {
      try {
        await supabase.from('focus_sessions').insert({
          user_id: user.id, duration_minutes: elapsedMins,
          completed: false, completed_early: true,
          session_date: todayKey(),
          completed_at: new Date().toISOString(),
        })
        await supabase.from('profiles').update({ focus_blocks_streak: 0 }).eq('user_id', user.id)
        setFocusBlocksStreak(0)
      } catch { /* non-fatal on early quit */ }
    }

    showRec(`Next session: stay at ${focusMins} min — consistency beats length.`)
    toast('Stay consistent — short sessions still count.', 'info')
    ctx.reset('focus')
  }

  // ── Recommendation banner helper ─────────────────────
  function showRec(text) {
    clearTimeout(recTimerRef.current)
    setRecommendation(text)
    recTimerRef.current = setTimeout(() => setRecommendation(null), 30000)
  }

  // ── Timer controls ───────────────────────────────────
  function toggleTimer() {
    // Unlock audio synchronously inside the tap gesture — required for iOS
    // Safari to allow brown-noise / chime playback that starts from effects.
    unlockAudio()
    if (timeLeft === 0) ctx.reset('focus')
    else running ? ctx.pause() : ctx.start()
  }

  function reset() {
    ctx.reset('focus')
    setRecommendation(null); clearTimeout(recTimerRef.current)
    setTabSwitchCount(0); tabSwitchCountRef.current = 0
  }

  function updateFocusMins(mins) {
    if (pomodoroMode) return
    ctx.setFocusMinsCtx(mins)
  }

  function updateBreakMins(mins) {
    if (pomodoroMode) return
    ctx.setBreakMinsCtx(mins)
  }

  // ── Task helpers ─────────────────────────────────────
  function addTask() {
    const text = taskInput.trim()
    if (!text || tasks.length >= 3) return
    setTasks(prev => [...prev, { id: Date.now() + Math.random(), text, done: false }])
    setTaskInput('')
  }

  function toggleTask(i) {
    setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, done: !t.done } : t))
  }

  function removeTask(i) {
    setTasks(prev => prev.filter((_, idx) => idx !== i))
  }

  // ── Daily Intention ──────────────────────────────────
  function saveIntention() {
    const text = intentionInput.trim()
    if (!text) return
    const payload = JSON.stringify({ date: todayKey(), text })
    localStorage.setItem('focusos_intention', payload)
    setIntention(text)
    setIntentionInput('')
    setShowIntentionForm(false)
  }

  // ── Derived display values ───────────────────────────
  const level    = getLevel(pomodoroMode ? 25 : focusMins)
  const levelIdx = LEVELS.indexOf(level)
  const prevMax  = levelIdx === 0 ? 0 : LEVELS[levelIdx - 1].max
  const nextLvl  = levelIdx < LEVELS.length - 1 ? LEVELS[levelIdx + 1] : null
  const pctToNext  = nextLvl ? Math.min(100, ((focusMins - prevMax) / (level.max - prevMax)) * 100) : 100
  const minsToNext = nextLvl ? Math.max(0, level.max - focusMins) : 0
  const streak   = profile?.streak_count ?? 0

  const hasMadeProgress = phase === 'focus' && timeLeft < focusDuration && timeLeft > 0

  const goalLabel = goals.length > 0
    ? 'Studying for: ' + goals.slice(0, 3)
        .map(g => g.test_type === 'AP' && g.subject ? `AP ${g.subject}` : g.test_type)
        .join(' · ')
    : null


  const quote = QUOTES[quoteIdx]

  // The Break tab only exists during a break.
  const activePanel = phase !== 'break' && panel === 'break' ? 'session' : panel

  const firstName = (profile?.name || profile?.username || 'there').split(' ')[0]
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  const live = running && phase === 'focus'
  const dialLabel = phase === 'break' ? 'Break' : live ? 'Focusing' : `${pomodoroMode ? 'Pomodoro' : 'Focus'} · ${focusMins} min`
  const primaryLabel = running ? 'Pause' : timeLeft === 0 ? 'Restart' : (hasMadeProgress || (phase === 'break' && timeLeft < breakDuration)) ? 'Resume' : 'Start'
  const canEndEarly = phase === 'focus' && (running || hasMadeProgress)
  const visiblePanels = PANELS.filter(p => p.id !== 'break' || phase === 'break')
  const tip = STUDY_TIPS[tipOrder[tipPos]]
  const taskCount = tasks.length

  return (
    <div className="page-fade">

      {/* ── Header ── */}
      <header className="recede" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <span className="kicker">{today}</span>
          <h1 className="page-title">{getGreeting()}, {firstName}.</h1>
          <div style={{ marginTop: 10, minHeight: 32, display: 'flex', alignItems: 'center' }}>
            {intention ? (
              <span style={{ fontSize: 14, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Today: <span style={{ color: 'var(--text)' }}>{intention}</span>
                <button className="btn-quiet" aria-label="Clear intention" onClick={() => { setIntention(''); localStorage.removeItem('focusos_intention') }}><X size={13} /></button>
              </span>
            ) : showIntentionForm ? (
              <form onSubmit={e => { e.preventDefault(); saveIntention() }} style={{ display: 'flex', gap: 6, width: 'min(380px, 100%)' }}>
                <input autoFocus placeholder="Today I will…" value={intentionInput} maxLength={60}
                  onChange={e => setIntentionInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') setShowIntentionForm(false) }}
                  style={{ height: 32, padding: '0 10px' }} />
                <button type="submit" className="btn btn-ghost btn-sm">Set</button>
              </form>
            ) : (
              <button className="btn-quiet" style={{ paddingLeft: 0 }} onClick={() => setShowIntentionForm(true)}>
                <Plus size={14} /> Set today's intention
              </button>
            )}
          </div>
        </div>
        <dl className="mono" style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--muted)' }}>
          {[[sessionsToday, 'blocks'], [minutesToday, 'min today'], [streak, 'day streak']].map(([v, k]) => (
            <div key={k} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
              <dt className="num" style={{ fontSize: 18, color: 'var(--text)' }}>{v}</dt><dd>{k}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ── Dial + controls ── */}
      <section style={{ margin: '48px 0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Dial
          timeLeft={timeLeft}
          totalTime={phase === 'focus' ? focusDuration : breakDuration}
          phase={phase}
          running={running}
          flashRing={flashRing}
          label={dialLabel}
        >
          <div style={{ height: 20, fontSize: 12.5, color: 'var(--muted)' }}>
            {live && tabSwitchCount > 0 ? (
              <span style={{ color: tabSwitchCount <= 2 ? 'var(--amber)' : 'var(--red)' }}>
                {tabSwitchCount} tab switch{tabSwitchCount === 1 ? '' : 'es'}
              </span>
            ) : focusBlocksStreak > 0 && phase === 'focus' ? (
              <span>{focusBlocksStreak} in a row</span>
            ) : goalLabel ? (
              <span>{goalLabel.replace('Studying for: ', '')}</span>
            ) : (
              <Link to="/goals" style={{ color: 'var(--muted)' }}>Add a goal</Link>
            )}
          </div>
        </Dial>

        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '44px auto 44px', alignItems: 'center', gap: 16 }}>
          <button className="btn-quiet" onClick={reset} aria-label="Reset timer" title="Reset (R)"
            style={{ width: 44, height: 44, justifyContent: 'center', border: '1px solid var(--hairline)', borderRadius: '50%' }}>
            <RotateCcw size={16} strokeWidth={1.6} />
          </button>
          <motion.button
            onClick={toggleTimer}
            className={running ? 'btn btn-ghost' : 'btn btn-accent'}
            whileTap={{ scale: 0.96 }}
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            style={{ height: 52, minWidth: 168, borderRadius: 999, justifyContent: 'center', fontSize: 15 }}
            aria-label={`${primaryLabel} timer`} title="Space"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={primaryLabel}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}>
                {primaryLabel}
              </motion.span>
            </AnimatePresence>
          </motion.button>
          {canEndEarly ? (
            <button className="btn-quiet" onClick={() => setQuitConfirm(true)} aria-label="End block early" title="End early"
              style={{ width: 44, height: 44, justifyContent: 'center', border: '1px solid var(--hairline)', borderRadius: '50%' }}>
              <Square size={13} strokeWidth={1.8} />
            </button>
          ) : <span />}
        </div>

        <AnimatePresence>
          {recommendation && (
            <motion.p
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ marginTop: 20, fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--text)' }}>{recommendation}</span>
              <button className="btn-quiet" aria-label="Dismiss" onClick={() => { setRecommendation(null); clearTimeout(recTimerRef.current) }}><X size={13} /></button>
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {/* ── Tools ── */}
      <section className="recede" style={{ maxWidth: 560, margin: '0 auto' }}>
        <nav className="subnav" style={{ marginBottom: 20, justifyContent: 'center' }} aria-label="Session tools">
          {visiblePanels.map(p => (
            <a key={p.id} href={`#${p.id}`} className={activePanel === p.id ? 'active' : ''}
              onClick={e => { e.preventDefault(); setPanel(p.id) }}>
              {p.label}
              {p.id === 'tasks' && taskCount > 0 && <span className="mono" style={{ marginLeft: 6, fontSize: 11, color: 'var(--faint)' }}>{taskCount}</span>}
              {p.id === 'sound' && soundType !== 'silent' && <span style={{ marginLeft: 6, display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', verticalAlign: 'middle' }} />}
              {activePanel === p.id && <motion.span layoutId="timer-panel-line" className="subnav-line" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            </a>
          ))}
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={activePanel}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
            {activePanel === 'break' && <BreakPanel breakTips={breakTips} onShuffle={() => setBreakTips(shuffleBreakTips())} />}
            {activePanel === 'session' && (
              <SessionPanel
                pomodoroMode={pomodoroMode} running={running}
                onTogglePomodoro={v => { if (!running) ctx.setPomodoroMode(v) }}
                focusMins={focusMins} breakMins={breakMins}
                onFocus={updateFocusMins} onBreak={updateBreakMins}
                level={level} nextLvl={nextLvl} minsToNext={minsToNext} pctToNext={pctToNext}
              />
            )}
            {activePanel === 'sound' && <SoundPanel soundType={soundType} setSoundType={setSoundType} volume={volume} setVolume={setVolume} running={running} />}
            {activePanel === 'tasks' && <TasksPanel tasks={tasks} taskInput={taskInput} setTaskInput={setTaskInput} addTask={addTask} removeTask={removeTask} running={running} />}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ── Study tip ── */}
      <footer className="recede" style={{ maxWidth: 560, margin: '56px auto 0', paddingTop: 20, borderTop: '1px solid var(--hairline)' }}>
        <div style={{ opacity: tipVisible ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          <span className="kicker">Did you know</span>
          <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>{tip.tip}</p>
          <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>{tip.source}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <button className="btn-quiet" style={{ paddingLeft: 0, fontSize: 12.5 }} onClick={() => setShortcutsOpen(true)}>
            <Keyboard size={14} strokeWidth={1.6} /> Shortcuts <kbd>?</kbd>
          </button>
          <button className="btn-quiet" style={{ fontSize: 12.5 }} onClick={nextTip}>Next tip →</button>
        </div>
      </footer>

      <ReflectionModal
        open={reflectionOpen} completedMins={completedMins} quote={quote}
        tasks={tasks} toggleTask={toggleTask}
        selectedDistraction={selectedDistraction} setSelectedDistraction={setSelectedDistraction}
        onFinish={finishReflection}
      />
      <QuitModal open={quitConfirm} onCancel={() => setQuitConfirm(false)} onConfirm={handleEarlyQuit} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
