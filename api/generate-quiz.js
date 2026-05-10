import { verifyAuth, checkRateLimit, setSecurityHeaders, sanitizeInput, validateInput, stripFields, checkIPRateLimit } from './_auth.js'

function buildMixedPrompt(notes, subject, numQuestions) {
  return `Generate ${numQuestions} active recall questions in MIXED format from these notes.
Subject: ${subject || 'General'}.
Distribute question types randomly: multiple_choice (30%), short_answer (25%), fill_blank (20%), explain (15%), true_false (10%).

For multiple_choice: include options array of 4 strings labeled "A) ...", "B) ...", etc., correct_option letter (A/B/C/D).
For fill_blank: include [BLANK] verbatim in the question string, answer is the word/phrase that fills it.
For true_false: include options ["True","False"] and correct boolean field.
For short_answer and explain: just question and answer strings.
All types: include explanation (2-3 sentences why correct) and source_hint (which part of notes).

NOTES:
${notes}

Return ONLY valid JSON, no markdown, no prose:
{"questions":[{"id":1,"type":"multiple_choice|short_answer|fill_blank|explain|true_false","question":"...","answer":"...","options":[],"correct_option":"A","correct":true,"explanation":"...","source_hint":"...","difficulty":"Standard"}]}`
}

async function gradeAnswer(question, correctAnswer, userAnswer, apiKey) {
  const prompt = `Grade this student answer concisely.
Question: ${question}
Correct answer: ${correctAnswer}
Student answer: ${userAnswer}

Return ONLY valid JSON: {"correct":boolean,"feedback":"1-2 sentence feedback","score":0-100}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  const raw = data.content?.[0]?.text || ''
  const match = raw.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : { correct: false, feedback: 'Could not grade.', score: 0 }
}

function buildPrompt(notes, subject, subjectType, numQuestions, mode, difficulty, tone) {
  const modeInstructions = {
    multiple_choice: 'Multiple choice with exactly 4 options labeled A, B, C, D. One correct answer, three plausible distractors.',
    short_answer:    'Short answer requiring a 1–3 sentence response.',
    fill_blank:      'Fill-in-the-blank: replace one key term/phrase per sentence with [BLANK].',
    explain:         '"Explain in your own words" prompts asking the student to explain a concept or process.',
  }
  const difficultyInstructions = {
    Basic:        'Direct recall — test whether the student can remember facts and definitions verbatim.',
    Standard:     'Understanding and connections — test whether the student understands concepts and can link ideas.',
    Hard:         'Application and analysis — apply knowledge to new situations or analyze information.',
    'Exam Style': 'SAT/AP format — formal testing language, multi-step reasoning, exactly how questions appear on standardized tests.',
  }
  const toneInstructions = {
    Simple:       'Clear, straightforward language. Easy to understand.',
    'Exam-Style': 'Formal, academic language typical of standardized tests.',
    Tricky:       'Include common misconceptions as distractors. Test deep understanding, not surface recall.',
  }
  const subjectInstructions = {
    Biology: 'Use precise biological terminology. Focus on processes, structures, mechanisms.',
    History: 'Focus on cause-and-effect, significance, chronology, and historical analysis.',
    English: 'Test comprehension, literary devices, analysis, and writing mechanics.',
    Math:    'Include step-by-step reasoning. Show what formula or approach is needed.',
    Vocab:   'Test definitions, usage in context, synonyms, and word roots.',
    Other:   'Generate well-rounded questions appropriate for the content.',
  }

  const jsonSchema = mode === 'multiple_choice'
    ? `{"questions":[{"id":1,"type":"multiple_choice","question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A) ...","correct_option":"A","explanation":"Why A is correct...","source_hint":"From the section on..."}]}`
    : mode === 'fill_blank'
    ? `{"questions":[{"id":1,"type":"fill_blank","question":"The [BLANK] is responsible for ATP production.","answer":"mitochondria","explanation":"Why this term fills the blank...","source_hint":"From the section on..."}]}`
    : `{"questions":[{"id":1,"type":"${mode}","question":"...","answer":"...","explanation":"Why this answer is correct...","source_hint":"From the section on..."}]}`

  return `Generate exactly ${numQuestions} questions from these study notes.

SUBJECT: ${subject || subjectType || 'General'}
MODE: ${modeInstructions[mode] || modeInstructions.short_answer}
DIFFICULTY: ${difficultyInstructions[difficulty] || difficultyInstructions.Standard}
TONE: ${toneInstructions[tone] || toneInstructions.Simple}
SUBJECT GUIDANCE: ${subjectInstructions[subjectType] || subjectInstructions.Other}

NOTES:
${notes}

Rules:
- "explanation" must explain WHY the answer is correct (2–3 sentences, not just a restatement).
- "source_hint" briefly points to which part of the notes this came from.
- For fill_blank: the [BLANK] must appear verbatim in the question string.
- For multiple_choice: correct_option must be the single letter (A/B/C/D) matching the correct option.
- Return ONLY valid JSON, no markdown fences, no prose before or after.

JSON format: ${jsonSchema}`
}

function buildQuestionBankPrompt(bankSubject, numQuestions, mode, difficulty) {
  const topics = {
    'SAT Math':    'SAT Mathematics — algebra, advanced math, problem-solving, data analysis',
    'SAT Reading': 'SAT Reading & Writing — information, ideas, craft, structure, expression of ideas',
    'SAT Writing': 'SAT Grammar & Writing — sentence structure, conventions, rhetoric, Standard English',
    'ACT English': 'ACT English — grammar, punctuation, sentence structure, rhetorical skills',
    'ACT Math':    'ACT Mathematics — pre-algebra, algebra, coordinate geometry, plane geometry, trigonometry',
    'ACT Science': 'ACT Science — data interpretation, research summaries, conflicting viewpoints',
    'ACT Reading': 'ACT Reading — prose fiction, social studies, humanities, natural sciences passages',
  }
  const diffMap = {
    Basic: 'easy, foundational recall',
    Standard: 'medium, typical test difficulty',
    Hard: 'challenging, upper range of difficulty',
    'Exam Style': 'official test format, realistic question stems and answer choices',
  }
  const modeMap = {
    multiple_choice: 'Multiple choice with exactly 4 options (A, B, C, D). One correct, three plausible distractors.',
    short_answer: 'Short answer requiring a 1-3 sentence response.',
    fill_blank: 'Fill-in-the-blank: replace one key term/phrase with [BLANK].',
    explain: '"Explain in your own words" prompts about a concept or process.',
    mixed: 'Mix of types: multiple_choice (40%), short_answer (30%), fill_blank (20%), explain (10%). Vary the "type" field accordingly.',
  }
  const schema = mode === 'multiple_choice'
    ? `{"questions":[{"id":1,"type":"multiple_choice","question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A) ...","correct_option":"A","explanation":"...","source_hint":"${bankSubject}"}]}`
    : mode === 'fill_blank'
    ? `{"questions":[{"id":1,"type":"fill_blank","question":"The [BLANK] equals...","answer":"...","explanation":"...","source_hint":"${bankSubject}"}]}`
    : `{"questions":[{"id":1,"type":"${mode === 'mixed' ? 'short_answer' : mode}","question":"...","answer":"...","explanation":"...","source_hint":"${bankSubject}"}]}`

  return `Generate exactly ${numQuestions} practice questions for ${bankSubject}.

TOPIC: ${topics[bankSubject] || bankSubject}
FORMAT: ${modeMap[mode] || modeMap.short_answer}
DIFFICULTY: ${diffMap[difficulty] || diffMap.Standard}

Rules:
- All questions must be realistic, high-quality ${bankSubject} practice questions
- "explanation" must explain WHY the answer is correct (2-3 sentences)
- "source_hint" names the sub-topic (e.g. "Quadratic equations", "Main idea inference")
- Return ONLY valid JSON, no markdown, no prose

JSON format: ${schema}`
}

function buildPlannerPrompt(testType, subject, testDate, hoursPerWeek, weakAreas, currentLevel) {
  const weeksLeft = testDate
    ? Math.max(1, Math.round((new Date(testDate) - new Date()) / (7 * 24 * 60 * 60 * 1000)))
    : 8
  const hrs = hoursPerWeek || 8
  const weak = weakAreas || 'not specified'

  return `Create a personalized ${testType} study plan.

STUDENT PROFILE:
- Test: ${testType}${subject ? ` — ${subject}` : ''}
- Test Date: ${testDate || 'flexible'}
- Weeks to study: ${weeksLeft}
- Hours per week available: ${hrs}
- Current level: ${currentLevel || 'Beginner'}
- Weak areas: ${weak}

Generate a week-by-week study plan covering ${Math.min(weeksLeft, 8)} weeks.
For each week include 5 weekday tasks (Mon–Fri) with realistic durations that fit ${hrs} hours/week total.
Tailor tasks toward the student's weak areas and test type.

Return ONLY valid JSON:
{
  "overview": "2-3 sentence personalized overview mentioning their weak areas and timeline",
  "weeks": [
    {
      "weekNum": 1,
      "theme": "Foundations",
      "days": [
        {"day": "Monday", "task": "...", "duration": 45},
        {"day": "Tuesday", "task": "...", "duration": 45},
        {"day": "Wednesday", "task": "...", "duration": 45},
        {"day": "Thursday", "task": "...", "duration": 45},
        {"day": "Friday", "task": "...", "duration": 45}
      ],
      "weekendPractice": "Take a timed practice section on [specific topic]",
      "quizTopic": "topic for quiz generation, e.g. 'SAT Math: Linear equations'"
    }
  ],
  "finalWeek": {
    "focus": "one sentence about final week strategy",
    "tasks": ["task 1", "task 2", "task 3"]
  },
  "dayBefore": {
    "tasks": ["task 1", "task 2", "task 3", "task 4"]
  },
  "resources": [
    {"name": "Resource name", "desc": "1 sentence description"}
  ]
}`
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
  const allowed = await checkRateLimit(supabase, user.id, 'generate-quiz')
  if (!allowed) return res.status(429).json({ error: 'Rate limit exceeded. Max 20 quiz generations per hour.' })

  // OWASP A03: Injection — whitelist only expected fields, drop everything else
  const ALLOWED_FIELDS = ['notes', 'subject', 'subjectType', 'numQuestions', 'mode', 'difficulty', 'tone',
    'userAnswer', 'correctAnswer', 'question', 'source', 'bankSubject',
    'testType', 'testDate', 'hoursPerWeek', 'weakAreas', 'currentLevel']
  const body = stripFields(req.body || {}, ALLOWED_FIELDS)

  // OWASP A03: Injection / A08: Data Integrity — validate types and length bounds
  const validErr = validateInput(body, {
    notes:        { type: 'string', maxLength: 20000 },
    subject:      { type: 'string', maxLength: 100 },
    numQuestions: { type: 'number' },
    difficulty:   { type: 'string', maxLength: 20 },
    mode:         { type: 'string', maxLength: 20 },
  })
  if (validErr) return res.status(400).json({ error: validErr })

  const {
    subjectType = 'Other', numQuestions = 10,
    mode = 'short_answer', difficulty = 'Standard', tone = 'Simple',
    source, testDate, hoursPerWeek, currentLevel,
  } = body

  // OWASP A03: Injection — strip LLM control tokens from all user strings before they reach Claude
  const notes         = sanitizeInput(body.notes)
  const subject       = sanitizeInput(body.subject)
  const question      = sanitizeInput(body.question)
  const userAnswer    = sanitizeInput(body.userAnswer)
  const correctAnswer = sanitizeInput(body.correctAnswer)
  const weakAreas     = sanitizeInput(body.weakAreas)
  const bankSubject   = sanitizeInput(body.bankSubject)
  const testType      = sanitizeInput(body.testType)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server.' })

  // ── Grading mode ──────────────────────────────────────────
  if (mode === 'grade') {
    if (!userAnswer || !correctAnswer || !question)
      return res.status(400).json({ error: 'userAnswer, correctAnswer, and question are required.' })
    try {
      const result = await gradeAnswer(question, correctAnswer, userAnswer, apiKey)
      return res.status(200).json(result)
    } catch (err) {
      return res.status(502).json({ error: err.message || 'Grading failed.' })
    }
  }

  // ── Planner mode ──────────────────────────────────────────
  if (mode === 'planner') {
    if (!testType) return res.status(400).json({ error: 'testType is required for study plan.' })
    try {
      const prompt = buildPlannerPrompt(testType, subject, testDate, hoursPerWeek, weakAreas, currentLevel)
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
      })
      if (!anthropicRes.ok) {
        const err = await anthropicRes.json().catch(() => ({}))
        return res.status(502).json({ error: err?.error?.message || 'Anthropic API error' })
      }
      const data = await anthropicRes.json()
      const raw = data.content?.[0]?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return res.status(502).json({ error: 'No plan generated. Please try again.' })
      return res.status(200).json({ plan: JSON.parse(match[0]) })
    } catch (err) {
      return res.status(502).json({ error: err.message || 'Failed to generate study plan.' })
    }
  }

  // ── Question Bank mode ────────────────────────────────────
  if (source === 'questionbank') {
    if (!bankSubject) return res.status(400).json({ error: 'bankSubject is required.' })
    try {
      const prompt = buildQuestionBankPrompt(bankSubject, numQuestions, mode, difficulty)
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
      })
      if (!anthropicRes.ok) {
        const err = await anthropicRes.json().catch(() => ({}))
        return res.status(502).json({ error: err?.error?.message || 'Anthropic API error' })
      }
      const data = await anthropicRes.json()
      const raw = data.content?.[0]?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return res.status(502).json({ error: 'No questions generated. Try again.' })
      const parsed = JSON.parse(match[0])
      if (!parsed.questions?.length) return res.status(502).json({ error: 'No questions generated.' })
      return res.status(200).json({ questions: parsed.questions })
    } catch (err) {
      return res.status(502).json({ error: err.message || 'Failed to generate questions.' })
    }
  }

  if (!notes?.trim()) return res.status(400).json({ error: 'Notes are required.' })

  try {
    const prompt = mode === 'mixed'
      ? buildMixedPrompt(notes, subject, numQuestions)
      : buildPrompt(notes, subject, subjectType, numQuestions, mode, difficulty, tone)

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}))
      return res.status(502).json({ error: err?.error?.message || `Anthropic API error ${anthropicRes.status}` })
    }

    const data = await anthropicRes.json()
    const raw = data.content?.[0]?.text || ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(502).json({ error: 'No valid JSON returned. Try rephrasing your notes.' })

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.questions?.length) return res.status(502).json({ error: 'No questions generated. Try more detailed notes.' })

    return res.status(200).json({ questions: parsed.questions })
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Failed to generate quiz. Try again.' })
  }
}
