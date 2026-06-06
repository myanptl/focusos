import { Resend } from 'resend'
import { checkIPRateLimit, setSecurityHeaders, validateInput, sanitizeInput, stripFields } from './_auth.js'

const CONTACT_SCHEMA = {
  name:    { required: true,  type: 'string', maxLength: 100 },
  email:   { required: true,  type: 'string', maxLength: 254 },
  message: { required: true,  type: 'string', maxLength: 2000 },
}

// HTML-escape any user-supplied value before it goes into the email template.
// Prevents an attacker from injecting clickable phishing links or fake "From"
// rows into the email the developer reads (audit #6).
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]))
}

export default async function handler(req, res) {
  setSecurityHeaders(res)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const allowed = await checkIPRateLimit(req, res)
  if (!allowed) return

  const raw = stripFields(req.body || {}, ['name', 'email', 'message'])
  const err = validateInput(raw, CONTACT_SCHEMA)
  if (err) return res.status(400).json({ error: err })

  const name    = sanitizeInput(raw.name)
  const email   = sanitizeInput(raw.email)
  const message = sanitizeInput(raw.message)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { error: sendError } = await resend.emails.send({
      from: 'FocusOS Support <support@focusos.live>',
      to:   'myan.ptl@gmail.com',
      replyTo: email,
      subject: `[FocusOS Support] Message from ${name}`,
      headers: {
        'List-Unsubscribe': '<mailto:support@focusos.live>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      text: `From: ${name} <${email}>\n\n${message}\n\n---\nSent via FocusOS contact form`,
      html: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>&gt;</p><hr/><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`,
    })

    if (sendError) {
      console.error('Resend error:', sendError)
      return res.status(500).json({ error: 'Failed to send message. Please try again.' })
    }
  } catch (err) {
    console.error('Resend threw:', err)
    return res.status(500).json({ error: 'Failed to send message. Please try again.' })
  }

  return res.status(200).json({ ok: true })
}
