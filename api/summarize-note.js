import { verifyAuth, checkRateLimit } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await verifyAuth(req, res)
  if (!auth) return

  const { user, supabase } = auth
  const allowed = await checkRateLimit(supabase, user.id, 'summarize-note')
  if (!allowed) return res.status(429).json({ error: 'Rate limit exceeded. Max 15 note summaries per hour.' })

  const { text, subject } = req.body || {}
  if (!text?.trim()) return res.status(400).json({ error: 'Text is required.' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server.' })

  const prompt = `Analyze these study notes and extract the key information.
Subject: ${subject || 'General'}

Return ONLY valid JSON, no markdown fences, no prose:
{
  "summary": "2-3 sentence overview of the main ideas",
  "keyPoints": ["point 1", "point 2", "point 3"]
}
Include 4-8 keyPoints that capture the most important ideas.

Notes:
${text.slice(0, 6000)}`

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.json().catch(() => ({}))
      return res.status(502).json({ error: err?.error?.message || 'Claude API error' })
    }

    const data = await claudeRes.json()
    const raw = data.content?.[0]?.text || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return res.status(502).json({ error: 'Could not parse response. Try again.' })

    return res.status(200).json(JSON.parse(match[0]))
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Failed to summarize.' })
  }
}
