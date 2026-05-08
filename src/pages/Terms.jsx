export default function Terms() {
  return (
    <div className="page-fade">
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>Terms of Service</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>Effective date: May 2026</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Overview</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            FocusOS is a study tool for personal educational use. By creating an account and using FocusOS, you agree to these terms. If you do not agree, do not use the service.
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Eligibility</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            You must be at least <strong style={{ color: 'var(--text)' }}>13 years old</strong> to create an account. If you are under 18, you confirm that you have permission from a parent or guardian to use FocusOS.
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Acceptable use</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>FocusOS is for personal, non-commercial educational use only</li>
              <li>Do not upload copyrighted material as notes if you do not have the right to do so</li>
              <li>Do not attempt to abuse, overload, or circumvent the quiz generator's rate limits</li>
              <li>Do not attempt to reverse-engineer, scrape, or automate requests to the service</li>
              <li>Do not use FocusOS in any way that violates applicable law</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Account suspension</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            We reserve the right to suspend or terminate accounts that violate these terms without prior notice. If you believe your account was suspended in error, contact <a href="mailto:support@focusos.app" style={{ color: 'var(--accent)' }}>support@focusos.app</a>.
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>No guarantees</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            <p>FocusOS is provided <strong style={{ color: 'var(--text)' }}>as-is</strong> with no guarantees of academic outcome, test score improvement, or service uptime. Study tools support learning — they do not replace it.</p>
            <p style={{ marginTop: 10 }}>The AI-generated quiz questions are created for study purposes and may contain errors. Always verify important information against your primary source materials.</p>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Changes to these terms</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            We may update these terms from time to time. Continued use of FocusOS after changes are posted constitutes acceptance of the updated terms.
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Contact</h2>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>
            Questions about these terms? Email <a href="mailto:support@focusos.app" style={{ color: 'var(--accent)' }}>support@focusos.app</a>
          </div>
        </section>

      </div>
    </div>
  )
}
