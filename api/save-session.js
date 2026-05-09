import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  }

  const { user_id, duration_minutes, session_date } = body || {}
  if (!user_id || !duration_minutes || duration_minutes < 1) {
    return res.status(400).json({ error: 'user_id and duration_minutes (≥1) required' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )

  try {
    await supabase.from('focus_sessions').insert({
      user_id,
      duration_minutes: Math.floor(duration_minutes),
      completed: false,
      completed_early: true,
      session_date: session_date || new Date().toISOString().split('T')[0],
      completed_at: new Date().toISOString(),
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
