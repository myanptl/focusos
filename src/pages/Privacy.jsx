export default function Privacy() {
  return (
    <div className="page-fade">
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>Privacy Policy</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>Effective date: May 2026</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>What we collect</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            When you create an account and use FocusOS, we collect the following data tied to your account:
            <ul style={{ marginTop: 10, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong style={{ color: 'var(--text)' }}>Email address</strong> — used for authentication only</li>
              <li><strong style={{ color: 'var(--text)' }}>Focus session data</strong> — duration, dates, session count, streaks</li>
              <li><strong style={{ color: 'var(--text)' }}>Quiz results</strong> — scores, question modes, missed questions, focus scores</li>
              <li><strong style={{ color: 'var(--text)' }}>Score goals</strong> — test type, target scores, test dates you enter</li>
              <li><strong style={{ color: 'var(--text)' }}>App preferences</strong> — timer settings, accent color, display name</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>How we use your data</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            Your data is used solely to power your FocusOS experience:
            <ul style={{ marginTop: 10, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Calculating your study streaks and focus statistics</li>
              <li>Tracking quiz history and scheduling spaced repetition reviews</li>
              <li>Generating personalized study plans based on your goals</li>
              <li>Restoring your preferences across devices and sessions</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Your notes and the AI</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            <p>When you generate a quiz, the notes you paste are sent to <strong style={{ color: 'var(--text)' }}>Anthropic's API</strong> to create questions. FocusOS does not store your notes. They are transmitted, used to generate questions, and discarded.</p>
            <p style={{ marginTop: 10 }}>We do <strong style={{ color: 'var(--text)' }}>not</strong> use your notes or quiz content to train any AI model. Anthropic handles this data under their own privacy policy: <a href="https://anthropic.com/privacy" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>anthropic.com/privacy</a></p>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>What we do not do</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>We do <strong style={{ color: 'var(--text)' }}>not</strong> sell your data to any third party</li>
              <li>We do <strong style={{ color: 'var(--text)' }}>not</strong> use your data for advertising</li>
              <li>We do <strong style={{ color: 'var(--text)' }}>not</strong> share your data with other users</li>
              <li>We do <strong style={{ color: 'var(--text)' }}>not</strong> store the notes you paste into the quiz generator</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Deleting your data</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            <p>You can reset all your focus and quiz data at any time from <strong style={{ color: 'var(--text)' }}>Settings → Data → Reset All Data</strong>.</p>
            <p style={{ marginTop: 10 }}>To fully delete your account, email us at <a href="mailto:support@focusos.live" style={{ color: 'var(--accent)' }}>support@focusos.live</a> and we will remove your account and all associated data within 7 days.</p>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Infrastructure</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            FocusOS is built on:
            <ul style={{ marginTop: 10, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong style={{ color: 'var(--text)' }}>Supabase</strong> — database and authentication. Their privacy policy: <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>supabase.com/privacy</a></li>
              <li><strong style={{ color: 'var(--text)' }}>Vercel</strong> — hosting and serverless functions. Their privacy policy: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>vercel.com/legal/privacy-policy</a></li>
            </ul>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Contact</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            Questions about this policy? Email <a href="mailto:support@focusos.live" style={{ color: 'var(--accent)' }}>support@focusos.live</a>
          </div>
        </section>

      </div>
    </div>
  )
}
