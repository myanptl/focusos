import { useState, useEffect, useRef } from 'react'
import { useTimerContext } from '../context/TimerContext'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { VolumeX, Waves, Music, Music2, FileText, Flame, Target, X, Timer as TimerIcon, Zap } from 'lucide-react'

// ── Constants ────────────────────────────────────────────
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
  'Phone / social media',
  'Noise or environment',
  'Tired or hungry',
  'My own thoughts',
  'Nothing — I was locked in',
]

const QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Focus is the art of knowing what to ignore.', author: 'Anonymous' },
  { text: 'Small daily improvements over time lead to stunning results.', author: 'Robin Sharma' },
  { text: "You don't rise to your goals, you fall to your systems.", author: 'James Clear' },
  { text: 'The successful warrior is the average person with laser-like focus.', author: 'Bruce Lee' },
  { text: 'Concentrate all your thoughts upon the work at hand.', author: 'Alexander Bell' },
]

const SPOTIFY_PLAYLISTS = [
  'Lo-fi Hip Hop Beats',
  'Deep Focus — Classical',
  'Brain Food — Spotify',
]

const SOUND_OPTIONS = [
  { id: 'silent',   label: 'Silent',   Icon: VolumeX },
  { id: 'brown',    label: 'Brown',    Icon: Waves },
  { id: 'baroque',  label: 'Baroque',  Icon: Music },
  { id: 'classical',label: 'Classical',Icon: Music2 },
]

const NAV_ROUTES = ['/timer', '/quiz', '/notes', '/goals', '/streak', '/progress', '/rooms', '/settings']

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

