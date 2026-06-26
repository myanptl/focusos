import { useState, useEffect, useRef } from 'react'
import LogoIcon from '../components/LogoIcon'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { X, Check, AlertTriangle, Calendar, Clock, Sparkles, Brain, RotateCcw, CheckCircle, XCircle, MapPin, Lightbulb, Minus, Bot, FlaskConical, Scroll, BookOpen, Calculator, Pencil, PlayCircle } from 'lucide-react'

function sm2Next(grade, reps, ef, interval) {
  const q = grade === 'got' ? 5 : grade === 'almost' ? 3 : 0
  const newEF = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if (q < 3) return { interval: 1, easeFactor: newEF, repetitions: 0 }
  const newReps = reps + 1
  const newInterval = newReps === 1 ? 1 : newReps === 2 ? 6 : Math.round(interval * ef)
  return { interval: newInterval, easeFactor: newEF, repetitions: newReps }
}

const MODES = [
  { key: 'multiple_choice', label: 'Multiple Choice' },
  { key: 'short_answer',    label: 'Short Answer' },
  { key: 'fill_blank',      label: 'Fill in Blank' },
  { key: 'explain',         label: 'Explain It' },
  { key: 'mixed',           label: 'Mixed' },
  { key: 'flashcards',      label: 'Flashcards' },
]

const TYPE_BADGES = {
  multiple_choice: { label: 'MC',  bg: 'rgba(96,211,248,0.15)',  fg: '#60d3f8' },
  short_answer:    { label: 'SA',  bg: 'rgba(168,139,250,0.15)', fg: '#a78bfa' },
  fill_blank:      { label: 'FB',  bg: 'rgba(255,179,64,0.15)',  fg: '#ffb340' },
  explain:         { label: 'EX',  bg: 'rgba(96,211,248,0.15)',  fg: '#60d3f8' },
  true_false:      { label: 'T/F', bg: 'rgba(181,242,58,0.15)',  fg: '#b5f23a' },
}
const DIFFICULTIES = ['Basic', 'Standard', 'Hard', 'Exam Style']
const SUBJECT_ICONS = { Science: FlaskConical, History: Scroll, English: BookOpen, Math: Calculator, Other: Pencil }
const CONF_LABELS = ['', 'Not sure', 'Vague idea', 'Mostly sure', 'Very sure', 'Certain']

const glass = (extra = {}) => ({
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 14,
  boxShadow: '0 4px 24px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.04)',
  ...extra,
})

const LIME = '#b5f23a'
const CYAN = '#60d3f8'
const RED  = '#f05a5a'
const AMBER = '#f2c75a'

