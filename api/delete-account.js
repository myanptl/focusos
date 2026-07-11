import { createClient } from '@supabase/supabase-js'
import { verifyAuth, setSecurityHeaders, checkIPRateLimit } from './_auth.js'

const TABLES = [
  'focus_sessions', 'daily_focus_log', 'quiz_results',
  'score_goals', 'notes', 'room_members', 'streaks',
]

export default async function handler(req, res) {
  setSecurityHeaders(res)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const allowed = await checkIPRateLimit(req, res)
  if (!allowed) return

  const auth = await verifyAuth(req, res)
  if (!auth) return

  const userId = auth.user.id

  // Use the user's own JWT for data deletion — RLS enforces ownership
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: req.headers.authorization } } }
  )

  await Promise.allSettled([
    ...TABLES.map(t => supabase.from(t).delete().eq('user_id', userId)),
    supabase.from('profiles').delete().eq('user_id', userId),
  ])

  // Delete the Supabase auth user (requires service role key)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) console.error('Auth user deletion failed:', error.message)
  }

  return res.status(200).json({ ok: true })
}
