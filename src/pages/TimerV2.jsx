import { useState, useEffect, useRef } from 'react'
import { useTimerContext } from '../context/TimerContext'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { VolumeX, Waves, Music, Music2, FileText, Flame, Target, X, Timer as TimerIcon, Zap, Check } from 'lucide-react'

// ── All constants (identical to Timer.jsx) ──────────────────────────────────
const LEVELS = [
  { max: 10,  name: 'SCATTERED',  color: '#ff4d4d', desc: 'Building the habit. Short sessions are real.' },
  { max: 20,  name: 'WARMING UP', color: '#ffb340', desc: 'Getting there. Brief bursts of real focus.' },
  { max: 35,  name: 'FOCUSED',    color: '#60d3f8', desc: 'Solid concentration. You\'re in the zone.' },
  { max: 50,  name: 'DEEP WORK',  color: '#a78bfa', desc: 'High performance mode. Elite territory.' },
  { max: 999, name: 'FLOW STATE', color: '#b5f23a', desc: 'Unbreakable. Your attention span is elite.' },
]
const BREAK_ACTIVITIES = [
  { text: '10 jumping jacks' },
  { text: 'Look out a window for 60 seconds' },
  { text: 'Drink a glass of water' },
  { text: '5 deep breaths — box breathing' },
  { text: 'Stretch your neck and shoulders' },
  { text: 'Walk to another room and back' },
]
const DISTRACTIONS = [
  'Phone / social media', 'Noise or environment', 'Tired or hungry',
  'My own thoughts', 'Nothing — I was locked in',
]
const QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Focus is the art of knowing what to ignore.', author: 'Anonymous' },
  { text: 'Small daily improvements over time lead to stunning results.', author: 'Robin Sharma' },
  { text: "You don't rise to your goals, you fall to your systems.", author: 'James Clear' },
  { text: 'The successful warrior is the average person with laser-like focus.', author: 'Bruce Lee' },
  { text: 'Concentrate all your thoughts upon the work at hand.', author: 'Alexander Bell' },
]
const SPOTIFY_PLAYLISTS = ['Lo-fi Hip Hop Beats', 'Deep Focus — Classical', 'Brain Food — Spotify']
const SOUND_OPTIONS = [
  { id: 'silent',    label: 'Silent',    Icon: VolumeX },
  { id: 'brown',     label: 'Brown',     Icon: Waves },
  { id: 'baroque',   label: 'Baroque',   Icon: Music },
  { id: 'classical', label: 'Classical', Icon: Music2 },
]
const STUDY_TIPS = [
  { tip: 'Staring at a blank wall for 10 minutes after studying helps your brain consolidate memories.', source: 'Dewar et al., Psychological Science, 2012' },
  { tip: 'Handwriting notes beats typing — the slower pace forces deeper processing of information.', source: 'Mueller & Oppenheimer, Psychological Science, 2014' },
  { tip: 'Testing yourself is 2× more effective than re-reading the same material.', source: 'Roediger & Karpicke, 2006' },
  { tip: 'A 10-minute walk before studying increases focus and memory retention significantly.', source: 'Hillman et al., Neuroscience, 2009' },
  { tip: 'Studying in different locations strengthens memory — your brain links info to environment.', source: 'Smith, 1982 — Context-dependent memory' },
  { tip: 'The ideal study-to-break ratio is roughly 52 minutes focus, 17 minutes break.', source: 'DeskTime productivity research, 2014' },
  { tip: 'Explaining a concept out loud to yourself reveals gaps in understanding. (The Feynman Technique)', source: 'Richard Feynman — Nobel Prize winner' },
  { tip: 'Mild dehydration (1–2%) reduces cognitive performance by up to 13%.', source: 'Masento et al., British Journal of Nutrition, 2014' },
  { tip: 'Background music with 60–70 BPM can enhance focus — matching the brain\'s alpha waves.', source: 'Rauscher et al., 1993 — Mozart Effect' },
  { tip: 'Sleeping within 12 hours of learning something doubles your retention rate.', source: 'Walker, Why We Sleep, 2017' },
  { tip: 'The spacing effect: studying material over multiple sessions beats cramming 3×.', source: 'Ebbinghaus Forgetting Curve, 1885' },
  { tip: 'Cold water on your face or wrists triggers the dive reflex — instant alertness boost.', source: 'Mammalian dive reflex — physiology research' },
  { tip: 'Interleaving different subjects in one session improves long-term retention vs. blocked practice.', source: 'Kornell & Bjork, Psychological Science, 2008' },
  { tip: 'A 20-minute nap between study sessions restores focus as effectively as a full night\'s sleep.', source: 'Mednick et al., Nature Neuroscience, 2003' },
  { tip: 'Writing your worries down before a test frees up working memory and improves performance.', source: 'Ramirez & Beilock, Science, 2011' },
]
const SHORTCUTS = [
  { key: 'Space', desc: 'Start / Pause timer' },
  { key: 'R',     desc: 'Reset timer' },
  { key: '1 – 8', desc: 'Switch tabs' },
  { key: 'Esc',   desc: 'Close modal / dialog' },
  { key: '?',     desc: 'Show this help panel' },
]

