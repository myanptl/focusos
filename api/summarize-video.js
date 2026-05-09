import { YoutubeTranscript } from 'youtube-transcript'
import { verifyAuth, checkRateLimit } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await verifyAuth(req, res)
  if (!auth) return

  const { user, supabase } = auth
  const allowed = await checkRateLimit(supabase, user.id, 'summarize-video')
  if (!allowed) return res.status(429).json({ error: 'Rate limit exceeded. Max 10 video summaries per hour.' })

  const { url, subject, transcript: manualTranscript } = req.body || {}
  if (!url?.trim()) return res.status(400).json({ error: 'YouTube URL is required.' })

  const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1]
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL. Paste a full youtube.com or youtu.be link.' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server.' })

  let transcript = ''

  if (manualTranscript?.trim()) {
    transcript = manualTranscript.trim()
  } else {
    try {
      const segments = await YoutubeTranscript.fetchTranscript(videoId)
      transcript = segments.map(s => s.text).join(' ')
    } catch (_) {}
  }

  if (!transcript || transcript.length < 50) {
    return res.status(400).json({
      code: 'NO_TRANSCRIPT',
      error: "This video's captions couldn't be fetched automatically. This happens with some videos. Paste the transcript manually using the steps below:",
    })
  }

  if (transcript.length > 80000) {
    return res.status(400).json({ error: 'Video too long — try a video under 2 hours.' })
  }

  const prompt = `Summarize this YouTube video transcript into study notes.
Subject: ${subject || 'General'}

Return ONLY valid JSON, no markdown fences, no prose:
{
  "title": "video topic title",
  "duration_estimate": "X min read",
  "summary": "3-4 sentence overview",
  "keyPoints": ["point 1", "point 2"],
  "keyTerms": [{"term": "...", "definition": "..."}],
  "studyNotes": "key notes in plain text with headers and bullets using ## and -",
  "questions": [{"question": "...", "answer": "..."}]
}
Include 5-8 keyPoints, 5-10 keyTerms, and exactly 5 questions.

Transcript: ${transcript.slice(0, 12000)}`

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
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.json().catch(() => ({}))
      return res.status(502).json({ error: err?.error?.message || 'Claude API error' })
    }

    const claudeData = await claudeRes.json()
    const text = claudeData.content?.[0]?.text || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return res.status(502).json({ error: 'Could not parse response. Try again.' })

    return res.status(200).json(JSON.parse(match[0]))
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Failed to summarize video.' })
  }
}