export default function QuizV2() {
  const { user } = useAuth()
  const toast = useToast()
  const location = useLocation()

  const [sourceMode,  setSourceMode]  = useState(location.state?.prefillBankSubject ? 'bank' : 'notes')
  const [bankSubject, setBankSubject] = useState(location.state?.prefillBankSubject || 'SAT Math')
  const [notes,       setNotes]       = useState(location.state?.prefillNotes || '')
  const [subject,     setSubject]     = useState(location.state?.prefillSubject || '')
  const [subjectType, setSubjectType] = useState('Other')
  const [count,       setCount]       = useState(10)
  const [mode,        setMode]        = useState('short_answer')
  const [difficulty,  setDifficulty]  = useState('Standard')
  const [tone,        setTone]        = useState('Simple')
  const [timed,       setTimed]       = useState(false)

  const [fcDeck,    setFcDeck]    = useState([])
  const [fcFlipped, setFcFlipped] = useState(false)

  const [phase,          setPhase]          = useState('setup')
  const [questions,      setQuestions]      = useState([])
  const [dueReview,      setDueReview]      = useState([])
  const [current,        setCurrent]        = useState(0)
  const [revealed,       setRevealed]       = useState(false)
  const [userAnswer,     setUserAnswer]     = useState('')
  const [confidence,     setConfidence]     = useState(3)
  const [selectedOption, setSelectedOption] = useState(null)
  const [mcGrade,        setMcGrade]        = useState(null)
  const [scores,         setScores]         = useState({})
  const [confidences,    setConfidences]    = useState({})
  const [qTimes,         setQTimes]         = useState({})
  const [qStart,         setQStart]         = useState(null)

  const [timeLeft, setTimeLeft] = useState(85)
  const timerRef  = useRef(null)

  const [saGrading,      setSaGrading]      = useState(false)
  const [saFeedback,     setSaFeedback]     = useState(null)
  const [fbInput,        setFbInput]        = useState('')
  const [fbResult,       setFbResult]       = useState(null)
  const [tfResult,       setTfResult]       = useState(null)

  const [miniLesson,      setMiniLesson]      = useState(null)
  const [harderQ,         setHarderQ]         = useState(null)
  const [followupLoading, setFollowupLoading] = useState(null)

  const [dragOver,  setDragOver]  = useState(false)
  const fileInputRef = useRef(null)

  const [videoUrl,             setVideoUrl]             = useState('')
  const [videoSubject,         setVideoSubject]         = useState('')
  const [videoLoading,         setVideoLoading]         = useState(false)
  const [videoError,           setVideoError]           = useState('')
  const [videoResult,          setVideoResult]          = useState(null)
  const [videoId,              setVideoId]              = useState(null)
  const [videoFlipped,         setVideoFlipped]         = useState(new Set())
  const [videoRevealed,        setVideoRevealed]        = useState({})
  const [videoNoTranscript,    setVideoNoTranscript]    = useState(false)
  const [manualTranscript,     setManualTranscript]     = useState('')
  const [showLengthWarning,    setShowLengthWarning]    = useState(false)

  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')
  const [results,          setResults]          = useState(null)
  const [modelUsed,        setModelUsed]        = useState(null)
  const [ollamaFallback,   setOllamaFallback]   = useState(false)
  const [generationsToday, setGenerationsToday] = useState(null)
  const [modelPref,        setModelPref]        = useState('auto')

  useEffect(() => { if (user) { loadDueReview(); loadGenerationsToday() } }, [user])

  async function loadDueReview() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('spaced_repetition')
      .select('*')
      .eq('user_id', user.id)
      .lte('next_review_date', today)
      .order('next_review_date')
      .limit(5)
    setDueReview(data || [])
  }

  async function loadGenerationsToday() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('profiles')
      .select('claude_generations_today, claude_generations_reset_date, ai_model_preference')
      .eq('user_id', user.id)
      .maybeSingle()
    const isReset = !data?.claude_generations_reset_date || data.claude_generations_reset_date !== today
    setGenerationsToday(isReset ? 0 : (data?.claude_generations_today || 0))
    setModelPref(data?.ai_model_preference || 'auto')
  }

  useEffect(() => {
    if (phase !== 'quiz') return
    setRevealed(false)
    setUserAnswer('')
    setConfidence(3)
    setSelectedOption(null)
    setMcGrade(null)
    setMiniLesson(null)
    setHarderQ(null)
    setSaGrading(false)
    setSaFeedback(null)
    setFbInput('')
    setFbResult(null)
    setTfResult(null)
    setQStart(Date.now())
    if (timed) {
      clearInterval(timerRef.current)
      setTimeLeft(85)
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); setRevealed(true); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [current, phase, timed])

  useEffect(() => { if (revealed) clearInterval(timerRef.current) }, [revealed])

  function handleImportedFile(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'txt' || ext === 'md') {
      const reader = new FileReader()
      reader.onload = e => { setNotes(e.target.result); toast(`Notes imported from ${file.name}`, 'success') }
      reader.readAsText(file)
    } else if (ext === 'pdf') {
      setError('PDF detected — paste your notes as text for best results.')
    } else if (ext === 'docx') {
      setError('Word doc detected — copy and paste your notes as text.')
    } else {
      setError('Unsupported file type. Please use .txt or .md files.')
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImportedFile(file)
  }

  function handleFileInput(e) {
    const file = e.target.files[0]
    if (file) handleImportedFile(file)
    e.target.value = ''
  }

  async function getAuthToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function summarizeVideo() {
    setVideoError('')
    setVideoLoading(true)
    try {
      const body = { url: videoUrl, subject: videoSubject }
      if (manualTranscript.trim()) body.transcript = manualTranscript
      const token = await getAuthToken()
      const res = await fetch('/api/summarize-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data?.code === 'NO_TRANSCRIPT') { setVideoNoTranscript(true); setVideoError(data.error || 'Auto-transcript unavailable.'); return }
        throw new Error(data?.error || `Server error ${res.status}`)
      }
      setVideoNoTranscript(false)
      setVideoResult(data)
      setShowLengthWarning((data.transcript_length ?? 0) > 12000)
      const id = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1]
      setVideoId(id || null)
      setVideoFlipped(new Set())
      setVideoRevealed({})
    } catch (err) {
      setVideoError(err.message || 'Failed to summarize video.')
    } finally {
      setVideoLoading(false)
    }
  }

  async function generateQuiz() {
    if (sourceMode === 'notes' && !notes.trim()) { setError('Paste your notes first.'); return }
    setError('')
    setLoading(true)
    try {
      const apiMode = mode === 'flashcards' ? 'short_answer' : mode
      const body = sourceMode === 'bank'
        ? { source: 'questionbank', bankSubject, numQuestions: count, mode: apiMode, difficulty, tone }
        : { notes, subject, subjectType, numQuestions: count, mode: apiMode, difficulty, tone }
      const token = await getAuthToken()
      const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`
      const res = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      })
      let data
      try {
        const text = await res.text()
        if (!text.trimStart().startsWith('{') && !text.trimStart().startsWith('[')) throw new Error('Quiz generation failed. Please try again.')
        data = JSON.parse(text)
      } catch (parseErr) {
        throw new Error(parseErr.message || 'Quiz generation failed. Please try again.')
      }
      if (!res.ok) {
        if (res.status === 429) throw new Error('Daily limit reached. Upgrade to Pro or try again tomorrow.')
        throw new Error(data?.error || `Server error ${res.status}`)
      }
      if (data.daily_limit_reached) toast('Daily Claude limit reached — switched to Llama 3.1.', 'info')
      if (!data.questions?.length) throw new Error('No questions generated. Try more detailed notes.')
      setModelUsed(data.model_used || 'claude')
      setOllamaFallback(data.ollama_fallback || false)
      if (data.model_used === 'claude') setGenerationsToday(g => (g ?? 0) + 1)
      const reviewQs = dueReview.map(r => ({
        question: r.question, answer: r.answer, explanation: r.explanation,
        source_hint: r.source_hint, type: r.question_type, isReview: true,
        reviewId: r.id, repetitions: r.repetitions, ease_factor: r.ease_factor,
        interval_days: r.interval_days, review_count: r.review_count,
      }))
      const allQs = [...reviewQs, ...data.questions]
      setQuestions(allQs); setScores({}); setConfidences({}); setQTimes({})
      setCurrent(0); setResults(null); setPhase('quiz')
      if (mode === 'flashcards') { setFcDeck(allQs.map((_, i) => i)); setFcFlipped(false) }
    } catch (err) {
      setError(err.message || 'Failed to generate quiz.')
    } finally {
      setLoading(false)
    }
  }

  function advance(grade) {
    const elapsed = qStart ? Math.round((Date.now() - qStart) / 1000) : 85
    const s = { ...scores, [current]: grade }
    const c = { ...confidences, [current]: confidence }
    const t = { ...qTimes, [current]: elapsed }
    setScores(s); setConfidences(c); setQTimes(t)
    if (current < questions.length - 1) setCurrent(i => i + 1)
    else finishQuiz(s, c, t)
  }

  function onMCSelect(letter) {
    if (revealed) return
    const q = questions[current]
    setSelectedOption(letter); setRevealed(true)
    setMcGrade(letter === q.correct_option ? 'got' : 'missed')
  }

  async function requestFollowup(action) {
    const q = harderQ || questions[current]
    setFollowupLoading(action)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/quiz-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action, question: q.question, answer: q.answer, userAnswer: action === 'mini_lesson' ? userAnswer : undefined, subject, difficulty, mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Follow-up failed')
      if (action === 'harder'      && data.question) setHarderQ(data.question)
      if (action === 'mini_lesson' && data.lesson)   setMiniLesson(data.lesson)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setFollowupLoading(null)
    }
  }

  async function gradeShortAnswer() {
    const q = activeQ
    setSaGrading(true)
    try {
      const token = await getAuthToken()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ mode: 'grade', question: q.question, correctAnswer: q.answer, userAnswer }),
      })
      const data = await res.json()
      setSaFeedback(data); setRevealed(true)
    } catch (err) {
      setSaFeedback({ correct: false, feedback: 'Could not grade. Check your answer manually.' })
      setRevealed(true)
    } finally {
      setSaGrading(false)
    }
  }

  async function finishQuiz(finalS, finalC, finalT) {
    const n       = questions.length
    const correct = Object.values(finalS).filter(v => v === 'got').length
    const almost  = Object.values(finalS).filter(v => v === 'almost').length
    const missed  = Object.values(finalS).filter(v => v === 'missed').length
    const pct     = Math.round(((correct + almost * 0.5) / n) * 100)
    const xp      = correct * 10 + almost * 5
    const confVals  = Object.values(finalC)
    const timeVals  = Object.values(finalT)
    const avgConf   = confVals.reduce((a, b) => a + b, 0) / Math.max(1, confVals.length)
    const avgTime   = timeVals.reduce((a, b) => a + b, 0) / Math.max(1, timeVals.length)
    const speedScore = timed ? Math.max(0, Math.min(100, ((85 - avgTime) / 85) * 100)) : 80
    const focusScore = Math.round((pct + (avgConf / 5) * 100 + speedScore) / 3)
    const weakTopics = questions.filter((_, i) => finalS[i] === 'missed' || (finalC[i] || 3) < 3).map(q => q.source_hint || q.question?.slice(0, 60)).filter(Boolean).slice(0, 5)
    const missedQs = questions.filter((_, i) => finalS[i] === 'missed')
    setResults({ correct, almost, missed, pct, xp, missedQs, focusScore, weakTopics }); setPhase('results')

    if (!user) { toast(`Quiz done! ${pct}% · +${xp} XP`, 'success'); return }
    const today = new Date().toISOString().split('T')[0]

    for (const [idx, q] of questions.entries()) {
      if (!q.isReview) continue
      const grade = finalS[idx] || 'missed'
      const { interval, easeFactor, repetitions } = sm2Next(grade, q.repetitions || 0, q.ease_factor || 2.5, q.interval_days || 1)
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + interval)
      await supabase.from('spaced_repetition').update({ interval_days: interval, ease_factor: easeFactor, repetitions, last_grade: grade, review_count: (q.review_count || 0) + 1, next_review_date: nextDate.toISOString().split('T')[0], updated_at: new Date().toISOString() }).eq('id', q.reviewId)
    }

    const inserts = []
    for (const [idx, q] of questions.entries()) {
      if (q.isReview) continue
      const grade = finalS[idx] || 'missed'
      const conf  = finalC[idx] || 3
      if (grade === 'missed' || conf < 3) {
        const interval = grade === 'missed' ? 1 : grade === 'almost' ? 3 : 7
        const nextDate = new Date()
        nextDate.setDate(nextDate.getDate() + interval)
        inserts.push({ user_id: user.id, question: q.question, answer: q.answer, explanation: q.explanation || null, source_hint: q.source_hint || null, subject: subject || 'General', question_type: mode, interval_days: interval, next_review_date: nextDate.toISOString().split('T')[0], last_grade: grade })
      }
    }
    if (inserts.length) await supabase.from('spaced_repetition').insert(inserts)

    const { data: todayLog } = await supabase.from('daily_focus_log').select('id').eq('user_id', user.id).eq('log_date', today).maybeSingle()
    const bonus = todayLog ? 50 : 0

    await supabase.from('quiz_results').insert({ user_id: user.id, subject: subject || 'General', questions_total: n, questions_correct: correct, missed_questions: missedQs, score_percentage: pct, quiz_date: today, mode, tone, subject_type: subjectType, timed, time_taken_seconds: timeVals.reduce((a, b) => a + b, 0), focus_score: focusScore, weak_topics: weakTopics })
    toast(bonus ? `Quiz done! ${pct}% · +${xp + bonus} XP (includes +${bonus} streak bonus!)` : `Quiz done! Score: ${pct}% · +${xp} XP`, 'success')
  }

  function restart() {
    setPhase('setup'); setQuestions([]); setScores({}); setResults(null)
    setFcDeck([]); setFcFlipped(false); setModelUsed(null); setOllamaFallback(false)
    if (user) loadDueReview()
  }

  function fcHandleGotIt() {
    const newDeck = fcDeck.slice(1)
    setFcDeck(newDeck); setFcFlipped(false)
    if (newDeck.length === 0) {
      const finalS = {}
      questions.forEach((_, i) => { finalS[i] = 'got' })
      finishQuiz(finalS, {}, {})
    }
  }

  function fcHandleReviewAgain() {
    setFcDeck(prev => [...prev.slice(1), prev[0]]); setFcFlipped(false)
  }

  const activeQ   = harderQ || questions[current]
  const progress  = questions.length > 0 ? (current / questions.length) * 100 : 0
  const qType     = mode === 'mixed' ? (activeQ?.type || 'short_answer') : mode
  const isMC      = (qType === 'multiple_choice') && !activeQ?.isReview
  const isTF      = (qType === 'true_false') && mode === 'mixed' && !activeQ?.isReview
  const isFB      = (qType === 'fill_blank') && mode === 'mixed' && !activeQ?.isReview
  const isSA      = (qType === 'short_answer') && mode === 'mixed' && !activeQ?.isReview
  const isExplain = (qType === 'explain') && mode === 'mixed' && !activeQ?.isReview

  function diffColor(d) {
    if (d === 'Basic')   return { bg: 'rgba(181,242,58,0.15)',  fg: LIME }
    if (d === 'Hard' || d === 'Exam Style') return { bg: 'rgba(242,90,90,0.15)', fg: RED }
    return { bg: 'rgba(242,199,90,0.15)', fg: AMBER }
  }
  const dc = diffColor(difficulty)

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text)',
    fontFamily: "'Outfit', sans-serif", outline: 'none',
    transition: 'border-color 0.15s',
  }
  const textareaStyle = { ...inputStyle, resize: 'vertical', lineHeight: 1.6, minHeight: 110 }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, alignItems: 'start' }}>

      {/* ─── LEFT: Setup ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(181,242,58,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Active Recall</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Quiz Generator</h1>
        </div>

        <div style={{ ...glass(), padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Source toggle */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Question Source</div>
            <div style={{ display: 'flex', gap: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              {[{ id: 'notes', label: 'My Notes' }, { id: 'bank', label: 'Question Bank' }, { id: 'video', label: 'Video' }].map((s, i) => (
                <motion.button
                  key={s.id}
                  onClick={() => setSourceMode(s.id)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1, padding: '9px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: sourceMode === s.id ? LIME : 'rgba(255,255,255,0.02)',
                    color: sourceMode === s.id ? '#0a0a0b' : 'var(--muted)',
                    border: 'none', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                    transition: 'all 0.15s', fontFamily: "'Outfit', sans-serif",
                    letterSpacing: '0.02em',
                  }}
                >{s.label}</motion.button>
              ))}
            </div>
          </div>

          {/* Source content */}
          {sourceMode === 'bank' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Subject</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['SAT Math','SAT Reading','SAT Writing','ACT English','ACT Math','ACT Science','ACT Reading'].map(s => (
                  <motion.button key={s} whileTap={{ scale: 0.95 }} onClick={() => setBankSubject(s)} style={{
                    padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: bankSubject === s ? 'rgba(181,242,58,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${bankSubject === s ? 'rgba(181,242,58,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    color: bankSubject === s ? LIME : 'var(--muted)',
                    transition: 'all 0.15s', fontFamily: "'Outfit', sans-serif",
                  }}>{s}</motion.button>
                ))}
              </div>
            </div>
          )}

          {sourceMode === 'video' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>YouTube URL</div>
                <input type="url" placeholder="https://youtube.com/watch?v=..." value={videoUrl}
                  onChange={e => { setVideoUrl(e.target.value); setShowLengthWarning(false); if (videoNoTranscript) { setVideoNoTranscript(false); setManualTranscript(''); setVideoError('') } }}
                  onKeyDown={e => { if (e.key === 'Enter' && videoUrl.trim() && !videoNoTranscript) summarizeVideo() }}
                  style={inputStyle}
                />
              </div>
              {showLengthWarning && (
                <div style={{ background: 'rgba(242,199,90,0.06)', border: '1px solid rgba(242,199,90,0.2)', borderRadius: 8, padding: '9px 13px', fontSize: 12, color: AMBER, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>This video is long — only the first ~45 minutes were summarized.</span>
                </div>
              )}
              {!videoNoTranscript ? (
                <>
                  <input type="text" placeholder="Subject (optional)" value={videoSubject} onChange={e => setVideoSubject(e.target.value)} style={inputStyle} />
                  {videoError && <div style={{ background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: RED }}>{videoError}</div>}
                  <motion.button whileHover={{ opacity: 0.9 }} whileTap={{ scale: 0.98 }} onClick={summarizeVideo} disabled={videoLoading || !videoUrl.trim()} style={{ padding: '12px 0', background: LIME, color: '#0a0a0b', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Outfit', sans-serif", opacity: (videoLoading || !videoUrl.trim()) ? 0.5 : 1 }}>
                    {videoLoading ? <><span className="spinner" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />Analyzing...</> : 'Summarize Video'}
                  </motion.button>
                </>
              ) : (
                <>
                  <div style={{ background: 'rgba(242,199,90,0.06)', border: '1px solid rgba(242,199,90,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 700, color: AMBER, marginBottom: 6 }}>Auto-transcript unavailable.</div>
                    {videoError}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Paste transcript manually</div>
                    <textarea value={manualTranscript} onChange={e => setManualTranscript(e.target.value)} placeholder="Paste the transcript text here..." rows={4} style={textareaStyle} />
                    <motion.button whileTap={{ scale: 0.98 }} onClick={summarizeVideo} disabled={videoLoading || !manualTranscript.trim()} style={{ marginTop: 8, padding: '10px 0', width: '100%', background: LIME, color: '#0a0a0b', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", opacity: (videoLoading || !manualTranscript.trim()) ? 0.5 : 1 }}>
                      {videoLoading ? 'Summarizing...' : 'Summarize from transcript'}
                    </motion.button>
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setVideoNoTranscript(false); setVideoUrl(''); setManualTranscript(''); setVideoError(''); setVideoResult(null) }} style={{ padding: '9px 0', width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, fontSize: 13, color: 'var(--muted)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                    ← Try another video
                  </motion.button>
                </>
              )}
            </div>
          )}

          {sourceMode === 'notes' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Your Notes</div>
              <div style={{ position: 'relative' }}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Paste your notes here... The more detail, the better the questions."
                  style={{ ...textareaStyle, borderColor: dragOver ? LIME : 'rgba(255,255,255,0.09)' }}
                />
                {notes && (
                  <button onClick={() => setNotes('')} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer', color: 'var(--muted)', padding: '4px 7px', display: 'flex', alignItems: 'center' }}><X size={11} /></button>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>drag a .txt file or paste text</div>
              <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.docx" onChange={handleFileInput} style={{ display: 'none' }} />
            </div>
          )}

          {sourceMode !== 'video' && (
            <>
              {sourceMode === 'notes' && (
                <input type="text" placeholder="Subject (optional)" value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
              )}

              {/* Count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Questions</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[5, 10, 15].map(n => (
                    <motion.button key={n} whileTap={{ scale: 0.95 }} onClick={() => setCount(n)} style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: count === n ? 'rgba(181,242,58,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${count === n ? 'rgba(181,242,58,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      color: count === n ? LIME : 'var(--muted)', transition: 'all 0.15s',
                      fontFamily: "'Outfit', sans-serif",
                    }}>{n}</motion.button>
                  ))}
                </div>
              </div>

              {/* Mode + Difficulty */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Mode</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {MODES.map(m => {
                        const short = m.key === 'multiple_choice' ? 'MC' : m.key === 'short_answer' ? 'SA' : m.key === 'fill_blank' ? 'Fill' : m.key === 'flashcards' ? 'Cards' : m.label
                        return (
                          <motion.button key={m.key} whileTap={{ scale: 0.95 }} onClick={() => setMode(m.key)} style={{
                            padding: '4px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: mode === m.key ? 'rgba(181,242,58,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${mode === m.key ? 'rgba(181,242,58,0.35)' : 'rgba(255,255,255,0.08)'}`,
                            color: mode === m.key ? LIME : 'var(--muted)', transition: 'all 0.15s',
                            fontFamily: "'Outfit', sans-serif",
                          }}>{short}</motion.button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Difficulty</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {DIFFICULTIES.map(d => {
                        const short = d === 'Standard' ? 'Med' : d === 'Exam Style' ? 'Exam' : d
                        const { bg, fg } = diffColor(d)
                        return (
                          <motion.button key={d} whileTap={{ scale: 0.95 }} onClick={() => setDifficulty(d)} style={{
                            padding: '4px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: difficulty === d ? bg : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${difficulty === d ? fg + '60' : 'rgba(255,255,255,0.08)'}`,
                            color: difficulty === d ? fg : 'var(--muted)', transition: 'all 0.15s',
                            fontFamily: "'Outfit', sans-serif",
                          }}>{short}</motion.button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {dueReview.length > 0 && (
                <div style={{ background: 'rgba(96,211,248,0.06)', border: '1px solid rgba(96,211,248,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: CYAN, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={11} />{dueReview.length} question{dueReview.length !== 1 ? 's' : ''} due for spaced review — will appear first.
                </div>
              )}

              {error && (
                <div style={{ background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: RED }}>
                  {error}
                  <button onClick={generateQuiz} style={{ marginTop: 8, display: 'block', background: 'none', border: 'none', color: LIME, fontSize: 12, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Retry →</button>
                </div>
              )}

              {/* Timed + Generate */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={12} />Timed 85s per question
                  </span>
                  <button onClick={() => setTimed(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 0, background: timed ? LIME : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s' }}>
                    <span style={{ position: 'absolute', top: 3, left: timed ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: timed ? '#0a0a0b' : 'var(--muted)', transition: 'left 0.2s' }} />
                  </button>
                </div>
                <motion.button
                  whileHover={{ opacity: 0.92 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={generateQuiz}
                  disabled={loading || (sourceMode === 'notes' && !notes.trim())}
                  style={{
                    padding: '14px 0', background: LIME, color: '#0a0a0b',
                    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 900,
                    cursor: 'pointer', letterSpacing: '0.06em', fontFamily: "'Outfit', sans-serif",
                    opacity: (loading || (sourceMode === 'notes' && !notes.trim())) ? 0.5 : 1,
                    boxShadow: '0 4px 20px rgba(181,242,58,0.25)',
                  }}
                >
                  {loading ? <><span className="spinner" style={{ width: 15, height: 15, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />Generating...</> : 'GENERATE →'}
                </motion.button>
              </div>

              {user && generationsToday !== null && (
                <div style={{ textAlign: 'center', fontSize: 11, color: modelPref === 'ollama' ? CYAN : (modelPref === 'auto' && generationsToday >= 5) ? AMBER : 'var(--muted)' }}>
                  {modelPref === 'ollama'
                    ? <><Bot size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Using Llama 3.1 (Free)</>
                    : modelPref === 'claude'
                    ? <><Sparkles size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{generationsToday}/5 Claude generations used today</>
                    : generationsToday >= 5
                    ? <><Bot size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Switched to Llama 3.1 (free)</>
                    : <><Sparkles size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{generationsToday}/5 Claude generations used today</>}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* ─── RIGHT: Quiz / Results ─────────────────────────── */}
      <div>
        {/* Video empty state */}
        {phase === 'setup' && sourceMode === 'video' && !videoResult && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ ...glass(), padding: 48, textAlign: 'center' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><PlayCircle size={48} color="rgba(255,255,255,0.15)" /></div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Summarize a YouTube Video</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>Paste a YouTube URL and Claude will extract the transcript and generate study notes, key terms, and practice questions.</p>
          </motion.div>
        )}

        {/* Video results */}
        {phase === 'setup' && sourceMode === 'video' && videoResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ ...glass({ borderLeft: `2px solid ${LIME}` }), padding: 16 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {videoId && <img src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt="" style={{ width: 110, height: 62, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4, marginBottom: 4 }}>{videoResult.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{videoResult.duration_estimate}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--muted)', marginTop: 12 }}>{videoResult.summary}</p>
            </div>

            {videoResult.keyPoints?.length > 0 && (
              <div style={{ ...glass(), padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: LIME, textTransform: 'uppercase', marginBottom: 10 }}>Key Points</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {videoResult.keyPoints.map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <Check size={13} color={LIME} strokeWidth={2.5} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, lineHeight: 1.5 }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {videoResult.keyTerms?.length > 0 && (
              <div style={{ ...glass(), padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: LIME, textTransform: 'uppercase', marginBottom: 4 }}>Key Terms</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>Click a card to reveal the definition</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {videoResult.keyTerms.map((kt, i) => (
                    <motion.div key={i} whileHover={{ y: -1 }} onClick={() => setVideoFlipped(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })}
                      style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', background: videoFlipped.has(i) ? 'rgba(181,242,58,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${videoFlipped.has(i) ? 'rgba(181,242,58,0.25)' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.2s', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                      {videoFlipped.has(i) ? <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{kt.definition}</div> : <div style={{ fontSize: 13, fontWeight: 700, color: LIME }}>{kt.term}</div>}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {videoResult.studyNotes && (
              <div style={{ ...glass(), padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: LIME, textTransform: 'uppercase', marginBottom: 10 }}>Study Notes</div>
                <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{videoResult.studyNotes}</div>
              </div>
            )}

            {videoResult.questions?.length > 0 && (
              <div style={{ ...glass(), padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: LIME, textTransform: 'uppercase', marginBottom: 10 }}>Practice Questions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {videoResult.questions.map((q, i) => (
                    <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: videoRevealed[i] ? 8 : 0 }}>{i + 1}. {q.question}</div>
                      {videoRevealed[i] ? (
                        <div style={{ fontSize: 13, color: 'var(--muted)', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)', lineHeight: 1.5 }}>{q.answer}</div>
                      ) : (
                        <button onClick={() => setVideoRevealed(prev => ({ ...prev, [i]: true }))} style={{ marginTop: 8, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'var(--muted)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Show Answer</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <motion.button whileHover={{ opacity: 0.9 }} whileTap={{ scale: 0.98 }} onClick={() => { if (videoResult.studyNotes) { setNotes(videoResult.studyNotes); setSourceMode('notes') } }}
              style={{ padding: '14px 0', background: LIME, color: '#0a0a0b', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Outfit', sans-serif", boxShadow: '0 4px 20px rgba(181,242,58,0.25)' }}>
              Take Full Quiz on This Video →
            </motion.button>
          </div>
        )}

        {/* Setup placeholder */}
        {phase === 'setup' && sourceMode !== 'video' && (
          dueReview.length > 0 ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ ...glass(), padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: CYAN, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Due for Review Today</div>
              {dueReview.map((r, i) => (
                <div key={r.id} style={{ padding: '10px 0', borderBottom: i < dueReview.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{r.question}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Next: {r.next_review_date} · Interval: {r.interval_days}d · Reviews: {r.review_count}</div>
                </div>
              ))}
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>Generate a quiz above — these will appear first.</p>
            </motion.div>
          ) : loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ ...glass(), padding: 48, textAlign: 'center' }}>
              <LogoIcon size={56} style={{ marginBottom: 16 }} />
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>Generating your questions...</p>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ ...glass(), padding: 48, textAlign: 'center' }}>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><Brain size={48} color={LIME} style={{ opacity: 0.7 }} /></div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Ready to test yourself?</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>Paste your notes and hit Generate. Claude will create personalized active recall questions.</p>
            </motion.div>
          )
        )}

        {/* ── Flashcard mode ────────────────────────────── */}
        {phase === 'quiz' && mode === 'flashcards' && questions.length > 0 && (() => {
          const totalCards = questions.length
          const uniqueRemaining = new Set(fcDeck).size
          const doneCount = totalCards - uniqueRemaining
          const q = fcDeck.length > 0 ? questions[fcDeck[0]] : null
          if (!q) return null
          return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ ...glass(), padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>Flashcards — {doneCount}/{totalCards} mastered</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fcDeck.length} remaining</span>
                </div>
                <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <motion.div animate={{ width: `${(doneCount / totalCards) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} style={{ height: '100%', background: LIME, borderRadius: 99 }} />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={fcDeck[0]}
                  initial={{ opacity: 0, rotateY: -15, scale: 0.97 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, rotateY: 15, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  onClick={() => setFcFlipped(f => !f)}
                  style={{
                    cursor: 'pointer', minHeight: 200, borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '32px 24px', textAlign: 'center', userSelect: 'none',
                    background: fcFlipped ? 'rgba(181,242,58,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${fcFlipped ? 'rgba(181,242,58,0.3)' : 'rgba(255,255,255,0.09)'}`,
                    position: 'relative', flexDirection: 'column', gap: 10,
                    transition: 'background 0.25s, border-color 0.25s',
                  }}
                >
                  <div style={{ position: 'absolute', top: 12, fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em' }}>
                    {fcFlipped ? '↩ tap to flip back' : 'tap to reveal answer'}
                  </div>
                  {fcFlipped
                    ? <div style={{ fontSize: 16, lineHeight: 1.6, color: LIME, fontWeight: 600 }}>{q.answer}</div>
                    : <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.5 }}>{q.question}</div>
                  }
                </motion.div>
              </AnimatePresence>

              {fcFlipped ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={fcHandleReviewAgain} style={{ flex: 1, padding: '13px 0', fontSize: 13, fontWeight: 700, background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.3)', color: RED, borderRadius: 10, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <RotateCcw size={13} />Review Again
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={fcHandleGotIt} style={{ flex: 1, padding: '13px 0', fontSize: 13, fontWeight: 700, background: 'rgba(181,242,58,0.1)', border: '1px solid rgba(181,242,58,0.3)', color: LIME, borderRadius: 10, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <CheckCircle size={13} />Got It
                  </motion.button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>Click the card to reveal the answer</div>
              )}

              <button onClick={restart} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>← Back to Setup</button>
            </motion.div>
          )
        })()}

        {/* ── Quiz card ──────────────────────────────────── */}
        {phase === 'quiz' && activeQ && mode !== 'flashcards' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ ...glass(), padding: 20, display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', overflow: 'hidden' }}>

            {/* Subject watermark */}
            {(() => {
              const SubjectMark = SUBJECT_ICONS[subjectType] || Pencil
              return <div style={{ position: 'absolute', bottom: -10, right: 10, opacity: 0.04, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}><SubjectMark size={130} /></div>
            })()}

            {/* Progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>Question {current + 1} of {questions.length}</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {timed && <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: timeLeft < 15 ? RED : 'var(--muted)' }}>{timeLeft}s</span>}
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{Math.round(progress)}%</span>
                </div>
              </div>
              <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <motion.div animate={{ width: `${progress}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} style={{ height: '100%', background: LIME, borderRadius: 99 }} />
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {mode === 'mixed' ? (
                <>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: 'rgba(181,242,58,0.1)', color: LIME, letterSpacing: '0.04em' }}>MIXED</span>
                  {TYPE_BADGES[qType] && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: TYPE_BADGES[qType].bg, color: TYPE_BADGES[qType].fg }}>{TYPE_BADGES[qType].label}</span>}
                </>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: 'rgba(96,211,248,0.15)', color: CYAN }}>
                  {MODES.find(m => m.key === mode)?.label}
                </span>
              )}
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: dc.bg, color: dc.fg }}>{difficulty}</span>
              {activeQ.isReview && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: 'rgba(242,199,90,0.15)', color: AMBER, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={10} />Spaced Review</span>}
              {harderQ && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: 'rgba(242,90,90,0.15)', color: RED }}>↑ Harder</span>}
            </div>

            {/* Question + answer area */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${current}-${harderQ ? 'h' : 'n'}`}
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -32 }}
                transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5 }}>{activeQ.question}</div>

                {/* MC unrevealed */}
                {isMC && !revealed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(activeQ.options || []).map((opt, i) => {
                      const letter = opt.match(/^([A-D])/)?.[1]
                      return (
                        <motion.button key={i} onClick={() => letter && onMCSelect(letter)}
                          initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 38, delay: i * 0.06 }}
                          whileHover={{ borderColor: LIME }} whileTap={{ scale: 0.98 }}
                          style={{ textAlign: 'left', padding: '12px 16px', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', fontSize: 14, color: 'var(--text)', transition: 'border-color 0.15s', fontFamily: "'Outfit', sans-serif" }}>
                          {opt}
                        </motion.button>
                      )
                    })}
                  </div>
                )}

                {/* MC revealed */}
                {isMC && revealed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(activeQ.options || []).map((opt, i) => {
                      const letter    = opt.match(/^([A-D])/)?.[1]
                      const isCorrect = letter === activeQ.correct_option
                      const isWrong   = letter === selectedOption && !isCorrect
                      return (
                        <div key={i} style={{ padding: '12px 16px', borderRadius: 10, fontSize: 14, background: isCorrect ? 'rgba(181,242,58,0.1)' : isWrong ? 'rgba(242,90,90,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isCorrect ? 'rgba(181,242,58,0.4)' : isWrong ? 'rgba(242,90,90,0.4)' : 'rgba(255,255,255,0.06)'}`, color: isCorrect ? LIME : isWrong ? RED : 'var(--muted)' }}>
                          {opt} {isCorrect ? <Check size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} /> : isWrong ? <X size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} /> : ''}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* True/False */}
                {isTF && !revealed && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {['True', 'False'].map(opt => (
                      <motion.button key={opt} whileTap={{ scale: 0.97 }} onClick={() => { const correct = activeQ.correct === (opt === 'True'); setTfResult({ selected: opt, correct }); setRevealed(true); setMcGrade(correct ? 'got' : 'missed') }}
                        style={{ flex: 1, padding: '15px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: opt === 'True' ? 'rgba(181,242,58,0.08)' : 'rgba(242,90,90,0.08)', border: `1px solid ${opt === 'True' ? 'rgba(181,242,58,0.25)' : 'rgba(242,90,90,0.25)'}`, color: opt === 'True' ? LIME : RED, fontFamily: "'Outfit', sans-serif" }}>
                        {opt}
                      </motion.button>
                    ))}
                  </div>
                )}
                {isTF && revealed && tfResult && (
                  <div style={{ padding: 14, borderRadius: 10, fontSize: 14, textAlign: 'center', fontWeight: 600, background: tfResult.correct ? 'rgba(181,242,58,0.08)' : 'rgba(242,90,90,0.08)', border: `1px solid ${tfResult.correct ? 'rgba(181,242,58,0.3)' : 'rgba(242,90,90,0.3)'}`, color: tfResult.correct ? LIME : RED }}>
                    {tfResult.correct ? <><Check size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Correct!</> : <><X size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Incorrect — answer is {activeQ.correct ? 'True' : 'False'}</>}
                  </div>
                )}

                {/* Fill in Blank */}
                {isFB && !revealed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="text" value={fbInput} onChange={e => setFbInput(e.target.value)} placeholder="Type the missing word or phrase..." style={inputStyle}
                      onKeyDown={e => { if (e.key === 'Enter' && fbInput.trim()) { const correct = fbInput.trim().toLowerCase() === activeQ.answer?.toLowerCase(); setFbResult({ correct }); setMcGrade(correct ? 'got' : 'missed'); setRevealed(true) } }} />
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => { if (!fbInput.trim()) return; const correct = fbInput.trim().toLowerCase() === activeQ.answer?.toLowerCase(); setFbResult({ correct }); setMcGrade(correct ? 'got' : 'missed'); setRevealed(true) }}
                      style={{ padding: '11px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 13, color: 'var(--text)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Check Answer</motion.button>
                  </div>
                )}
                {isFB && revealed && fbResult && (
                  <div style={{ padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: 'center', background: fbResult.correct ? 'rgba(181,242,58,0.08)' : 'rgba(242,90,90,0.08)', border: `1px solid ${fbResult.correct ? 'rgba(181,242,58,0.3)' : 'rgba(242,90,90,0.3)'}`, color: fbResult.correct ? LIME : RED }}>
                    {fbResult.correct ? <><Check size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Correct — "{activeQ.answer}"</> : <><X size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />The answer was "{activeQ.answer}"</>}
                  </div>
                )}

                {/* Short Answer */}
                {isSA && !revealed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} placeholder="Write your answer..." rows={3} style={textareaStyle} />
                    <motion.button whileTap={{ scale: 0.98 }} onClick={gradeShortAnswer} disabled={saGrading || !userAnswer.trim()}
                      style={{ padding: '12px 0', background: LIME, color: '#0a0a0b', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", opacity: (saGrading || !userAnswer.trim()) ? 0.5 : 1 }}>
                      {saGrading ? <><span className="spinner" style={{ width: 13, height: 13, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />Grading...</> : 'Check My Answer'}
                    </motion.button>
                  </div>
                )}
                {isSA && revealed && saFeedback && (
                  <div style={{ padding: 14, borderRadius: 10, fontSize: 13, lineHeight: 1.6, background: saFeedback.correct ? 'rgba(181,242,58,0.06)' : 'rgba(242,90,90,0.06)', border: `1px solid ${saFeedback.correct ? 'rgba(181,242,58,0.25)' : 'rgba(242,90,90,0.25)'}` }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: saFeedback.correct ? LIME : RED }}>
                      {saFeedback.correct ? <><Check size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Correct</> : <><X size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Needs work</>}{saFeedback.score !== undefined ? ` · ${saFeedback.score}/100` : ''}
                    </div>
                    <div style={{ color: 'var(--muted)' }}>{saFeedback.feedback}</div>
                  </div>
                )}

                {/* Explain */}
                {isExplain && !revealed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} placeholder="Explain this in your own words..." rows={4} style={textareaStyle} />
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setRevealed(true)} style={{ padding: '11px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 13, color: 'var(--text)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>See Model Answer</motion.button>
                  </div>
                )}

                {/* Standard (non-mixed) */}
                {!isMC && !isTF && !isFB && !isSA && !isExplain && !revealed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} placeholder="Write your answer (optional — helps with self-grading)..." rows={3} style={textareaStyle} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                        Confidence: <span style={{ fontWeight: 400, textTransform: 'none' }}>{CONF_LABELS[confidence]}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <motion.button key={n} whileTap={{ scale: 0.95 }} onClick={() => setConfidence(n)} style={{ flex: 1, padding: '6px 0', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: confidence === n ? 'rgba(181,242,58,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${confidence === n ? 'rgba(181,242,58,0.35)' : 'rgba(255,255,255,0.08)'}`, color: confidence === n ? LIME : 'var(--muted)', transition: 'all 0.15s', fontFamily: "'Outfit', sans-serif" }}>{n}</motion.button>
                        ))}
                      </div>
                    </div>
                    <motion.button whileTap={{ scale: 0.98 }} onClick={() => setRevealed(true)} style={{ padding: '13px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 13, color: 'var(--text)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Show Answer</motion.button>
                  </div>
                )}

                {/* Revealed answer */}
                {revealed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ background: 'rgba(181,242,58,0.06)', border: '1px solid rgba(181,242,58,0.15)', borderRadius: 10, padding: 14, fontSize: 14, lineHeight: 1.7 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: LIME, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Answer</div>
                      {activeQ.answer}
                    </div>
                    {activeQ.explanation && (
                      <div style={{ background: 'rgba(96,211,248,0.06)', border: '1px solid rgba(96,211,248,0.15)', borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 1.6 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: CYAN, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Why</div>
                        {activeQ.explanation}
                      </div>
                    )}
                    {activeQ.source_hint && (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        <MapPin size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{activeQ.source_hint}
                      </div>
                    )}

                    {/* Grade / Next */}
                    {(isMC || isTF || isFB) ? (
                      <motion.button whileTap={{ scale: 0.98 }} onClick={() => advance(mcGrade)} style={{ padding: '13px 0', background: LIME, color: '#0a0a0b', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Outfit', sans-serif" }}>Next Question →</motion.button>
                    ) : isSA ? (
                      <motion.button whileTap={{ scale: 0.98 }} onClick={() => advance(saFeedback?.correct ? 'got' : 'missed')} style={{ padding: '13px 0', background: LIME, color: '#0a0a0b', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Outfit', sans-serif" }}>Next Question →</motion.button>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={() => advance('got')} style={{ flex: 1, padding: '12px 0', background: 'rgba(181,242,58,0.15)', color: LIME, border: '1px solid rgba(181,242,58,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Check size={13} />Got it</motion.button>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={() => advance('almost')} style={{ flex: 1, padding: '12px 0', background: 'rgba(242,199,90,0.12)', color: AMBER, border: '1px solid rgba(242,199,90,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>~ Almost</motion.button>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={() => advance('missed')} style={{ flex: 1, padding: '12px 0', background: 'rgba(242,90,90,0.12)', color: RED, border: '1px solid rgba(242,90,90,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><X size={13} />Missed</motion.button>
                      </div>
                    )}

                    {/* Follow-up actions */}
                    <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
                      <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }} onClick={() => requestFollowup('harder')} disabled={!!followupLoading || !!harderQ}
                        style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", opacity: (!!followupLoading || !!harderQ) ? 0.4 : 1 }}>
                        {followupLoading === 'harder' ? '...' : '↑ Make Harder'}
                      </motion.button>
                      <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }} onClick={() => requestFollowup('mini_lesson')} disabled={!!followupLoading || !!miniLesson}
                        style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 5, opacity: (!!followupLoading || !!miniLesson) ? 0.4 : 1 }}>
                        <Lightbulb size={12} />{followupLoading === 'mini_lesson' ? '...' : 'Teach Me'}
                      </motion.button>
                    </div>

                    {miniLesson && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(242,199,90,0.08)', border: '1px solid rgba(242,199,90,0.2)', borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.7 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: AMBER, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mini Lesson</div>
                        {miniLesson}
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Results ────────────────────────────────────── */}
        {phase === 'results' && results && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ ...glass(), padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: LIME, margin: 0, letterSpacing: '0.06em' }}>QUIZ RESULTS</h2>
              {modelUsed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: modelUsed === 'claude' ? 'rgba(181,242,58,0.12)' : 'rgba(96,211,248,0.12)', border: `1px solid ${modelUsed === 'claude' ? 'rgba(181,242,58,0.25)' : 'rgba(96,211,248,0.25)'}`, color: modelUsed === 'claude' ? LIME : CYAN }}>
                  {modelUsed === 'claude' ? <><Sparkles size={11} />Generated by Claude</> : <><Bot size={11} />Generated by Llama 3.1</>}
                  {ollamaFallback && <span style={{ opacity: 0.7 }}> (Ollama offline)</span>}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: 'Score',       value: `${results.pct}%`,       color: results.pct >= 80 ? LIME : results.pct >= 60 ? AMBER : RED },
                { label: 'Focus Score', value: `${results.focusScore}%`, color: CYAN },
                { label: 'XP Earned',  value: `+${results.xp}`,         color: CYAN },
                { label: 'Missed',     value: results.missed,            color: results.missed > 0 ? RED : LIME },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: s.color, letterSpacing: '0.04em' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Mixed mode breakdown */}
            {mode === 'mixed' && (() => {
              const typeKeys = ['multiple_choice', 'short_answer', 'fill_blank', 'explain', 'true_false']
              const typeLabels = { multiple_choice: 'Multiple Choice', short_answer: 'Short Answer', fill_blank: 'Fill in Blank', explain: 'Explain', true_false: 'True / False' }
              const rows = typeKeys.map(t => {
                const idxs = questions.map((q, i) => q.type === t ? i : -1).filter(i => i >= 0)
                if (!idxs.length) return null
                const correct = idxs.filter(i => scores[i] === 'got').length
                const total   = idxs.length
                const [Icon, iconColor] = correct === total ? [CheckCircle, LIME] : correct >= total / 2 ? [Minus, AMBER] : [XCircle, RED]
                return { label: typeLabels[t], correct, total, Icon, iconColor, badge: TYPE_BADGES[t] }
              }).filter(Boolean)
              if (!rows.length) return null
              return (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Breakdown by Type</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {rows.map(r => (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: r.badge?.bg, color: r.badge?.fg }}>{r.badge?.label}</span>
                        <span style={{ flex: 1, fontSize: 13 }}>{r.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{r.correct}/{r.total}</span>
                        <r.Icon size={14} color={r.iconColor} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {results.weakTopics?.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: AMBER, textTransform: 'uppercase', marginBottom: 8 }}>Weak Topics</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {results.weakTopics.map((t, i) => (
                    <div key={i} style={{ background: 'rgba(242,199,90,0.06)', border: '1px solid rgba(242,199,90,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={11} color={AMBER} />{t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.missedQs.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Missed Questions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {results.missedQs.map((q, i) => (
                    <div key={i} style={{ background: 'rgba(242,90,90,0.06)', border: '1px solid rgba(242,90,90,0.15)', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{q.question}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{q.answer}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: CYAN, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} />Saved for spaced repetition review.</p>
              </div>
            )}

            <motion.button whileHover={{ opacity: 0.9 }} whileTap={{ scale: 0.98 }} onClick={restart}
              style={{ padding: '14px 0', background: LIME, color: '#0a0a0b', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 900, cursor: 'pointer', letterSpacing: '0.06em', fontFamily: "'Outfit', sans-serif", boxShadow: '0 4px 20px rgba(181,242,58,0.25)' }}>
              New Quiz
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