function shuffleIndices(len) {
  const a = Array.from({ length: len }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getLevel(mins) { return LEVELS.find(l => mins < l.max) || LEVELS[LEVELS.length - 1] }
function shuffleBreakTips() { return [...BREAK_ACTIVITIES].sort(() => Math.random() - 0.5).slice(0, 3) }
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'
}
function todayKey() { return new Date().toISOString().split('T')[0] }
function pad(n) { return String(n).padStart(2, '0') }
function fmt(secs) { return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}` }

function makeBrownNoise(ctx) {
  const masterGain = ctx.createGain(); masterGain.gain.value = 0.4; masterGain.connect(ctx.destination)
  const bufferSize = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch); let lastOut = 0
    for (let i = 0; i < bufferSize; i++) { const w = Math.random() * 2 - 1; lastOut = (lastOut + 0.02 * w) / 1.02; data[i] = lastOut * 3.5 }
  }
  const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true
  const lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 500; lowpass.Q.value = 0.5
  source.connect(lowpass); lowpass.connect(masterGain); source.start()
  return { stop: () => { source.stop(); masterGain.disconnect() }, setVolume: (v) => { masterGain.gain.value = v * 0.4 } }
}
const YT_IDS = { baroque: 'WPni755-Krg', classical: 'jgpJVI3tDbY' }
function createAmbientSound(type, volume) {
  if (type === 'silent') return null
  if (type === 'brown') {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(); ctx.resume()
    const sound = makeBrownNoise(ctx); sound.setVolume(volume)
    return { stop: () => { sound.stop(); ctx.close() }, setVolume: (v) => sound.setVolume(v) }
  }
  const iframe = document.createElement('iframe'); iframe.allow = 'autoplay'
  iframe.style.cssText = 'display:none;position:fixed;top:-9999px;left:-9999px;width:0;height:0;'
  const vid = YT_IDS[type]
  iframe.src = `https://www.youtube.com/embed/${vid}?autoplay=1&loop=1&playlist=${vid}&controls=0&enablejsapi=1`
  document.body.appendChild(iframe)
  const postCmd = (func, args = []) => {
    try { iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*') } catch(e) {}
  }
  const initTimer = setTimeout(() => postCmd('setVolume', [Math.round(volume * 100)]), 2000)
  return {
    setVolume: (v) => postCmd('setVolume', [Math.round(v * 100)]),
    stop: () => { clearTimeout(initTimer); postCmd('pauseVideo'); setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe) }, 150) },
  }
}

const R = 100, CIRC = 2 * Math.PI * R

function CircularTimer({ timeLeft, totalTime, phase, pomodoroMode, running, flashRing }) {
  const progress = totalTime > 0 ? timeLeft / totalTime : 1
  const offset   = CIRC * (1 - progress)
  const color    = phase === 'focus' ? '#b5f23a' : '#60d3f8'
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2
    return { x1: 120 + 86 * Math.cos(angle), y1: 120 + 86 * Math.sin(angle), x2: 120 + 96 * Math.cos(angle), y2: 120 + 96 * Math.sin(angle), major: i % 3 === 0 }
  })
  return (
    <div style={{ position: 'relative', width: 'min(240px, 76vw)', height: 'min(240px, 76vw)', margin: '0 auto' }}>
      <svg width="100%" height="100%" viewBox="0 0 240 240" style={{
        display: 'block',
        filter: running && phase === 'focus' ? 'drop-shadow(0 0 18px rgba(181,242,58,0.52))' : 'none',
        transition: 'filter 0.7s ease',
      }}>
        {running && phase === 'focus' && (
          <circle cx="120" cy="120" r={R} fill="none" stroke={color} strokeWidth="3"
            style={{ animation: 'ping 2s ease-out infinite', transformOrigin: 'center', transformBox: 'fill-box' }} />
        )}
        <circle cx="120" cy="120" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle cx="120" cy="120" r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={offset} transform="rotate(-90 120 120)"
          className={flashRing ? 'ring-flash' : ''}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }} />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.major ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.09)'}
            strokeWidth={t.major ? 2 : 1} strokeLinecap="round" />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={timeLeft}
            initial={{ scale: 1.08, opacity: 0.7 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="bebas glow-num"
            style={{ fontSize: 50, color, letterSpacing: 2, lineHeight: 1 }}
          >
            {fmt(timeLeft)}
          </motion.div>
        </AnimatePresence>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em', marginTop: 5, fontWeight: 700 }}>
          {pomodoroMode ? (phase === 'focus' ? 'POMODORO' : 'BREAK') : (phase === 'focus' ? 'FOCUS' : 'BREAK')}
        </div>
      </div>
    </div>
  )
}

// ── Glass card helper ──────────────────────────────────────────────────────
const GlassCard = ({ children, style = {}, borderAccent }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: borderAccent
      ? `1px solid rgba(255,255,255,0.07)`
      : '1px solid rgba(255,255,255,0.07)',
    borderLeft: borderAccent ? `2px solid ${borderAccent}` : undefined,
    borderRadius: 14,
    boxShadow: '0 4px 24px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.04)',
    padding: 18,
    ...style,
  }}>
    {children}
  </div>
)

