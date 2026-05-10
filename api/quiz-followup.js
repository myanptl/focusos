import { verifyAuth, checkRateLimit, setSecurityHeaders, sanitizeInput, validateInput, stripFields, checkIPRateLimit, getModelConfig, incrementClaudeCount, callAI } from './_auth.js'

function buildHarderPrompt(question, answer, subject, currentDifficulty, mode) {
  const nextLevel = { Basic: 'Standard', Standard: 'Hard', Hard: 'Exam Style', 'Exam Style': 'Exam Style' }
  const harder = nextLevel[currentDifficulty] || 'Hard'
  return `Rewrite this ${mode?.replace('_', ' ') || 'study'} question at a HARDER difficulty level (${harder}).

Original question: ${question}
Original answer: ${answer}
Subject: ${subject || 'General'}

Make it harder by:
- Requiring deeper analysis or application rather than recall
- Adding nuance or a multi-step reasoning requirement
- Using more precise or technical language if appropriate

Return ONLY valid JSON (no markdown): {"question":{"type":"${mode || 'short_answer'}","question":"...","answer":"...","explanation":"...","source_hint":"Harder version of the original"}}`
}

function buildMiniLessonPrompt(question, correctAnswer, userAnswer, subject) {
  return `A student got this question wrong. Create a short, encouraging mini-lesson to help them understand.

Question: ${question}
Correct answer: ${correctAnswer}
Student's answer: ${userAnswer || '(no answer given)'}
Subject: ${subject || 'General'}

Write a 3–5 sentence mini-lesson that:
1. Acknowledges what they might have been thinking
2. Clearly explains the correct concept
3. Gives a memorable tip or analogy to remember it

Return ONLY valid JSON (no markdown): {"lesson":"..."}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // OWASP A05: Security Misconfiguration — set hardened headers on every response
  setSecurityHeaders(res)

  // OWASP A04: Insecure Design — reject bodies over 100 KB before any processing
  if (JSON.stringify(req.body || {}).length > 100_000)
    return res.status(413).json({ error: 'Request body too large.' })

  // OWASP A04: Insecure Design — IP-level throttle before JWT auth to catch unauthenticated abuse
  const ipOk = await checkIPRateLimit(req, res)
  if (!ipOk) return

  // OWASP A07: Identification and Authentication Failures — verify Bearer JWT
  const auth = await verifyAuth(req, res)
  if (!auth) return

  const { user, supabase } = auth

  // OWASP A04: Insecure Design — per-user hourly quota after IP check
  const allowed = await checkRateLimit(supabase, user.id, 'quiz-followup')
  if (!allowed) return res.status(429).json({ error: 'Rate limit exceeded. Max 30 follow-up requests per hour.' })

  const { useOllama, generationsToday, today } = await getModelConfig(supabase, user.id)

  // OWASP A03: Injection — whitelist only expected fields, drop everything else
  const body = stripFields(req.body || {}, ['action', 'question', 'answer', 'userAnswer', 'subject', 'difficulty', 'mode'])

  // OWASP A03: Injection / A08: Data Integrity — validate types and length bounds
  const validErr = validateInput(body, {
    action:   { required: true, type: 'string', maxLength: 20 },
    question: { required: true, type: 'string', maxLength: 1000 },
    answer:   { type: 'string', maxLength: 2000 },
    mode:     { type: 'string', maxLength: 20 },
  })
  if (validErr) return res.status(400).json({ error: validErr })

  // OWASP A03: Injection — strip LLM control tokens from all user strings before they reach Claude
  const action    = sanitizeInput(body.action)
  const question  = sanitizeInput(body.question)
  const answer    = sanitizeInput(body.answer)
  const userAnswer = sanitizeInput(body.userAnswer)
  const subject   = sanitizeInput(body.subject)
  const { difficulty, mode } = body

  if (!action || !question || !answer) return res.status(400).json({ error: 'action, question, and answer are required.' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' })

  const prompt = action === 'harder'
    ? buildHarderPrompt(question, answer, subject, difficulty, mode)
    : buildMiniLessonPrompt(question, answer, userAnswer, subject)

  try {
    const { raw, modelUsed, ollamaFailed } = await callAI(prompt, { useOllama, apiKey, maxTokens: 800 })
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(502).json({ error: 'Could not parse response.' })
    const parsed = JSON.parse(jsonMatch[0])
    if (modelUsed === 'claude') await incrementClaudeCount(supabase, user.id, generationsToday, today)
    return res.status(200).json({ ...parsed, model_used: modelUsed, ollama_fallback: ollamaFailed })
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Request failed. Try again.' })
  }
}
