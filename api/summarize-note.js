import { verifyAuth, checkRateLimit, setSecurityHeaders, sanitizeInput, validateInput, stripFields, checkIPRateLimit } from './_auth.js'

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
  const allowed = await checkRateLimit(supabase, user.id, 'summarize-note')
  if (!allowed) return res.status(429).json({ error: 'Rate limit exceeded. Max 15 note summaries per hour.' })

  // OWASP A03: Injection — whitelist only expected fields, drop everything else
  const body = stripFields(req.body || {}, ['text', 'subject'])

  // OWASP A03: Injection / A08: Data Integrity — validate types and length bounds
  const validErr = validateInput(body, {
    text:    { required: true, type: 'string', maxLength: 15000 },
    subject: { type: 'string', maxLength: 100 },
  })
  if (validErr) return res.status(400).json({ error: validErr })

  // OWASP A03: Injection — strip LLM control tokens from all user strings before they reach Claude
  const text    = sanitizeInput(body.text)
  const subject = sanitizeInput(body.subject)

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