export default function TimerV2() {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const ctx = useTimerContext()
  const { timeLeft, running, phase, focusMins, breakMins, focusDuration, breakDuration,
    pomodoroMode, focusJustCompleted, breakJustCompleted } = ctx

  const [sessionsToday,      setSessionsToday]      = useState(0)
  const [minutesToday,       setMinutesToday]        = useState(0)
  const [todaySessions,      setTodaySessions]      = useState([])
  const [focusBlocksStreak,  setFocusBlocksStreak]  = useState(0)
  const [goals,              setGoals]              = useState([])
  const [reflectionOpen,     setReflectionOpen]     = useState(false)
  const [completedMins,      setCompletedMins]      = useState(0)
  const [selectedDistraction,setSelectedDistraction]= useState(null)
  const [sessionNote,        setSessionNote]        = useState('')
  const [recommendation,     setRecommendation]     = useState(null)
  const recTimerRef = useRef(null)
  const [quitConfirm,  setQuitConfirm]  = useState(false)
  const [breakTips,    setBreakTips]    = useState(() => shuffleBreakTips())
  const [tasks,        setTasks]        = useState([])
  const [taskInput,    setTaskInput]    = useState('')
  const [intention,    setIntention]    = useState(() => {
    const saved = localStorage.getItem('focusos_intention')
    if (!saved) return ''
    try { const { date, text } = JSON.parse(saved); return date === todayKey() ? text : '' } catch { return '' }
  })
  const [intentionInput,    setIntentionInput]    = useState('')
  const [showIntentionForm, setShowIntentionForm] = useState(false)
  const [soundType, setSoundType] = useState(() => {
    const saved = localStorage.getItem('focusos_sound') || 'silent'
    return ['silent','brown','baroque','classical'].includes(saved) ? saved : 'silent'
  })
  const [volume,      setVolume]      = useState(() => parseFloat(localStorage.getItem('focusos_sound_vol') || '0.5'))
  const soundRef = useRef(null)
  const [quoteIdx,    setQuoteIdx]    = useState(() => Math.floor(Math.random() * QUOTES.length))
  const [tipOrder]                    = useState(() => shuffleIndices(STUDY_TIPS.length))
  const [tipPos,      setTipPos]      = useState(0)
  const [tipVisible,  setTipVisible]  = useState(true)
  const [shortcutsOpen,  setShortcutsOpen]  = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const tabSwitchCountRef = useRef(0)
  const [noteOpen,    setNoteOpen]    = useState(false)
  const [liveNote,    setLiveNote]    = useState('')
  const liveNoteRef = useRef('')
  const [flashRing,   setFlashRing]   = useState(false)

  const sessionsTodayRef  = useRef(0)
  const profileLoadedRef  = useRef(false)
  const runningRef        = useRef(running)
  const phaseRef          = useRef(phase)
  const timeLeftRef       = useRef(timeLeft)
  const focusDurationRef  = useRef(focusDuration)

  useEffect(() => { runningRef.current = running }, [running])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { timeLeftRef.current = timeLeft }, [timeLeft])
  useEffect(() => { focusDurationRef.current = focusDuration }, [focusDuration])
  useEffect(() => { tabSwitchCountRef.current = tabSwitchCount }, [tabSwitchCount])
  useEffect(() => { liveNoteRef.current = liveNote }, [liveNote])

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) return
      if (!runningRef.current || phaseRef.current !== 'focus') return
      const next = tabSwitchCountRef.current + 1
      setTabSwitchCount(next); tabSwitchCountRef.current = next
      const msg = next <= 2 ? 'Welcome back — try to stay focused!'
        : next <= 5 ? `Tab switch #${next} detected — refocus.`
        : `${next} switches this session. Every distraction costs 23 min of recovery.`
      toast(msg, next > 5 ? 'error' : 'info')
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem('focusos_session_note', liveNote), 2000)
    return () => clearTimeout(t)
  }, [liveNote])

  useEffect(() => {
    if (!profile || profileLoadedRef.current) return
    profileLoadedRef.current = true
    setFocusBlocksStreak(profile.focus_blocks_streak ?? 0)
  }, [profile])

  useEffect(() => { if (user) { loadTodayData(); loadGoals() } }, [user])

  useEffect(() => {
    function handleBeforeUnload() {
      if (!runningRef.current || phaseRef.current !== 'focus') return
      const elapsed = focusDurationRef.current - timeLeftRef.current
      if (elapsed < 60 || !user?.id) return
      const blob = new Blob([JSON.stringify({ user_id: user.id, duration_minutes: Math.floor(elapsed / 60), session_date: new Date().toISOString().split('T')[0] })], { type: 'application/json' })
      navigator.sendBeacon('/api/save-session', blob)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [user])
  useEffect(() => { sessionsTodayRef.current = sessionsToday }, [sessionsToday])
  useEffect(() => () => clearTimeout(recTimerRef.current), [])

  function stopSound() { if (soundRef.current) { soundRef.current.stop(); soundRef.current = null } }
  function startSound(type, vol) { stopSound(); if (type === 'silent') return; soundRef.current = createAmbientSound(type, vol) }

  useEffect(() => {
    localStorage.setItem('focusos_sound', soundType)
    if (running && phase === 'focus') startSound(soundType, volume)
    else stopSound()
    return stopSound
  }, [soundType])

  useEffect(() => { localStorage.setItem('focusos_sound_vol', volume); if (soundRef.current?.setVolume) soundRef.current.setVolume(volume) }, [volume])
  useEffect(() => { if (running && phase === 'focus') startSound(soundType, volume); else stopSound() }, [running, phase])
  useEffect(() => () => stopSound(), [])

  function nextTip() {
    setTipVisible(false)
    setTimeout(() => { setTipPos(p => (p + 1) % STUDY_TIPS.length); setTipVisible(true) }, 300)
  }
  useEffect(() => { const id = setInterval(nextTip, 5 * 60 * 1000); return () => clearInterval(id) }, [])

  useEffect(() => {
    function handleKey(e) {
      const tag = document.activeElement?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (e.key === '?' && !inInput) { setShortcutsOpen(o => !o); return }
      if (shortcutsOpen && e.key === 'Escape') { setShortcutsOpen(false); return }
      if (e.key === 'Escape') { setReflectionOpen(false); setQuitConfirm(false); return }
      if (inInput) return
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (phaseRef.current === 'focus' || phaseRef.current === 'break') { runningRef.current ? ctx.pause() : ctx.start() }
        return
      }
      if (e.key === 'r' || e.key === 'R') { reset(); return }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [shortcutsOpen, pomodoroMode, focusDuration, navigate])

  async function loadTodayData() {
    try {
      const today = todayKey()
      const [logRes, sessRes] = await Promise.all([
        supabase.from('daily_focus_log').select('total_minutes, sessions_completed, sessions_count').eq('user_id', user.id).eq('log_date', today).single(),
        supabase.from('focus_sessions').select('duration_minutes').eq('user_id', user.id).eq('session_date', today).eq('completed', true),
      ])
      if (logRes.data) { setSessionsToday((logRes.data.sessions_completed ?? logRes.data.sessions_count) || 0); setMinutesToday(logRes.data.total_minutes || 0) }
      setTodaySessions(sessRes.data || [])
    } catch { /* non-fatal */ }
  }

  async function loadGoals() {
    try {
      const { data } = await supabase.from('score_goals').select('test_type, subject').eq('user_id', user.id).order('created_at', { ascending: false })
      setGoals(data || [])
    } catch { /* non-fatal */ }
  }

  useEffect(() => {
    if (!focusJustCompleted) return
    setFlashRing(true); setTimeout(() => setFlashRing(false), 1300)
    setCompletedMins(focusMins); setSessionNote(liveNoteRef.current || ''); setReflectionOpen(true)
  }, [focusJustCompleted])

  useEffect(() => {
    if (!breakJustCompleted) return
    toast('Break over — back to work.', 'info')
    setBreakTips(shuffleBreakTips()); setTabSwitchCount(0); tabSwitchCountRef.current = 0
    ctx.acknowledgeBreakCompleted()
  }, [breakJustCompleted])

  async function saveFocusSession(mins, note, extraProfileFields = {}) {
    if (!user) return null
    try {
      const today = todayKey()
      const { data: sd } = await supabase.from('focus_sessions').insert({ user_id: user.id, duration_minutes: mins, completed: true, session_date: today, completed_at: new Date().toISOString(), notes: note || null, distraction_count: tabSwitchCountRef.current }).select('id').single()
      const sessionId = sd?.id
      const { data: existing } = await supabase.from('daily_focus_log').select('*').eq('user_id', user.id).eq('log_date', today).single()
      if (existing) {
        const newMins = (existing.total_minutes || 0) + mins
        const newSessions = (existing.sessions_completed || existing.sessions_count || 0) + 1
        await supabase.from('daily_focus_log').update({ total_minutes: newMins, sessions_completed: newSessions, sessions_count: newSessions }).eq('id', existing.id)
        setMinutesToday(newMins); setSessionsToday(newSessions)
      } else {
        await supabase.from('daily_focus_log').insert({ user_id: user.id, log_date: today, total_minutes: mins, sessions_completed: 1, sessions_count: 1 })
        setMinutesToday(mins); setSessionsToday(1)
      }
      const currentStreak = profile?.streak_count ?? 0
      const isFirstToday = sessionsTodayRef.current === 0
      await supabase.from('profiles').update({ total_focus_minutes: (profile?.total_focus_minutes ?? 0) + mins, total_sessions: (profile?.total_sessions ?? 0) + 1, streak_count: isFirstToday ? currentStreak + 1 : currentStreak, last_focus_date: today, ...extraProfileFields }).eq('user_id', user.id)
      await refreshProfile()
      return sessionId
    } catch (err) {
      console.error('Session save failed:', err.message)
      toast('Session logged locally — sync failed.', 'error')
      return null
    }
  }

  async function finishReflection(distraction) {
    try {
      const mins = completedMins
      const newSpan = pomodoroMode ? 25 : Math.min(90, mins + 2)
      const newStreak = focusBlocksStreak + 1
      const sessionId = await saveFocusSession(mins, sessionNote, pomodoroMode ? {} : { focus_duration: newSpan, focus_blocks_streak: newStreak })
      if (distraction && distraction !== 'skip') {
        await supabase.from('session_reflections').insert({ user_id: user.id, session_id: sessionId ?? null, distraction, session_date: todayKey() })
      }
      const completedTasks = tasks.filter(t => t.done)
      let taskXP = 0
      if (completedTasks.length > 0 && user) {
        const today = todayKey()
        await supabase.from('tasks').insert(completedTasks.map(t => ({ user_id: user.id, task_text: t.text, completed: true, session_date: today })))
        const incompleteTasks = tasks.filter(t => !t.done)
        if (incompleteTasks.length > 0) await supabase.from('tasks').insert(incompleteTasks.map(t => ({ user_id: user.id, task_text: t.text, completed: false, session_date: today })))
        taskXP = completedTasks.length * 5
      }
      setFocusBlocksStreak(newStreak)
      setTodaySessions(prev => [...prev, { duration_minutes: mins }])
      if (!pomodoroMode) { ctx.setFocusMinsCtx(newSpan); showRec(`Next session: try ${newSpan} min — you earned it.`) }
      else showRec('Pomodoro complete! Take your break.')
      const xpMsg = taskXP > 0 ? ` +${taskXP} task XP` : ''
      toast(`+${mins * 10} XP · ${mins} minutes logged${xpMsg}`, 'success')
      setQuoteIdx(i => (i + 1) % QUOTES.length); nextTip()
      setTasks([]); setTaskInput(''); setSessionNote(''); setLiveNote(''); liveNoteRef.current = ''
      localStorage.removeItem('focusos_session_note')
      setTabSwitchCount(0); tabSwitchCountRef.current = 0
      setReflectionOpen(false); setSelectedDistraction(null); ctx.startBreak()
    } catch (err) {
      console.error('Reflection submit failed:', err.message)
      toast('Could not save session.', 'error'); setReflectionOpen(false)
    }
  }

  async function handleEarlyQuit() {
    setQuitConfirm(false); ctx.pause()
    const elapsedMins = Math.max(1, Math.floor((focusDuration - timeLeft) / 60))
    if (user) {
      try {
        await supabase.from('focus_sessions').insert({ user_id: user.id, duration_minutes: elapsedMins, completed: false, completed_early: true, session_date: todayKey(), completed_at: new Date().toISOString() })
        await supabase.from('profiles').update({ focus_blocks_streak: 0 }).eq('user_id', user.id)
        setFocusBlocksStreak(0)
      } catch { /* non-fatal */ }
    }
    showRec(`Next session: stay at ${focusMins} min — consistency beats length.`)
    toast('Stay consistent — short sessions still count.', 'info'); ctx.reset('focus')
  }

  function showRec(text) { clearTimeout(recTimerRef.current); setRecommendation(text); recTimerRef.current = setTimeout(() => setRecommendation(null), 30000) }
  function toggleTimer() { if (timeLeft === 0) ctx.reset('focus'); else running ? ctx.pause() : ctx.start() }
  function reset() { ctx.reset('focus'); setRecommendation(null); clearTimeout(recTimerRef.current); setTabSwitchCount(0); tabSwitchCountRef.current = 0 }
  function updateFocusMins(mins) { if (pomodoroMode) return; ctx.setFocusMinsCtx(mins) }
  function updateBreakMins(mins) { if (pomodoroMode) return; ctx.setBreakMinsCtx(mins) }
  function addTask() { const text = taskInput.trim(); if (!text || tasks.length >= 3) return; setTasks(prev => [...prev, { text, done: false }]); setTaskInput('') }
  function toggleTask(i) { setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, done: !t.done } : t)) }
  function removeTask(i) { setTasks(prev => prev.filter((_, idx) => idx !== i)) }
  function saveIntention() {
    const text = intentionInput.trim(); if (!text) return
    localStorage.setItem('focusos_intention', JSON.stringify({ date: todayKey(), text }))
    setIntention(text); setIntentionInput(''); setShowIntentionForm(false)
  }

  const level    = getLevel(pomodoroMode ? 25 : focusMins)
  const levelIdx = LEVELS.indexOf(level)
  const prevMax  = levelIdx === 0 ? 0 : LEVELS[levelIdx - 1].max
  const nextLvl  = levelIdx < LEVELS.length - 1 ? LEVELS[levelIdx + 1] : null
  const pctToNext  = nextLvl ? Math.min(100, ((focusMins - prevMax) / (level.max - prevMax)) * 100) : 100
  const minsToNext = nextLvl ? Math.max(0, level.max - focusMins) : 0
  const streak   = profile?.streak_count ?? 0
  const focusPct = Math.min(100, ((focusMins - 5) / (90 - 5)) * 100)
  const breakPct = Math.min(100, ((breakMins - 1) / (30 - 1)) * 100)
  const hasMadeProgress = phase === 'focus' && timeLeft < focusDuration && timeLeft > 0
  const goalLabel = goals.length > 0
    ? 'Studying for: ' + goals.slice(0, 3).map(g => g.test_type === 'AP' && g.subject ? `AP ${g.subject}` : g.test_type).join(' · ')
    : null
  const quote = QUOTES[quoteIdx]

  /* ─────────────────────────────── RENDER ─────────────────────────────── */
  return (
    <div className="page-fade" style={{ position: 'relative' }}>

      {/* Intention banner */}
      <AnimatePresence>
        {intention ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              marginBottom: 14, padding: '10px 16px',
              background: 'rgba(181,242,58,0.05)',
              border: '1px solid rgba(181,242,58,0.14)',
              borderLeft: '2px solid rgba(181,242,58,0.5)',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 13, color: 'rgba(148,148,160,0.8)' }}>
              Today I will: <span style={{ color: '#f0f0f2', fontWeight: 600 }}>{intention}</span>
            </span>
            <button onClick={() => { setIntention(''); localStorage.removeItem('focusos_intention') }}
              style={{ background: 'none', border: 'none', color: 'rgba(148,148,160,0.4)', cursor: 'pointer', padding: '0 4px', display: 'flex' }}>
              <X size={14} />
            </button>
          </motion.div>
        ) : !showIntentionForm ? (
          <motion.button
            whileHover={{ borderColor: 'rgba(181,242,58,0.4)', color: 'rgba(181,242,58,0.7)' }}
            onClick={() => setShowIntentionForm(true)}
            style={{
              display: 'block', width: '100%', marginBottom: 14, padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', border: '1px dashed rgba(181,242,58,0.18)', color: 'rgba(148,148,160,0.5)',
              fontSize: 13, textAlign: 'left', transition: 'all 0.15s', fontFamily: "'Outfit', sans-serif",
            }}
          >
            <Target size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} /> Set today's intention →
          </motion.button>
        ) : (
          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input autoFocus placeholder="Today I will..." value={intentionInput} maxLength={60}
              onChange={e => setIntentionInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveIntention(); if (e.key === 'Escape') setShowIntentionForm(false) }}
              style={{ flex: 1, fontSize: 13, padding: '6px 10px' }} />
            <button className="btn btn-accent btn-sm" onClick={saveIntention}>Set</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowIntentionForm(false)} style={{ display: 'flex', alignItems: 'center' }}><X size={14} /></button>
          </div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 12 }}>
          {getGreeting()},{' '}
          <span className="page-title-accent">{(profile?.name || profile?.username || 'there').split(' ')[0]}</span>
        </h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Sessions', value: sessionsToday },
            { label: 'Minutes',  value: minutesToday },
            { label: 'Streak',   value: streak, isStreak: true },
          ].map(c => (
            <motion.div key={c.label}
              whileHover={{ y: -1 }}
              style={{
                padding: '7px 14px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9,
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ color: 'rgba(148,148,160,0.6)' }}>{c.label}:</span>
              <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                {c.value}{c.isStreak && <Flame size={13} color="#ffb340" />}
              </span>
            </motion.div>
          ))}
          {running && phase === 'focus' && (
            <div style={{
              padding: '7px 14px', borderRadius: 9, fontSize: 13,
              background: tabSwitchCount === 0 ? 'rgba(255,255,255,0.03)' : tabSwitchCount <= 2 ? 'rgba(242,199,90,0.1)' : 'rgba(242,90,90,0.1)',
              border: `1px solid ${tabSwitchCount === 0 ? 'rgba(255,255,255,0.07)' : tabSwitchCount <= 2 ? 'rgba(242,199,90,0.3)' : 'rgba(242,90,90,0.3)'}`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: 'rgba(148,148,160,0.6)' }}>Tab switches:</span>
              <span style={{ fontWeight: 700, color: tabSwitchCount === 0 ? '#f0f0f2' : tabSwitchCount <= 2 ? '#f2c75a' : '#f25a5a' }}>{tabSwitchCount}</span>
            </div>
          )}
        </div>
      </div>

      <div className="timer-grid">

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Level card */}
          <GlassCard borderAccent={level.color}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={level.name}
                  initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  style={{ fontSize: 20, fontWeight: 800, color: level.color, letterSpacing: '0.03em' }}
                >
                  {pomodoroMode ? 'CLASSIC POMODORO' : level.name}
                </motion.div>
              </AnimatePresence>
              {!pomodoroMode && nextLvl && (
                <span style={{ fontSize: 11, color: 'rgba(148,148,160,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '3px 9px' }}>
                  {minsToNext}m to {nextLvl.name}
                </span>
              )}
              {pomodoroMode && <span style={{ fontSize: 11, color: 'rgba(148,148,160,0.5)' }}>25 / 5 min</span>}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(148,148,160,0.6)', marginBottom: 12, lineHeight: 1.5 }}>
              {pomodoroMode ? 'Classic 25-minute Pomodoro intervals.' : level.desc}
            </div>
            {!pomodoroMode && (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${pctToNext}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ height: '100%', background: `linear-gradient(90deg, ${level.color}99, ${level.color})`, borderRadius: 4 }}
                />
              </div>
            )}
          </GlassCard>

          {/* Timer card */}
          <GlassCard style={{
            textAlign: 'center',
            boxShadow: running && phase === 'focus'
              ? '0 0 60px rgba(181,242,58,0.12), 0 4px 24px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.04)'
              : '0 4px 24px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.04)',
            transition: 'box-shadow 0.6s ease',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(148,148,160,0.5)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                {phase === 'focus' ? (pomodoroMode ? 'Pomodoro' : 'Focus Session') : 'Break Time'}
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {focusBlocksStreak > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(181,242,58,0.08)', border: '1px solid rgba(181,242,58,0.2)', color: '#b5f23a', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Target size={10} /> {focusBlocksStreak} in a row
                  </span>
                )}
                <motion.button
                  whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                  onClick={() => setNoteOpen(o => !o)}
                  style={{
                    background: noteOpen ? 'rgba(181,242,58,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${noteOpen ? 'rgba(181,242,58,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 7, cursor: 'pointer', padding: '4px 7px',
                    color: noteOpen ? '#b5f23a' : 'rgba(148,148,160,0.5)', display: 'flex', alignItems: 'center',
                  }}
                >
                  <FileText size={13} />
                </motion.button>
              </div>
            </div>

            {/* Goal pill */}
            <div style={{ marginBottom: 16 }}>
              {goalLabel ? (
                <span style={{ display: 'inline-block', fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(96,211,248,0.07)', border: '1px solid rgba(96,211,248,0.18)', color: '#60d3f8' }}>
                  {goalLabel}
                </span>
              ) : (
                <Link to="/goals" style={{ display: 'inline-block', fontSize: 12, padding: '4px 12px', borderRadius: 20, textDecoration: 'none', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(148,148,160,0.5)' }}>
                  Add a goal in Goals →
                </Link>
              )}
            </div>

            {/* Ring */}
            <div style={{ display: 'inline-block', borderRadius: '50%', transition: 'box-shadow 0.5s ease' }}>
              <CircularTimer timeLeft={timeLeft} totalTime={phase === 'focus' ? focusDuration : breakDuration}
                phase={phase} pomodoroMode={pomodoroMode} running={running} flashRing={flashRing} />
            </div>

            {/* Controls */}
            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <motion.button
                className="btn btn-accent btn-full" onClick={toggleTimer}
                whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(181,242,58,0.4), 0 4px 16px rgba(181,242,58,0.2)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                style={{ height: 52, fontSize: 16, fontWeight: 800, letterSpacing: '0.07em' }}
              >
                {running ? 'PAUSE' : timeLeft === 0 ? 'RESTART' : 'START'}
              </motion.button>
              <div style={{ display: 'flex', gap: 7 }}>
                <motion.button className="btn btn-ghost btn-full" onClick={reset} whileTap={{ scale: 0.96 }} style={{ fontSize: 13 }}>Reset</motion.button>
                {phase === 'focus' && (running || hasMadeProgress) && (
                  <motion.button className="btn btn-ghost btn-full" whileTap={{ scale: 0.96 }} onClick={() => setQuitConfirm(true)} style={{ fontSize: 12, color: 'rgba(148,148,160,0.5)' }}>
                    End Early
                  </motion.button>
                )}
              </div>
            </div>

            {/* Pomodoro toggle + sliders */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {pomodoroMode ? <><TimerIcon size={12} />Classic Pomodoro</> : <><Zap size={12} />Adaptive Mode</>}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(148,148,160,0.5)', marginTop: 1 }}>
                    {pomodoroMode ? '25 min focus / 5 min break' : 'Grows with your attention span'}
                  </div>
                </div>
                <label className="toggle" style={{ flexShrink: 0 }}>
                  <input type="checkbox" checked={pomodoroMode} onChange={e => { if (!running) ctx.setPomodoroMode(e.target.checked) }} />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div style={{ opacity: pomodoroMode ? 0.4 : 1, pointerEvents: pomodoroMode ? 'none' : 'auto' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="label">Focus</label>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#b5f23a' }}>{focusMins} min</span>
                  </div>
                  <input type="range" min={5} max={90} step={1} value={focusMins}
                    onChange={e => updateFocusMins(Number(e.target.value))} disabled={running || pomodoroMode}
                    style={{ width: '100%', appearance: 'none', WebkitAppearance: 'none', outline: 'none', cursor: (running || pomodoroMode) ? 'not-allowed' : 'pointer', background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${focusPct}%, #222226 ${focusPct}%, #222226 100%)` }} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="label">Break</label>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#60d3f8' }}>{breakMins} min</span>
                  </div>
                  <input type="range" min={1} max={30} step={1} value={breakMins}
                    onChange={e => updateBreakMins(Number(e.target.value))} disabled={running || pomodoroMode}
                    style={{ width: '100%', appearance: 'none', WebkitAppearance: 'none', outline: 'none', cursor: (running || pomodoroMode) ? 'not-allowed' : 'pointer', background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${breakPct}%, #222226 ${breakPct}%, #222226 100%)` }} />
                </div>
              </div>
            </div>

            {/* Sound controls */}
            <div style={{ marginTop: 16, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div className="label">Ambient Sound</div>
                {soundType !== 'silent' && (
                  <input type="range" min={0} max={1} step={0.05} value={volume}
                    onChange={e => setVolume(parseFloat(e.target.value))}
                    style={{ width: 76, appearance: 'none', WebkitAppearance: 'none', outline: 'none', cursor: 'pointer', background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${volume * 100}%, #222226 ${volume * 100}%, #222226 100%)` }} />
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {SOUND_OPTIONS.map(s => (
                  <motion.button key={s.id} onClick={() => setSoundType(s.id)}
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }}
                    style={{
                      padding: '8px 4px', borderRadius: 9, cursor: 'pointer',
                      border: `1px solid ${soundType === s.id ? 'rgba(181,242,58,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      background: soundType === s.id ? 'rgba(181,242,58,0.08)' : 'rgba(255,255,255,0.03)',
                      color: soundType === s.id ? '#b5f23a' : 'rgba(148,148,160,0.5)',
                      fontSize: 10, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      transition: 'all 0.15s',
                    }}
                  >
                    <s.Icon size={16} /><span>{s.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Recommendation */}
            <AnimatePresence>
              {recommendation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  style={{ marginTop: 14, padding: '10px 14px', borderRadius: 9, fontSize: 13, textAlign: 'left', background: 'rgba(181,242,58,0.06)', border: '1px solid rgba(181,242,58,0.18)', color: '#b5f23a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>{recommendation}</span>
                  <button onClick={() => { setRecommendation(null); clearTimeout(recTimerRef.current) }} style={{ background: 'none', border: 'none', color: 'rgba(148,148,160,0.5)', cursor: 'pointer', padding: 0, marginLeft: 8, display: 'flex' }}><X size={14} /></button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quote */}
            <div style={{ marginTop: 18, textAlign: 'center', padding: '10px 4px' }}>
              <p style={{ fontSize: 12, color: 'rgba(148,148,160,0.5)', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 3 }}>"{quote.text}"</p>
              <p style={{ fontSize: 11, color: 'rgba(148,148,160,0.3)' }}>— {quote.author}</p>
            </div>
          </GlassCard>

          {/* Break card */}
          <AnimatePresence>
            {phase === 'break' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                <GlassCard borderAccent="rgba(242,199,90,0.6)">
                  <div style={{ marginBottom: 12 }}>
                    <div className="bebas" style={{ fontSize: 17, color: '#f2c75a', letterSpacing: '0.1em' }}>ACTIVE BREAK</div>
                    <div style={{ fontSize: 12, color: 'rgba(148,148,160,0.5)', marginTop: 2 }}>Don't scroll. Move instead.</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
                    {breakTips.map((tip, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(242,199,90,0.05)', borderRadius: 8, padding: '9px 11px' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f2c75a', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'rgba(240,240,242,0.8)' }}>{tip.text}</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setBreakTips(shuffleBreakTips())}>Shuffle</button>
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(148,148,160,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Study Playlists</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {SPOTIFY_PLAYLISTS.map(name => (
                        <button key={name} onClick={() => window.open(`https://open.spotify.com/search/${encodeURIComponent(name)}`, '_blank')}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: 'rgba(30,215,96,0.05)', border: '1px solid rgba(30,215,96,0.18)', color: '#1ed760', fontSize: 12, fontWeight: 600, fontFamily: "'Outfit', sans-serif", transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,215,96,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(30,215,96,0.05)'}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Music size={12} />{name}</span>
                          <span style={{ fontSize: 10, opacity: 0.6 }}>Spotify →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Study tip */}
          {(() => {
            const tip = STUDY_TIPS[tipOrder[tipPos]]
            return (
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderLeft: '2px solid rgba(181,242,58,0.45)',
                borderRadius: '0 10px 10px 0', padding: '14px 18px',
                opacity: tipVisible ? 1 : 0, transition: 'opacity 0.28s ease',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#b5f23a', marginBottom: 8, textTransform: 'uppercase' }}>DID YOU KNOW?</div>
                <p style={{ fontSize: 13, color: 'rgba(240,240,242,0.8)', lineHeight: 1.6, marginBottom: 4 }}>{tip.tip}</p>
                <p style={{ fontSize: 11, color: 'rgba(148,148,160,0.45)', fontStyle: 'italic' }}>{tip.source}</p>
                <div style={{ textAlign: 'right', marginTop: 8 }}>
                  <button onClick={nextTip} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(148,148,160,0.4)', fontFamily: "'Outfit', sans-serif", padding: 0, transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#b5f23a'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(148,148,160,0.4)'}
                  >next tip →</button>
                </div>
              </div>
            )
          })()}
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Research callout */}
          <div style={{ padding: '12px 16px', background: 'rgba(96,211,248,0.04)', border: '1px solid rgba(96,211,248,0.12)', borderRadius: 10, fontSize: 13, color: 'rgba(148,148,160,0.7)', lineHeight: 1.6 }}>
            Generic apps assume 25 minutes. <strong style={{ color: '#f0f0f2' }}>FocusOS starts at YOUR span and grows with you.</strong>{' '}
            Brief mental breaks restore attention in sustained tasks.{' '}
            [<em style={{ color: 'rgba(96,211,248,0.6)' }}>Ariga &amp; Lleras, 2011</em>]
          </div>

          {/* Task card */}
          <GlassCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="label">What will you focus on?</div>
              <span style={{ fontSize: 10, color: 'rgba(148,148,160,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '2px 8px' }}>{tasks.length}/3</span>
            </div>
            <AnimatePresence>
              {tasks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {tasks.map((t, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 9,
                        background: t.done ? 'rgba(181,242,58,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${t.done ? 'rgba(181,242,58,0.18)' : 'rgba(255,255,255,0.07)'}`,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onClick={() => toggleTask(i)}
                    >
                      <div style={{
                        width: 15, height: 15, borderRadius: '50%', flexShrink: 0,
                        background: t.done ? '#b5f23a' : 'transparent',
                        border: `1.5px solid ${t.done ? '#b5f23a' : 'rgba(255,255,255,0.2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, color: '#0a0a0b', fontWeight: 900,
                      }}>
                        {t.done && <Check size={8} strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: 13, flex: 1, color: t.done ? 'rgba(148,148,160,0.5)' : 'rgba(240,240,242,0.85)', textDecoration: t.done ? 'line-through' : 'none' }}>
                        {t.text}
                      </span>
                      {!running && (
                        <button onClick={e => { e.stopPropagation(); removeTask(i) }} style={{ background: 'none', border: 'none', color: 'rgba(148,148,160,0.3)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                          <X size={12} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
            {tasks.length < 3 && !running && (
              <div style={{ display: 'flex', gap: 7 }}>
                <input placeholder="Add a task..." value={taskInput}
                  onChange={e => setTaskInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  style={{ flex: 1, fontSize: 13, padding: '7px 10px' }} />
                <button className="btn btn-ghost btn-sm" onClick={addTask} disabled={!taskInput.trim()}>Add</button>
              </div>
            )}
            {running && tasks.length === 0 && (
              <div style={{ fontSize: 12, color: 'rgba(148,148,160,0.4)', fontStyle: 'italic' }}>No tasks set for this session.</div>
            )}
          </GlassCard>

          {/* Levels reference */}
          <GlassCard>
            <div className="label" style={{ marginBottom: 12 }}>Attention Levels</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {LEVELS.map(l => (
                <div key={l.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, flexShrink: 0, marginTop: 5, boxShadow: `0 0 6px ${l.color}66` }} />
                  <div>
                    <span style={{ fontWeight: 700, color: l.color, fontSize: 13 }}>{l.name}</span>
                    <span style={{ color: 'rgba(148,148,160,0.5)', fontSize: 12 }}> · {l.max < 999 ? `up to ${l.max}` : '50+'} min</span>
                    <div style={{ fontSize: 12, color: 'rgba(148,148,160,0.45)', marginTop: 2 }}>{l.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Shortcuts hint */}
          <motion.button
            whileHover={{ borderColor: 'rgba(255,255,255,0.14)', y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShortcutsOpen(true)}
            style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9,
              color: 'rgba(148,148,160,0.5)', fontSize: 12, cursor: 'pointer', padding: '9px 13px',
              fontFamily: "'Outfit', sans-serif", textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s',
            }}
          >
            <span>⌨ Keyboard shortcuts</span>
            <kbd style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 5, padding: '2px 7px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#b5f23a' }}>?</kbd>
          </motion.button>
        </div>
      </div>

      {/* ── Session Notes Panel ── */}
      <AnimatePresence>
        {noteOpen && (
          <motion.div
            initial={{ x: 280, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 280, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
            style={{
              position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
              width: 280, zIndex: 150,
              background: 'rgba(13,13,15,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(181,242,58,0.25)', borderLeft: '2px solid rgba(181,242,58,0.5)',
              borderRadius: '14px 0 0 14px', padding: 16, boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#b5f23a' }}>
                <FileText size={13} /> Session Notes
              </div>
              <button onClick={() => setNoteOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(148,148,160,0.4)', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={15} /></button>
            </div>
            <textarea value={liveNote} onChange={e => setLiveNote(e.target.value.slice(0, 500))}
              placeholder="Capture thoughts during your session..."
              rows={9} style={{ resize: 'none', fontSize: 12, lineHeight: 1.65, width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'rgba(148,148,160,0.35)' }}>Auto-saved · {liveNote.length}/500</span>
              {liveNote && <button onClick={() => setLiveNote('')} style={{ background: 'none', border: 'none', color: 'rgba(148,148,160,0.4)', cursor: 'pointer', fontSize: 11, fontFamily: "'Outfit', sans-serif" }}>Clear</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reflection modal ── */}
      <AnimatePresence>
        {reflectionOpen && (
          <motion.div key="refl-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(8,8,9,0.92)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ opacity: 0, scale: 0.93, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              style={{ maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto', background: 'rgba(16,16,18,0.96)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: 24, boxShadow: '0 24px 72px rgba(0,0,0,0.7)' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(181,242,58,0.08)', border: '1px solid rgba(181,242,58,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Target size={28} color="#b5f23a" />
                  </div>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Session complete! +{completedMins * 10} XP</h2>
                <div style={{ fontSize: 13, color: 'rgba(148,148,160,0.6)' }}>{completedMins} minutes logged</div>
              </div>
              {tasks.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <label className="label" style={{ display: 'block', marginBottom: 10 }}>Tasks completed? (+5 XP each)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {tasks.map((t, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '9px 12px', borderRadius: 9, background: t.done ? 'rgba(181,242,58,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${t.done ? 'rgba(181,242,58,0.22)' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.15s' }}>
                        <input type="checkbox" checked={t.done} onChange={() => toggleTask(i)} style={{ width: 16, height: 16, accentColor: '#b5f23a', cursor: 'pointer' }} />
                        <span style={{ fontSize: 13, color: t.done ? '#b5f23a' : '#f0f0f2', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
                        {t.done && <span style={{ fontSize: 11, color: '#b5f23a', marginLeft: 'auto' }}>+5 XP</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <label className="label" style={{ display: 'block', marginBottom: 10 }}>What pulled your attention away?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {DISTRACTIONS.map(d => (
                    <button key={d} onClick={() => setSelectedDistraction(d)} style={{ padding: '10px 14px', borderRadius: 9, textAlign: 'left', cursor: 'pointer', border: `1px solid ${selectedDistraction === d ? '#b5f23a' : 'rgba(255,255,255,0.08)'}`, background: selectedDistraction === d ? 'rgba(181,242,58,0.08)' : 'rgba(255,255,255,0.03)', color: selectedDistraction === d ? '#b5f23a' : 'rgba(240,240,242,0.8)', fontSize: 14, transition: 'all 0.15s' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="label" style={{ display: 'block', marginBottom: 8 }}>Session note <span style={{ color: 'rgba(148,148,160,0.4)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional)</span></label>
                <textarea placeholder="Any thoughts from this session?" value={sessionNote} onChange={e => setSessionNote(e.target.value.slice(0, 200))} rows={2} style={{ resize: 'none', fontSize: 13 }} />
                <div style={{ fontSize: 11, color: 'rgba(148,148,160,0.35)', textAlign: 'right', marginTop: 3 }}>{sessionNote.length}/200</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => finishReflection('skip')}>Skip</button>
                <button className="btn btn-accent" style={{ flex: 2 }} onClick={() => finishReflection(selectedDistraction || 'skip')}>Save &amp; Start Break</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quit confirm ── */}
      <AnimatePresence>
        {quitConfirm && (
          <motion.div key="quit-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(8,8,9,0.92)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ opacity: 0, scale: 0.93, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              style={{ maxWidth: 380, width: '100%', textAlign: 'center', background: 'rgba(16,16,18,0.96)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: 28, boxShadow: '0 24px 72px rgba(0,0,0,0.7)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>End this session?</h2>
              <p style={{ fontSize: 14, color: 'rgba(148,148,160,0.6)', marginBottom: 24, lineHeight: 1.6 }}>Progress won't count toward adaptive growth. Your focus blocks streak will reset.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setQuitConfirm(false)}>Keep Going</button>
                <button className="btn" style={{ flex: 1, background: 'rgba(242,90,90,0.12)', color: '#f25a5a', border: '1px solid rgba(242,90,90,0.28)' }} onClick={handleEarlyQuit}>End Session</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Shortcuts modal ── */}
      <AnimatePresence>
        {shortcutsOpen && (
          <motion.div key="shortcuts-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(8,8,9,0.92)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setShortcutsOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.93, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              style={{ maxWidth: 380, width: '100%', background: 'rgba(16,16,18,0.96)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: 24, boxShadow: '0 24px 72px rgba(0,0,0,0.7)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700 }}>⌨ Keyboard Shortcuts</h2>
                <button onClick={() => setShortcutsOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(148,148,160,0.4)', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={17} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {SHORTCUTS.map(s => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <kbd style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#b5f23a', minWidth: 52, textAlign: 'center', flexShrink: 0 }}>{s.key}</kbd>
                    <span style={{ fontSize: 13, color: 'rgba(240,240,242,0.75)' }}>{s.desc}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(148,148,160,0.35)', marginTop: 14 }}>Disabled when a text field is focused.</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
