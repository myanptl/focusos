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
// OWASP LLM01: Prompt Injection (indirect, from third-party content)
// Sanitizer for content fetched from untrusted sources (YouTube transcripts,
// pasted-by-user transcript text, etc.) before it is interpolated into a
// Claude prompt. Strips role-style tags Claude or other models could
// interpret as control structures, and neutralises the closing form of our
// own delimiter tag so injected content cannot escape the wrapper.
//
// Always pair with `wrapUntrustedContent()` below so the model is told the
// delimited region is data, not instructions.
// ─────────────────────────────────────────────────────────
export function sanitizeUntrustedContent(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/\0/g, '')
    // Role / system tags many LLMs (including Claude) recognise.
    .replace(/<\/?\s*(system|assistant|user|human|inst|sys)\b[^>]*>/gi, '')
    // Our own delimiter — strip both open and close so content can't escape it.
    .replace(/<\/?\s*untrusted_[a-z_]+\s*>/gi, '')
    // Llama / Mistral chat-template tokens (covers what sanitizeInput already does
    // plus a few common variants).
    .replace(/\[\/?(INST|SYS)\]/gi, '')
    .replace(/<\|[^|>]{1,40}\|>/g, '')   // ChatML-style <|im_start|>, <|endoftext|>, etc.
    .replace(/<\/?s>/gi, '')
    .replace(/\s{10,}/g, ' ')
    .trim()
}

export function wrapUntrustedContent(tag, content) {
  const safe = sanitizeUntrustedContent(content)
  return `<${tag}>\n${safe}\n</${tag}>`
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

  try {
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
  } catch {
    // Rate-limit DB error — allow the request through rather than blocking all traffic
  }

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
// Decides Claude vs Ollama for this request. For 'auto' users this also
// atomically reserves one of the day's Claude slots via the
// claim_claude_call() Postgres RPC, so parallel requests cannot all pass the
// gate when generationsToday is below the cap (TOCTOU fix for audit #3).
//
// Trade-off: the slot is claimed BEFORE the Claude call, so a Claude failure
// still costs one slot for the day. Acceptable for a 5/day quota.
// ─────────────────────────────────────────────────────────
export async function getModelConfig(supabase, userId) {
  const today = new Date().toISOString().split('T')[0]
  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_model_preference, claude_generations_today')
    .eq('user_id', userId)
    .maybeSingle()

  const modelPref = profile?.ai_model_preference || 'auto'
  const currentCount = profile?.claude_generations_today || 0

  // Explicit overrides never touch the counter.
  if (modelPref === 'ollama') return { useOllama: true,  generationsToday: currentCount, modelPref, today }
  if (modelPref === 'claude') return { useOllama: false, generationsToday: currentCount, modelPref, today }

  // 'auto' — atomically claim a Claude slot for the day.
  const { data, error } = await supabase.rpc('claim_claude_call', {
    p_user_id: userId,
    p_limit:   5,
  })

  if (error) {
    // RPC unavailable -> fail-open to Claude, matching the existing rate-limit catch behavior.
    return { useOllama: false, generationsToday: currentCount, modelPref, today }
  }

  const row     = Array.isArray(data) ? data[0] : data
  const claimed = !!row?.claimed
  return {
    useOllama:        !claimed,
    generationsToday: row?.count_after ?? currentCount,
    modelPref,
    today,
  }
}

// No-op. The counter is now incremented atomically inside getModelConfig() via
// the claim_claude_call() RPC, so the post-call increment is no longer needed.
// Kept as an exported no-op so the four api/*.js call sites do not need edits.
export async function incrementClaudeCount() {
  // intentionally empty
}

async function _callClaude(prompt, apiKey, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      system: 'You are a JSON generation API. Always respond with valid JSON only. Never include explanations, markdown fences, apologies, or any plain text outside the JSON structure. If you cannot complete the request, still return a valid JSON error object like {"error":"reason"}.',
      messages: [{ role: 'user', content: prompt }],
    }),
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

  try {
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
  } catch {
    // Rate-limit DB error — allow the request through rather than blocking all traffic
  }

  return true
}