function shuffleIndices(len) {
  const a = Array.from({ length: len }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const SHORTCUTS = [
  { key: 'Space', desc: 'Start / Pause timer' },
  { key: 'R', desc: 'Reset timer' },
  { key: '1 – 8', desc: 'Switch tabs (Timer, Quiz, Notes, Goals, Streak, Progress, Rooms, Settings)' },
  { key: 'Esc', desc: 'Close modal / dialog' },
  { key: '?', desc: 'Show this help panel' },
]

// ── Helpers ──────────────────────────────────────────────
function getLevel(mins) {
  return LEVELS.find(l => mins < l.max) || LEVELS[LEVELS.length - 1]
}

function shuffleBreakTips() {
  return [...BREAK_ACTIVITIES].sort(() => Math.random() - 0.5).slice(0, 3)
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

function pad(n) { return String(n).padStart(2, '0') }
function fmt(secs) { return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}` }

// ── Shared AudioContext + mobile unlock ───────────────────
// iOS/Android silence any AudioContext that is created or resumed outside a
// user gesture. We keep ONE shared context for the app's lifetime and unlock
// it (resume + play a 1-sample silent buffer) the first time the user taps.
// Once unlocked, the same context can be (re)used from effects without a
// gesture, which is why brown noise reuses this instead of `new AudioContext`.
let sharedCtx = null
let audioUnlocked = false

function getAudioCtx() {
  if (!sharedCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return null
    sharedCtx = new Ctor()
  }
  return sharedCtx
}

// Call synchronously from inside a user gesture (e.g. the START tap).
function unlockAudio() {
  const ctx = getAudioCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  if (!audioUnlocked) {
    try {
      const buffer = ctx.createBuffer(1, 1, 22050)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(0)
      audioUnlocked = true
    } catch { /* unlock best-effort */ }
  }
}

// Belt-and-suspenders: unlock on the very first interaction anywhere, so the
// context is ready even if the user changes the sound type before pressing start.
if (typeof window !== 'undefined') {
  const firstGesture = () => {
    unlockAudio()
    window.removeEventListener('pointerdown', firstGesture)
    window.removeEventListener('touchend', firstGesture)
    window.removeEventListener('keydown', firstGesture)
  }
  window.addEventListener('pointerdown', firstGesture, { once: false })
  window.addEventListener('touchend', firstGesture, { once: false })
  window.addEventListener('keydown', firstGesture, { once: false })
}

// ── Web Audio: Brown Noise ────────────────────────────────
function makeBrownNoise(ctx) {
  const masterGain = ctx.createGain()
  masterGain.gain.value = 0.4
  masterGain.connect(ctx.destination)

  const bufferSize = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      lastOut = (lastOut + 0.02 * white) / 1.02
      data[i] = lastOut * 3.5
    }
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 500
  lowpass.Q.value = 0.5

  source.connect(lowpass)
  lowpass.connect(masterGain)
  source.start()

  return {
    stop: () => { source.stop(); masterGain.disconnect() },
    setVolume: (v) => { masterGain.gain.value = v * 0.4 },
  }
}

// ── Ambient Sound Engine ──────────────────────────────────
// Baroque/Classical are self-hosted public-domain recordings decoded through
// the shared (gesture-unlocked) AudioContext — the same path as brown noise.
// This is what makes them play on iOS: a hidden YouTube iframe can't be
// unlocked by a gesture and is blocked by mobile autoplay policy.
//   baroque.mp3   — Bach, Cello Suite No. 1 Prélude (BWV 1007), CC0
//   classical.mp3 — Satie, Gymnopédie No. 2, Public Domain
// Both via Wikimedia Commons; CC0/PD require no attribution.
const SOUND_FILES = {
  baroque:   '/sounds/baroque.mp3',
  classical: '/sounds/classical.mp3',
}

// Decode once, reuse — repeated plays are instant and don't re-download.
const decodedBufferCache = {}
async function loadAudioBuffer(ctx, url) {
  if (decodedBufferCache[url]) return decodedBufferCache[url]
  const res = await fetch(url)
  if (!res.ok) throw new Error(`audio fetch failed (${res.status}) for ${url}`)
  const arrayBuf = await res.arrayBuffer()
  const audioBuf = await ctx.decodeAudioData(arrayBuf)
  decodedBufferCache[url] = audioBuf
  return audioBuf
}

// Looping file playback on the shared unlocked context (volume via GainNode,
// which iOS honours — unlike HTMLMediaElement.volume).
function createFileSound(url, volume) {
  const ctx = getAudioCtx()
  if (!ctx) return null
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  const gain = ctx.createGain()
  gain.gain.value = volume
  gain.connect(ctx.destination)
  let source = null
  let stopped = false
  loadAudioBuffer(ctx, url)
    .then((buf) => {
      if (stopped) return
      source = ctx.createBufferSource()
      source.buffer = buf
      source.loop = true
      source.connect(gain)
      source.start()
    })
    .catch((err) => { console.error('[FocusOS] ambient audio failed:', err) })
  return {
    stop: () => {
      stopped = true
      if (source) { try { source.stop() } catch { /* already stopped */ } }
      gain.disconnect()
    },
    setVolume: (v) => { gain.gain.value = v },
  }
}

function createAmbientSound(type, volume) {
  if (type === 'silent') return null

  // Brown noise: instant Web Audio synthesis on the shared (unlocked) context.
  if (type === 'brown') {
    const ctx = getAudioCtx()
    if (!ctx) return null
    // Resume in case we got here without a prior gesture (desktop autoplay-ok).
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const sound = makeBrownNoise(ctx)
    sound.setVolume(volume)
    // Do NOT close the shared context on stop — just tear down this graph,
    // so the next play can reuse the already-unlocked context.
    return {
      stop: () => { sound.stop() },
      setVolume: (v) => sound.setVolume(v),
    }
  }

  // Baroque / Classical: self-hosted public-domain MP3, decoded and looped on
  // the shared unlocked context (works on iOS; volume honoured via GainNode).
  if (SOUND_FILES[type]) {
    return createFileSound(SOUND_FILES[type], volume)
  }

  return null
}

// ── Circular Timer SVG ───────────────────────────────────
const R = 100
const CIRC = 2 * Math.PI * R

function CircularTimer({ timeLeft, totalTime, phase, pomodoroMode, running, flashRing }) {
  const progress = totalTime > 0 ? timeLeft / totalTime : 1
  const offset   = CIRC * (1 - progress)
  const color    = phase === 'focus' ? '#b5f23a' : '#60d3f8'

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2
    return {
      x1: 120 + 86 * Math.cos(angle), y1: 120 + 86 * Math.sin(angle),
      x2: 120 + 96 * Math.cos(angle), y2: 120 + 96 * Math.sin(angle),
      major: i % 3 === 0,
    }
  })

  return (
    <div style={{ position: 'relative', width: 'min(240px, 80vw)', height: 'min(240px, 80vw)', margin: '0 auto' }}>
      <svg width="100%" height="100%" viewBox="0 0 240 240" style={{
        display: 'block',
        filter: running && phase === 'focus' ? 'drop-shadow(0 0 14px rgba(181,242,58,0.42))' : 'none',
        transition: 'filter 0.7s ease',
      }}>
        {/* Pulse ring — expands outward while running */}
        {running && phase === 'focus' && (
          <circle
            cx="120" cy="120" r={R} fill="none"
            stroke={color} strokeWidth="3"
            style={{ animation: 'ping 2s ease-out infinite', transformOrigin: 'center', transformBox: 'fill-box' }}
          />
        )}
        {/* Track */}
        <circle cx="120" cy="120" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        {/* Progress arc */}
        <circle
          cx="120" cy="120" r={R} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          transform="rotate(-90 120 120)"
          className={flashRing ? 'ring-flash' : ''}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
        />
        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.major ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)'}
            strokeWidth={t.major ? 2 : 1} strokeLinecap="round"
          />
        ))}
      </svg>
      {/* Time text as HTML overlay — animates on each tick */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={timeLeft}
            initial={{ scale: 1.1, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="bebas glow-num"
            style={{ fontSize: 48, color, letterSpacing: 2, lineHeight: 1 }}
          >
            {fmt(timeLeft)}
          </motion.div>
        </AnimatePresence>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginTop: 4 }}>
          {pomodoroMode ? (phase === 'focus' ? 'POMODORO' : 'BREAK') : (phase === 'focus' ? 'FOCUS' : 'BREAK')}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────
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
  const [todaySessions,   setTodaySessions]   = useState([])
  const [focusBlocksStreak, setFocusBlocksStreak] = useState(0)

  // Goal context
  const [goals, setGoals] = useState([])

  // Reflection modal
  const [reflectionOpen,      setReflectionOpen]      = useState(false)
  const [completedMins,       setCompletedMins]       = useState(0)
  const [selectedDistraction, setSelectedDistraction] = useState(null)
  const [sessionNote,         setSessionNote]         = useState('')

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
  const [savedTaskIds, setSavedTaskIds] = useState([])

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
  const [noteOpen, setNoteOpen] = useState(false)
  const [liveNote, setLiveNote] = useState('')
  const liveNoteRef = useRef('')

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
  useEffect(() => { liveNoteRef.current = liveNote }, [liveNote])

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

  // ── Live note auto-save ──────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem('focusos_session_note', liveNote), 2000)
    return () => clearTimeout(t)
  }, [liveNote])

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
      const [logRes, sessRes] = await Promise.all([
        supabase.from('daily_focus_log')
          .select('total_minutes, sessions_completed, sessions_count')
          .eq('user_id', user.id).eq('log_date', today).single(),
        supabase.from('focus_sessions')
          .select('duration_minutes')
          .eq('user_id', user.id).eq('session_date', today).eq('completed', true),
      ])
      if (logRes.data) {
        setSessionsToday((logRes.data.sessions_completed ?? logRes.data.sessions_count) || 0)
        setMinutesToday(logRes.data.total_minutes || 0)
      }
      setTodaySessions(sessRes.data || [])
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
    setSessionNote(liveNoteRef.current || '')
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
      .eq('user_id', user.id).eq('log_date', today).single()

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

    const sessionId = await saveFocusSession(mins, sessionNote, pomodoroMode ? {} : {
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
    setTodaySessions(prev => [...prev, { duration_minutes: mins }])

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
    setSessionNote('')
    setLiveNote('')
    liveNoteRef.current = ''
    localStorage.removeItem('focusos_session_note')
    setTabSwitchCount(0)
    tabSwitchCountRef.current = 0
    setReflectionOpen(false)
    setSelectedDistraction(null)
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
  const focusPct = Math.min(100, ((focusMins - 5) / (90 - 5)) * 100)
  const breakPct = Math.min(100, ((breakMins - 1) / (30 - 1)) * 100)

  const hasMadeProgress = phase === 'focus' && timeLeft < focusDuration && timeLeft > 0

  const goalLabel = goals.length > 0
    ? 'Studying for: ' + goals.slice(0, 3)
        .map(g => g.test_type === 'AP' && g.subject ? `AP ${g.subject}` : g.test_type)
        .join(' · ')
    : null

  const baseline = profile?.focus_duration ?? profile?.baseline_attention_span ?? 25
  const todayAvg = todaySessions.length > 0
    ? todaySessions.reduce((a, s) => a + s.duration_minutes, 0) / todaySessions.length : 0

  const quote = QUOTES[quoteIdx]

  // ── Render ───────────────────────────────────────────
  return (
    <div className="page-fade">

      {/* Daily Intention banner */}
      {intention ? (
        <div style={{
          marginBottom: 14, padding: '10px 16px',
          background: 'rgba(181,242,58,0.05)', border: '1px solid rgba(181,242,58,0.15)',
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            Today I will: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{intention}</span>
          </span>
          <button onClick={() => { setIntention(''); localStorage.removeItem('focusos_intention') }}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0 4px', display: 'flex' }}>
            <X size={14} />
          </button>
        </div>
      ) : !showIntentionForm ? (
        <button
          onClick={() => setShowIntentionForm(true)}
          style={{
            display: 'block', width: '100%', marginBottom: 14,
            padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
            background: 'transparent', border: '1px dashed rgba(181,242,58,0.2)',
            color: 'var(--muted)', fontSize: 13, textAlign: 'left',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(181,242,58,0.4)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(181,242,58,0.2)'}
        >
          <Target size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} /> Set today's intention →
        </button>
      ) : (
        <div style={{
          marginBottom: 14, padding: '10px 14px',
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <input
            autoFocus
            placeholder="Today I will..."
            value={intentionInput}
            maxLength={60}
            onChange={e => setIntentionInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveIntention(); if (e.key === 'Escape') setShowIntentionForm(false) }}
            style={{ flex: 1, fontSize: 13, padding: '6px 10px' }}
          />
          <button className="btn btn-accent btn-sm" onClick={saveIntention}>Set</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowIntentionForm(false)} style={{ display: 'flex', alignItems: 'center' }}><X size={14} /></button>
        </div>
      )}

      {/* Greeting + quick stats */}
      <div style={{ marginBottom: 16 }}>
        <span className="v3-kicker">Session ready · Lock in</span>
        <h1 className="page-title" style={{ marginBottom: 14 }}>
          <span className="pt-inner">
            {getGreeting()},{' '}
            <span className="page-title-accent">
              {(profile?.name || profile?.username || 'there').split(' ')[0]}
            </span>
            <span className="v3-dot">.</span>
          </span>
        </h1>
        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          {[
            { label: 'Sessions Today', value: sessionsToday },
            { label: 'Minutes Today',  value: minutesToday },
            { label: 'Day Streak',     value: streak, isStreak: true },
          ].map(c => (
            <div key={c.label} className="stat-card" style={{
              padding: '8px 16px', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: 'var(--muted)' }}>{c.label}: </span>
              <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                {c.value}{c.isStreak && <Flame size={13} color="var(--amber)" />}
              </span>
            </div>
          ))}
          {running && phase === 'focus' && (
            <div style={{
              background: tabSwitchCount === 0 ? 'var(--card2)' : tabSwitchCount <= 2 ? 'rgba(242,199,90,0.15)' : 'rgba(242,90,90,0.15)',
              border: `1px solid ${tabSwitchCount === 0 ? 'var(--border)' : tabSwitchCount <= 2 ? 'rgba(242,199,90,0.4)' : 'rgba(242,90,90,0.4)'}`,
              borderRadius: 8, padding: '0 14px', fontSize: 13,
              height: 32, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: 'var(--muted)' }}>Tab switches: </span>
              <span style={{ fontWeight: 700, color: tabSwitchCount === 0 ? 'var(--text)' : tabSwitchCount <= 2 ? 'var(--amber)' : 'var(--red)' }}>
                {tabSwitchCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2-column grid — stacks on mobile */}
      <div className="timer-grid">

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Level card */}
          <div className="card card-top">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={level.name}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  style={{ fontSize: 22, fontWeight: 800, color: level.color, letterSpacing: '0.02em' }}
                >
                  {pomodoroMode ? 'CLASSIC POMODORO' : level.name}
                </motion.div>
              </AnimatePresence>
              {!pomodoroMode && nextLvl && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {minsToNext} min to {nextLvl.name}
                </span>
              )}
              {pomodoroMode && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>25 / 5 min fixed</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
              {pomodoroMode ? 'Classic 25-minute Pomodoro intervals.' : level.desc}
            </div>
            {!pomodoroMode && (
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${pctToNext}%`, background: level.color }} />
              </div>
            )}
          </div>

          {/* Timer card */}
          <div className="card card-top" style={{ textAlign: 'center' }}>

            {/* Header: phase label + focus blocks streak + notes button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em' }}>
                {phase === 'focus' ? (pomodoroMode ? 'POMODORO' : 'FOCUS SESSION') : 'BREAK TIME'}
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {focusBlocksStreak > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: 'rgba(181,242,58,0.1)', border: '1px solid rgba(181,242,58,0.25)',
                    color: 'var(--accent)',
                  }}>
                    <Target size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {focusBlocksStreak} in a row
                  </span>
                )}
                <button onClick={() => setNoteOpen(o => !o)} title="Session notes" style={{
                  background: noteOpen ? 'rgba(181,242,58,0.1)' : 'var(--card2)',
                  border: `1px solid ${noteOpen ? 'rgba(181,242,58,0.4)' : 'var(--border)'}`,
                  borderRadius: 6, cursor: 'pointer', padding: '2px 7px', fontSize: 14,
                  color: noteOpen ? 'var(--accent)' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><FileText size={14} /></button>
              </div>
            </div>

            {/* Goal context pill */}
            <div style={{ marginBottom: 14 }}>
              {goalLabel ? (
                <span style={{
                  display: 'inline-block', fontSize: 12, padding: '4px 12px', borderRadius: 20,
                  background: 'rgba(96,211,248,0.08)', border: '1px solid rgba(96,211,248,0.2)',
                  color: 'var(--cyan)',
                }}>
                  {goalLabel}
                </span>
              ) : (
                <Link to="/goals" style={{
                  display: 'inline-block', fontSize: 12, padding: '4px 12px', borderRadius: 20,
                  textDecoration: 'none',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                  color: 'var(--muted)',
                }}>
                  Add a goal in Goals tab →
                </Link>
              )}
            </div>

            {/* Timer ring */}
            <div style={{
              display: 'inline-block', borderRadius: '50%',
              boxShadow: running
                ? '0 0 80px rgba(181,242,58,0.28), 0 0 120px rgba(181,242,58,0.1)'
                : 'none',
              transition: 'box-shadow 0.5s ease',
            }}>
              <CircularTimer
                timeLeft={timeLeft}
                totalTime={phase === 'focus' ? focusDuration : breakDuration}
                phase={phase}
                pomodoroMode={pomodoroMode}
                running={running}
                flashRing={flashRing}
              />
            </div>

            {/* Primary controls */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <motion.button
                className="btn btn-accent btn-full" onClick={toggleTimer}
                whileHover={{ scale: 1.025, boxShadow: '0 0 32px rgba(181,242,58,0.35), 0 4px 16px rgba(181,242,58,0.18)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                style={{ height: 54, fontSize: 16, fontWeight: 800, letterSpacing: '0.05em' }}>
                {running ? 'PAUSE' : timeLeft === 0 ? 'RESTART' : 'START'}
              </motion.button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-full" onClick={reset} style={{ fontSize: 13 }}>Reset</button>
                {phase === 'focus' && (running || hasMadeProgress) && (
                  <button className="btn btn-ghost btn-full" onClick={() => setQuitConfirm(true)}
                    style={{ fontSize: 12, color: 'var(--muted)' }}>
                    End Session Early
                  </button>
                )}
              </div>
            </div>

            {/* Duration sliders + Pomodoro toggle */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
              {/* Pomodoro toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 8, background: 'var(--card2)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {pomodoroMode ? <><TimerIcon size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Classic Pomodoro</> : <><Zap size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Adaptive Mode</>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                    {pomodoroMode ? '25 min focus / 5 min break' : 'Grows with your attention span'}
                  </div>
                </div>
                <label className="toggle" style={{ flexShrink: 0 }}>
                  <input type="checkbox" checked={pomodoroMode}
                    onChange={e => { if (!running) ctx.setPomodoroMode(e.target.checked) }} />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Sliders (disabled in Pomodoro mode) */}
              <div style={{ opacity: pomodoroMode ? 0.4 : 1, pointerEvents: pomodoroMode ? 'none' : 'auto' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="label">Focus</label>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{focusMins} min</span>
                  </div>
                  <input type="range" min={5} max={90} step={1} value={focusMins}
                    onChange={e => updateFocusMins(Number(e.target.value))}
                    disabled={running || pomodoroMode}
                    style={{
                      width: '100%', appearance: 'none', WebkitAppearance: 'none', outline: 'none',
                      cursor: (running || pomodoroMode) ? 'not-allowed' : 'pointer',
                      background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${focusPct}%, #222226 ${focusPct}%, #222226 100%)`,
                    }} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="label">Break</label>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>{breakMins} min</span>
                  </div>
                  <input type="range" min={1} max={30} step={1} value={breakMins}
                    onChange={e => updateBreakMins(Number(e.target.value))}
                    disabled={running || pomodoroMode}
                    style={{
                      width: '100%', appearance: 'none', WebkitAppearance: 'none', outline: 'none',
                      cursor: (running || pomodoroMode) ? 'not-allowed' : 'pointer',
                      background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${breakPct}%, #222226 ${breakPct}%, #222226 100%)`,
                    }} />
                </div>
              </div>
            </div>

            {/* Ambient sound controls */}
            <div style={{ marginTop: 16, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div className="label">Ambient Sound</div>
                {soundType !== 'silent' && (
                  <input type="range" min={0} max={1} step={0.05} value={volume}
                    onChange={e => setVolume(parseFloat(e.target.value))}
                    style={{
                      width: 80, appearance: 'none', WebkitAppearance: 'none', outline: 'none',
                      cursor: 'pointer',
                      background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${volume * 100}%, #222226 ${volume * 100}%, #222226 100%)`,
                    }} />
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {SOUND_OPTIONS.map(s => (
                  <button key={s.id} onClick={() => setSoundType(s.id)} style={{
                    flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${soundType === s.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: soundType === s.id ? 'rgba(181,242,58,0.08)' : 'var(--card2)',
                    color: soundType === s.id ? 'var(--accent)' : 'var(--muted)',
                    fontSize: 10, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    transition: 'all 0.15s',
                  }}>
                    <s.Icon size={16} />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
              {soundType !== 'silent' && !running && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                  Plays when session starts
                </div>
              )}
            </div>

            {/* Recommendation banner */}
            {recommendation && (
              <div style={{
                marginTop: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, textAlign: 'left',
                background: 'rgba(181,242,58,0.06)', border: '1px solid rgba(181,242,58,0.2)',
                color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>{recommendation}</span>
                <button
                  onClick={() => { setRecommendation(null); clearTimeout(recTimerRef.current) }}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, marginLeft: 8, display: 'flex' }}
                ><X size={15} /></button>
              </div>
            )}

            {/* Motivational quote */}
            <div style={{ marginTop: 18, textAlign: 'center', padding: '10px 4px' }}>
              <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.55, marginBottom: 3 }}>
                "{quote.text}"
              </p>
              <p style={{ fontSize: 11, color: 'rgba(148,148,160,0.6)' }}>— {quote.author}</p>
            </div>
          </div>

          {/* Active break suggestions */}
          {phase === 'break' && (
            <div className="card" style={{ border: '1px solid rgba(242,199,90,0.3)' }}>
              <div style={{ marginBottom: 14 }}>
                <div className="bebas" style={{ fontSize: 18, color: 'var(--amber)', letterSpacing: '0.06em' }}>
                  ACTIVE BREAK
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Don't scroll. Move instead.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {breakTips.map((tip, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(242,199,90,0.06)', borderRadius: 8, padding: '10px 12px',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{tip.text}</span>
                  </div>
                ))}
              </div>
              <div style={{
                fontSize: 11, color: 'var(--muted)', lineHeight: 1.5,
                borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 10,
              }}>
                Movement restores focus better than passive rest [Cognitive Science, 2011]
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setBreakTips(shuffleBreakTips())}>
                Shuffle
              </button>
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Study Playlists
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SPOTIFY_PLAYLISTS.map(name => (
                    <button key={name} onClick={() => window.open(`https://open.spotify.com/search/${encodeURIComponent(name)}`, '_blank', 'noopener,noreferrer')}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                        background: 'rgba(30,215,96,0.06)', border: '1px solid rgba(30,215,96,0.2)',
                        color: '#1ed760', fontSize: 12, fontWeight: 600,
                        fontFamily: "'Outfit', sans-serif", transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,215,96,0.12)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(30,215,96,0.06)'}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Music size={12} />{name}</span>
                      <span style={{ fontSize: 10, opacity: 0.7 }}>Open in Spotify →</span>
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>
                  Music with 60–70 BPM matches focus rhythms [research]
                </div>
              </div>
            </div>
          )}

          {/* Study Science Tip */}
          {(() => {
            const tip = STUDY_TIPS[tipOrder[tipPos]]
            return (
              <div style={{
                background: 'var(--card)',
                borderLeft: '3px solid var(--accent)',
                borderRadius: '0 8px 8px 0',
                padding: '16px 20px',
                opacity: tipVisible ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '3px',
                  color: 'var(--accent)', marginBottom: 8,
                }}>
                  DID YOU KNOW?
                </div>
                <div>
                  <p style={{ fontSize: 13, color: '#f0f0f2', lineHeight: 1.55, marginBottom: 4 }}>{tip.tip}</p>
                  <p style={{ fontSize: 11, color: '#9494a0', fontStyle: 'italic' }}>{tip.source}</p>
                </div>
                <div style={{ textAlign: 'right', marginTop: 10 }}>
                  <button onClick={nextTip} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: '#9494a0',
                    fontFamily: "'Outfit', sans-serif", padding: 0,
                    transition: 'color 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = '#9494a0'}
                  >
                    next tip →
                  </button>
                </div>
              </div>
            )
          })()}
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Task card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="label">What will you focus on?</div>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{tasks.length}/3</span>
            </div>

            {tasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {tasks.map((t, i) => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 8,
                    background: t.done ? 'rgba(181,242,58,0.06)' : 'var(--card2)',
                    border: `1px solid ${t.done ? 'rgba(181,242,58,0.2)' : 'var(--border)'}`,
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 14, flex: 1, color: t.done ? 'var(--muted)' : 'var(--text)',
                      textDecoration: t.done ? 'line-through' : 'none' }}>
                      {t.text}
                    </span>
                    {!running && (
                      <button onClick={() => removeTask(i)} style={{
                        background: 'none', border: 'none', color: 'var(--muted)',
                        cursor: 'pointer', padding: 0, display: 'flex',
                      }}><X size={13} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tasks.length < 3 && !running && (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  placeholder="Add a task..."
                  value={taskInput}
                  onChange={e => setTaskInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  style={{ flex: 1, fontSize: 13, padding: '7px 10px' }}
                />
                <button className="btn btn-ghost btn-sm" onClick={addTask} disabled={!taskInput.trim()}>
                  Add
                </button>
              </div>
            )}

            {running && tasks.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                No tasks set for this session.
              </div>
            )}
          </div>

          {/* Attention levels — collapsed by default to keep the page minimal */}
          <details className="card v3-details">
            <summary className="label" style={{
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', listStyle: 'none',
            }}>
              Attention Levels
              <span className="v3-details-chevron" aria-hidden style={{ fontSize: 13, color: 'var(--muted)' }}>+</span>
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {LEVELS.map(l => (
                <div key={l.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: l.color, flexShrink: 0, marginTop: 4,
                  }} />
                  <div>
                    <span style={{ fontWeight: 700, color: l.color, fontSize: 13 }}>{l.name}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {' '}· {l.max < 999 ? `up to ${l.max}` : '50+'} min
                    </span>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{l.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* Keyboard shortcut hint */}
          <button onClick={() => setShortcutsOpen(true)} style={{
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: '8px 12px',
            fontFamily: "'Outfit', sans-serif", textAlign: 'left',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>⌨ Keyboard shortcuts</span>
            <kbd style={{
              background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 4,
              padding: '2px 6px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
            }}>?</kbd>
          </button>
        </div>
      </div>

      {/* ── Session Notes Panel ── */}
      {noteOpen && (
        <div style={{
          position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
          width: 280, zIndex: 150,
          background: 'var(--card)', border: '1px solid rgba(181,242,58,0.3)',
          borderLeft: '2px solid var(--accent)',
          borderRadius: '12px 0 0 12px', padding: 16,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={14} /> Session Notes
            </div>
            <button onClick={() => setNoteOpen(false)} style={{
              background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, display: 'flex',
            }}><X size={16} /></button>
          </div>
          <textarea
            value={liveNote}
            onChange={e => setLiveNote(e.target.value.slice(0, 500))}
            placeholder="Capture thoughts, questions, or insights during your session..."
            rows={9}
            style={{ resize: 'none', fontSize: 12, lineHeight: 1.6, width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Auto-saved · {liveNote.length}/500</span>
            {liveNote && (
              <button onClick={() => setLiveNote('')} style={{
                background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11,
                fontFamily: "'Outfit', sans-serif",
              }}>Clear</button>
            )}
          </div>
        </div>
      )}

      {/* ── Reflection modal ── */}
      <AnimatePresence>
      {reflectionOpen && (
        <motion.div
          key="reflection-bg"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(10,10,11,0.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="card" style={{ maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                <Target size={40} color="var(--accent)" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                Session complete! +{completedMins * 10} XP
              </h2>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {completedMins} minutes logged
              </div>
            </div>

            {/* Task checkboxes */}
            {tasks.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label className="label" style={{ display: 'block', marginBottom: 10 }}>
                  Tasks completed? (+5 XP each)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tasks.map((t, i) => (
                    <label key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      padding: '9px 12px', borderRadius: 8,
                      background: t.done ? 'rgba(181,242,58,0.07)' : 'var(--card2)',
                      border: `1px solid ${t.done ? 'rgba(181,242,58,0.25)' : 'var(--border)'}`,
                      transition: 'all 0.15s',
                    }}>
                      <input type="checkbox" checked={t.done} onChange={() => toggleTask(i)}
                        style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                      <span style={{ fontSize: 13, color: t.done ? 'var(--accent)' : 'var(--text)',
                        textDecoration: t.done ? 'line-through' : 'none' }}>
                        {t.text}
                      </span>
                      {t.done && <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 'auto' }}>+5 XP</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label className="label" style={{ display: 'block', marginBottom: 12 }}>
                What pulled your attention away?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DISTRACTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setSelectedDistraction(d)}
                    style={{
                      padding: '10px 14px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                      border: `1px solid ${selectedDistraction === d ? 'var(--accent)' : 'var(--border)'}`,
                      background: selectedDistraction === d ? 'rgba(181,242,58,0.08)' : 'var(--card2)',
                      color: selectedDistraction === d ? 'var(--accent)' : 'var(--text)',
                      fontSize: 14, transition: 'all 0.15s',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Session note */}
            <div style={{ marginBottom: 20 }}>
              <label className="label" style={{ display: 'block', marginBottom: 8 }}>
                Session note <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional)</span>
              </label>
              <textarea
                placeholder="Any thoughts from this session?"
                value={sessionNote}
                onChange={e => setSessionNote(e.target.value.slice(0, 200))}
                rows={2}
                style={{ resize: 'none', fontSize: 13 }}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right', marginTop: 3 }}>
                {sessionNote.length}/200
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }}
                onClick={() => finishReflection('skip')}>
                Skip
              </button>
              <button className="btn btn-accent" style={{ flex: 2 }}
                onClick={() => finishReflection(selectedDistraction || 'skip')}>
                Save &amp; Start Break
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── Quit early confirm ── */}
      <AnimatePresence>
      {quitConfirm && (
        <motion.div
          key="quit-bg"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(10,10,11,0.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="card" style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>End this session?</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
              Progress won't count toward adaptive growth. Your focus blocks streak will reset.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }}
                onClick={() => setQuitConfirm(false)}>
                Keep Going
              </button>
              <button
                className="btn" style={{ flex: 1, background: 'rgba(242,90,90,0.15)', color: 'var(--red)', border: '1px solid rgba(242,90,90,0.3)' }}
                onClick={handleEarlyQuit}>
                End Session
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── Keyboard shortcuts modal ── */}
      <AnimatePresence>
      {shortcutsOpen && (
        <motion.div
          key="shortcuts-bg"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(10,10,11,0.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }} onClick={() => setShortcutsOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="card" style={{ maxWidth: 380, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>⌨ Keyboard Shortcuts</h2>
              <button onClick={() => setShortcutsOpen(false)} style={{
                background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, display: 'flex',
              }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SHORTCUTS.map(s => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <kbd style={{
                    background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 6,
                    padding: '3px 10px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                    color: 'var(--accent)', minWidth: 52, textAlign: 'center', flexShrink: 0,
                  }}>{s.key}</kbd>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{s.desc}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 14 }}>
              Shortcuts are disabled when a text field is focused.
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
