import { verifyAuth, setSecurityHeaders, checkIPRateLimit } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  setSecurityHeaders(res)

  if (JSON.stringify(req.body || {}).length > 10_000)
    return res.status(413).json({ error: 'Request body too large.' })

  const ipOk = await checkIPRateLimit(req, res)
  if (!ipOk) return

  const auth = await verifyAuth(req, res)
  if (!auth) return

  const { user, supabase } = auth

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  }

  const { duration_minutes, session_date } = body || {}
  // Guard against NaN: typeof check + explicit isNaN, then range check
  if (typeof duration_minutes !== 'number' || isNaN(duration_minutes) || duration_minutes < 1) {
    return res.status(400).json({ error: 'duration_minutes (≥1) required' })
  }

  const safeDuration = Math.min(Math.floor(duration_minutes), 300)

  try {
    const { error: insertErr } = await supabase.from('focus_sessions').insert({
      user_id: user.id,
      duration_minutes: safeDuration,
      completed: false,
      completed_early: true,
      session_date: session_date || new Date().toISOString().split('T')[0],
      completed_at: new Date().toISOString(),
    })
    if (insertErr) return res.status(500).json({ error: insertErr.message })
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
