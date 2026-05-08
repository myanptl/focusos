import { useState } from 'react'
import { Link } from 'react-router-dom'

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
    a: 'Go to Settings → Data → Reset All Data to clear your focus history, quiz results, and goals. To fully delete your account and email address from our system, email support@focusos.app and we will process it within 7 days.',
  },
  {
    q: 'Why is my streak broken?',
    a: 'Streaks require at least one completed focus session per day. Missing a calendar day (midnight to midnight) resets the streak to zero. Completing any session — even a short one — maintains it.',
  },
]

function FAQItem({ q, a, link }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '16px 0',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{q}</span>
        <span style={{ color: 'var(--muted)', flexShrink: 0, fontSize: 16, lineHeight: 1 }}>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div style={{ paddingBottom: 16, fontSize: 14, lineHeight: 1.7, color: 'var(--muted)' }}>
          {a}
          {link && (
            <span> <Link to={link.to} style={{ color: 'var(--accent)' }}>{link.label}</Link></span>
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

  function handleSubmit(e) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="page-fade">
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>Get Help</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 36 }}>
        Find answers below or reach us at{' '}
        <a href="mailto:support@focusos.app" style={{ color: 'var(--accent)' }}>support@focusos.app</a>
      </p>

      {/* FAQ */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="label" style={{ marginBottom: 4 }}>Frequently Asked Questions</div>
        <div>
          {FAQS.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} link={faq.link} />
          ))}
        </div>
      </div>

      {/* Contact form */}
      <div className="card">
        <div className="label" style={{ marginBottom: 16 }}>Send a message</div>

        {sent ? (
          <div style={{
            background: 'rgba(181,242,58,0.08)', border: '1px solid rgba(181,242,58,0.2)',
            borderRadius: 10, padding: '20px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Message received</div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>
              Thanks! We'll get back to you within 48 hours.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>Name</label>
              <input
                type="text" placeholder="Your name" value={name}
                onChange={e => setName(e.target.value)} required
              />
            </div>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>Email</label>
              <input
                type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required
              />
            </div>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>Message</label>
              <textarea
                placeholder="Describe your question or issue..."
                value={message} onChange={e => setMessage(e.target.value)}
                rows={5} style={{ resize: 'vertical', lineHeight: 1.6 }} required
              />
            </div>
            <button type="submit" className="btn btn-accent btn-full">Send Message</button>
          </form>
        )}
      </div>
    </div>
  )
}
