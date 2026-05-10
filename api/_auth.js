import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────
// Per-user hourly request limits (OWASP A04: Insecure Design)
// ─────────────────────────────────────────────────────────
const USER_RATE_LIMITS = {
  'generate-quiz':   20,
  'quiz-followup':   30,
  'summarize-video': 10,
  'summarize-note':  15,
}

// Max requests per IP per hour across all endpoints combined.
const IP_RATE_LIMIT = 50

// ─────────────────────────────────────────────────────────
// OWASP A05: Security Misconfiguration
// Set hardened HTTP response headers on every API response to
// prevent MIME-sniffing, clickjacking, and reflected XSS.
// ─────────────────────────────────────────────────────────
export function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Content-Security-Policy', "default-src 'self'")
}

// ─────────────────────────────────────────────────────────
// OWASP A03: Injection
// Strip characters that could manipulate LLM prompts or
// corrupt stored data before user content reaches Claude.
// ─────────────────────────────────────────────────────────
export function sanitizeInput(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/\0/g, '')                                  // null bytes crash some parsers
    .replace(/\s{10,}/g, ' ')                           // collapse excessive whitespace
    .replace(/(\[INST\]|\[\/INST\]|<s>|<\/s>)/gi, '')  // strip open-source LLM control tokens
    .trim()
}

// ─────────────────────────────────────────────────────────
// OWASP A03: Injection / A08: Data Integrity
// Validate that required fields are present, types match,
// and string lengths are within safe bounds before any
// processing. Returns an error string or null if valid.
// ─────────────────────────────────────────────────────────
export function validateInput(body, schema) {
  for (const [key, rules] of Object.entries(schema)) {
    if (rules.required && (body[key] === undefined || body[key] === null || body[key] === '')) {
      return `Missing required field: ${key}`
    }
    if (body[key] !== undefined && body[key] !== null) {
      if (rules.type && typeof body[key] !== rules.type) {
        return `${key} must be type ${rules.type}`
      }
      if (rules.maxLength && typeof body[key] === 'string' && body[key].length > rules.maxLength) {
        return `${key} exceeds max length of ${rules.maxLength}`
      }
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────
// OWASP A03: Injection
// Whitelist approach — strip any field not in allowedKeys so
// unexpected properties never reach business logic or prompts.
// ─────────────────────────────────────────────────────────
export function stripFields(body, allowedKeys) {
  return Object.fromEntries(
    Object.entries(body).filter(([k]) => allowedKeys.includes(k))
  )
}

// ─────────────────────────────────────────────────────────
// Helper: extract the real client IP, accounting for proxies.
// Vercel sets x-forwarded-for; leftmost value is the origin.
// ─────────────────────────────────────────────────────────
function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown'
}

// ─────────────────────────────────────────────────────────
// OWASP A04: Insecure Design — IP-level throttle
// Runs BEFORE JWT auth so it catches unauthenticated abuse,
// credential stuffing, and burst attacks from a single source.
// Uses the same api_rate_limits table, namespaced with "ip:".
// Returns true if the request is allowed, false (+ 429) if not.
// ─────────────────────────────────────────────────────────
export async function checkIPRateLimit(req, res) {
  const ip = getIP(req)
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // Anon client — IP checks don't require a user session
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )

  const { data: limitData } = await supabase
    .from('api_rate_limits')
    .select('request_count, window_start')
    .eq('user_id', `ip:${ip}`)
    .eq('endpoint', 'ip-global')
    .maybeSingle()

  const inWindow = limitData && limitData.window_start > windowStart

  if (inWindow && limitData.request_count >= IP_RATE_LIMIT) {
    res.status(429).json({ error: 'Too many requests from this IP. Try again later.' })
    return false
  }

  await supabase
    .from('api_rate_limits')
    .upsert({
      user_id: `ip:${ip}`,
      endpoint: 'ip-global',
      request_count: inWindow ? limitData.request_count + 1 : 1,
      window_start: inWindow ? limitData.window_start : new Date().toISOString(),
    }, { onConflict: 'user_id,endpoint' })

  return true
}

// ─────────────────────────────────────────────────────────
// OWASP A07: Identification and Authentication Failures
// Verify the Bearer JWT against Supabase so only real,
// active sessions can reach Claude. Returns { user, supabase }
// on success, or sends 401 and returns null on failure.
// ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────
// Freemium AI model selection
// Reads the user's profile to decide Claude vs Ollama.
// Free users: 10 Claude calls/day then auto-switch to Ollama.
// Preference 'ollama' always uses Ollama regardless of count.
// ─────────────────────────────────────────────────────────
export async function getModelConfig(supabase, userId) {
  const today = new Date().toISOString().split('T')[0]
  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_model_preference, claude_generations_today, claude_generations_reset_date')
    .eq('user_id', userId)
    .maybeSingle()

  const modelPref = profile?.ai_model_preference || 'auto'
  const isReset = !profile?.claude_generations_reset_date || profile.claude_generations_reset_date !== today
  const generationsToday = isReset ? 0 : (profile?.claude_generations_today || 0)
  const useOllama =
    modelPref === 'ollama' ? true :
    modelPref === 'claude' ? false :
    generationsToday >= 5

  return { useOllama, generationsToday, modelPref, today }
}

export async function incrementClaudeCount(supabase, userId, generationsToday, today) {
  await supabase
    .from('profiles')
    .update({
      claude_generations_today: generationsToday + 1,
      claude_generations_reset_date: today,
    })
    .eq('user_id', userId)
}

async function _callClaude(prompt, apiKey, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Claude API error ${res.status}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// callAI — routes to Ollama or Claude based on model config.
// If Ollama is selected but unavailable, falls back to Claude
// and sets ollamaFailed=true so the frontend can show a warning.
export async function callAI(prompt, { useOllama, apiKey, maxTokens = 4000 }) {
  if (useOllama) {
    try {
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.1', prompt, stream: false }),
        signal: AbortSignal.timeout(60000),
      })
      if (!res.ok) throw new Error('Ollama error')
      const data = await res.json()
      return { raw: data.response || '', modelUsed: 'ollama', ollamaFailed: false }
    } catch {
      // Ollama not running — fall back to Claude silently
    }
    const raw = await _callClaude(prompt, apiKey, maxTokens)
    return { raw, modelUsed: 'claude', ollamaFailed: true }
  }
  const raw = await _callClaude(prompt, apiKey, maxTokens)
  return { raw, modelUsed: 'claude', ollamaFailed: false }
}

// ─────────────────────────────────────────────────────────
// OWASP A04: Insecure Design — per-user hourly quota
// Second rate-limit layer (after IP check) that tracks each
// authenticated user individually, preventing API cost abuse
// even from users on shared IPs (VPNs, NAT, etc.).
// ─────────────────────────────────────────────────────────
export async function checkRateLimit(supabase, userId, endpoint) {
  const maxRequests = USER_RATE_LIMITS[endpoint] ?? 20
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
