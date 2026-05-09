import { verifyAuth, checkRateLimit } from './_auth.js'

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

  const auth = await verifyAuth(req, res)
  if (!auth) return

  const { user, supabase } = auth
  const allowed = await checkRateLimit(supabase, user.id, 'quiz-followup')
  if (!allowed) return res.status(429).json({ error: 'Rate limit exceeded. Max 30 follow-up requests per hour.' })

  const { action, question, answer, userAnswer, subject, difficulty, mode } = req.body || {}

  if (!action || !question || !answer) return res.status(400).json({ error: 'action, question, and answer are required.' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' })

  const prompt = action === 'harder'
    ? buildHarderPrompt(question, answer, subject, difficulty, mode)
    : buildMiniLessonPrompt(question, answer, userAnswer, subject)

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}))
      return res.status(502).json({ error: err?.error?.message || `API error ${anthropicRes.status}` })
    }

    const data = await anthropicRes.json()
    const raw = data.content?.[0]?.text || ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(502).json({ error: 'Could not parse response.' })

    const parsed = JSON.parse(jsonMatch[0])
    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Request failed. Try again.' })
  }
}
