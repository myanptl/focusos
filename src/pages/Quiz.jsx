import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import SetupForm from '../components/quiz/SetupForm'
import VideoSummary from '../components/quiz/VideoSummary'
import QuestionView from '../components/quiz/QuestionView'
import Flashcards from '../components/quiz/Flashcards'
import Results from '../components/quiz/Results'

function sm2Next(grade, reps, ef, interval) {
  const q = grade === 'got' ? 5 : grade === 'almost' ? 3 : 0
  const newEF = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if (q < 3) return { interval: 1, easeFactor: newEF, repetitions: 0 }
  const newReps = reps + 1
  const newInterval = newReps === 1 ? 1 : newReps === 2 ? 6 : Math.round(interval * ef)
  return { interval: newInterval, easeFactor: newEF, repetitions: newReps }
}

export default function Quiz() {
  const { user, profile } = useAuth()
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

  useEffect(() => { if (user) loadDueReview() }, [user])

  useEffect(() => {
    if (!profile) return
    const today = new Date().toISOString().split('T')[0]
    const isReset = !profile.claude_generations_reset_date || profile.claude_generations_reset_date !== today
    setGenerationsToday(isReset ? 0 : (profile.claude_generations_today || 0))
    setModelPref(profile.ai_model_preference || 'auto')
  }, [profile])

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
      setError('PDF detected — paste your notes as text for best results. PDFs are not supported yet.')
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
      const res = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      })
      let data
      try {
        const text = await res.text()
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

    if (!user) { toast(`Quiz done · ${pct}% · +${xp} XP`, 'success'); return }

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
        ? `Quiz done · ${pct}% · +${xp + bonus} XP, including +${bonus} streak bonus`
        : `Quiz done · ${pct}% · +${xp} XP`,
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

  function onTFSelect(opt) {
    const correct = activeQ.correct === (opt === 'True')
    setTfResult({ selected: opt, correct })
    setRevealed(true)
    setMcGrade(correct ? 'got' : 'missed')
  }

  function onFBCheck() {
    if (!fbInput.trim()) return
    const correct = fbInput.trim().toLowerCase() === activeQ.answer?.toLowerCase()
    setFbResult({ correct })
    setMcGrade(correct ? 'got' : 'missed')
    setRevealed(true)
  }

  function onVideoUrlChange(value) {
    setVideoUrl(value)
    setShowLengthWarning(false)
    if (videoNoTranscript) { setVideoNoTranscript(false); setManualTranscript(''); setVideoError('') }
  }

  function resetVideo() {
    setVideoNoTranscript(false); setVideoUrl(''); setManualTranscript(''); setVideoError(''); setVideoResult(null)
  }

  function takeQuizOnVideo() {
    if (videoResult.studyNotes) {
      setNotes(videoResult.studyNotes)
      setSourceMode('notes')
    }
  }

  const setupProps = {
    user, sourceMode, setSourceMode, notes, setNotes, subject, setSubject, bankSubject, setBankSubject,
    count, setCount, mode, setMode, difficulty, setDifficulty, timed, setTimed,
    dragOver, setDragOver, onDrop: handleDrop, fileInputRef, onFileInput: handleFileInput,
    videoUrl, onVideoUrlChange, summarizeVideo, videoSubject, setVideoSubject, videoLoading, videoError,
    videoNoTranscript, manualTranscript, setManualTranscript, showLengthWarning, resetVideo,
    dueReview, error, loading, generateQuiz, generationsToday, modelPref,
  }

  const questionProps = {
    activeQ, current, total: questions.length, progress, timed, timeLeft, mode, qType, difficulty, harderQ,
    isMC, isTF, isFB, isSA, isExplain, revealed, setRevealed, selectedOption, onMCSelect,
    tfResult, onTFSelect, fbInput, setFbInput, fbResult, onFBCheck,
    userAnswer, setUserAnswer, saGrading, saFeedback, gradeShortAnswer, confidence, setConfidence,
    advance, mcGrade, requestFollowup, followupLoading, miniLesson, onExit: restart,
  }

  return (
    <div className="page-fade">
      {phase === 'setup' && (
        <>
          <header className="page-head">
            <h1 className="page-title">Quiz</h1>
            <p>Paste notes, pick a question bank, or drop in a video. What you miss comes back later.</p>
          </header>

          <SetupForm {...setupProps} />

          {sourceMode === 'video' && videoResult && (
            <VideoSummary
              videoResult={videoResult} videoId={videoId}
              videoFlipped={videoFlipped} setVideoFlipped={setVideoFlipped}
              videoRevealed={videoRevealed} setVideoRevealed={setVideoRevealed}
              onTakeQuiz={takeQuizOnVideo}
            />
          )}

        </>
      )}

      {phase === 'quiz' && mode === 'flashcards' && questions.length > 0 && (
        <Flashcards
          questions={questions} fcDeck={fcDeck} fcFlipped={fcFlipped} setFcFlipped={setFcFlipped}
          onGotIt={fcHandleGotIt} onReviewAgain={fcHandleReviewAgain} onExit={restart}
        />
      )}

      {phase === 'quiz' && activeQ && mode !== 'flashcards' && <QuestionView {...questionProps} />}

      {phase === 'results' && results && (
        <Results
          results={results} modelUsed={modelUsed} ollamaFallback={ollamaFallback}
          mode={mode} questions={questions} scores={scores} onRestart={restart}
        />
      )}
    </div>
  )
}
