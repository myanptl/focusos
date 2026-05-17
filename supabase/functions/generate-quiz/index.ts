import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODEL = 'claude-sonnet-4-20250514'

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function callClaude(prompt: string, apiKey: string, maxTokens = 4000): Promise<string> {
  console.log('[generate-quiz] Calling Claude API, model:', MODEL, 'maxTokens:', maxTokens)
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: 'You are a JSON generation API. Always respond with valid JSON only. Never include explanations, markdown fences, apologies, or any plain text outside the JSON structure. If you cannot complete the request, still return a valid JSON error object like {"error":"reason"}.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    const msg = err?.error?.message || `Claude API error ${res.status}`
    console.error('[generate-quiz] Claude API error:', res.status, msg)
    throw new Error(msg)
  }
  const data = await res.json() as { content?: { text?: string }[] }
  const text = data.content?.[0]?.text || ''
  console.log('[generate-quiz] Claude response length:', text.length, 'starts with:', text.slice(0, 50))
  return text
}

function buildPrompt(notes: string, subject: string, subjectType: string, numQuestions: number, mode: string, difficulty: string, tone: string) {
  const modeInstructions: Record<string, string> = {
    multiple_choice: 'Multiple choice with exactly 4 options labeled A, B, C, D. One correct answer, three plausible distractors.',
    short_answer:    'Short answer requiring a 1–3 sentence response.',
    fill_blank:      'Fill-in-the-blank: replace one key term/phrase per sentence with [BLANK].',
    explain:         '"Explain in your own words" prompts asking the student to explain a concept or process.',
  }
  const difficultyInstructions: Record<string, string> = {
    Basic:        'Direct recall — test whether the student can remember facts and definitions verbatim.',
    Standard:     'Understanding and connections — test whether the student understands concepts and can link ideas.',
    Hard:         'Application and analysis — apply knowledge to new situations or analyze information.',
    'Exam Style': 'SAT/AP format — formal testing language, multi-step reasoning, exactly how questions appear on standardized tests.',
  }
  const toneInstructions: Record<string, string> = {
    Simple:       'Clear, straightforward language. Easy to understand.',
    'Exam-Style': 'Formal, academic language typical of standardized tests.',
    Tricky:       'Include common misconceptions as distractors. Test deep understanding, not surface recall.',
  }
  const subjectInstructions: Record<string, string> = {
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

function buildMixedPrompt(notes: string, subject: string, numQuestions: number) {
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

function buildQuestionBankPrompt(bankSubject: string, numQuestions: number, mode: string, difficulty: string) {
  const topics: Record<string, string> = {
    'SAT Math':    'SAT Mathematics — algebra, advanced math, problem-solving, data analysis',
    'SAT Reading': 'SAT Reading & Writing — information, ideas, craft, structure, expression of ideas',
    'SAT Writing': 'SAT Grammar & Writing — sentence structure, conventions, rhetoric, Standard English',
    'ACT English': 'ACT English — grammar, punctuation, sentence structure, rhetorical skills',
    'ACT Math':    'ACT Mathematics — pre-algebra, algebra, coordinate geometry, plane geometry, trigonometry',
    'ACT Science': 'ACT Science — data interpretation, research summaries, conflicting viewpoints',
    'ACT Reading': 'ACT Reading — prose fiction, social studies, humanities, natural sciences passages',
  }
  const diffMap: Record<string, string> = {
    Basic:        'easy, foundational recall',
    Standard:     'medium, typical test difficulty',
    Hard:         'challenging, upper range of difficulty',
    'Exam Style': 'official test format, realistic question stems and answer choices',
  }
  const modeMap: Record<string, string> = {
    multiple_choice: 'Multiple choice with exactly 4 options (A, B, C, D). One correct, three plausible distractors.',
    short_answer:    'Short answer requiring a 1-3 sentence response.',
    fill_blank:      'Fill-in-the-blank: replace one key term/phrase with [BLANK].',
    explain:         '"Explain in your own words" prompts about a concept or process.',
    mixed:           'Mix of types: multiple_choice (40%), short_answer (30%), fill_blank (20%), explain (10%). Vary the "type" field accordingly.',
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

function buildPlannerPrompt(testType: string, subject: string, testDate: string, hoursPerWeek: number, weakAreas: string, currentLevel: string) {
  const weeksLeft = testDate
    ? Math.max(1, Math.round((new Date(testDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)))
    : 8
  return `Create a personalized ${testType} study plan.

STUDENT PROFILE:
- Test: ${testType}${subject ? ` — ${subject}` : ''}
- Test Date: ${testDate || 'flexible'}
- Weeks to study: ${weeksLeft}
- Hours per week available: ${hoursPerWeek || 8}
- Current level: ${currentLevel || 'Beginner'}
- Weak areas: ${weakAreas || 'not specified'}

Generate a week-by-week study plan covering ${Math.min(weeksLeft, 8)} weeks.
For each week include 5 weekday tasks (Mon–Fri) with realistic durations.

Return ONLY valid JSON:
{
  "overview": "2-3 sentence personalized overview",
  "weeks": [{"weekNum":1,"theme":"Foundations","days":[{"day":"Monday","task":"...","duration":45},{"day":"Tuesday","task":"...","duration":45},{"day":"Wednesday","task":"...","duration":45},{"day":"Thursday","task":"...","duration":45},{"day":"Friday","task":"...","duration":45}],"weekendPractice":"...","quizTopic":"..."}],
  "finalWeek": {"focus":"...","tasks":["task 1","task 2","task 3"]},
  "dayBefore": {"tasks":["task 1","task 2","task 3","task 4"]},
  "resources": [{"name":"...","desc":"..."}]
}`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url = new URL(req.url)
  console.log('[generate-quiz] Request received:', req.method, url.pathname)

  // Diagnostic endpoint — verifies the secret is present without using it
  if (req.method === 'GET' && url.searchParams.get('action') === 'test-key') {
    const key = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
    return respond({
      key_present: key.length > 0,
      key_prefix: key.length > 8 ? key.slice(0, 8) + '...' : '(empty)',
    })
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    console.log('[generate-quiz] ANTHROPIC_API_KEY present:', !!apiKey)
    if (!apiKey) {
      console.error('[generate-quiz] FATAL: ANTHROPIC_API_KEY secret is not set in Supabase project settings.')
      return respond({ error: 'API key not configured on server.' }, 500)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    console.log('[generate-quiz] SUPABASE_URL present:', !!supabaseUrl, '| SERVICE_ROLE_KEY present:', !!supabaseServiceKey)

    // JWT auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[generate-quiz] Auth failed: no Bearer token in Authorization header')
      return respond({ error: 'Unauthorized' }, 401)
    }
    const token = authHeader.split(' ')[1]

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) {
      console.error('[generate-quiz] Auth failed:', authErr?.message || 'no user returned')
      return respond({ error: 'Invalid token' }, 401)
    }
    console.log('[generate-quiz] Authenticated user:', user.id)

    const svcClient = createClient(supabaseUrl, supabaseServiceKey)

    // Per-user hourly rate limit (20/hr)
    const windowStart = new Date(Date.now() - 3_600_000).toISOString()
    const { data: limitData } = await svcClient
      .from('api_rate_limits')
      .select('request_count, window_start')
      .eq('user_id', user.id)
      .eq('endpoint', 'generate-quiz')
      .maybeSingle()
    const inWindow = !!(limitData && limitData.window_start > windowStart)
    if (inWindow && limitData!.request_count >= 20)
      return respond({ error: 'Rate limit exceeded. Max 20 quiz generations per hour.' }, 429)
    await svcClient.from('api_rate_limits').upsert({
      user_id: user.id,
      endpoint: 'generate-quiz',
      request_count: inWindow ? limitData!.request_count + 1 : 1,
      window_start: inWindow ? limitData!.window_start : new Date().toISOString(),
    }, { onConflict: 'user_id,endpoint' })

    // Daily generation tracking
    const today = new Date().toISOString().split('T')[0]
    const { data: profile } = await svcClient
      .from('profiles')
      .select('ai_model_preference, claude_generations_today, claude_generations_reset_date')
      .eq('user_id', user.id)
      .maybeSingle() as { data: Record<string, unknown> | null }
    const modelPref = (profile?.ai_model_preference as string) || 'auto'
    const isReset = !profile?.claude_generations_reset_date || profile.claude_generations_reset_date !== today
    const generationsToday = isReset ? 0 : ((profile?.claude_generations_today as number) || 0)
    const dailyLimitReached = modelPref === 'auto' && generationsToday >= 5

    const body = await req.json() as Record<string, unknown>
    const {
      notes,
      subject = '',
      subjectType = 'Other',
      numQuestions = 10,
      mode = 'short_answer',
      difficulty = 'Standard',
      tone = 'Simple',
      source,
      bankSubject,
      testType,
      testDate,
      hoursPerWeek,
      weakAreas,
      currentLevel,
      question,
      userAnswer,
      correctAnswer,
    } = body as {
      notes?: string; subject?: string; subjectType?: string; numQuestions?: number
      mode?: string; difficulty?: string; tone?: string; source?: string
      bankSubject?: string; testType?: string; testDate?: string
      hoursPerWeek?: number; weakAreas?: string; currentLevel?: string
      question?: string; userAnswer?: string; correctAnswer?: string
    }

    async function incrementCount() {
      await svcClient.from('profiles').update({
        claude_generations_today: generationsToday + 1,
        claude_generations_reset_date: today,
      }).eq('user_id', user.id)
    }

    // ── Grade mode ──────────────────────────────────────────
    if (mode === 'grade') {
      if (!userAnswer || !correctAnswer || !question)
        return respond({ error: 'userAnswer, correctAnswer, and question are required.' }, 400)
      const raw = await callClaude(
        `Grade this student answer concisely.\nQuestion: ${question}\nCorrect answer: ${correctAnswer}\nStudent answer: ${userAnswer}\n\nReturn ONLY valid JSON: {"correct":boolean,"feedback":"1-2 sentence feedback","score":0-100}`,
        apiKey, 200,
      )
      const match = raw.match(/\{[\s\S]*\}/)
      return respond(match ? JSON.parse(match[0]) : { correct: false, feedback: 'Could not grade.', score: 0 })
    }

    // ── Planner mode ────────────────────────────────────────
    if (mode === 'planner') {
      if (!testType) return respond({ error: 'testType is required for study plan.' }, 400)
      const raw = await callClaude(buildPlannerPrompt(testType, subject!, testDate!, hoursPerWeek!, weakAreas!, currentLevel!), apiKey, 4000)
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return respond({ error: 'No plan generated. Please try again.' }, 502)
      await incrementCount()
      return respond({ plan: JSON.parse(match[0]), model_used: 'claude', ollama_fallback: false })
    }

    // ── Question Bank mode ──────────────────────────────────
    if (source === 'questionbank') {
      if (!bankSubject) return respond({ error: 'bankSubject is required.' }, 400)
      const raw = await callClaude(buildQuestionBankPrompt(bankSubject, numQuestions!, mode, difficulty!), apiKey, 4000)
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return respond({ error: 'No questions generated. Try again.' }, 502)
      const parsed = JSON.parse(match[0])
      if (!parsed.questions?.length) return respond({ error: 'No questions generated.' }, 502)
      await incrementCount()
      return respond({ questions: parsed.questions, model_used: 'claude', ollama_fallback: false, daily_limit_reached: dailyLimitReached })
    }

    // ── Notes mode ──────────────────────────────────────────
    if (!notes?.trim()) return respond({ error: 'Notes are required.' }, 400)
    const prompt = mode === 'mixed'
      ? buildMixedPrompt(notes, subject!, numQuestions!)
      : buildPrompt(notes, subject!, subjectType!, numQuestions!, mode, difficulty!, tone!)
    const raw = await callClaude(prompt, apiKey, 4000)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return respond({ error: 'No valid JSON returned. Try rephrasing your notes.' }, 502)
    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.questions?.length) return respond({ error: 'No questions generated. Try more detailed notes.' }, 502)
    await incrementCount()
    return respond({ questions: parsed.questions, model_used: 'claude', ollama_fallback: false, daily_limit_reached: dailyLimitReached })

  } catch (err: unknown) {
    const msg = (err as Error).message || 'Failed to generate quiz.'
    console.error('[generate-quiz] Unhandled error:', msg, err)
    return respond({ error: msg }, 502)
  }
})
