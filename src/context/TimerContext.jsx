import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'

const TimerContext = createContext(null)

function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback }
  catch { return fallback }
}

export function TimerProvider({ children }) {
  const { profile } = useAuth()
  const profileLoadedRef = useRef(false)
  const profileRef = useRef(null)

  const [pomodoroMode, _setPomodoroMode] = useState(() => loadLS('focusos_pomodoro', false))
  const [focusMins, _setFocusMins] = useState(() => loadLS('focusos_focus_mins', 25))
  const [breakMins, _setBreakMins] = useState(() => loadLS('focusos_break_mins', 5))

  const [timeLeft, setTimeLeft] = useState(() => {
    const s = loadLS('focusos_timer_global', {})
    return s.timeLeft > 0 ? s.timeLeft : loadLS('focusos_focus_mins', 25) * 60
  })
  const [running, _setRunning] = useState(false)
  const [phase, _setPhase] = useState(() => loadLS('focusos_timer_global', {}).phase || 'focus')
  const [sessionCount, setSessionCount] = useState(0)

  const [focusJustCompleted, setFocusJustCompleted] = useState(false)
  const [breakJustCompleted, setBreakJustCompleted] = useState(false)

  const intervalRef = useRef(null)
  const phaseRef = useRef(phase)
  const focusDurationRef = useRef(focusMins * 60)
  const breakDurationRef = useRef(breakMins * 60)

  const focusDuration = focusMins * 60
  const breakDuration = breakMins * 60

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { focusDurationRef.current = focusDuration }, [focusDuration])
  useEffect(() => { breakDurationRef.current = breakDuration }, [breakDuration])

  // Persist timer state on every tick so navigating away loses nothing
  useEffect(() => {
    localStorage.setItem('focusos_timer_global', JSON.stringify({ timeLeft, phase }))
  }, [timeLeft, phase])

  // Sync profile on first load
  useEffect(() => {
    if (!profile || profileLoadedRef.current) return
    profileLoadedRef.current = true
    profileRef.current = profile
    if (pomodoroMode) return
    const span = profile.focus_duration ?? profile.baseline_attention_span ?? 25
    const brk = profile.break_duration ?? 5
    _setFocusMins(span)
    _setBreakMins(brk)
    localStorage.setItem('focusos_focus_mins', JSON.stringify(span))
    localStorage.setItem('focusos_break_mins', JSON.stringify(brk))
    const saved = loadLS('focusos_timer_global', {})
    if (!saved.timeLeft) setTimeLeft(span * 60)
  }, [profile])

  // Global interval — alive for the full app session regardless of current route
  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          _setRunning(false)
          if (phaseRef.current === 'focus') {
            setFocusJustCompleted(true)
          } else {
            _setPhase('focus')
            setTimeLeft(focusDurationRef.current)
            setSessionCount(c => c + 1)
            setBreakJustCompleted(true)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

  function start() { _setRunning(true) }
  function pause() { _setRunning(false) }

  function reset(targetPhase = 'focus') {
    _setRunning(false)
    _setPhase(targetPhase)
    setTimeLeft(targetPhase === 'focus' ? focusDurationRef.current : breakDurationRef.current)
    setFocusJustCompleted(false)
  }

  function startBreak() {
    setFocusJustCompleted(false)
    _setPhase('break')
    setTimeLeft(breakDurationRef.current)
    _setRunning(true)
  }

  function dismissFocusCompletion() {
    setFocusJustCompleted(false)
    _setPhase('focus')
    setTimeLeft(focusDurationRef.current)
  }

  function acknowledgeBreakCompleted() {
    setBreakJustCompleted(false)
  }

  function setFocusMinsCtx(n) {
    _setFocusMins(n)
    localStorage.setItem('focusos_focus_mins', JSON.stringify(n))
    if (phaseRef.current === 'focus' && !running) setTimeLeft(n * 60)
  }

  function setBreakMinsCtx(n) {
    _setBreakMins(n)
    localStorage.setItem('focusos_break_mins', JSON.stringify(n))
    if (phaseRef.current === 'break' && !running) setTimeLeft(n * 60)
  }

  function setPomodoroMode(val) {
    _setPomodoroMode(val)
    localStorage.setItem('focusos_pomodoro', JSON.stringify(val))
    _setRunning(false)
    if (val) {
      _setFocusMins(25)
      _setBreakMins(5)
      _setPhase('focus')
      setTimeLeft(25 * 60)
    } else {
      const p = profileRef.current
      const span = p?.focus_duration ?? p?.baseline_attention_span ?? 25
      const brk = p?.break_duration ?? 5
      _setFocusMins(span)
      _setBreakMins(brk)
      _setPhase('focus')
      setTimeLeft(span * 60)
    }
  }

  return (
    <TimerContext.Provider value={{
      timeLeft, running, phase, sessionCount,
      focusMins, breakMins, focusDuration, breakDuration,
      pomodoroMode, focusJustCompleted, breakJustCompleted,
      start, pause, reset, startBreak, dismissFocusCompletion,
      acknowledgeBreakCompleted, setFocusMinsCtx, setBreakMinsCtx, setPomodoroMode,
    }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimerContext() {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimerContext must be used within TimerProvider')
  return ctx
}
