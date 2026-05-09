import { createClient } from '@supabase/supabase-js'

const RATE_LIMITS = {
  'generate-quiz':  20,
  'quiz-followup':  30,
  'summarize-video': 10,
  'summarize-note': 15,
}

export async function verifyAuth(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  const token = authHeader.split(' ')[1]
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    res.status(401).json({ error: 'Invalid token' })
    return null
  }
  return { user, supabase }
}

export async function checkRateLimit(supabase, userId, endpoint) {
  const maxRequests = RATE_LIMITS[endpoint] ?? 20
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: limitData } = await supabase
    .from('api_rate_limits')
    .select('request_count, window_start')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .maybeSingle()

  const inWindow = limitData && limitData.window_start > windowStart

  if (inWindow && limitData.request_count >= maxRequests) {
    return false
  }

  await supabase
    .from('api_rate_limits')
    .upsert({
      user_id: userId,
      endpoint,
      request_count: inWindow ? limitData.request_count + 1 : 1,
      window_start: inWindow ? limitData.window_start : new Date().toISOString(),
    }, { onConflict: 'user_id,endpoint' })

  return true
}
