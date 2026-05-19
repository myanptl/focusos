import { useState, useEffect, useRef } from 'react'
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

export default function Quiz() {
  const { user } = useAuth()
  const toast = useToast()
  const location = useLocation()

  // ── Setup ──────────────────────────────────────────────
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

  // ── Flashcard state ────────────────────────────────────
  const [fcDeck,    setFcDeck]    = useState([])
  const [fcFlipped, setFcFlipped] = useState(false)

  // ── Quiz state ─────────────────────────────────────────
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

  // ── Timer ──────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(85)
  const timerRef  = useRef(null)

  // ── Mixed-mode per-question state ─────────────────────
  const [saGrading,      setSaGrading]      = useState(false)
  const [saFeedback,     setSaFeedback]     = useState(null)
  const [fbInput,        setFbInput]        = useState('')
  const [fbResult,       setFbResult]       = useState(null)
  const [tfResult,       setTfResult]       = useState(null)

  // ── Follow-up ──────────────────────────────────────────
  const [miniLesson,     setMiniLesson]     = useState(null)
  const [harderQ,        setHarderQ]        = useState(null)
  const [followupLoading, setFollowupLoading] = useState(null)

  // ── File import ────────────────────────────────────────
  const [dragOver,  setDragOver]  = useState(false)
  const fileInputRef = useRef(null)

  // ── Video ─────────────────────────────────────────────
  const [videoUrl,      setVideoUrl]      = useState('')
  const [videoSubject,  setVideoSubject]  = useState('')
  const [videoLoading,  setVideoLoading]  = useState(false)
  const [videoError,    setVideoError]    = useState('')
  const [videoResult,   setVideoResult]   = useState(null)
  const [videoId,       setVideoId]       = useState(null)
  const [videoFlipped,       setVideoFlipped]       = useState(new Set())
  const [videoRevealed,      setVideoRevealed]      = useState({})
  const [videoNoTranscript,  setVideoNoTranscript]  = useState(false)
  const [manualTranscript,   setManualTranscript]   = useState('')
  const [showLengthWarning,  setShowLengthWarning]  = useState(false)

  // ── UI ─────────────────────────────────────────────────
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

  // Per-question reset + timer
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

  useEffect(() => {
    if (revealed) clearInterval(timerRef.current)
  }, [revealed])

  function handleImportedFile(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'txt' || ext === 'md') {
      const reader = new FileReader()
      reader.onload = e => {
        setNotes(e.target.result)
        toast(`Notes imported from ${file.name}`, 'success')
      }
      reader.readAsText(file)
    } else if (ext === 'pdf') {
      setError('PDF detected — paste your notes as text for best results. PDF extraction coming in V2.')
    } else if (ext === 'docx') {
      setError('Word doc detected — copy and paste your notes as text for best results.')
    } else {
      setError('Unsupported file type. Please use .txt or .md files.')
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
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
        if (data?.code === 'NO_TRANSCRIPT') {
          setVideoNoTranscript(true)
          setVideoError(data.error || 'Auto-transcript unavailable.')
          return
        }
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
      console.log('[Quiz] Fetching:', edgeFnUrl, '| hasToken:', !!token, '| body:', JSON.stringify(body).slice(0, 200))
      const res = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      })
      let data
      try {
        const text = await res.text()
        console.log('[Quiz] Response status:', res.status, '| text preview:', text.slice(0, 300))
        if (!text.trimStart().startsWith('{') && !text.trimStart().startsWith('[')) {
          console.error('[Quiz] Non-JSON response from edge function:', text)
          throw new Error('Quiz generation failed. Please try again.')
        }
        data = JSON.parse(text)
      } catch (parseErr) {
        console.error('[Quiz] Parse error:', parseErr)
        throw new Error(parseErr.message || 'Quiz generation failed. Please try again.')
      }
      if (!res.ok) {
        console.error('[Quiz] API error:', res.status, data)
        if (res.status === 429) throw new Error('Daily limit reached. Upgrade to Pro or try again tomorrow.')
        throw new Error(data?.error || `Server error ${res.status}`)
      }
      if (data.daily_limit_reached) {
        toast('Daily Claude limit reached — switched to Llama 3.1.', 'info')
      }
      if (!data.questions?.length) throw new Error('No questions generated. Try more detailed notes.')

      setModelUsed(data.model_used || 'claude')
      setOllamaFallback(data.ollama_fallback || false)
      if (data.model_used === 'claude') setGenerationsToday(g => (g ?? 0) + 1)

      const reviewQs = dueReview.map(r => ({
        question: r.question, answer: r.answer,
        explanation: r.explanation, source_hint: r.source_hint,
        type: r.question_type, isReview: true, reviewId: r.id,
        repetitions: r.repetitions, ease_factor: r.ease_factor,
        interval_days: r.interval_days, review_count: r.review_count,
      }))
      const allQs = [...reviewQs, ...data.questions]
      setQuestions(allQs)
      setScores({})
      setConfidences({})
      setQTimes({})
      setCurrent(0)
      setResults(null)
      setPhase('quiz')
      if (mode === 'flashcards') {
        setFcDeck(allQs.map((_, i) => i))
        setFcFlipped(false)
      }
    } catch (err) {
      setError(err.message || 'Failed to generate quiz.')
    } finally {
      setLoading(false)
    }
  }

  function advance(grade) {
    const elapsed = qStart ? Math.round((Date.now() - qStart) / 1000) : 85
    const s = { ...scores,     [current]: grade }
    const c = { ...confidences, [current]: confidence }
    const t = { ...qTimes,     [current]: elapsed }
    setScores(s); setConfidences(c); setQTimes(t)
    if (current < questions.length - 1) setCurrent(i => i + 1)
    else finishQuiz(s, c, t)
  }

  function onMCSelect(letter) {
    if (revealed) return
    const q = questions[current]
    setSelectedOption(letter)
    setRevealed(true)
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
        body: JSON.stringify({
          action,
          question: q.question,
          answer:   q.answer,
          userAnswer: action === 'mini_lesson' ? userAnswer : undefined,
          subject, difficulty, mode,
        }),
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
      console.log('[Quiz] grade response status:', res.status)
      const data = await res.json()
      if (!res.ok) console.error('[Quiz] grade error:', data)
      setSaFeedback(data)
      setRevealed(true)
    } catch (err) {
      console.error('[Quiz] gradeShortAnswer error:', err)
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

    const weakTopics = questions
      .filter((_, i) => finalS[i] === 'missed' || (finalC[i] || 3) < 3)
      .map(q => q.source_hint || q.question?.slice(0, 60))
      .filter(Boolean)
      .slice(0, 5)

    const missedQs = questions.filter((_, i) => finalS[i] === 'missed')
    setResults({ correct, almost, missed, pct, xp, missedQs, focusScore, weakTopics })
    setPhase('results')

    if (!user) { toast(`Quiz done! ${pct}% · +${xp} XP`, 'success'); return }

    const today = new Date().toISOString().split('T')[0]

    // Update SM-2 for review questions
    for (const [idx, q] of questions.entries()) {
      if (!q.isReview) continue
      const grade = finalS[idx] || 'missed'
      const { interval, easeFactor, repetitions } = sm2Next(
        grade, q.repetitions || 0, q.ease_factor || 2.5, q.interval_days || 1
      )
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + interval)
      await supabase.from('spaced_repetition').update({
        interval_days: interval, ease_factor: easeFactor, repetitions,
        last_grade: grade, review_count: (q.review_count || 0) + 1,
        next_review_date: nextDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      }).eq('id', q.reviewId)
    }

    // Save missed / low-confidence questions for spaced repetition
    const inserts = []
    for (const [idx, q] of questions.entries()) {
      if (q.isReview) continue
      const grade = finalS[idx] || 'missed'
      const conf  = finalC[idx] || 3
      if (grade === 'missed' || conf < 3) {
        const interval = grade === 'missed' ? 1 : grade === 'almost' ? 3 : 7
        const nextDate = new Date()
        nextDate.setDate(nextDate.getDate() + interval)
        inserts.push({
          user_id: user.id, question: q.question, answer: q.answer,
          explanation: q.explanation || null, source_hint: q.source_hint || null,
          subject: subject || 'General', question_type: mode,
          interval_days: interval,
          next_review_date: nextDate.toISOString().split('T')[0],
          last_grade: grade,
        })
      }
    }
    if (inserts.length) await supabase.from('spaced_repetition').insert(inserts)

    // Streak bonus if user also focused today
    const { data: todayLog } = await supabase
      .from('daily_focus_log').select('id')
      .eq('user_id', user.id).eq('log_date', today).maybeSingle()
    const bonus = todayLog ? 50 : 0

    await supabase.from('quiz_results').insert({
      user_id: user.id, subject: subject || 'General',
      questions_total: n, questions_correct: correct,
      missed_questions: missedQs, score_percentage: pct, quiz_date: today,
      mode, tone, subject_type: subjectType, timed,
      time_taken_seconds: timeVals.reduce((a, b) => a + b, 0),
      focus_score: focusScore, weak_topics: weakTopics,
    })

    toast(
      bonus
        ? `Quiz done! ${pct}% · +${xp + bonus} XP (includes +${bonus} streak bonus!)`
        : `Quiz done! Score: ${pct}% · +${xp} XP`,
      'success'
    )
  }

  function restart() {
    setPhase('setup'); setQuestions([]); setScores({}); setResults(null)
    setFcDeck([]); setFcFlipped(false); setModelUsed(null); setOllamaFallback(false)
    if (user) loadDueReview()
  }

  function fcHandleGotIt() {
    const newDeck = fcDeck.slice(1)
    setFcDeck(newDeck)
    setFcFlipped(false)
    if (newDeck.length === 0) {
      const finalS = {}
      questions.forEach((_, i) => { finalS[i] = 'got' })
      finishQuiz(finalS, {}, {})
    }
  }

  function fcHandleReviewAgain() {
    setFcDeck(prev => [...prev.slice(1), prev[0]])
    setFcFlipped(false)
  }

  const activeQ    = harderQ || questions[current]
  const progress   = questions.length > 0 ? (current / questions.length) * 100 : 0
  const qType      = mode === 'mixed' ? (activeQ?.type || 'short_answer') : mode
  const isMC       = (qType === 'multiple_choice') && !activeQ?.isReview
  const isTF       = (qType === 'true_false') && mode === 'mixed' && !activeQ?.isReview
  const isFB       = (qType === 'fill_blank') && mode === 'mixed' && !activeQ?.isReview
  const isSA       = (qType === 'short_answer') && mode === 'mixed' && !activeQ?.isReview
  const isExplain  = (qType === 'explain') && mode === 'mixed' && !activeQ?.isReview

  // ── Difficulty badge colours ────────────────────────────
  function diffColor(d) {
    if (d === 'Basic')   return { bg: 'rgba(181,242,58,0.15)',  fg: 'var(--accent)' }
    if (d === 'Hard' || d === 'Exam Style') return { bg: 'rgba(242,90,90,0.15)', fg: 'var(--red)' }
    return { bg: 'rgba(242,199,90,0.15)', fg: 'var(--amber)' }
  }
  const dc = diffColor(difficulty)

  return (
    <div className="page-fade quiz-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, alignItems: 'start' }}>

      {/* ─── LEFT: Setup ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--accent)' }}>Active Recall Quiz</h1>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px' }}>
          {/* Source toggle */}
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 8 }}>Question Source</label>
            <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {[{ id: 'notes', label: 'My Notes' }, { id: 'bank', label: 'Question Bank' }, { id: 'video', label: 'Video' }].map((s, i) => (
                <button key={s.id} onClick={() => setSourceMode(s.id)} style={{
                  flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: sourceMode === s.id ? 'var(--accent)' : 'var(--card2)',
                  color: sourceMode === s.id ? '#0a0a0b' : 'var(--muted)',
                  border: 'none', borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                  transition: 'all 0.15s',
                }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {sourceMode === 'bank' ? (
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 8 }}>Subject</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['SAT Math','SAT Reading','SAT Writing','ACT English','ACT Math','ACT Science','ACT Reading'].map(s => (
                  <button key={s} className={`pill ${bankSubject === s ? 'active' : ''}`}
                    onClick={() => setBankSubject(s)} style={{ fontSize: 12 }}>{s}</button>
                ))}
              </div>
            </div>
          ) : sourceMode === 'video' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>YouTube URL</label>
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={e => {
                  setVideoUrl(e.target.value)
                  setShowLengthWarning(false)
                  if (videoNoTranscript) { setVideoNoTranscript(false); setManualTranscript(''); setVideoError('') }
                }}
                onKeyDown={e => { if (e.key === 'Enter' && videoUrl.trim() && !videoNoTranscript) summarizeVideo() }}
              />
            </div>

            {showLengthWarning && (
              <div style={{
                background: 'rgba(242,199,90,0.06)', border: '1px solid rgba(242,199,90,0.2)',
                borderRadius: 8, padding: '9px 13px', fontSize: 12, color: 'var(--amber)',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>This video is long — only the first ~45 minutes were summarized. For best results use videos under 45 minutes.</span>
              </div>
            )}

            {!videoNoTranscript ? (
              <>
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 6 }}>
                    Subject <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11, color: 'var(--muted)' }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AP Biology, SAT Math"
                    value={videoSubject}
                    onChange={e => setVideoSubject(e.target.value)}
                  />
                </div>
                {videoError && (
                  <div style={{ background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>
                    {videoError}
                  </div>
                )}
                <button
                  className="btn btn-accent btn-full btn-lg"
                  onClick={summarizeVideo}
                  disabled={videoLoading || !videoUrl.trim()}
                >
                  {videoLoading
                    ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Analyzing video...</>
                    : 'Summarize Video'}
                </button>
              </>
            ) : (
              <>
                <div style={{ background: 'rgba(242,199,90,0.06)', border: '1px solid rgba(242,199,90,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--amber)', marginBottom: 6 }}>Auto-transcript unavailable for this video. You can:</div>
                  {videoError}
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '0.08em' }}>OPTION 1 — Paste the transcript manually</div>
                  <textarea
                    value={manualTranscript}
                    onChange={e => setManualTranscript(e.target.value)}
                    placeholder="Paste the transcript text here..."
                    rows={5}
                    style={{ resize: 'none', lineHeight: 1.6, marginBottom: 8 }}
                  />
                  <button
                    className="btn btn-accent btn-full"
                    onClick={summarizeVideo}
                    disabled={videoLoading || !manualTranscript.trim()}
                  >
                    {videoLoading
                      ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Summarizing...</>
                      : 'Summarize from transcript'}
                  </button>
                </div>

                <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, letterSpacing: '0.08em' }}>OPTION 2 — Get transcript from YouTube</div>
                  {['Open the video on YouTube', 'Click "..." below the video', 'Click "Show transcript"', 'Copy all the text', 'Paste it above'].map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: i < 4 ? 8 : 0 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(181,242,58,0.1)', border: '1px solid rgba(181,242,58,0.2)',
                        fontSize: 10, fontWeight: 700, color: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{step}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '0.08em' }}>OPTION 3 — Use a different video</div>
                  <button
                    className="btn btn-ghost btn-full"
                    onClick={() => { setVideoNoTranscript(false); setVideoUrl(''); setManualTranscript(''); setVideoError(''); setVideoResult(null) }}
                  >
                    ← Try another video
                  </button>
                </div>
              </>
            )}
          </div>
          ) : (
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>Your Notes</label>
            <div
              style={{ position: 'relative' }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Paste your notes here... The more detail, the better the questions."
                style={{ resize: 'none', lineHeight: 1.6, minHeight: 120, borderColor: dragOver ? 'var(--accent)' : undefined }}
              />
              {notes && (
                <button onClick={() => setNotes('')} style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 6, cursor: 'pointer', color: 'var(--muted)',
                  padding: '4px 7px', display: 'flex', alignItems: 'center',
                }}><X size={12} /></button>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>drag a .txt file or paste text</div>
            <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.docx" onChange={handleFileInput} style={{ display: 'none' }} />
          </div>
          )}

          {sourceMode !== 'video' && (<>

          {/* Subject + count inline */}
          {sourceMode === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                type="text"
                placeholder="Subject (optional)"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={{ fontSize: 13 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Qs</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[5, 10, 15].map(n => (
                    <button key={n} className={`pill${count === n ? ' active' : ''}`}
                      onClick={() => setCount(n)} style={{ fontSize: 11, padding: '4px 8px' }}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sourceMode === 'bank' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Qs</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {[5, 10, 15].map(n => (
                  <button key={n} className={`pill${count === n ? ' active' : ''}`}
                    onClick={() => setCount(n)} style={{ fontSize: 11, padding: '4px 8px' }}>{n}</button>
                ))}
              </div>
            </div>
          )}

          {/* Mode + Difficulty 2-column grid */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {MODES.map(m => {
                  const short = m.key === 'multiple_choice' ? 'MC' : m.key === 'short_answer' ? 'SA' : m.key === 'fill_blank' ? 'Fill' : m.key === 'flashcards' ? 'Cards' : m.label
                  return (
                    <button key={m.key} className={`pill${mode === m.key ? ' active' : ''}`}
                      onClick={() => setMode(m.key)} style={{ fontSize: 11, padding: '4px 8px' }}>{short}</button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {DIFFICULTIES.map(d => {
                  const short = d === 'Standard' ? 'Med' : d === 'Exam Style' ? 'Exam' : d
                  return (
                    <button key={d} className={`pill${difficulty === d ? ' active' : ''}`}
                      onClick={() => setDifficulty(d)} style={{ fontSize: 11, padding: '4px 8px' }}>{short}</button>
                  )
                })}
              </div>
            </div>
          </div>

          {dueReview.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--cyan)', background: 'rgba(96,211,248,0.08)', border: '1px solid rgba(96,211,248,0.2)', borderRadius: 8, padding: '8px 12px' }}>
              <Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{dueReview.length} question{dueReview.length !== 1 ? 's' : ''} due for spaced review — will appear first.
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>
              {error}
              <button className="btn btn-ghost btn-sm" onClick={generateQuiz} style={{ marginTop: 8, display: 'block' }}>Retry</button>
            </div>
          )}

          {/* Timed toggle + Generate */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />Timed 85s per question
              </span>
              <button onClick={() => setTimed(v => !v)} style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 0,
                background: timed ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'background 0.2s',
              }}>
                <span style={{
                  position: 'absolute', top: 3, left: timed ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: timed ? '#0a0a0b' : 'var(--muted)', transition: 'left 0.2s',
                }} />
              </button>
            </div>
            <button
              className="btn btn-accent btn-full"
              style={{ height: 48, fontSize: 15, fontWeight: 800, letterSpacing: '0.04em' }}
              onClick={generateQuiz}
              disabled={loading || (sourceMode === 'notes' && !notes.trim())}
            >
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Generating...</>
                : 'GENERATE →'}
            </button>
          </div>

          {user && generationsToday !== null && (
            <div style={{
              textAlign: 'center', fontSize: 11,
              color: modelPref === 'ollama' ? 'var(--cyan)'
                : (modelPref === 'auto' && generationsToday >= 5) ? 'var(--amber)'
                : 'var(--muted)',
            }}>
              {modelPref === 'ollama'
                ? <><Bot size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Using Llama 3.1 (Free)</>
                : modelPref === 'claude'
                ? <><Sparkles size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{generationsToday}/5 Claude generations used today</>
                : generationsToday >= 5
                ? <><Bot size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Switched to Llama 3.1 (free)</>
                : <><Sparkles size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{generationsToday}/5 Claude generations used today</>}
            </div>
          )}

          </>)}
        </div>
      </div>

      {/* ─── RIGHT: Quiz / Results ───────────────────────── */}
      <div>

        {/* Video empty state */}
        {phase === 'setup' && sourceMode === 'video' && !videoResult && (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><PlayCircle size={48} color="var(--muted)" /></div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Summarize a YouTube Video</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
              Paste a YouTube URL and Claude will extract the transcript and generate study notes, key terms, and practice questions.
            </p>
          </div>
        )}

        {/* Video results */}
        {phase === 'setup' && sourceMode === 'video' && videoResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {videoId && (
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                    alt=""
                    style={{ width: 120, height: 68, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4, marginBottom: 6 }}>{videoResult.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{videoResult.duration_estimate}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--muted)', marginTop: 12 }}>{videoResult.summary}</p>
            </div>

            {videoResult.keyPoints?.length > 0 && (
              <div className="card">
                <div className="label" style={{ marginBottom: 12 }}>Key Points</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {videoResult.keyPoints.map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <Check size={13} color="var(--accent)" strokeWidth={2.5} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, lineHeight: 1.5 }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {videoResult.keyTerms?.length > 0 && (
              <div className="card">
                <div className="label" style={{ marginBottom: 4 }}>Key Terms</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>Click a card to reveal the definition</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {videoResult.keyTerms.map((kt, i) => (
                    <div
                      key={i}
                      onClick={() => setVideoFlipped(prev => {
                        const next = new Set(prev)
                        next.has(i) ? next.delete(i) : next.add(i)
                        return next
                      })}
                      style={{
                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                        background: videoFlipped.has(i) ? 'rgba(181,242,58,0.08)' : 'var(--card2)',
                        border: `1px solid ${videoFlipped.has(i) ? 'rgba(181,242,58,0.25)' : 'var(--border)'}`,
                        transition: 'all 0.2s', minHeight: 60,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                      }}
                    >
                      {videoFlipped.has(i) ? (
                        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{kt.definition}</div>
                      ) : (
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{kt.term}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {videoResult.studyNotes && (
              <div className="card">
                <div className="label" style={{ marginBottom: 12 }}>Study Notes</div>
                <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>
                  {videoResult.studyNotes}
                </div>
              </div>
            )}

            {videoResult.questions?.length > 0 && (
              <div className="card">
                <div className="label" style={{ marginBottom: 12 }}>Practice Questions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {videoResult.questions.map((q, i) => (
                    <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--card2)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: videoRevealed[i] ? 8 : 0 }}>{i + 1}. {q.question}</div>
                      {videoRevealed[i] ? (
                        <div style={{ fontSize: 13, color: 'var(--muted)', paddingTop: 8, borderTop: '1px solid var(--border)', lineHeight: 1.5 }}>{q.answer}</div>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ marginTop: 8, fontSize: 11 }}
                          onClick={() => setVideoRevealed(prev => ({ ...prev, [i]: true }))}
                        >
                          Show Answer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn btn-accent btn-full btn-lg"
              onClick={() => {
                if (videoResult.studyNotes) {
                  setNotes(videoResult.studyNotes)
                  setSourceMode('notes')
                }
              }}
            >
              Take Full Quiz on This Video →
            </button>
          </div>
        )}

        {/* Setup placeholder */}
        {phase === 'setup' && sourceMode !== 'video' && (
          dueReview.length > 0 ? (
            <div className="card">
              <div className="bebas" style={{ fontSize: 20, color: 'var(--cyan)', marginBottom: 14 }}>DUE FOR REVIEW TODAY</div>
              {dueReview.map((r, i) => (
                <div key={r.id} style={{ padding: '10px 0', borderBottom: i < dueReview.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{r.question}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Next: {r.next_review_date} · Interval: {r.interval_days}d · Reviews: {r.review_count}
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
                Generate a quiz above — these will appear first.
              </p>
            </div>
          ) : loading ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{
                fontSize: 64, color: 'var(--accent)',
                animation: 'spin-slow 3s linear infinite',
                display: 'inline-block', lineHeight: 1, marginBottom: 16,
                width: 64, textAlign: 'center', transformOrigin: 'center',
              }}>⟳</div>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>Generating your questions...</p>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', animation: 'float-brain 2s ease-in-out infinite' }}><Brain size={48} color="var(--accent)" /></div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Ready to test yourself?</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
                Paste your notes and hit Generate. Claude will create personalized active recall questions.
              </p>
            </div>
          )
        )}

        {/* ── Flashcard mode ───────────────────────────── */}
        {phase === 'quiz' && mode === 'flashcards' && questions.length > 0 && (() => {
          const totalCards = questions.length
          const uniqueRemaining = new Set(fcDeck).size
          const doneCount = totalCards - uniqueRemaining
          const q = fcDeck.length > 0 ? questions[fcDeck[0]] : null
          if (!q) return null
          return (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="label">Flashcards — {doneCount}/{totalCards} mastered</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fcDeck.length} remaining</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${(doneCount / totalCards) * 100}%` }} />
                </div>
              </div>

              <div
                onClick={() => setFcFlipped(f => !f)}
                style={{
                  cursor: 'pointer', minHeight: 220, borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '32px 24px', textAlign: 'center', userSelect: 'none',
                  transition: 'background 0.25s, border-color 0.25s',
                  background: fcFlipped ? 'rgba(181,242,58,0.06)' : 'var(--card2)',
                  border: `2px solid ${fcFlipped ? 'rgba(181,242,58,0.3)' : 'var(--border)'}`,
                  position: 'relative', flexDirection: 'column', gap: 12,
                }}
              >
                <div style={{ position: 'absolute', top: 12, fontSize: 11, color: 'var(--muted)' }}>
                  {fcFlipped ? '↩ tap to flip back' : 'tap to reveal answer'}
                </div>
                {fcFlipped ? (
                  <div style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--accent)', fontWeight: 600 }}>
                    {q.answer}
                  </div>
                ) : (
                  <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.5 }}>
                    {q.question}
                  </div>
                )}
              </div>

              {fcFlipped ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={fcHandleReviewAgain}
                    style={{
                      flex: 1, padding: '14px 0', fontSize: 14, fontWeight: 700,
                      background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.3)',
                      color: 'var(--red)', borderRadius: 10, cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  ><RotateCcw size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Review Again</button>
                  <button
                    onClick={fcHandleGotIt}
                    style={{
                      flex: 1, padding: '14px 0', fontSize: 14, fontWeight: 700,
                      background: 'rgba(181,242,58,0.1)', border: '1px solid rgba(181,242,58,0.3)',
                      color: 'var(--accent)', borderRadius: 10, cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  ><CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Got It</button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
                  Click the card to reveal the answer
                </div>
              )}

              <button className="btn btn-ghost btn-sm" onClick={restart} style={{ alignSelf: 'flex-start', fontSize: 12 }}>
                ← Back to Setup
              </button>
            </div>
          )
        })()}

        {/* ── Quiz card ─────────────────────────────────── */}
        {phase === 'quiz' && activeQ && mode !== 'flashcards' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', overflow: 'hidden' }}>

            {/* Subject watermark */}
            {(() => {
              const SubjectMark = SUBJECT_ICONS[subjectType] || Pencil
              return (
                <div style={{
                  position: 'absolute', bottom: -10, right: 10,
                  opacity: 0.04,
                  lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
                  zIndex: 0,
                }}><SubjectMark size={140} /></div>
              )
            })()}

            {/* Progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="label">Question {current + 1} of {questions.length}</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {timed && (
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
                      color: timeLeft < 15 ? 'var(--red)' : 'var(--muted)',
                    }}>{timeLeft}s</span>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{Math.round(progress)}%</span>
                </div>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {mode === 'mixed' ? (
                <>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: 'rgba(181,242,58,0.1)', color: 'var(--accent)', letterSpacing: '0.04em' }}>
                    MIXED
                  </span>
                  {TYPE_BADGES[qType] && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: TYPE_BADGES[qType].bg, color: TYPE_BADGES[qType].fg }}>
                      {TYPE_BADGES[qType].label}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: 'rgba(96,211,248,0.15)', color: 'var(--cyan)' }}>
                  {MODES.find(m => m.key === mode)?.label}
                </span>
              )}
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: dc.bg, color: dc.fg }}>
                {difficulty}
              </span>
              {activeQ.isReview && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: 'rgba(242,199,90,0.15)', color: 'var(--amber)' }}>
                  <Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />Spaced Review
                </span>
              )}
              {harderQ && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: 'rgba(242,90,90,0.15)', color: 'var(--red)' }}>
                  ↑ Harder
                </span>
              )}
            </div>

            {/* Question text + answer area — slides between questions */}
            <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${current}-${harderQ ? 'h' : 'n'}`}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            >
            <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.5, padding: '4px 0' }}>
              {activeQ.question}
            </div>

            {/* MC options — unrevealed */}
            {isMC && !revealed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(activeQ.options || []).map((opt, i) => {
                  const letter = opt.match(/^([A-D])/)?.[1]
                  return (
                    <motion.button
                      key={i}
                      onClick={() => letter && onMCSelect(letter)}
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 38, delay: i * 0.06 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        textAlign: 'left', padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                        background: 'var(--card2)', border: '1px solid var(--border)',
                        fontSize: 14, color: 'var(--text)', transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    >{opt}</motion.button>
                  )
                })}
              </div>
            )}

            {/* MC options — revealed */}
            {isMC && revealed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(activeQ.options || []).map((opt, i) => {
                  const letter    = opt.match(/^([A-D])/)?.[1]
                  const isCorrect = letter === activeQ.correct_option
                  const isWrong   = letter === selectedOption && !isCorrect
                  return (
                    <div key={i} style={{
                      padding: '12px 16px', borderRadius: 10, fontSize: 14,
                      background: isCorrect ? 'rgba(181,242,58,0.1)' : isWrong ? 'rgba(242,90,90,0.1)' : 'var(--card2)',
                      border: `1px solid ${isCorrect ? 'rgba(181,242,58,0.4)' : isWrong ? 'rgba(242,90,90,0.4)' : 'var(--border)'}`,
                      color: isCorrect ? 'var(--accent)' : isWrong ? 'var(--red)' : 'var(--muted)',
                    }}>
                      {opt} {isCorrect ? <Check size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} /> : isWrong ? <X size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} /> : ''}
                    </div>
                  )
                })}
              </div>
            )}

            {/* True/False — mixed mode only */}
            {isTF && !revealed && (
              <div style={{ display: 'flex', gap: 10 }}>
                {['True', 'False'].map(opt => (
                  <button key={opt} onClick={() => {
                    const correct = activeQ.correct === (opt === 'True')
                    setTfResult({ selected: opt, correct })
                    setRevealed(true)
                    setMcGrade(correct ? 'got' : 'missed')
                  }} style={{
                    flex: 1, padding: '16px 0', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    background: opt === 'True' ? 'rgba(181,242,58,0.08)' : 'rgba(242,90,90,0.08)',
                    border: `1px solid ${opt === 'True' ? 'rgba(181,242,58,0.25)' : 'rgba(242,90,90,0.25)'}`,
                    color: opt === 'True' ? 'var(--accent)' : 'var(--red)',
                  }}>{opt}</button>
                ))}
              </div>
            )}
            {isTF && revealed && tfResult && (
              <div style={{
                padding: 14, borderRadius: 10, fontSize: 14, textAlign: 'center', fontWeight: 600,
                background: tfResult.correct ? 'rgba(181,242,58,0.08)' : 'rgba(242,90,90,0.08)',
                border: `1px solid ${tfResult.correct ? 'rgba(181,242,58,0.3)' : 'rgba(242,90,90,0.3)'}`,
                color: tfResult.correct ? 'var(--accent)' : 'var(--red)',
              }}>
                {tfResult.correct ? <><Check size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Correct!</> : <><X size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Incorrect — answer is {activeQ.correct ? 'True' : 'False'}</>}
              </div>
            )}

            {/* Fill in Blank — mixed mode only */}
            {isFB && !revealed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text" value={fbInput} onChange={e => setFbInput(e.target.value)}
                  placeholder="Type the missing word or phrase..."
                  style={{ fontSize: 14 }}
                  onKeyDown={e => { if (e.key === 'Enter' && fbInput.trim()) {
                    const correct = fbInput.trim().toLowerCase() === activeQ.answer?.toLowerCase()
                    setFbResult({ correct })
                    setMcGrade(correct ? 'got' : 'missed')
                    setRevealed(true)
                  }}}
                />
                <button className="btn btn-ghost btn-full" onClick={() => {
                  if (!fbInput.trim()) return
                  const correct = fbInput.trim().toLowerCase() === activeQ.answer?.toLowerCase()
                  setFbResult({ correct })
                  setMcGrade(correct ? 'got' : 'missed')
                  setRevealed(true)
                }}>Check Answer</button>
              </div>
            )}
            {isFB && revealed && fbResult && (
              <div style={{
                padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: 'center',
                background: fbResult.correct ? 'rgba(181,242,58,0.08)' : 'rgba(242,90,90,0.08)',
                border: `1px solid ${fbResult.correct ? 'rgba(181,242,58,0.3)' : 'rgba(242,90,90,0.3)'}`,
                color: fbResult.correct ? 'var(--accent)' : 'var(--red)',
              }}>
                {fbResult.correct ? <><Check size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Correct — "{activeQ.answer}"</> : <><X size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />The answer was "{activeQ.answer}"</>}
              </div>
            )}

            {/* Short Answer — mixed mode: type + AI grade */}
            {isSA && !revealed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)}
                  placeholder="Write your answer..."
                  rows={3} style={{ resize: 'vertical', lineHeight: 1.6, fontSize: 14 }} />
                <button className="btn btn-accent btn-full" disabled={saGrading || !userAnswer.trim()} onClick={gradeShortAnswer}>
                  {saGrading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Grading...</> : 'Check My Answer'}
                </button>
              </div>
            )}
            {isSA && revealed && saFeedback && (
              <div style={{
                padding: 14, borderRadius: 10, fontSize: 13, lineHeight: 1.6,
                background: saFeedback.correct ? 'rgba(181,242,58,0.06)' : 'rgba(242,90,90,0.06)',
                border: `1px solid ${saFeedback.correct ? 'rgba(181,242,58,0.25)' : 'rgba(242,90,90,0.25)'}`,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: saFeedback.correct ? 'var(--accent)' : 'var(--red)' }}>
                  {saFeedback.correct ? <><Check size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Correct</> : <><X size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Needs work</>}{saFeedback.score !== undefined ? ` · ${saFeedback.score}/100` : ''}
                </div>
                <div style={{ color: 'var(--muted)' }}>{saFeedback.feedback}</div>
              </div>
            )}

            {/* Explain — mixed mode: show answer on demand, self-grade */}
            {isExplain && !revealed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)}
                  placeholder="Explain this in your own words..."
                  rows={4} style={{ resize: 'vertical', lineHeight: 1.6, fontSize: 14 }} />
                <button className="btn btn-ghost btn-full" onClick={() => setRevealed(true)}>
                  See Model Answer
                </button>
              </div>
            )}

            {/* Non-MC non-mixed: standard textarea + confidence */}
            {!isMC && !isTF && !isFB && !isSA && !isExplain && !revealed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)}
                  placeholder="Write your answer (optional — helps with self-grading)..."
                  rows={3} style={{ resize: 'vertical', lineHeight: 1.6, fontSize: 14 }} />
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 8 }}>
                    Confidence: <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{CONF_LABELS[confidence]}</span>
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} className={`pill ${confidence === n ? 'active' : ''}`}
                        onClick={() => setConfidence(n)} style={{ flex: 1, fontSize: 12 }}>{n}</button>
                    ))}
                  </div>
                </div>
                <button className="btn btn-ghost btn-full" style={{ padding: 14 }} onClick={() => setRevealed(true)}>
                  Show Answer
                </button>
              </div>
            )}

            {/* Answer + explanation (revealed) */}
            {revealed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'rgba(181,242,58,0.06)', border: '1px solid rgba(181,242,58,0.15)', borderRadius: 10, padding: 16, fontSize: 14, lineHeight: 1.7 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Answer</div>
                  {activeQ.answer}
                </div>

                {activeQ.explanation && (
                  <div style={{ background: 'rgba(96,211,248,0.06)', border: '1px solid rgba(96,211,248,0.15)', borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--cyan)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Why</div>
                    {activeQ.explanation}
                  </div>
                )}

                {activeQ.source_hint && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', padding: '0 2px' }}>
                    <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{activeQ.source_hint}
                  </div>
                )}

                {/* Grade or Next */}
                {(isMC || isTF || isFB) ? (
                  <button className="btn btn-accent btn-full" onClick={() => advance(mcGrade)}>
                    Next Question →
                  </button>
                ) : isSA ? (
                  <button className="btn btn-accent btn-full" onClick={() => advance(saFeedback?.correct ? 'got' : 'missed')}>
                    Next Question →
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" onClick={() => advance('got')}
                      style={{ flex: 1, background: 'rgba(181,242,58,0.15)', color: 'var(--accent)', border: '1px solid rgba(181,242,58,0.3)' }}>
                      <Check size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Got it
                    </button>
                    <button className="btn" onClick={() => advance('almost')}
                      style={{ flex: 1, background: 'rgba(242,199,90,0.12)', color: 'var(--amber)', border: '1px solid rgba(242,199,90,0.3)' }}>
                      ~ Almost
                    </button>
                    <button className="btn" onClick={() => advance('missed')}
                      style={{ flex: 1, background: 'rgba(242,90,90,0.12)', color: 'var(--red)', border: '1px solid rgba(242,90,90,0.3)' }}>
                      <X size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Missed
                    </button>
                  </div>
                )}

                {/* Follow-up actions */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
                    onClick={() => requestFollowup('harder')}
                    disabled={!!followupLoading || !!harderQ}>
                    {followupLoading === 'harder' ? '...' : '↑ Make Harder'}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
                    onClick={() => requestFollowup('mini_lesson')}
                    disabled={!!followupLoading || !!miniLesson}>
                    {followupLoading === 'mini_lesson' ? '...' : <><Lightbulb size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Teach Me</>}
                  </button>
                </div>

                {miniLesson && (
                  <div style={{ background: 'rgba(242,199,90,0.08)', border: '1px solid rgba(242,199,90,0.2)', borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.7 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mini Lesson</div>
                    {miniLesson}
                  </div>
                )}
              </div>
            )}
            </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* ── Results ───────────────────────────────────── */}
        {phase === 'results' && results && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="bebas" style={{ fontSize: 28, color: 'var(--accent)', margin: 0 }}>QUIZ RESULTS</h2>
              {modelUsed && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: modelUsed === 'claude' ? 'rgba(181,242,58,0.12)' : 'rgba(96,211,248,0.12)',
                  border: `1px solid ${modelUsed === 'claude' ? 'rgba(181,242,58,0.25)' : 'rgba(96,211,248,0.25)'}`,
                  color: modelUsed === 'claude' ? 'var(--accent)' : 'var(--cyan)',
                }}>
                  {modelUsed === 'claude' ? <><Sparkles size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Generated by Claude</> : <><Bot size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Generated by Llama 3.1</>}
                  {ollamaFallback && <span style={{ opacity: 0.7 }}> (Ollama offline)</span>}
                </div>
              )}
            </div>

            {modelUsed === 'ollama' && (
              <div style={{ fontSize: 11, color: 'var(--muted)', background: 'rgba(96,211,248,0.06)', border: '1px solid rgba(96,211,248,0.15)', borderRadius: 8, padding: '6px 12px', marginBottom: 16 }}>
                Generated by Llama 3.1 — verify important facts before your exam
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Score',       value: `${results.pct}%`,       color: results.pct >= 80 ? 'var(--accent)' : results.pct >= 60 ? 'var(--amber)' : 'var(--red)' },
                { label: 'Focus Score', value: `${results.focusScore}%`, color: 'var(--cyan)' },
                { label: 'XP Earned',  value: `+${results.xp}`,         color: 'var(--cyan)' },
                { label: 'Missed',     value: results.missed,            color: results.missed > 0 ? 'var(--red)' : 'var(--accent)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--card2)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div className="bebas" style={{ fontSize: 28, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Mixed mode type breakdown */}
            {mode === 'mixed' && (() => {
              const typeKeys = ['multiple_choice', 'short_answer', 'fill_blank', 'explain', 'true_false']
              const typeLabels = { multiple_choice: 'Multiple Choice', short_answer: 'Short Answer', fill_blank: 'Fill in Blank', explain: 'Explain', true_false: 'True / False' }
              const rows = typeKeys.map(t => {
                const idxs = questions.map((q, i) => q.type === t ? i : -1).filter(i => i >= 0)
                if (!idxs.length) return null
                const correct = idxs.filter(i => scores[i] === 'got').length
                const total   = idxs.length
                const [Icon, iconColor] = correct === total ? [CheckCircle, 'var(--accent)'] : correct >= total / 2 ? [Minus, 'var(--amber)'] : [XCircle, 'var(--red)']
                return { label: typeLabels[t], correct, total, Icon, iconColor, badge: TYPE_BADGES[t] }
              }).filter(Boolean)
              if (!rows.length) return null
              return (
                <div style={{ marginBottom: 20 }}>
                  <div className="label" style={{ marginBottom: 10 }}>Breakdown by Type</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {rows.map(r => (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--card2)' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: r.badge?.bg, color: r.badge?.fg }}>{r.badge?.label}</span>
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
              <div style={{ marginBottom: 20 }}>
                <div className="label" style={{ marginBottom: 10, color: 'var(--amber)' }}>Weak Topics</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {results.weakTopics.map((t, i) => (
                    <div key={i} style={{ background: 'rgba(242,199,90,0.06)', border: '1px solid rgba(242,199,90,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--muted)' }}>
                      <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />{t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.missedQs.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="label" style={{ marginBottom: 10 }}>Missed Questions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {results.missedQs.map((q, i) => (
                    <div key={i} style={{ background: 'rgba(242,90,90,0.06)', border: '1px solid rgba(242,90,90,0.15)', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{q.question}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{q.answer}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 10 }}><Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Saved for spaced repetition review.</p>
              </div>
            )}

            <button className="btn btn-accent btn-full" onClick={restart}>New Quiz</button>
          </div>
        )}
      </div>
    </div>
  )
}
