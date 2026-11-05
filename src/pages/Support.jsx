import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

const FAQS = [
  {
    q: 'How does the adaptive timer work?',
    a: 'FocusOS starts at your real attention span from onboarding and increases by 2 minutes after each completed session. The goal is to gradually extend your focus capacity rather than force a fixed 25-minute block.',
  },
  {
    q: 'How does the quiz generator work?',
    a: 'Paste your notes, choose your settings (mode, difficulty, tone, subject type), and FocusOS uses Claude AI to generate questions matched to your material. Your notes are sent to the API to generate questions and are not stored.',
  },
  {
    q: 'What is spaced repetition?',
    a: 'Questions you miss or rate as low-confidence get scheduled for review at increasing intervals — 1 day, 3 days, 7 days — so you spend time on what you actually need to work on, not what you already know.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Your notes are only sent to Anthropic to generate questions and are never stored by FocusOS. We do not sell your data or use it for advertising. See our Privacy Policy for full details.',
    link: { label: 'Privacy Policy', to: '/privacy' },
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Settings → Data → Reset All Data to clear your focus history, quiz results, and goals. To fully delete your account and email address from our system, email support@focusos.live and we will process it within 7 days.',
  },
  {
    q: 'Why is my streak broken?',
    a: 'Streaks require at least one completed focus session per day. Missing a calendar day (midnight to midnight) resets the streak to zero. Completing any session — even a short one — maintains it.',
  },
]

function FAQItem({ q, a, link }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderTop: '1px solid var(--hairline)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: '100%', textAlign: 'left', padding: '16px 0',
          background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{q}</span>
        <Plus size={14} strokeWidth={1.6} color="var(--muted)" style={{ flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.18s var(--ease-out)' }} />
      </button>
      {open && (
        <div style={{ paddingBottom: 18, fontSize: 14, lineHeight: 1.7, color: 'var(--muted)', maxWidth: '68ch' }}>
          {a}
          {link && (
            <span> <Link to={link.to} style={{ color: 'var(--text)' }}>{link.label}</Link></span>
          )}
        </div>
      )}
    </div>
  )
}

export default function Support() {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send message')
      setSent(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <header className="page-head">
        <h1 className="page-title">Get help</h1>
        <p>
          Find answers below or reach us at{' '}
          <a href="mailto:support@focusos.live" style={{ color: 'var(--text)' }}>support@focusos.live</a>
        </p>
      </header>

      <section style={{ marginBottom: 48 }}>
        <div className="label" style={{ marginBottom: 12 }}>Questions</div>
        <div style={{ borderBottom: '1px solid var(--hairline)' }}>
          {FAQS.map(faq => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} link={faq.link} />
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 520 }}>
        <div className="label" style={{ marginBottom: 16 }}>Send a message</div>

        {sent ? (
          <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Message received</div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>
              Thanks. We&apos;ll get back to you within 48 hours.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label" htmlFor="support-name" style={{ display: 'block', marginBottom: 6 }}>Name</label>
              <input
                id="support-name" type="text" placeholder="Your name" value={name}
                onChange={e => setName(e.target.value)} required
              />
            </div>
            <div>
              <label className="label" htmlFor="support-email" style={{ display: 'block', marginBottom: 6 }}>Email</label>
              <input
                id="support-email" type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required
              />
            </div>
            <div>
              <label className="label" htmlFor="support-message" style={{ display: 'block', marginBottom: 6 }}>Message</label>
              <textarea
                id="support-message"
                placeholder="Describe your question or issue..."
                value={message} onChange={e => setMessage(e.target.value)}
                rows={5} style={{ resize: 'vertical', lineHeight: 1.6 }} required
              />
            </div>
            {error && (
              <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>
            )}
            <div>
              <button type="submit" className="btn btn-accent" disabled={loading}>
                {loading ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
